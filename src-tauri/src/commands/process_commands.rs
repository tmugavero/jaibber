use tauri::{State, Emitter};
use std::sync::Arc;
use tokio::io::{AsyncBufReadExt, BufReader};
use crate::state::AppState;
use crate::error::JaibberError;
use crate::agent_providers::{ProviderConfig, ProviderKind, extract_text_from_line, is_auth_error};

/// Spawns an agent process via bash -c so that the user's full shell environment
/// (nvm, PATH, etc.) is available. Prompt is passed via env var to avoid shell
/// escaping issues with quotes and special characters.
#[tauri::command]
pub async fn run_agent(
    prompt: String,
    project_dir: String,
    agent_provider: Option<String>,
    custom_command: Option<String>,
    state: State<'_, Arc<AppState>>,
) -> Result<String, JaibberError> {
    if project_dir.is_empty() {
        return Err(JaibberError::Other("project_dir must not be empty".into()));
    }

    let provider_str = agent_provider.as_deref().unwrap_or("claude");
    let provider = ProviderConfig {
        kind: ProviderKind::from_str(provider_str),
        custom_command,
    };

    let pcmd = provider.build_oneshot_cmd();

    let settings = state.settings.read().await;
    let fallback_key = settings.fallback_key_for(provider_str).map(|s| s.to_string());
    drop(settings);

    // First attempt: without fallback API key (use CLI's own auth)
    let result = run_oneshot(&pcmd.bash_command, &project_dir, &prompt, None).await;

    match result {
        Ok(stdout) => Ok(stdout),
        Err(ref e) => {
            let err_str = e.to_string();
            // Check for auth error + available fallback
            if is_auth_error(&err_str) {
                if let (Some(env_var), Some(ref key)) = (pcmd.api_key_env_var, &fallback_key) {
                    // Retry with fallback API key
                    let retry = run_oneshot(
                        &pcmd.bash_command,
                        &project_dir,
                        &prompt,
                        Some((env_var, key)),
                    ).await;
                    return retry;
                }
            }
            // Not an auth error or no fallback available — surface the original error
            result
        }
    }
}

/// Helper: run a one-shot CLI command and return stdout or error.
async fn run_oneshot(
    bash_cmd: &str,
    project_dir: &str,
    prompt: &str,
    api_key_env: Option<(&str, &str)>,
) -> Result<String, JaibberError> {
    let mut cmd = tokio::process::Command::new("bash");
    cmd.arg("-c")
       .arg(bash_cmd)
       .current_dir(project_dir)
       .env("JAIBBER_PROMPT", prompt)
       .stdout(std::process::Stdio::piped())
       .stderr(std::process::Stdio::piped());

    if let Some((var, key)) = api_key_env {
        cmd.env(var, key);
    }

    let output = cmd.output().await
        .map_err(|e| JaibberError::Shell(format!("Failed to spawn bash: {e}")))?;

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();

    if output.status.success() {
        Ok(stdout)
    } else {
        if stderr.contains("command not found") || stderr.contains("not recognized") {
            return Err(JaibberError::Shell(stderr));
        }
        let code = output.status.code().map(|c| c.to_string()).unwrap_or_else(|| "?".to_string());
        Err(JaibberError::Shell(format!(
            "Agent process exited with code {code}\nstderr: {stderr}\nstdout: {stdout}"
        )))
    }
}

