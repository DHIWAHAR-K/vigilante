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
    #[serde(default)]
    pub mcp: McpSettings,
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
                model_id: "llama3.2:3b".into(),
            },
            provider_keys: ProviderKeys::default(),
            search: SearchSettings::default(),
            mcp: McpSettings::default(),
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
            provider: SearchProvider::SearxNg,
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

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct McpSettings {
    pub enabled_by_default: bool,
    #[serde(default = "default_max_context_items")]
    pub max_context_items: u32,
    #[serde(default)]
    pub connectors: Vec<McpConnectorConfig>,
}

impl Default for McpSettings {
    fn default() -> Self {
        Self {
            enabled_by_default: false,
            max_context_items: default_max_context_items(),
            connectors: default_mcp_connectors(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct McpConnectorConfig {
    pub id: String,
    pub name: String,
    pub description: String,
    pub tier: McpTier,
    pub transport: McpTransport,
    pub enabled: bool,
    #[serde(default = "default_true")]
    pub read_only: bool,
    pub command: Option<String>,
    #[serde(default)]
    pub args: Vec<String>,
    pub url: Option<String>,
    #[serde(default)]
    pub env: Vec<McpEnvironmentVariable>,
    #[serde(default)]
    pub allowed_roots: Vec<String>,
    #[serde(default)]
    pub workspace_root_required: bool,
    #[serde(default = "default_mcp_timeout_ms")]
    pub startup_timeout_ms: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct McpEnvironmentVariable {
    pub key: String,
    pub value: Option<String>,
    pub source_env: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum McpTransport {
    Stdio,
    StreamableHttp,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum McpTier {
    Tier1,
    Tier2,
    Tier3,
}

fn default_true() -> bool {
    true
}

fn default_max_context_items() -> u32 {
    6
}

fn default_mcp_timeout_ms() -> u64 {
    8_000
}

fn default_mcp_connectors() -> Vec<McpConnectorConfig> {
    vec![
        McpConnectorConfig {
            id: "filesystem".into(),
            name: "Filesystem".into(),
            description: "Secure file search and read access scoped to the active workspace."
                .into(),
            tier: McpTier::Tier1,
            transport: McpTransport::Stdio,
            enabled: false,
            read_only: true,
            command: Some("npx".into()),
            args: vec![
                "-y".into(),
                "@modelcontextprotocol/server-filesystem".into(),
                "${workspace_root}".into(),
            ],
            url: None,
            env: Vec::new(),
            allowed_roots: vec!["${workspace_root}".into()],
            workspace_root_required: true,
            startup_timeout_ms: default_mcp_timeout_ms(),
        },
        McpConnectorConfig {
            id: "git".into(),
            name: "Git".into(),
            description:
                "Repository-aware status, diff, and history tooling for the active workspace."
                    .into(),
            tier: McpTier::Tier1,
            transport: McpTransport::Stdio,
            enabled: false,
            read_only: true,
            command: Some("uvx".into()),
            args: vec![
                "mcp-server-git".into(),
                "--repository".into(),
                "${workspace_root}".into(),
            ],
            url: None,
            env: Vec::new(),
            allowed_roots: vec!["${workspace_root}".into()],
            workspace_root_required: true,
            startup_timeout_ms: default_mcp_timeout_ms(),
        },
        McpConnectorConfig {
            id: "fetch".into(),
            name: "Fetch".into(),
            description: "Fetch web content through the official MCP fetch server.".into(),
            tier: McpTier::Tier1,
            transport: McpTransport::Stdio,
            enabled: false,
            read_only: true,
            command: Some("uvx".into()),
            args: vec!["mcp-server-fetch".into()],
            url: None,
            env: Vec::new(),
            allowed_roots: Vec::new(),
            workspace_root_required: false,
            startup_timeout_ms: default_mcp_timeout_ms(),
        },
        McpConnectorConfig {
            id: "postgres".into(),
            name: "PostgreSQL".into(),
            description: "Read-only schema and query access for PostgreSQL databases.".into(),
            tier: McpTier::Tier1,
            transport: McpTransport::Stdio,
            enabled: false,
            read_only: true,
            command: Some("npx".into()),
            args: vec![
                "-y".into(),
                "@modelcontextprotocol/server-postgres".into(),
                "${connector_url}".into(),
            ],
            url: Some("postgresql://localhost/mydb".into()),
            env: Vec::new(),
            allowed_roots: Vec::new(),
            workspace_root_required: false,
            startup_timeout_ms: default_mcp_timeout_ms(),
        },
        McpConnectorConfig {
            id: "sqlite".into(),
            name: "SQLite".into(),
            description:
                "Read-only schema access for SQLite databases, defaulting to Vigilante's local DB."
                    .into(),
            tier: McpTier::Tier1,
            transport: McpTransport::Stdio,
            enabled: false,
            read_only: true,
            command: Some("uvx".into()),
            args: vec![
                "mcp-server-sqlite".into(),
                "--db-path".into(),
                "${vigilante_db}".into(),
            ],
            url: None,
            env: Vec::new(),
            allowed_roots: Vec::new(),
            workspace_root_required: false,
            startup_timeout_ms: default_mcp_timeout_ms(),
        },
        McpConnectorConfig {
            id: "github".into(),
            name: "GitHub".into(),
            description: "Repository, PR, issue, and code search through GitHub MCP.".into(),
            tier: McpTier::Tier1,
            transport: McpTransport::Stdio,
            enabled: false,
            read_only: true,
            command: Some("npx".into()),
            args: vec!["-y".into(), "@modelcontextprotocol/server-github".into()],
            url: None,
            env: vec![McpEnvironmentVariable {
                key: "GITHUB_PERSONAL_ACCESS_TOKEN".into(),
                value: None,
                source_env: Some("GITHUB_PERSONAL_ACCESS_TOKEN".into()),
            }],
            allowed_roots: Vec::new(),
            workspace_root_required: false,
            startup_timeout_ms: default_mcp_timeout_ms(),
        },
        McpConnectorConfig {
            id: "search".into(),
            name: "Search".into(),
            description: "Search MCP slot for Brave, Serper, or SearXNG style connectors.".into(),
            tier: McpTier::Tier2,
            transport: McpTransport::Stdio,
            enabled: false,
            read_only: true,
            command: None,
            args: Vec::new(),
            url: None,
            env: Vec::new(),
            allowed_roots: Vec::new(),
            workspace_root_required: false,
            startup_timeout_ms: default_mcp_timeout_ms(),
        },
        McpConnectorConfig {
            id: "notion".into(),
            name: "Notion".into(),
            description: "Specs and team notes from Notion.".into(),
            tier: McpTier::Tier2,
            transport: McpTransport::Stdio,
            enabled: false,
            read_only: true,
            command: None,
            args: Vec::new(),
            url: None,
            env: Vec::new(),
            allowed_roots: Vec::new(),
            workspace_root_required: false,
            startup_timeout_ms: default_mcp_timeout_ms(),
        },
        McpConnectorConfig {
            id: "slack".into(),
            name: "Slack".into(),
            description: "Channel history and discussions from Slack.".into(),
            tier: McpTier::Tier2,
            transport: McpTransport::Stdio,
            enabled: false,
            read_only: true,
            command: None,
            args: Vec::new(),
            url: None,
            env: Vec::new(),
            allowed_roots: Vec::new(),
            workspace_root_required: false,
            startup_timeout_ms: default_mcp_timeout_ms(),
        },
        McpConnectorConfig {
            id: "linear".into(),
            name: "Linear / Jira".into(),
            description: "Issue-tracking connectors for engineering planning workflows.".into(),
            tier: McpTier::Tier2,
            transport: McpTransport::Stdio,
            enabled: false,
            read_only: true,
            command: None,
            args: Vec::new(),
            url: None,
            env: Vec::new(),
            allowed_roots: Vec::new(),
            workspace_root_required: false,
            startup_timeout_ms: default_mcp_timeout_ms(),
        },
        McpConnectorConfig {
            id: "google_drive".into(),
            name: "Google Drive".into(),
            description: "Shared docs, PDFs, and notes outside the repo.".into(),
            tier: McpTier::Tier2,
            transport: McpTransport::Stdio,
            enabled: false,
            read_only: true,
            command: None,
            args: Vec::new(),
            url: None,
            env: Vec::new(),
            allowed_roots: Vec::new(),
            workspace_root_required: false,
            startup_timeout_ms: default_mcp_timeout_ms(),
        },
        McpConnectorConfig {
            id: "sentry".into(),
            name: "Sentry".into(),
            description: "Issue retrieval and debugging context from Sentry.".into(),
            tier: McpTier::Tier3,
            transport: McpTransport::Stdio,
            enabled: false,
            read_only: true,
            command: None,
            args: Vec::new(),
            url: None,
            env: Vec::new(),
            allowed_roots: Vec::new(),
            workspace_root_required: false,
            startup_timeout_ms: default_mcp_timeout_ms(),
        },
        McpConnectorConfig {
            id: "docker".into(),
            name: "Docker / Kubernetes".into(),
            description: "Runtime and deployment visibility for containerized environments.".into(),
            tier: McpTier::Tier3,
            transport: McpTransport::Stdio,
            enabled: false,
            read_only: true,
            command: None,
            args: Vec::new(),
            url: None,
            env: Vec::new(),
            allowed_roots: Vec::new(),
            workspace_root_required: false,
            startup_timeout_ms: default_mcp_timeout_ms(),
        },
        McpConnectorConfig {
            id: "papers".into(),
            name: "arXiv / PubMed".into(),
            description: "Paper and publication retrieval for research-heavy workflows.".into(),
            tier: McpTier::Tier3,
            transport: McpTransport::Stdio,
            enabled: false,
            read_only: true,
            command: None,
            args: Vec::new(),
            url: None,
            env: Vec::new(),
            allowed_roots: Vec::new(),
            workspace_root_required: false,
            startup_timeout_ms: default_mcp_timeout_ms(),
        },
        McpConnectorConfig {
            id: "memory".into(),
            name: "Memory".into(),
            description: "External MCP memory, separate from Vigilante's local thread history."
                .into(),
            tier: McpTier::Tier3,
            transport: McpTransport::Stdio,
            enabled: false,
            read_only: true,
            command: Some("npx".into()),
            args: vec!["-y".into(), "@modelcontextprotocol/server-memory".into()],
            url: None,
            env: Vec::new(),
            allowed_roots: Vec::new(),
            workspace_root_required: false,
            startup_timeout_ms: default_mcp_timeout_ms(),
        },
        McpConnectorConfig {
            id: "time".into(),
            name: "Time".into(),
            description: "Time and timezone conversion utilities.".into(),
            tier: McpTier::Tier3,
            transport: McpTransport::Stdio,
            enabled: false,
            read_only: true,
            command: Some("npx".into()),
            args: vec!["-y".into(), "@modelcontextprotocol/server-time".into()],
            url: None,
            env: Vec::new(),
            allowed_roots: Vec::new(),
            workspace_root_required: false,
            startup_timeout_ms: default_mcp_timeout_ms(),
        },
    ]
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
            default_model: Some("llama3.2:3b".into()),
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
