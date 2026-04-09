use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// Cached result of an Ollama probe — written to `cache/runtime-status.json`.
/// The frontend considers this stale after 30 seconds and re-requests via `probe_runtime`.
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

/// The health state of the Ollama runtime.
///
/// State machine (from the frontend's perspective):
///   Unknown      → initial / cold-cache state, always re-probe
///   NotInstalled → show "Install Ollama" instructions; no recovery possible
///   Stopped      → Ollama binary present but process not running; offer auto-start
///   Available    → process running, but no models downloaded; offer model pull
///   Running      → at least one model present; app is fully operational
///   Error        → process responded with an unexpected status; show error detail
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum OllamaStatus {
    /// Not yet probed this session.
    Unknown,
    /// Ollama process is reachable and at least one model is available.
    Running,
    /// Ollama is reachable but no models are installed.
    Available,
    /// Ollama binary exists on disk but the process is not responding.
    Stopped,
    /// Ollama binary is not present on this machine.
    NotInstalled,
    /// Probe returned an unexpected HTTP error.
    Error,
}

/// What happened when `ensure_runtime_ready` tried to get Ollama running.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum StartOutcome {
    /// Ollama was already running when we checked — nothing needed.
    AlreadyRunning,
    /// We launched `ollama serve` and it became healthy within the timeout.
    Started,
    /// Binary not found on disk — user must install Ollama.
    NotInstalled,
    /// We launched the process but it never became healthy before the timeout.
    Timeout,
    /// The launch command itself failed (permissions, exec error, etc.).
    Failed,
}

/// Result returned by `ensure_runtime_ready`.
/// Bundles the final probed status with metadata about what the native layer did.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EnsureReadyResult {
    /// Current runtime status after the ensure attempt.
    pub runtime: OllamaRuntimeStatus,
    /// Whether the native layer attempted to start Ollama.
    pub start_attempted: bool,
    /// What the start attempt resolved to (None if no attempt was made).
    pub start_outcome: Option<StartOutcome>,
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

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RuntimeSnapshot {
    pub runtime: OllamaRuntimeStatus,
    pub selected_model_id: Option<String>,
    pub installed_models: Vec<ModelInfo>,
    pub managed_runtime: ManagedRuntimeInfo,
    #[serde(default)]
    pub active_install_jobs: Vec<ModelInstallJob>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ManagedRuntimeInfo {
    pub managed: bool,
    pub base_url: String,
    pub models_dir: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CatalogModel {
    pub id: String,
    pub name: String,
    pub description: String,
    pub family: Option<String>,
    pub size_bytes: u64,
    pub parameter_size: String,
    pub quantization: String,
    pub context_window: u32,
    pub tags: Vec<String>,
    pub supports_cpu: bool,
    pub supports_apple_silicon: bool,
    pub supports_nvidia: bool,
    pub min_memory_gb: Option<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum ModelInstallStatus {
    Queued,
    Downloading,
    Verifying,
    Complete,
    Failed,
    Cancelled,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ModelInstallJob {
    pub id: Uuid,
    pub model_id: String,
    pub status: ModelInstallStatus,
    pub progress_percent: u8,
    pub downloaded_bytes: Option<u64>,
    pub total_bytes: Option<u64>,
    pub message: Option<String>,
    pub error: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub completed_at: Option<DateTime<Utc>>,
}
