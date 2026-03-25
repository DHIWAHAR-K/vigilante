use chrono::Utc;
use uuid::Uuid;

use crate::error::{VError, VResult};
use crate::models::attachment::ComposerAttachment;
use crate::models::index::ThreadIndexEntry;
use crate::models::message::Message;
use crate::models::settings::ProviderConfig;
use crate::models::thread::{DraftContextItem, DraftThread, PersistedThread};
use crate::services::thread_service::save_thread;
use crate::storage::json_store::{read_json, write_json_atomic};
use crate::storage::paths::StoragePaths;

// ── Lifecycle ─────────────────────────────────────────────────────────────────

/// Create a new ephemeral draft and persist it to `drafts/<id>.json`.
/// The draft does NOT appear in the sidebar thread history.
pub fn create_draft(paths: &StoragePaths, provider: ProviderConfig) -> VResult<DraftThread> {
    let draft = DraftThread::new(provider);
    write_json_atomic(&paths.draft_file(&draft.id), &draft)?;
    tracing::debug!(id = %draft.id, "Draft created");
    Ok(draft)
}

pub fn get_draft(paths: &StoragePaths, id: &Uuid) -> VResult<DraftThread> {
    read_json(&paths.draft_file(id)).map_err(|_| VError::DraftNotFound(id.to_string()))
}

/// Update the composer state for an existing draft (debounced from frontend).
pub fn save_draft(
    paths: &StoragePaths,
    id: &Uuid,
    input_text: String,
    context_items: Vec<DraftContextItem>,
) -> VResult<DraftThread> {
    let mut draft = get_draft(paths, id)?;
    draft.input_text = input_text;
    draft.context_items = context_items;
    draft.updated_at = Utc::now();
    write_json_atomic(&paths.draft_file(id), &draft)?;
    Ok(draft)
}

pub fn replace_draft_attachments(
    paths: &StoragePaths,
    id: &Uuid,
    attachments: Vec<ComposerAttachment>,
) -> VResult<DraftThread> {
    let mut draft = get_draft(paths, id)?;
    draft.attachments = attachments;
    draft.updated_at = Utc::now();
    write_json_atomic(&paths.draft_file(id), &draft)?;
    Ok(draft)
}

/// Permanently remove a draft file. No activity log entry is written.
pub fn discard_draft(paths: &StoragePaths, id: &Uuid) -> VResult<()> {
    let path = paths.draft_file(id);
    if path.exists() {
        std::fs::remove_file(&path)?;
        tracing::debug!(id = %id, "Draft discarded");
    }
    Ok(())
}

// ── Promote to persisted thread ───────────────────────────────────────────────

/// Convert a draft into a full `PersistedThread` when the first message is sent.
///
/// Steps:
///   1. Read the draft file.
///   2. Build a `PersistedThread` using the draft's provider + the caller's first message.
///   3. Derive a title from the first message content.
///   4. Write `threads/<new-id>.json`.
///   5. Delete the draft file.
///   6. Return `(PersistedThread, ThreadIndexEntry)` for the caller to push into AppState.
pub fn promote_draft(
    paths: &StoragePaths,
    draft_id: &Uuid,
    first_message: Message,
) -> VResult<(PersistedThread, ThreadIndexEntry)> {
    let draft: DraftThread = read_json(&paths.draft_file(draft_id))
        .map_err(|_| VError::DraftNotFound(draft_id.to_string()))?;

    let now = Utc::now();
    let title = derive_title(&first_message.content);
    let initial_mode = first_message.mode.clone();

    let thread = PersistedThread {
        id: Uuid::new_v4(),
        title,
        messages: vec![first_message],
        research_trails: Vec::new(),
        provider: draft.provider,
        initial_mode,
        attachment_ids: Vec::new(),
        archived: false,
        pinned: false,
        created_at: now,
        updated_at: now,
        last_opened_at: Some(now),
    };

    let entry = save_thread(paths, &thread)?;

    // Clean up the draft file (best-effort — don't fail if already gone).
    let _ = discard_draft(paths, draft_id);

    tracing::info!(thread_id = %thread.id, title = %thread.title, "Draft promoted to thread");
    Ok((thread, entry))
}

// ── Utilities ─────────────────────────────────────────────────────────────────

/// Produce a short title from the first message content.
/// Takes up to the first sentence or 60 characters, whichever is shorter.
fn derive_title(content: &str) -> String {
    let trimmed = content.trim();
    let end = trimmed.find(['.', '!', '?', '\n']).unwrap_or(trimmed.len());
    let candidate = trimmed[..end].trim();
    if candidate.len() <= 60 {
        candidate.to_owned()
    } else {
        format!("{}…", &candidate[..59])
    }
}

/// List all draft IDs currently on disk (for cleanup on startup if needed).
pub fn list_draft_ids(paths: &StoragePaths) -> Vec<Uuid> {
    std::fs::read_dir(paths.drafts_dir())
        .into_iter()
        .flatten()
        .filter_map(|e| e.ok())
        .filter_map(|e| {
            let p = e.path();
            if p.extension()?.to_str() == Some("json") {
                p.file_stem()?.to_str()?.parse().ok()
            } else {
                None
            }
        })
        .collect()
}
