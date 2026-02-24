use std::sync::Arc;

mod error;
mod state;
mod commands;

use commands::settings_commands;
use commands::process_commands;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| tracing_subscriber::EnvFilter::new("info")),
        )
        .init();

    let app_state = Arc::new(state::AppState::new());

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .manage(app_state)
        .invoke_handler(tauri::generate_handler![
            settings_commands::get_settings,
            settings_commands::save_settings,
            process_commands::run_claude,
            process_commands::run_claude_stream,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Jaibber");
}
