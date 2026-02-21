use thiserror::Error;

#[derive(Debug, Error)]
pub enum JaibberError {
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    #[error("Serde error: {0}")]
    Serde(#[from] serde_json::Error),

    #[error("Tauri error: {0}")]
    Tauri(#[from] tauri::Error),

    #[error("Shell error: {0}")]
    Shell(String),

    #[error("No Anthropic API key configured")]
    NoApiKey,

    #[error("{0}")]
    Other(String),
}

impl serde::Serialize for JaibberError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}
