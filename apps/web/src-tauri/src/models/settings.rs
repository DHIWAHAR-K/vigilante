use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

/// Top-level user preferences — persisted at `settings.json`.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppSettings {
    /// Incremented when schema changes. Checked against `schema-version.json` on startup.
    pub schema_version: u32,
    pub appearance: AppearanceSettings,
    pub default_provider: ProviderConfig,
    pub provider_keys: ProviderKeys,
    pub search: SearchSettings,
    pub has_completed_onboarding: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl Default for AppSettings {
    fn default() -> Self {
        let now = Utc::now();
        Self {
            schema_version: 1,
            appearance: AppearanceSettings::default(),
            default_provider: ProviderConfig {
                provider_id: "ollama".into(),
                model_id: "llama3.2".into(),
            },
            provider_keys: ProviderKeys::default(),
            search: SearchSettings::default(),
            has_completed_onboarding: false,
            created_at: now,
            updated_at: now,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppearanceSettings {
    pub theme: Theme,
    pub sidebar_collapsed: bool,
    pub font_size: FontSize,
}

impl Default for AppearanceSettings {
    fn default() -> Self {
        Self {
            theme: Theme::System,
            sidebar_collapsed: false,
            font_size: FontSize::Medium,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum Theme {
    Light,
    Dark,
    System,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum FontSize {
    Small,
    Medium,
    Large,
}

/// Which AI provider + model to use by default for new threads.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProviderConfig {
    /// e.g. "ollama", "openai", "anthropic", "groq", "gemini"
    pub provider_id: String,
    /// e.g. "llama3.2", "gpt-4o", "claude-3-5-sonnet"
    pub model_id: String,
}

/// Optional API keys for remote providers.
/// Stored locally on device — never transmitted by the storage layer itself.
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct ProviderKeys {
    pub openai: Option<String>,
    pub anthropic: Option<String>,
    pub groq: Option<String>,
    pub gemini: Option<String>,
    pub openrouter: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchSettings {
    pub enabled_by_default: bool,
    pub provider: SearchProvider,
    pub brave_api_key: Option<String>,
    pub searxng_base_url: Option<String>,
}

impl Default for SearchSettings {
    fn default() -> Self {
        Self {
            enabled_by_default: true,
            provider: SearchProvider::Brave,
            brave_api_key: None,
            searxng_base_url: None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum SearchProvider {
    Brave,
    Serper,
    SearxNg,
}

/// Ollama runtime configuration — persisted at `runtime.json`.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RuntimeSettings {
    pub ollama_base_url: String,
    pub default_model: Option<String>,
    /// Timeout for Ollama health-check probes in milliseconds.
    pub connection_timeout_ms: u64,
    pub updated_at: DateTime<Utc>,
}

impl Default for RuntimeSettings {
    fn default() -> Self {
        Self {
            ollama_base_url: "http://127.0.0.1:11434".into(),
            default_model: None,
            connection_timeout_ms: 5_000,
            updated_at: Utc::now(),
        }
    }
}

/// Schema version manifest — persisted at `schema-version.json`.
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct SchemaVersion {
    pub version: u32,
    pub migrated_at: DateTime<Utc>,
}
