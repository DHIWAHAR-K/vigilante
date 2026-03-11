use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// An append-only event — each entry is one line in `activity/activity.jsonl`.
///
/// Using a tagged enum so each event type carries exactly the fields it needs.
/// The `type` field is the discriminant (camelCase string on the wire).
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum ActivityEvent {
    AppStarted {
        event_id: Uuid,
        schema_version: u32,
        timestamp: DateTime<Utc>,
    },
    ThreadCreated {
        event_id: Uuid,
        thread_id: Uuid,
        title: String,
        timestamp: DateTime<Utc>,
    },
    ThreadOpened {
        event_id: Uuid,
        thread_id: Uuid,
        timestamp: DateTime<Utc>,
    },
    ThreadRenamed {
        event_id: Uuid,
        thread_id: Uuid,
        old_title: String,
        new_title: String,
        timestamp: DateTime<Utc>,
    },
    ThreadArchived {
        event_id: Uuid,
        thread_id: Uuid,
        timestamp: DateTime<Utc>,
    },
    ThreadUnarchived {
        event_id: Uuid,
        thread_id: Uuid,
        timestamp: DateTime<Utc>,
    },
    ThreadDeleted {
        event_id: Uuid,
        thread_id: Uuid,
        timestamp: DateTime<Utc>,
    },
    MessageSent {
        event_id: Uuid,
        thread_id: Uuid,
        message_id: Uuid,
        /// "user" or "assistant"
        role: String,
        timestamp: DateTime<Utc>,
    },
    ModelChanged {
        event_id: Uuid,
        from_model: String,
        to_model: String,
        timestamp: DateTime<Utc>,
    },
    ExportCreated {
        event_id: Uuid,
        thread_id: Uuid,
        /// "markdown" | "json"
        format: String,
        /// Absolute path of the generated file.
        path: String,
        timestamp: DateTime<Utc>,
    },
    SettingsUpdated {
        event_id: Uuid,
        timestamp: DateTime<Utc>,
    },
    RuntimeChecked {
        event_id: Uuid,
        status: String,
        timestamp: DateTime<Utc>,
    },
}

impl ActivityEvent {
    pub fn timestamp(&self) -> &DateTime<Utc> {
        match self {
            Self::AppStarted { timestamp, .. } => timestamp,
            Self::ThreadCreated { timestamp, .. } => timestamp,
            Self::ThreadOpened { timestamp, .. } => timestamp,
            Self::ThreadRenamed { timestamp, .. } => timestamp,
            Self::ThreadArchived { timestamp, .. } => timestamp,
            Self::ThreadUnarchived { timestamp, .. } => timestamp,
            Self::ThreadDeleted { timestamp, .. } => timestamp,
            Self::MessageSent { timestamp, .. } => timestamp,
            Self::ModelChanged { timestamp, .. } => timestamp,
            Self::ExportCreated { timestamp, .. } => timestamp,
            Self::SettingsUpdated { timestamp, .. } => timestamp,
            Self::RuntimeChecked { timestamp, .. } => timestamp,
        }
    }
}
