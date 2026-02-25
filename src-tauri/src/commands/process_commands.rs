use tauri::{State, Emitter};
use std::sync::Arc;
use tokio::io::{AsyncBufReadExt, BufReader};
use crate::state::AppState;
use crate::error::JaibberError;

/// Build the shell preamble that sources the user's environment (nvm, bashrc, etc.)
/// and sets up PATH. Reusable across agent providers.
fn build_shell_env() -> String {
    r#"export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
[ -f "$HOME/.bashrc" ] && . "$HOME/.bashrc" 2>/dev/null
[ -f "$HOME/.profile" ] && . "$HOME/.profile" 2>/dev/null
[ -f "$HOME/.zshrc" ] && . "$HOME/.zshrc" 2>/dev/null
export PATH="$PATH:/usr/local/bin:/usr/bin"
# Windows: add Claude Code install dir (version-agnostic glob)
for _d in "$HOME/AppData/Roaming/Claude/claude-code"/*/; do
  [ -d "$_d" ] && export PATH="$PATH:$_d"
done"#.to_string()
}

/// Build the Claude CLI command for one-shot (non-streaming) execution.
fn build_claude_oneshot_cmd() -> String {
    format!("{}\nclaude --print --dangerously-skip-permissions \"$JAIBBER_PROMPT\"",
        build_shell_env())
}

/// Build the Claude CLI command for streaming execution with stream-json output.
fn build_claude_stream_cmd(has_system_prompt: bool) -> String {
    let env = build_shell_env();
    if has_system_prompt {
        format!("{}\nclaude --print --verbose --output-format stream-json --append-system-prompt \"$JAIBBER_SYSTEM\" --dangerously-skip-permissions \"$JAIBBER_PROMPT\"", env)
    } else {
        format!("{}\nclaude --print --verbose --output-format stream-json --dangerously-skip-permissions \"$JAIBBER_PROMPT\"", env)
    }
}

/// Spawns an agent process via bash -c so that the user's full shell environment
/// (nvm, PATH, etc.) is available. Prompt is passed via env var to avoid shell
/// escaping issues with quotes and special characters.
#[tauri::command]
pub async fn run_agent(
    prompt: String,
    project_dir: String,
    state: State<'_, Arc<AppState>>,
) -> Result<String, JaibberError> {
    let anthropic_key = {
        let settings = state.settings.read().await;
        settings.anthropic_api_key.clone()
    };

    if project_dir.is_empty() {
        return Err(JaibberError::Other("project_dir must not be empty".into()));
    }

    let bash_cmd = build_claude_oneshot_cmd();

    let mut cmd = tokio::process::Command::new("bash");
    cmd.arg("-c")
       .arg(&bash_cmd)
       .current_dir(&project_dir)
       .env("JAIBBER_PROMPT", &prompt)
       .stdout(std::process::Stdio::piped())
       .stderr(std::process::Stdio::piped());

    if let Some(key) = &anthropic_key {
        if !key.is_empty() {
            cmd.env("ANTHROPIC_API_KEY", key);
        }
    }

    let output = cmd.output().await
        .map_err(|e| JaibberError::Shell(format!("Failed to spawn bash: {e}")))?;

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();

    if output.status.success() {
        Ok(stdout)
    } else {
        if stderr.contains("command not found") || stderr.contains("not recognized") {
            return Err(JaibberError::Shell(
                "Agent CLI (Claude Code) is not installed or not on PATH.\n\
                Install it with: npm install -g @anthropic-ai/claude-code\n\
                Then restart Jaibber.".into()
            ));
        }
        let code = output.status.code().map(|c| c.to_string()).unwrap_or_else(|| "?".to_string());
        Err(JaibberError::Shell(format!(
            "Agent process exited with code {code}\nstderr: {stderr}\nstdout: {stdout}"
        )))
    }
}

/// Extract text content from a Claude stream-json event line.
/// This parser is specific to Claude Code's `--output-format stream-json`.
/// A future agent provider would need its own parser.
fn extract_text_from_event(json: &serde_json::Value) -> String {
    // Partial content block delta: {"type":"content_block_delta","delta":{"type":"text_delta","text":"..."}}
    if let Some(delta) = json.get("delta") {
        if let Some(text) = delta.get("text").and_then(|t| t.as_str()) {
            return text.to_string();
        }
    }

    // Complete message: {"type":"message","content":[{"type":"text","text":"..."}]}
    // or: {"message":{"content":[{"type":"text","text":"..."}]}}
    let content = json.get("content")
        .or_else(|| json.get("message").and_then(|m| m.get("content")));
    if let Some(serde_json::Value::Array(items)) = content {
        let mut text = String::new();
        for item in items {
            if item.get("type").and_then(|t| t.as_str()) == Some("text") {
                if let Some(t) = item.get("text").and_then(|t| t.as_str()) {
                    text.push_str(t);
                }
            }
        }
        return text;
    }

    String::new()
}

/// Streaming variant of `run_agent`. Spawns a CLI agent process and streams
/// its stdout as Tauri events. Parses JSON lines (stream-json) for text
/// extraction, falling back to raw text for non-JSON output.
///
/// Uses a two-tier idle timeout: 5 minutes before any output (waiting for agent
/// to start), 60 seconds after output (detect lingering processes). If the
/// process lingers after producing output, it's treated as successful completion.
///
/// System prompt is passed via `--append-system-prompt`. Conversation context
/// is included in the main prompt.
#[tauri::command]
pub async fn run_agent_stream(
    prompt: String,
    project_dir: String,
    response_id: String,
    system_prompt: String,
    conversation_context: String,
    window: tauri::Window,
    state: State<'_, Arc<AppState>>,
) -> Result<(), JaibberError> {
    let anthropic_key = {
        let settings = state.settings.read().await;
        settings.anthropic_api_key.clone()
    };

    if project_dir.is_empty() {
        return Err(JaibberError::Other("project_dir must not be empty".into()));
    }

    // Build the user prompt with conversation context prepended.
    let mut full_prompt = String::new();
    if !conversation_context.is_empty() {
        full_prompt.push_str(
            "Below is the recent conversation history for context. \
             Respond ONLY to the final user message.\n\n"
        );
        full_prompt.push_str(&conversation_context);
        full_prompt.push_str("\n\n---\n\n");
    }
    full_prompt.push_str(&prompt);

    let bash_cmd = build_claude_stream_cmd(!system_prompt.is_empty());

    let mut cmd = tokio::process::Command::new("bash");
    cmd.arg("-c")
       .arg(&bash_cmd)
       .current_dir(&project_dir)
       .env("JAIBBER_PROMPT", &full_prompt)
       .env("JAIBBER_SYSTEM", &system_prompt)
       .stdout(std::process::Stdio::piped())
       .stderr(std::process::Stdio::piped());

    if let Some(key) = &anthropic_key {
        if !key.is_empty() {
            cmd.env("ANTHROPIC_API_KEY", key);
        }
    }

    let mut child = cmd.spawn()
        .map_err(|e| JaibberError::Shell(format!("Failed to spawn bash: {e}")))?;

    let stdout = child.stdout.take()
        .ok_or_else(|| JaibberError::Shell("Failed to capture stdout".into()))?;
    let stderr_pipe = child.stderr.take();

    let rid = response_id.clone();
    let win = window.clone();

    // Spawn a background task to read stream-json lines and emit chunks
    tokio::spawn(async move {
        use tokio::time::{timeout, Duration};

        // Collect stderr in parallel so we can include it in error messages
        let stderr_handle = stderr_pipe.map(|pipe| {
            tokio::spawn(async move {
                let mut buf = String::new();
                let reader = BufReader::new(pipe);
                let mut lines = reader.lines();
                while let Ok(Some(line)) = lines.next_line().await {
                    buf.push_str(&line);
                    buf.push('\n');
                    if buf.len() > 4000 { break; } // cap stderr collection
                }
                buf
            })
        });

        let reader = BufReader::new(stdout);
        let mut lines = reader.lines();
        let mut got_output = false;
        // Before any output: wait up to 5 minutes for the agent to start responding.
        // After output has started: if nothing new for 60 seconds, the agent is
        // likely done and the process is just lingering (e.g. spawned a dev server).
        let idle_timeout_initial = Duration::from_secs(300);
        let idle_timeout_after_output = Duration::from_secs(60);

        loop {
            let wait = if got_output { idle_timeout_after_output } else { idle_timeout_initial };
            match timeout(wait, lines.next_line()).await {
                Ok(Ok(Some(line))) => {
                    // Try to parse as stream-json event
                    if let Ok(json) = serde_json::from_str::<serde_json::Value>(&line) {
                        let text = extract_text_from_event(&json);
                        if !text.is_empty() {
                            got_output = true;
                            let _ = win.emit("agent-chunk", serde_json::json!({
                                "responseId": rid,
                                "chunk": text,
                                "done": false,
                                "error": null,
                            }));
                        }
                    } else if !line.trim().is_empty() {
                        // Non-JSON line — emit as raw text (fallback)
                        got_output = true;
                        let _ = win.emit("agent-chunk", serde_json::json!({
                            "responseId": rid,
                            "chunk": format!("{}\n", line),
                            "done": false,
                            "error": null,
                        }));
                    }
                }
                Ok(Ok(None)) => break, // EOF — process finished
                Ok(Err(_)) => break,   // Read error
                Err(_) => {
                    // Idle timeout fired — kill the lingering process
                    let _ = child.kill().await;
                    if got_output {
                        // Agent produced output but process didn't exit —
                        // treat as successful completion (e.g. agent spawned
                        // a long-running subprocess like a dev server).
                        let _ = win.emit("agent-chunk", serde_json::json!({
                            "responseId": rid,
                            "chunk": "",
                            "done": true,
                            "error": null,
                        }));
                    } else {
                        // No output at all — genuine timeout
                        let _ = win.emit("agent-chunk", serde_json::json!({
                            "responseId": rid,
                            "chunk": "",
                            "done": false,
                            "error": "Agent timed out (no output for 5 minutes)",
                        }));
                    }
                    return;
                }
            }
        }

        // Collect stderr for error reporting
        let stderr_text = match stderr_handle {
            Some(handle) => handle.await.unwrap_or_default(),
            None => String::new(),
        };

        // Wait for exit status with a 30-second timeout
        match timeout(Duration::from_secs(30), child.wait()).await {
            Ok(Ok(status)) => {
                if status.success() || got_output {
                    let _ = win.emit("agent-chunk", serde_json::json!({
                        "responseId": rid,
                        "chunk": "",
                        "done": true,
                        "error": null,
                    }));
                } else {
                    let code = status.code().map(|c| c.to_string()).unwrap_or_else(|| "?".into());
                    let err_detail = if stderr_text.trim().is_empty() {
                        format!("Agent process exited with code {code}")
                    } else {
                        format!("Agent process exited with code {code}\n{}", stderr_text.trim())
                    };
                    let _ = win.emit("agent-chunk", serde_json::json!({
                        "responseId": rid,
                        "chunk": "",
                        "done": false,
                        "error": err_detail,
                    }));
                }
            }
            _ => {
                // wait() timed out or errored — force kill
                let _ = child.kill().await;
                if got_output {
                    let _ = win.emit("agent-chunk", serde_json::json!({
                        "responseId": rid,
                        "chunk": "",
                        "done": true,
                        "error": null,
                    }));
                } else {
                    let _ = win.emit("agent-chunk", serde_json::json!({
                        "responseId": rid,
                        "chunk": "",
                        "done": false,
                        "error": "Agent process timed out",
                    }));
                }
            }
        }
    });

    Ok(())
}
