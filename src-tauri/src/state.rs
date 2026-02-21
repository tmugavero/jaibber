use std::sync::Arc;
use tokio::sync::RwLock;
use serde::{Deserialize, Serialize};

/// Central application state, shared via Arc across all Tauri commands.
pub struct AppState {
    pub settings: Arc<RwLock<AppSettings>>,
}

impl AppState {
    pub fn new() -> Self {
        Self {
            settings: Arc::new(RwLock::new(AppSettings::default())),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppSettings {
    pub anthropic_api_key: Option<String>,
    pub machine_name: String,
    pub api_base_url: String,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            anthropic_api_key: None,
            machine_name: String::new(),
            api_base_url: String::new(),
        }
    }
}
