use tauri::State;
use std::sync::Arc;
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
        let code = output.status.code().map(|c| c.to_string()).unwrap_or_else(|| "?".to_string());
        Err(JaibberError::Shell(format!(
            "claude exited with code {code}\nstderr: {stderr}\nstdout: {stdout}"
        )))
    }
}
