use tauri::State;
use std::sync::Arc;
use std::path::PathBuf;
use crate::state::AppState;
use crate::error::JaibberError;

/// Find the `claude` binary, checking common install locations since
/// Tauri spawns processes with a minimal PATH that may not include
/// nvm/npm global bin dirs.
fn find_claude() -> Option<PathBuf> {
    // 1. Check PATH first (works on Windows and some Linux setups)
    if let Ok(path) = which::which("claude") {
        return Some(path);
    }

    // 2. Common locations where `npm install -g` puts binaries on Linux/macOS
    let home = std::env::var("HOME").unwrap_or_default();
    let candidates = vec![
        // nvm default
        format!("{home}/.nvm/versions/node/$(ls {home}/.nvm/versions/node/ 2>/dev/null | sort -V | tail -1)/bin/claude"),
        format!("{home}/.nvm/versions/node/v22.22.0/bin/claude"),
        format!("{home}/.nvm/versions/node/v22.0.0/bin/claude"),
        format!("{home}/.nvm/versions/node/v20.0.0/bin/claude"),
        // npm global without nvm
        format!("{home}/.npm-global/bin/claude"),
        format!("{home}/.local/bin/claude"),
        // system npm
        "/usr/local/bin/claude".to_string(),
        "/usr/bin/claude".to_string(),
    ];

    for path in candidates {
        let p = PathBuf::from(&path);
        if p.exists() {
            return Some(p);
        }
    }

    None
}

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

    let dir = project_dir.ok_or_else(|| {
        JaibberError::Other("No project directory configured".into())
    })?;

    // Try to find the claude binary explicitly
    let claude_bin = find_claude()
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_else(|| "claude".to_string());

    let output = app
        .shell()
        .command(&claude_bin)
        .args(["--print", &prompt])
        .current_dir(&dir)
        .output()
        .await
        .map_err(|e| JaibberError::Shell(format!(
            "Failed to spawn claude (tried: {claude_bin}): {e}"
        )))?;

    if output.status.success() {
        let text = String::from_utf8_lossy(&output.stdout).to_string();
        Ok(text)
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr).to_string();
        let stdout = String::from_utf8_lossy(&output.stdout).to_string();
        Err(JaibberError::Shell(format!(
            "claude exited with error.\nstderr: {stderr}\nstdout: {stdout}"
        )))
    }
}
