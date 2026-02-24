use tauri::{State, Emitter};
use std::sync::Arc;
use tokio::io::{AsyncBufReadExt, BufReader};
use crate::state::AppState;
use crate::error::JaibberError;

/// Spawns `claude --print "<prompt>"` via bash -c so that the user's full
/// shell environment (nvm, PATH, etc.) is available — Tauri's shell plugin
/// strips the environment when spawning, causing Claude Code to hang.
///
/// `project_dir` is passed per-call from the frontend (projectStore) rather
/// than stored globally in settings, enabling one Jaibber instance to serve
/// multiple projects by using a different directory each time.
#[tauri::command]
pub async fn run_claude(
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

    // Escape any single-quotes in the prompt so it's safe inside bash -c '...'
    let safe_prompt = prompt.replace('\'', "'\''");

    let bash_cmd = format!(
        r#"export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
[ -f "$HOME/.bashrc" ] && . "$HOME/.bashrc" 2>/dev/null
[ -f "$HOME/.profile" ] && . "$HOME/.profile" 2>/dev/null
[ -f "$HOME/.zshrc" ] && . "$HOME/.zshrc" 2>/dev/null
export PATH="$PATH:/usr/local/bin:/usr/bin"
# Windows: add Claude Code install dir (version-agnostic glob)
for _d in "$HOME/AppData/Roaming/Claude/claude-code"/*/; do
  [ -d "$_d" ] && export PATH="$PATH:$_d"
done
claude --print --dangerously-skip-permissions '{safe_prompt}'"#
    );

    let mut cmd = tokio::process::Command::new("bash");
    cmd.arg("-c")
       .arg(&bash_cmd)
       .current_dir(&project_dir)
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
                "Claude Code is not installed or not on PATH.\n\
                Install it with: npm install -g @anthropic-ai/claude-code\n\
                Then restart Jaibber.".into()
            ));
        }
        let code = output.status.code().map(|c| c.to_string()).unwrap_or_else(|| "?".to_string());
        Err(JaibberError::Shell(format!(
            "claude exited with code {code}\nstderr: {stderr}\nstdout: {stdout}"
        )))
    }
}

/// Streaming variant of `run_claude`. Spawns the Claude CLI process, reads
/// stdout line-by-line, and emits each line as a Tauri event so the frontend
/// can render responses incrementally.
///
/// The full prompt sent to Claude is:  system_prompt + conversation_context + user prompt.
#[tauri::command]
pub async fn run_claude_stream(
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

    // Build full prompt: system instructions + conversation context + user message.
    // The prompt must clearly separate context from the actual request so Claude
    // doesn't interpret the history as a cut-off conversation.
    let mut full_prompt = String::new();
    if !system_prompt.is_empty() {
        full_prompt.push_str(&system_prompt);
        full_prompt.push_str("\n\n");
    }
    if !conversation_context.is_empty() {
        full_prompt.push_str(
            "Below is the recent conversation history for context. \
             Respond ONLY to the final user message.\n\n"
        );
        full_prompt.push_str(&conversation_context);
        full_prompt.push_str("\n\n---\n\n");
    }
    full_prompt.push_str(&prompt);

    let safe_prompt = full_prompt.replace('\'', "'\''");

    let bash_cmd = format!(
        r#"export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
[ -f "$HOME/.bashrc" ] && . "$HOME/.bashrc" 2>/dev/null
[ -f "$HOME/.profile" ] && . "$HOME/.profile" 2>/dev/null
[ -f "$HOME/.zshrc" ] && . "$HOME/.zshrc" 2>/dev/null
export PATH="$PATH:/usr/local/bin:/usr/bin"
# Windows: add Claude Code install dir (version-agnostic glob)
for _d in "$HOME/AppData/Roaming/Claude/claude-code"/*/; do
  [ -d "$_d" ] && export PATH="$PATH:$_d"
done
claude --print --dangerously-skip-permissions '{safe_prompt}'"#
    );

    let mut cmd = tokio::process::Command::new("bash");
    cmd.arg("-c")
       .arg(&bash_cmd)
       .current_dir(&project_dir)
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

    let rid = response_id.clone();
    let win = window.clone();

    // Spawn a background task to read stdout line-by-line and emit events
    tokio::spawn(async move {
        let reader = BufReader::new(stdout);
        let mut lines = reader.lines();
        let mut got_output = false;

        while let Ok(Some(line)) = lines.next_line().await {
            got_output = true;
            let _ = win.emit("claude-chunk", serde_json::json!({
                "responseId": rid,
                "chunk": format!("{}\n", line),
                "done": false,
                "error": null,
            }));
        }

        // Wait for exit status
        let status = child.wait().await;
        let exit_status = status.ok();
        let success = exit_status.map(|s| s.success()).unwrap_or(false);

        // If we got output, treat as success even if exit code is non-zero.
        // The claude CLI can exit non-zero after producing valid output.
        if success || got_output {
            let _ = win.emit("claude-chunk", serde_json::json!({
                "responseId": rid,
                "chunk": "",
                "done": true,
                "error": null,
            }));
        } else {
            let code = exit_status
                .and_then(|s| s.code())
                .map(|c| c.to_string())
                .unwrap_or_else(|| "?".into());
            // Also capture stderr for a more useful error message
            let _ = win.emit("claude-chunk", serde_json::json!({
                "responseId": rid,
                "chunk": "",
                "done": false,
                "error": format!("claude exited with code {code}"),
            }));
        }
    });

    Ok(())
}
