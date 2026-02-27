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
    #[serde(default)]
    pub openai_api_key: Option<String>,
    #[serde(default)]
    pub google_api_key: Option<String>,
    pub machine_name: String,
    pub api_base_url: String,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            anthropic_api_key: None,
            openai_api_key: None,
            google_api_key: None,
            machine_name: String::new(),
            api_base_url: String::new(),
        }
    }
}

impl AppSettings {
    /// Get the fallback API key for a given provider.
    pub fn fallback_key_for(&self, provider: &str) -> Option<&str> {
        let key = match provider.to_lowercase().as_str() {
            "claude" => self.anthropic_api_key.as_deref(),
            "codex" => self.openai_api_key.as_deref(),
            "gemini" => self.google_api_key.as_deref(),
            _ => None,
        };
        // Only return non-empty keys
        key.filter(|k| !k.is_empty())
    }
}
