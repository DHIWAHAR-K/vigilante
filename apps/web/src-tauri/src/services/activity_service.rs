use chrono::Utc;
use uuid::Uuid;

use crate::error::VResult;
use crate::models::activity::ActivityEvent;
use crate::storage::json_store::{append_jsonl, read_jsonl_tail};
use crate::storage::paths::StoragePaths;

/// Append one activity event to `activity/activity.jsonl`.
pub fn log_event(paths: &StoragePaths, event: ActivityEvent) -> VResult<()> {
    append_jsonl(paths.activity_log().as_path(), &event)
}

/// Read the last `limit` events from the activity log, most-recent last.
pub fn list_recent_events(paths: &StoragePaths, limit: usize) -> VResult<Vec<ActivityEvent>> {
    read_jsonl_tail(paths.activity_log().as_path(), limit)
}

// ── Convenience constructors ──────────────────────────────────────────────────

pub fn log_app_started(paths: &StoragePaths, schema_version: u32) -> VResult<()> {
    log_event(
        paths,
        ActivityEvent::AppStarted {
            event_id: Uuid::new_v4(),
            schema_version,
            timestamp: Utc::now(),
        },
    )
}

pub fn log_thread_created(paths: &StoragePaths, thread_id: Uuid, title: String) -> VResult<()> {
    log_event(
        paths,
        ActivityEvent::ThreadCreated {
            event_id: Uuid::new_v4(),
            thread_id,
            title,
            timestamp: Utc::now(),
        },
    )
}

pub fn log_thread_opened(paths: &StoragePaths, thread_id: Uuid) -> VResult<()> {
    log_event(
        paths,
        ActivityEvent::ThreadOpened {
            event_id: Uuid::new_v4(),
            thread_id,
            timestamp: Utc::now(),
        },
    )
}

pub fn log_thread_renamed(
    paths: &StoragePaths,
    thread_id: Uuid,
    old_title: String,
    new_title: String,
) -> VResult<()> {
    log_event(
        paths,
        ActivityEvent::ThreadRenamed {
            event_id: Uuid::new_v4(),
            thread_id,
            old_title,
            new_title,
            timestamp: Utc::now(),
        },
    )
}

pub fn log_thread_archived(paths: &StoragePaths, thread_id: Uuid) -> VResult<()> {
    log_event(
        paths,
        ActivityEvent::ThreadArchived {
            event_id: Uuid::new_v4(),
            thread_id,
            timestamp: Utc::now(),
        },
    )
}

pub fn log_thread_unarchived(paths: &StoragePaths, thread_id: Uuid) -> VResult<()> {
    log_event(
        paths,
        ActivityEvent::ThreadUnarchived {
            event_id: Uuid::new_v4(),
            thread_id,
            timestamp: Utc::now(),
        },
    )
}

pub fn log_thread_deleted(paths: &StoragePaths, thread_id: Uuid) -> VResult<()> {
    log_event(
        paths,
        ActivityEvent::ThreadDeleted {
            event_id: Uuid::new_v4(),
            thread_id,
            timestamp: Utc::now(),
        },
    )
}

pub fn log_message_sent(
    paths: &StoragePaths,
    thread_id: Uuid,
    message_id: Uuid,
    role: &str,
) -> VResult<()> {
    log_event(
        paths,
        ActivityEvent::MessageSent {
            event_id: Uuid::new_v4(),
            thread_id,
            message_id,
            role: role.to_owned(),
            timestamp: Utc::now(),
        },
    )
}

pub fn log_model_changed(
    paths: &StoragePaths,
    from_model: String,
    to_model: String,
) -> VResult<()> {
    log_event(
        paths,
        ActivityEvent::ModelChanged {
            event_id: Uuid::new_v4(),
            from_model,
            to_model,
            timestamp: Utc::now(),
        },
    )
}

pub fn log_export_created(
    paths: &StoragePaths,
    thread_id: Uuid,
    format: &str,
    path: &str,
) -> VResult<()> {
    log_event(
        paths,
        ActivityEvent::ExportCreated {
            event_id: Uuid::new_v4(),
            thread_id,
            format: format.to_owned(),
            path: path.to_owned(),
            timestamp: Utc::now(),
        },
    )
}

pub fn log_runtime_checked(paths: &StoragePaths, status: &str) -> VResult<()> {
    log_event(
        paths,
        ActivityEvent::RuntimeChecked {
            event_id: Uuid::new_v4(),
            status: status.to_owned(),
            timestamp: Utc::now(),
        },
    )
}
