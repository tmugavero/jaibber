use tauri::State;
use std::sync::Arc;
use crate::state::{AppState, AppSettings};
use crate::error::JaibberError;

const SETTINGS_KEY: &str = "app_settings";

/// Load settings from the persistent store into state, then return them.
/// Always reads from disk so callers get the real persisted values.
#[tauri::command]
pub async fn get_settings(
    state: State<'_, Arc<AppState>>,
    app: tauri::AppHandle,
) -> Result<AppSettings, JaibberError> {
    use tauri_plugin_store::StoreExt;
    if let Ok(store) = app.store("jaibber.json") {
        if let Some(value) = store.get(SETTINGS_KEY) {
            if let Ok(settings) = serde_json::from_value::<AppSettings>(value.clone()) {
                *state.settings.write().await = settings.clone();
                return Ok(settings);
            }
        }
    }
    Ok(state.settings.read().await.clone())
}

#[tauri::command]
pub async fn save_settings(
    state: State<'_, Arc<AppState>>,
    app: tauri::AppHandle,
    settings: AppSettings,
) -> Result<(), JaibberError> {
    use tauri_plugin_store::StoreExt;
    let store = app.store("jaibber.json")
        .map_err(|e| JaibberError::Other(e.to_string()))?;
    store.set(SETTINGS_KEY, serde_json::to_value(&settings)?);
    store.save()
        .map_err(|e| JaibberError::Other(e.to_string()))?;
    *state.settings.write().await = settings;
    Ok(())
}

#[tauri::command]
pub async fn is_setup_complete(
    state: State<'_, Arc<AppState>>,
    app: tauri::AppHandle,
) -> Result<bool, JaibberError> {
    use tauri_plugin_store::StoreExt;
    if let Ok(store) = app.store("jaibber.json") {
        if let Some(value) = store.get(SETTINGS_KEY) {
            if let Ok(settings) = serde_json::from_value::<AppSettings>(value.clone()) {
                let complete = settings.ably_api_key.is_some()
                    && !settings.my_handle.is_empty();
                *state.settings.write().await = settings;
                return Ok(complete);
            }
        }
    }
    Ok(false)
}
