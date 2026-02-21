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
    pub ably_api_key: Option<String>,
    pub anthropic_api_key: Option<String>,
    pub my_handle: String,
    pub my_mode: AgentMode,
    pub project_dir: Option<String>,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            ably_api_key: None,
            anthropic_api_key: None,
            my_handle: String::new(),
            my_mode: AgentMode::Hub,
            project_dir: None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum AgentMode {
    Hub,
    Agent,
}
