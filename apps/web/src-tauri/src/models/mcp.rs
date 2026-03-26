use serde::{Deserialize, Serialize};

use crate::models::settings::McpTransport;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct McpContextAction {
    pub connector_id: String,
    pub kind: McpContextActionKind,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum McpContextActionKind {
    FilesystemSearch,
    GitStatus,
    GitLog,
    SqliteSchema,
    PostgresSchema,
    FetchUrl,
    GithubSearchRepositories,
    GithubSearchIssues,
    GithubSearchCode,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct McpConnectorStatus {
    pub connector_id: String,
    pub name: String,
    pub enabled: bool,
    pub transport: McpTransport,
    pub available: bool,
    pub server_name: Option<String>,
    pub server_version: Option<String>,
    pub tools: Vec<McpToolInfo>,
    pub resources: Vec<McpResourceInfo>,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct McpToolInfo {
    pub name: String,
    pub description: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct McpResourceInfo {
    pub uri: String,
    pub name: Option<String>,
    pub description: Option<String>,
    pub mime_type: Option<String>,
}

#[derive(Debug, Clone)]
pub struct McpContextBlock {
    pub title: String,
    pub body: String,
}
