use std::path::{Path, PathBuf};
use uuid::Uuid;

use crate::error::VResult;

/// Central registry of all filesystem paths used by the Vigilante data directory.
///
/// All path resolution goes through here — no ad-hoc `PathBuf::from` elsewhere.
/// Constructed once at startup from `app_handle.path().app_local_data_dir()`.
#[derive(Debug, Clone)]
pub struct StoragePaths {
    /// Root of the Vigilante app data directory.
    /// e.g. `~/Library/Application Support/com.vigilante.app`
    pub base: PathBuf,
}

impl StoragePaths {
    pub fn new(base: PathBuf) -> Self {
        Self { base }
    }

    // ── Top-level files ─────────────────────────────────────────────────────

    pub fn settings(&self) -> PathBuf {
        self.base.join("settings.json")
    }

    pub fn runtime_config(&self) -> PathBuf {
        self.base.join("runtime.json")
    }

    pub fn schema_version(&self) -> PathBuf {
        self.base.join("schema-version.json")
    }

    pub fn database(&self) -> PathBuf {
        self.base.join("vigilante.sqlite3")
    }

    pub fn thread_index(&self) -> PathBuf {
        self.base.join("thread-index.json")
    }

    // ── threads/ ─────────────────────────────────────────────────────────────

    pub fn threads_dir(&self) -> PathBuf {
        self.base.join("threads")
    }

    pub fn thread_file(&self, id: &Uuid) -> PathBuf {
        self.threads_dir().join(format!("{}.json", id))
    }

    // ── drafts/ ──────────────────────────────────────────────────────────────

    pub fn drafts_dir(&self) -> PathBuf {
        self.base.join("drafts")
    }

    pub fn draft_file(&self, id: &Uuid) -> PathBuf {
        self.drafts_dir().join(format!("{}.json", id))
    }

    // ── attachments/ ─────────────────────────────────────────────────────────

    pub fn attachments_dir(&self) -> PathBuf {
        self.base.join("attachments")
    }

    pub fn attachment_dir(&self, thread_id: &Uuid, attachment_id: &Uuid) -> PathBuf {
        self.attachments_dir()
            .join(thread_id.to_string())
            .join(attachment_id.to_string())
    }

    pub fn attachment_metadata(&self, thread_id: &Uuid, attachment_id: &Uuid) -> PathBuf {
        self.attachment_dir(thread_id, attachment_id)
            .join("metadata.json")
    }

    pub fn attachment_original(&self, thread_id: &Uuid, attachment_id: &Uuid, ext: &str) -> PathBuf {
        self.attachment_dir(thread_id, attachment_id)
            .join(format!("original.{}", ext))
    }

    // ── activity/ ────────────────────────────────────────────────────────────

    pub fn activity_dir(&self) -> PathBuf {
        self.base.join("activity")
    }

    pub fn activity_log(&self) -> PathBuf {
        self.activity_dir().join("activity.jsonl")
    }

    // ── cache/ ───────────────────────────────────────────────────────────────

    pub fn cache_dir(&self) -> PathBuf {
        self.base.join("cache")
    }

    pub fn workers_dir(&self) -> PathBuf {
        self.base.join("workers")
    }

    pub fn scrapling_worker(&self) -> PathBuf {
        self.workers_dir().join("scrapling_worker.py")
    }

    pub fn web_cache_dir(&self) -> PathBuf {
        self.cache_dir().join("web")
    }

    pub fn runtime_status_cache(&self) -> PathBuf {
        self.cache_dir().join("runtime-status.json")
    }

    pub fn model_inventory_cache(&self) -> PathBuf {
        self.cache_dir().join("model-inventory.json")
    }

    // ── exports/ ─────────────────────────────────────────────────────────────

    pub fn exports_dir(&self) -> PathBuf {
        self.base.join("exports")
    }

    pub fn export_file(&self, id: &Uuid, ext: &str) -> PathBuf {
        self.exports_dir().join(format!("{}.{}", id, ext))
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    /// Ensure every expected top-level directory exists.
    /// Called once at startup by `storage_service::init_storage`.
    pub fn ensure_dirs(&self) -> VResult<()> {
        let threads_dir = self.threads_dir();
        let drafts_dir = self.drafts_dir();
        let attachments_dir = self.attachments_dir();
        let activity_dir = self.activity_dir();
        let cache_dir = self.cache_dir();
        let web_cache_dir = self.web_cache_dir();
        let workers_dir = self.workers_dir();
        let exports_dir = self.exports_dir();
        let dirs = [
            self.base.as_path(),
            threads_dir.as_path(),
            drafts_dir.as_path(),
            attachments_dir.as_path(),
            activity_dir.as_path(),
            cache_dir.as_path(),
            web_cache_dir.as_path(),
            workers_dir.as_path(),
            exports_dir.as_path(),
        ];
        for dir in dirs {
            std::fs::create_dir_all(dir)?;
        }
        Ok(())
    }

    /// Total size of the base directory in bytes (best-effort, ignores unreadable entries).
    pub fn total_size_bytes(&self) -> u64 {
        dir_size_bytes(&self.base)
    }
}

fn dir_size_bytes(path: &Path) -> u64 {
    let Ok(entries) = std::fs::read_dir(path) else {
        return 0;
    };
    entries
        .filter_map(|e| e.ok())
        .map(|e| {
            let meta = e.metadata().ok();
            if let Some(m) = meta {
                if m.is_dir() {
                    dir_size_bytes(&e.path())
                } else {
                    m.len()
                }
            } else {
                0
            }
        })
        .sum()
}
