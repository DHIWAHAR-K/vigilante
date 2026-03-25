use serde::Serialize;
use thiserror::Error;

/// Application-level error type.
/// Implements `Into<tauri::ipc::InvokeError>` so command handlers can use `?`.
#[derive(Debug, Error)]
pub enum VError {
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    #[error("JSON error: {0}")]
    Json(#[from] serde_json::Error),

    #[error("Database error: {0}")]
    Database(#[from] rusqlite::Error),

    #[error("Thread not found: {0}")]
    ThreadNotFound(String),

    #[error("Workspace not found: {0}")]
    WorkspaceNotFound(String),

    #[error("Draft not found: {0}")]
    DraftNotFound(String),

    #[error("Invalid path")]
    InvalidPath,

    #[error("Storage not initialised")]
    NotInitialised,

    #[error("Schema migration failed: {0}")]
    MigrationFailed(String),

    #[error("Ollama error: {0}")]
    Ollama(String),

    #[error("HTTP error: {0}")]
    Http(#[from] reqwest::Error),

    #[error("Export error: {0}")]
    Export(String),

    #[error("{0}")]
    Other(String),
}

/// Allow VError to be returned from Tauri commands transparently.
impl Serialize for VError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}

pub type VResult<T> = Result<T, VError>;
