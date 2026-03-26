use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::models::attachment::ComposerAttachment;
use crate::models::message::{Message, QueryMode, ResearchTrail};
use crate::models::settings::ProviderConfig;

/// A fully persisted research thread — stored at `threads/<id>.json`.
///
/// Contains all messages, citations, and research trail for one conversation.
/// This is the single source of truth for a thread's content.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PersistedThread {
    pub id: Uuid,
    pub title: String,
    /// All messages in chronological order (user and assistant turns interleaved).
    pub messages: Vec<Message>,
    /// Research trail entries — one per assistant turn that used research or deep-research mode.
    pub research_trails: Vec<ResearchTrail>,
    /// Provider configuration captured at thread creation.
    pub provider: ProviderConfig,
    /// Query mode of the first user message (shapes the character of the thread).
    pub initial_mode: QueryMode,
    /// UUIDs of document attachments linked to this thread.
    pub attachment_ids: Vec<Uuid>,
    pub archived: bool,
    pub pinned: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub last_opened_at: Option<DateTime<Utc>>,
}

impl PersistedThread {
    /// Derive a short preview string for the sidebar index.
    /// Uses the last assistant message (first 120 chars), or first user message.
    pub fn preview(&self) -> String {
        let text = self
            .messages
            .iter()
            .rev()
            .find(|m| matches!(m.role, crate::models::message::MessageRole::Assistant))
            .or_else(|| self.messages.first())
            .map(|m| m.content.as_str())
            .unwrap_or("");

        let trimmed = text.trim();
        if trimmed.len() <= 120 {
            trimmed.to_owned()
        } else {
            format!("{}…", &trimmed[..119])
        }
    }
}

/// An ephemeral draft — stored at `drafts/<id>.json`.
///
/// Created when the user starts composing a new query but before sending.
/// Drafts are NEVER shown in the sidebar thread history.
/// Promoted to a `PersistedThread` when the first message is sent.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DraftThread {
    pub id: Uuid,
    /// Current text of the composer textarea.
    pub input_text: String,
    /// Provider selected at draft time.
    pub provider: ProviderConfig,
    /// @mentions or attached context items from the composer.
    pub context_items: Vec<DraftContextItem>,
    #[serde(default)]
    pub attachments: Vec<ComposerAttachment>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl DraftThread {
    pub fn new(provider: ProviderConfig) -> Self {
        let now = Utc::now();
        Self {
            id: Uuid::new_v4(),
            input_text: String::new(),
            provider,
            context_items: Vec::new(),
            attachments: Vec::new(),
            created_at: now,
            updated_at: now,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DraftContextItem {
    pub kind: DraftContextKind,
    pub label: String,
    pub value: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum DraftContextKind {
    FileRef,
    Url,
    ClipboardText,
}
