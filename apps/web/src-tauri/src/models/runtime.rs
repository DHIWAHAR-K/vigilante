use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

/// Cached result of an Ollama probe — written to `cache/runtime-status.json`.
/// The frontend considers this stale after 30 seconds and re-requests via `check_runtime`.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OllamaRuntimeStatus {
    pub status: OllamaStatus,
    pub version: Option<String>,
    pub models: Vec<ModelInfo>,
    pub base_url: String,
    pub probed_at: DateTime<Utc>,
}

impl Default for OllamaRuntimeStatus {
    fn default() -> Self {
        Self {
            status: OllamaStatus::Unknown,
            version: None,
            models: Vec::new(),
            base_url: "http://127.0.0.1:11434".into(),
            probed_at: Utc::now(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum OllamaStatus {
    /// Not yet probed this session.
    Unknown,
    /// Ollama process is reachable and at least one model is available.
    Running,
    /// Ollama is reachable but no models are installed.
    Available,
    /// Ollama process is not responding.
    Stopped,
    /// Ollama binary is not installed on this machine.
    NotInstalled,
    /// Probe returned an unexpected error.
    Error,
}

/// Summary of an installed Ollama model.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ModelInfo {
    pub id: String,
    pub name: String,
    pub size_bytes: u64,
    pub modified_at: Option<DateTime<Utc>>,
    pub family: Option<String>,
    pub parameter_size: Option<String>,
    pub quantization: Option<String>,
}
