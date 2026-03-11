use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// The full sidebar thread index — persisted at `thread-index.json`
/// and mirrored in `AppState.thread_index` (in-memory RwLock).
///
/// Contains only the fields needed to render the sidebar.
/// Full message payloads are NOT stored here.
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct ThreadIndex {
    pub schema_version: u32,
    pub entries: Vec<ThreadIndexEntry>,
    pub updated_at: DateTime<Utc>,
}

impl ThreadIndex {
    pub fn new() -> Self {
        Self {
            schema_version: 1,
            entries: Vec::new(),
            updated_at: Utc::now(),
        }
    }

    /// Insert or replace an entry by id.
    pub fn upsert(&mut self, entry: ThreadIndexEntry) {
        if let Some(pos) = self.entries.iter().position(|e| e.id == entry.id) {
            self.entries[pos] = entry;
        } else {
            self.entries.push(entry);
        }
        self.updated_at = Utc::now();
    }

    /// Remove an entry by id.
    pub fn remove(&mut self, id: &Uuid) {
        self.entries.retain(|e| &e.id != id);
        self.updated_at = Utc::now();
    }

    /// Return non-archived entries sorted by `updated_at` descending.
    pub fn active_sorted(&self) -> Vec<&ThreadIndexEntry> {
        let mut active: Vec<&ThreadIndexEntry> =
            self.entries.iter().filter(|e| !e.archived).collect();
        active.sort_by(|a, b| b.updated_at.cmp(&a.updated_at));
        active
    }

    /// Return archived entries sorted by `updated_at` descending.
    pub fn archived_sorted(&self) -> Vec<&ThreadIndexEntry> {
        let mut archived: Vec<&ThreadIndexEntry> =
            self.entries.iter().filter(|e| e.archived).collect();
        archived.sort_by(|a, b| b.updated_at.cmp(&a.updated_at));
        archived
    }
}

/// Lightweight summary of one thread — all fields needed for the sidebar.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ThreadIndexEntry {
    pub id: Uuid,
    pub title: String,
    /// Short preview of the last assistant message (≤ 120 chars).
    pub preview: String,
    pub message_count: u32,
    pub archived: bool,
    pub pinned: bool,
    pub last_provider_id: Option<String>,
    pub last_model_id: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}
