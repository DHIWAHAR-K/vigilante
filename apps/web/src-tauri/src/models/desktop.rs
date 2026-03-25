use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::models::message::{Citation, Message, QueryMode};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ThreadSummary {
    pub id: Uuid,
    pub workspace_id: Uuid,
    pub title: String,
    pub preview: String,
    pub archived: bool,
    pub pinned: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub last_opened_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ThreadDetail {
    pub thread: ThreadSummary,
    pub messages: Vec<Message>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DesktopQueryRequest {
    pub workspace_id: Uuid,
    pub thread_id: Option<Uuid>,
    pub query: String,
    pub mode: QueryMode,
    pub web_search: bool,
    pub context_items: Vec<DesktopContextItem>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DesktopContextItem {
    pub id: String,
    pub kind: DesktopContextKind,
    pub title: String,
    pub path: Option<String>,
    pub value: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum DesktopContextKind {
    File,
    Directory,
    Thread,
    Url,
    Text,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct QuerySubmission {
    pub thread_id: Uuid,
    pub user_message_id: Uuid,
    pub assistant_message_id: Uuid,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct QueryFinished {
    pub thread_id: Uuid,
    pub assistant_message_id: Uuid,
    pub citations: Vec<Citation>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ResearchProgressEvent {
    pub thread_id: Uuid,
    pub phase: String,
    pub message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchResult {
    pub title: String,
    pub url: String,
    pub snippet: String,
    pub rank: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WebSource {
    pub id: Uuid,
    pub url: String,
    pub title: String,
    pub excerpt: String,
    pub domain: Option<String>,
    pub fetched_at: DateTime<Utc>,
    pub content_path: Option<String>,
    pub content_text: String,
}