/// Streaming variant of `run_agent`. Spawns a CLI agent process and streams
/// its stdout as Tauri events. Uses the provider abstraction to support
/// multiple backends (Claude, Codex, Gemini, custom).
///
/// Auth fallback: if the CLI fails with an auth error and a fallback API key
/// is configured for this provider, automatically retries with the key set
/// as an env var and emits an `"agent-auth-fallback"` event so the frontend
/// can show a subtle notice.
#[tauri::command]
pub async fn run_agent_stream(
    prompt: String,
    project_dir: String,
    response_id: String,
    system_prompt: String,
    conversation_context: String,
    agent_provider: Option<String>,
    custom_command: Option<String>,
    window: tauri::Window,
    state: State<'_, Arc<AppState>>,
) -> Result<(), JaibberError> {
    if project_dir.is_empty() {
        return Err(JaibberError::Other("project_dir must not be empty".into()));
    }

    let provider_str = agent_provider.as_deref().unwrap_or("claude");
    let provider = ProviderConfig {
        kind: ProviderKind::from_str(provider_str),
        custom_command: custom_command.clone(),
    };

    // Read fallback keys from settings
    let settings = state.settings.read().await;
    let fallback_key = settings.fallback_key_for(provider_str).map(|s| s.to_string());
    drop(settings);

    // Build the user prompt with conversation context prepended.
    let mut full_prompt = String::new();
    if !conversation_context.is_empty() {
        full_prompt.push_str(
            "Below is the recent conversation history for context. \
             Respond ONLY to the final user message. \
             Be conversational and concise — reply directly to the user as a chat participant. \
             Do NOT narrate your thought process, planning steps, or internal reasoning. \
             Do NOT describe actions you would take (e.g. \"I should...\", \"Let me...\", \"I will...\"). \
             Just answer.\n\n"
        );
        full_prompt.push_str(&conversation_context);
        full_prompt.push_str("\n\n---\n\n");
    }
    full_prompt.push_str(&prompt);

    let pcmd = provider.build_stream_cmd(!system_prompt.is_empty());
    let provider_kind = provider.kind.clone();
    let reauth_hint = provider.reauth_hint().to_string();
    let install_hint = provider.install_hint().to_string();

    // Try to spawn the agent process
    let spawn_result = spawn_agent_process(
        &pcmd.bash_command,
        &project_dir,
        &full_prompt,
        &system_prompt,
        None, // No API key on first attempt — use CLI's own auth
    );

    let mut child = match spawn_result {
        Ok(c) => c,
        Err(e) => return Err(e),
    };

    let stdout = child.stdout.take()
        .ok_or_else(|| JaibberError::Shell("Failed to capture stdout".into()))?;
    let stderr_pipe = child.stderr.take();

    let rid = response_id.clone();
    let win = window.clone();
    let fallback_env_var = pcmd.api_key_env_var.map(|s| s.to_string());
    let bash_cmd_for_retry = pcmd.bash_command.clone();
    let full_prompt_for_retry = full_prompt.clone();
    let system_prompt_for_retry = system_prompt.clone();
    let project_dir_for_retry = project_dir.clone();

    // Spawn a background task to read stream lines and emit chunks
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
        let idle_timeout_initial = Duration::from_secs(300);
        let idle_timeout_after_output = Duration::from_secs(60);

        loop {
            let wait = if got_output { idle_timeout_after_output } else { idle_timeout_initial };
            match timeout(wait, lines.next_line()).await {
                Ok(Ok(Some(line))) => {
                    let text = extract_text_from_line(&provider_kind, &line);
                    if !text.is_empty() {
                        got_output = true;
                        let _ = win.emit("agent-chunk", serde_json::json!({
                            "responseId": rid,
                            "chunk": text,
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
                    // Process failed with no output — check for auth error
                    if is_auth_error(&stderr_text) {
                        if let (Some(ref env_var), Some(ref key)) = (&fallback_env_var, &fallback_key) {
                            // ── AUTH FALLBACK: retry with API key ──
                            let _ = win.emit("agent-auth-fallback", serde_json::json!({
                                "responseId": rid,
                                "provider": format!("{:?}", provider_kind),
                                "message": format!(
                                    "CLI auth expired — using fallback API key. {}",
                                    reauth_hint
                                ),
                            }));

                            // Spawn the retry
                            retry_with_fallback(
                                &bash_cmd_for_retry,
                                &project_dir_for_retry,
                                &full_prompt_for_retry,
                                &system_prompt_for_retry,
                                env_var,
                                key,
                                &rid,
                                &provider_kind,
                                &win,
                            ).await;
                            return;
                        }
                    }

                    // Not an auth error, or no fallback available
                    let code = status.code().map(|c| c.to_string()).unwrap_or_else(|| "?".into());
                    let err_detail = if stderr_text.contains("command not found") || stderr_text.contains("not recognized") {
                        install_hint.to_string()
                    } else if is_auth_error(&stderr_text) {
                        // Auth error but no fallback key configured
                        format!(
                            "Agent auth expired (exit code {code}). {} or add a fallback API key in Settings.\n{}",
                            reauth_hint,
                            stderr_text.trim()
                        )
                    } else if stderr_text.trim().is_empty() {
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

/// Helper: spawn an agent CLI process with the given configuration.
fn spawn_agent_process(
    bash_cmd: &str,
    project_dir: &str,
    prompt: &str,
    system_prompt: &str,
    api_key_env: Option<(&str, &str)>,
) -> Result<tokio::process::Child, JaibberError> {
    let mut cmd = tokio::process::Command::new("bash");
    cmd.arg("-c")
       .arg(bash_cmd)
       .current_dir(project_dir)
       .env("JAIBBER_PROMPT", prompt)
       .env("JAIBBER_SYSTEM", system_prompt)
       .stdout(std::process::Stdio::piped())
       .stderr(std::process::Stdio::piped());

    if let Some((var, key)) = api_key_env {
        cmd.env(var, key);
    }

    cmd.spawn()
        .map_err(|e| JaibberError::Shell(format!("Failed to spawn bash: {e}")))
}

/// Retry a streaming agent invocation with a fallback API key.
/// This is called when the first attempt failed with an auth error.
async fn retry_with_fallback(
    bash_cmd: &str,
    project_dir: &str,
    full_prompt: &str,
    system_prompt: &str,
    env_var: &str,
    api_key: &str,
    response_id: &str,
    provider_kind: &ProviderKind,
    window: &tauri::Window,
) {
    use tokio::time::{timeout, Duration};

    let spawn_result = spawn_agent_process(
        bash_cmd,
        project_dir,
        full_prompt,
        system_prompt,
        Some((env_var, api_key)),
    );

    let mut child = match spawn_result {
        Ok(c) => c,
        Err(e) => {
            let _ = window.emit("agent-chunk", serde_json::json!({
                "responseId": response_id,
                "chunk": "",
                "done": false,
                "error": format!("Auth fallback retry failed to spawn: {e}"),
            }));
            return;
        }
    };

    let stdout = match child.stdout.take() {
        Some(s) => s,
        None => {
            let _ = window.emit("agent-chunk", serde_json::json!({
                "responseId": response_id,
                "chunk": "",
                "done": false,
                "error": "Auth fallback retry: failed to capture stdout",
            }));
            return;
        }
    };

    let reader = BufReader::new(stdout);
    let mut lines = reader.lines();
    let mut got_output = false;
    let idle_timeout_initial = Duration::from_secs(300);
    let idle_timeout_after_output = Duration::from_secs(60);

    loop {
        let wait = if got_output { idle_timeout_after_output } else { idle_timeout_initial };
        match timeout(wait, lines.next_line()).await {
            Ok(Ok(Some(line))) => {
                let text = extract_text_from_line(provider_kind, &line);
                if !text.is_empty() {
                    got_output = true;
                    let _ = window.emit("agent-chunk", serde_json::json!({
                        "responseId": response_id,
                        "chunk": text,
                        "done": false,
                        "error": null,
                    }));
                }
            }
            Ok(Ok(None)) => break,
            Ok(Err(_)) => break,
            Err(_) => {
                let _ = child.kill().await;
                if got_output {
                    let _ = window.emit("agent-chunk", serde_json::json!({
                        "responseId": response_id,
                        "chunk": "",
                        "done": true,
                        "error": null,
                    }));
                } else {
                    let _ = window.emit("agent-chunk", serde_json::json!({
                        "responseId": response_id,
                        "chunk": "",
                        "done": false,
                        "error": "Agent timed out on fallback retry",
                    }));
                }
                return;
            }
        }
    }

    match timeout(Duration::from_secs(30), child.wait()).await {
        Ok(Ok(status)) => {
            if status.success() || got_output {
                let _ = window.emit("agent-chunk", serde_json::json!({
                    "responseId": response_id,
                    "chunk": "",
                    "done": true,
                    "error": null,
                }));
            } else {
                let _ = window.emit("agent-chunk", serde_json::json!({
                    "responseId": response_id,
                    "chunk": "",
                    "done": false,
                    "error": "Agent failed even with fallback API key",
                }));
            }
        }
        _ => {
            let _ = child.kill().await;
            if got_output {
                let _ = window.emit("agent-chunk", serde_json::json!({
                    "responseId": response_id,
                    "chunk": "",
                    "done": true,
                    "error": null,
                }));
            } else {
                let _ = window.emit("agent-chunk", serde_json::json!({
                    "responseId": response_id,
                    "chunk": "",
                    "done": false,
                    "error": "Agent process timed out on fallback retry",
                }));
            }
        }
    }
}
