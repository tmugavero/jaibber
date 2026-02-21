use tauri::State;
use std::sync::Arc;
use crate::state::AppState;
use crate::error::JaibberError;

/// Spawns `claude --print "<prompt>"` via bash -c so that the user's full
/// shell environment (nvm, PATH, etc.) is available — Tauri's shell plugin
/// strips the environment when spawning, causing Claude Code to hang.
///
/// We use tokio::process::Command directly instead of tauri-plugin-shell
/// for the same reason.
#[tauri::command]
pub async fn run_claude(
    prompt: String,
    state: State<'_, Arc<AppState>>,
) -> Result<String, JaibberError> {
    let (project_dir, anthropic_key) = {
        let settings = state.settings.read().await;
        (settings.project_dir.clone(), settings.anthropic_api_key.clone())
    };

    let dir = project_dir.ok_or_else(|| {
        JaibberError::Other("No project directory configured".into())
    })?;

    // Escape any single-quotes in the prompt so it's safe inside bash -c '...'
    let safe_prompt = prompt.replace('\'', "'\''");

    // Build the bash command:
    // - Source nvm and common profile files so PATH includes nvm node/claude
    // - Use --print and --dangerously-skip-permissions (no TTY available)
    let bash_cmd = format!(
        r#"export NVM_DIR="$HOME/.nvm"; \
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"; \
[ -f "$HOME/.bashrc" ] && . "$HOME/.bashrc" 2>/dev/null; \
[ -f "$HOME/.profile" ] && . "$HOME/.profile" 2>/dev/null; \
claude --print --dangerously-skip-permissions '{safe_prompt}'"#
    );

    let mut cmd = tokio::process::Command::new("bash");
    cmd.arg("-c")
       .arg(&bash_cmd)
       .current_dir(&dir)
       .stdout(std::process::Stdio::piped())
       .stderr(std::process::Stdio::piped());

    // Pass ANTHROPIC_API_KEY if we have it stored
    if let Some(key) = anthropic_key {
        if !key.is_empty() {
            cmd.env("ANTHROPIC_API_KEY", key);
        }
    }

    let output = cmd.output().await
        .map_err(|e| JaibberError::Shell(format!("Failed to spawn bash: {e}")))?;

    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).to_string())
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr).to_string();
        let stdout = String::from_utf8_lossy(&output.stdout).to_string();
        Err(JaibberError::Shell(format!(
            "claude error\nstderr: {stderr}\nstdout: {stdout}"
        )))
    }
}
