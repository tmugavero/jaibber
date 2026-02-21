use tauri::State;
use std::sync::Arc;
use crate::state::AppState;
use crate::error::JaibberError;

/// Spawns `claude --print "<prompt>"` in the configured project_dir.
/// Returns the full stdout of the claude process.
#[tauri::command]
pub async fn run_claude(
    prompt: String,
    state: State<'_, Arc<AppState>>,
    app: tauri::AppHandle,
) -> Result<String, JaibberError> {
    use tauri_plugin_shell::ShellExt;

    let project_dir = {
        let settings = state.settings.read().await;
        settings.project_dir.clone()
    };

    let dir = project_dir.ok_or_else(|| JaibberError::Other("No project directory configured".into()))?;

    let output = app
        .shell()
        .command("claude")
        .args(["--print", &prompt])
        .current_dir(&dir)
        .output()
        .await
        .map_err(|e| JaibberError::Shell(e.to_string()))?;

    if output.status.success() {
        let text = String::from_utf8_lossy(&output.stdout).to_string();
        Ok(text)
    } else {
        let err = String::from_utf8_lossy(&output.stderr).to_string();
        Err(JaibberError::Shell(err))
    }
}
