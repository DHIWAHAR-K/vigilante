use std::path::Path;
use std::sync::Arc;

use chrono::{DateTime, Utc};
use parking_lot::Mutex;
use rusqlite::{params, Connection, OptionalExtension, Row};
use uuid::Uuid;

use crate::error::{VError, VResult};
use crate::models::desktop::{ThreadDetail, ThreadSummary, WebSource};
use crate::models::message::{Citation, Message, MessageRole, ModelUsed, QueryMode};
use crate::models::runtime::{ModelInstallJob, ModelInstallStatus};
use crate::models::settings::ProviderConfig;
use crate::models::thread::PersistedThread;
use crate::models::workspace::{CreateWorkspaceRequest, Workspace};
use crate::storage::json_store::read_json;
use crate::storage::paths::StoragePaths;

#[derive(Clone)]
pub struct AppDatabase {
    conn: Arc<Mutex<Connection>>,
}

impl AppDatabase {
    pub fn open(path: &Path) -> VResult<Self> {
        let conn = Connection::open(path)?;
        conn.pragma_update(None, "foreign_keys", "ON")?;
        conn.pragma_update(None, "journal_mode", "WAL")?;

        let db = Self {
            conn: Arc::new(Mutex::new(conn)),
        };
        db.init_schema()?;
        Ok(db)
    }

    pub fn init_schema(&self) -> VResult<()> {
        self.with_conn(|conn| {
            conn.execute_batch(
                r#"
                CREATE TABLE IF NOT EXISTS workspaces (
                    id            TEXT PRIMARY KEY,
                    name          TEXT NOT NULL,
                    root_path     TEXT,
                    is_active     INTEGER NOT NULL DEFAULT 0,
                    created_at    TEXT NOT NULL,
                    updated_at    TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS threads (
                    id               TEXT PRIMARY KEY,
                    workspace_id     TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
                    title            TEXT NOT NULL,
                    preview          TEXT NOT NULL DEFAULT '',
                    archived         INTEGER NOT NULL DEFAULT 0,
                    pinned           INTEGER NOT NULL DEFAULT 0,
                    initial_mode     TEXT NOT NULL,
                    created_at       TEXT NOT NULL,
                    updated_at       TEXT NOT NULL,
                    last_opened_at   TEXT
                );

                CREATE TABLE IF NOT EXISTS messages (
                    id               TEXT PRIMARY KEY,
                    thread_id        TEXT NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
                    role             TEXT NOT NULL,
                    content          TEXT NOT NULL,
                    mode             TEXT NOT NULL,
                    follow_ups_json  TEXT NOT NULL DEFAULT '[]',
                    provider_id      TEXT,
                    model_id         TEXT,
                    tokens_in        INTEGER,
                    tokens_out       INTEGER,
                    latency_ms       INTEGER,
                    is_complete      INTEGER NOT NULL DEFAULT 1,
                    created_at       TEXT NOT NULL,
                    updated_at       TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS citations (
                    id           TEXT PRIMARY KEY,
                    message_id   TEXT NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
                    citation_idx INTEGER NOT NULL,
                    title        TEXT NOT NULL,
                    url          TEXT NOT NULL,
                    favicon_url  TEXT,
                    excerpt      TEXT,
                    domain       TEXT
                );

                CREATE TABLE IF NOT EXISTS web_sources (
                    id            TEXT PRIMARY KEY,
                    thread_id     TEXT REFERENCES threads(id) ON DELETE CASCADE,
                    message_id    TEXT REFERENCES messages(id) ON DELETE CASCADE,
                    url           TEXT NOT NULL,
                    title         TEXT NOT NULL,
                    excerpt       TEXT NOT NULL,
                    domain        TEXT,
                    fetched_at    TEXT NOT NULL,
                    content_path  TEXT,
                    content_text  TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS model_install_jobs (
                    id                TEXT PRIMARY KEY,
                    model_id          TEXT NOT NULL,
                    status            TEXT NOT NULL,
                    progress_percent  INTEGER NOT NULL DEFAULT 0,
                    downloaded_bytes  INTEGER,
                    total_bytes       INTEGER,
                    message           TEXT,
                    error             TEXT,
                    created_at        TEXT NOT NULL,
                    updated_at        TEXT NOT NULL,
                    completed_at      TEXT
                );

                CREATE INDEX IF NOT EXISTS idx_workspaces_active ON workspaces(is_active);
                CREATE INDEX IF NOT EXISTS idx_threads_workspace_updated ON threads(workspace_id, updated_at DESC);
                CREATE INDEX IF NOT EXISTS idx_messages_thread_created ON messages(thread_id, created_at ASC);
                CREATE INDEX IF NOT EXISTS idx_citations_message ON citations(message_id, citation_idx ASC);
                CREATE INDEX IF NOT EXISTS idx_model_install_jobs_model_status ON model_install_jobs(model_id, status, updated_at DESC);
                "#,
            )
        })?;

        self.ensure_default_workspace()?;
        Ok(())
    }

    pub fn import_legacy_json_threads(&self, paths: &StoragePaths) -> VResult<()> {
        let has_threads = self.with_conn(|conn| {
            conn.query_row("SELECT EXISTS(SELECT 1 FROM threads LIMIT 1)", [], |row| {
                row.get::<_, i64>(0)
            })
        })?;
        if has_threads > 0 {
            return Ok(());
        }

        let workspace = self.get_active_workspace()?;
        let Ok(entries) = std::fs::read_dir(paths.threads_dir()) else {
            return Ok(());
        };

        for entry in entries.filter_map(|entry| entry.ok()) {
            let path = entry.path();
            if path.extension().and_then(|ext| ext.to_str()) != Some("json") {
                continue;
            }

            let Ok(thread) = read_json::<PersistedThread>(&path) else {
                continue;
            };

            let thread_summary = self.upsert_imported_thread(&workspace.id, &thread)?;
            for message in thread.messages {
                self.insert_message(&thread_summary.id, &message)?;
            }
        }

        Ok(())
    }

    pub fn list_workspaces(&self) -> VResult<Vec<Workspace>> {
        self.with_conn(|conn| {
            let mut stmt = conn.prepare(
                "SELECT id, name, root_path, is_active, created_at, updated_at
                 FROM workspaces
                 ORDER BY is_active DESC, updated_at DESC",
            )?;
            let rows = stmt.query_map([], workspace_from_row)?;
            rows.collect()
        })
    }

    pub fn create_workspace(&self, request: CreateWorkspaceRequest) -> VResult<Workspace> {
        let id = Uuid::new_v4();
        let now = now_string();
        self.with_conn(|conn| {
            conn.execute("UPDATE workspaces SET is_active = 0", [])?;
            conn.execute(
                "INSERT INTO workspaces (id, name, root_path, is_active, created_at, updated_at)
                 VALUES (?1, ?2, ?3, 1, ?4, ?4)",
                params![id.to_string(), request.name.trim(), request.root_path, now],
            )?;
            Ok(())
        })?;
        self.get_workspace(id)
    }

    pub fn get_active_workspace(&self) -> VResult<Workspace> {
        let workspace = self.with_conn(|conn| {
            conn.query_row(
                "SELECT id, name, root_path, is_active, created_at, updated_at
                 FROM workspaces
                 WHERE is_active = 1
                 LIMIT 1",
                [],
                workspace_from_row,
            )
            .optional()
        })?;

        match workspace {
            Some(workspace) => Ok(workspace),
            None => {
                self.ensure_default_workspace()?;
                self.get_active_workspace()
            }
        }
    }

    pub fn set_active_workspace(&self, id: Uuid) -> VResult<Workspace> {
        self.with_conn(|conn| {
            conn.execute("UPDATE workspaces SET is_active = 0", [])?;
            conn.execute(
                "UPDATE workspaces SET is_active = 1, updated_at = ?2 WHERE id = ?1",
                params![id.to_string(), now_string()],
            )?;
            Ok(())
        })?;
        self.get_workspace(id)
    }

    pub fn get_workspace(&self, id: Uuid) -> VResult<Workspace> {
        let workspace = self.with_conn(|conn| {
            conn.query_row(
                "SELECT id, name, root_path, is_active, created_at, updated_at
                 FROM workspaces
                 WHERE id = ?1
                 LIMIT 1",
                params![id.to_string()],
                workspace_from_row,
            )
            .optional()
        })?;

        workspace.ok_or_else(|| VError::WorkspaceNotFound(id.to_string()))
    }

    pub fn list_threads(&self, workspace_id: Uuid) -> VResult<Vec<ThreadSummary>> {
        self.with_conn(|conn| {
            let mut stmt = conn.prepare(
                "SELECT id, workspace_id, title, preview, archived, pinned, created_at, updated_at, last_opened_at
                 FROM threads
                 WHERE workspace_id = ?1 AND archived = 0
                 ORDER BY updated_at DESC",
            )?;
            let rows = stmt.query_map(params![workspace_id.to_string()], thread_summary_from_row)?;
            rows.collect()
        })
    }

    pub fn open_thread(&self, thread_id: Uuid) -> VResult<ThreadDetail> {
        let thread = self.get_thread(thread_id)?;
        let messages = self.list_messages(thread_id)?;
        self.with_conn(|conn| {
            conn.execute(
                "UPDATE threads SET last_opened_at = ?2 WHERE id = ?1",
                params![thread_id.to_string(), now_string()],
            )
        })?;

        Ok(ThreadDetail {
            thread,
            messages,
            attachments: Vec::new(),
        })
    }

    pub fn create_thread(
        &self,
        workspace_id: Uuid,
        query: &str,
        mode: QueryMode,
    ) -> VResult<ThreadSummary> {
        let id = Uuid::new_v4();
        self.create_thread_with_id(id, workspace_id, query, mode)
    }

    pub fn create_thread_with_id(
        &self,
        id: Uuid,
        workspace_id: Uuid,
        query: &str,
        mode: QueryMode,
    ) -> VResult<ThreadSummary> {
        let now = now_string();
        let title = derive_title(query);
        self.with_conn(|conn| {
            conn.execute(
                "INSERT INTO threads (id, workspace_id, title, preview, archived, pinned, initial_mode, created_at, updated_at, last_opened_at)
                 VALUES (?1, ?2, ?3, '', 0, 0, ?4, ?5, ?5, ?5)",
                params![id.to_string(), workspace_id.to_string(), title, query_mode_to_str(&mode), now],
            )?;
            Ok(())
        })?;
        self.get_thread(id)
    }

    pub fn delete_thread(&self, thread_id: Uuid) -> VResult<()> {
        self.with_conn(|conn| {
            conn.execute(
                "DELETE FROM threads WHERE id = ?1",
                params![thread_id.to_string()],
            )?;
            Ok(())
        })
    }

    pub fn archive_thread(&self, thread_id: Uuid) -> VResult<()> {
        self.with_conn(|conn| {
            conn.execute(
                "UPDATE threads SET archived = 1, updated_at = ?2 WHERE id = ?1",
                params![thread_id.to_string(), now_string()],
            )?;
            Ok(())
        })
    }

    pub fn insert_message(&self, thread_id: &Uuid, message: &Message) -> VResult<()> {
        self.with_conn(|conn| {
            conn.execute(
                "INSERT OR REPLACE INTO messages
                 (id, thread_id, role, content, mode, follow_ups_json, provider_id, model_id, tokens_in, tokens_out, latency_ms, is_complete, created_at, updated_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14)",
                params![
                    message.id.to_string(),
                    thread_id.to_string(),
                    role_to_str(&message.role),
                    message.content,
                    query_mode_to_str(&message.mode),
                    serde_json::to_string(&message.follow_ups).unwrap_or_else(|_| "[]".into()),
                    message.model_used.as_ref().map(|model| model.provider_id.clone()),
                    message.model_used.as_ref().map(|model| model.model_id.clone()),
                    message.model_used.as_ref().and_then(|model| model.tokens_in.map(i64::from)),
                    message.model_used.as_ref().and_then(|model| model.tokens_out.map(i64::from)),
                    message.model_used.as_ref().and_then(|model| model.latency_ms.map(i64::from)),
                    if message.is_complete { 1 } else { 0 },
                    message.created_at.to_rfc3339(),
                    message.updated_at.to_rfc3339(),
                ],
            )?;
            conn.execute(
                "UPDATE threads SET preview = ?2, updated_at = ?3 WHERE id = ?1",
                params![thread_id.to_string(), preview_text(&message.content), now_string()],
            )?;
            Ok(())
        })?;

        self.replace_citations(message.id, &message.citations)
    }

    pub fn update_assistant_message(
        &self,
        thread_id: Uuid,
        message_id: Uuid,
        content: String,
        is_complete: bool,
        model_used: Option<ModelUsed>,
    ) -> VResult<()> {
        self.with_conn(|conn| {
            conn.execute(
                "UPDATE messages
                 SET content = ?3,
                     is_complete = ?4,
                     provider_id = ?5,
                     model_id = ?6,
                     tokens_in = ?7,
                     tokens_out = ?8,
                     latency_ms = ?9,
                     updated_at = ?10
                 WHERE id = ?1 AND thread_id = ?2",
                params![
                    message_id.to_string(),
                    thread_id.to_string(),
                    content,
                    if is_complete { 1 } else { 0 },
                    model_used.as_ref().map(|model| model.provider_id.clone()),
                    model_used.as_ref().map(|model| model.model_id.clone()),
                    model_used
                        .as_ref()
                        .and_then(|model| model.tokens_in.map(i64::from)),
                    model_used
                        .as_ref()
                        .and_then(|model| model.tokens_out.map(i64::from)),
                    model_used
                        .as_ref()
                        .and_then(|model| model.latency_ms.map(i64::from)),
                    now_string(),
                ],
            )?;
            conn.execute(
                "UPDATE threads SET preview = ?2, updated_at = ?3 WHERE id = ?1",
                params![thread_id.to_string(), preview_text(&content), now_string()],
            )?;
            Ok(())
        })
    }

    pub fn replace_citations(&self, message_id: Uuid, citations: &[Citation]) -> VResult<()> {
        self.with_conn(|conn| {
            conn.execute("DELETE FROM citations WHERE message_id = ?1", params![message_id.to_string()])?;

            for citation in citations {
                conn.execute(
                    "INSERT INTO citations (id, message_id, citation_idx, title, url, favicon_url, excerpt, domain)
                     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
                    params![
                        citation.id.to_string(),
                        message_id.to_string(),
                        i64::from(citation.index),
                        citation.title,
                        citation.url,
                        citation.favicon_url,
                        citation.excerpt,
                        citation.domain,
                    ],
                )?;
            }

            Ok(())
        })
    }

    pub fn list_messages(&self, thread_id: Uuid) -> VResult<Vec<Message>> {
        self.with_conn(|conn| {
            let mut stmt = conn.prepare(
                "SELECT id, role, content, mode, follow_ups_json, provider_id, model_id, tokens_in, tokens_out, latency_ms, is_complete, created_at, updated_at
                 FROM messages
                 WHERE thread_id = ?1
                 ORDER BY created_at ASC",
            )?;
            let rows = stmt.query_map(params![thread_id.to_string()], message_from_row)?;
            rows.collect::<rusqlite::Result<Vec<_>>>()
        })?
        .into_iter()
        .map(|mut message| {
            message.citations = self.list_citations(message.id)?;
            Ok(message)
        })
        .collect()
    }

    pub fn save_web_sources(
        &self,
        thread_id: Uuid,
        message_id: Uuid,
        sources: &[WebSource],
    ) -> VResult<()> {
        self.with_conn(|conn| {
            conn.execute(
                "DELETE FROM web_sources WHERE message_id = ?1",
                params![message_id.to_string()],
            )?;

            for source in sources {
                conn.execute(
                    "INSERT OR REPLACE INTO web_sources
                     (id, thread_id, message_id, url, title, excerpt, domain, fetched_at, content_path, content_text)
                     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
                    params![
                        source.id.to_string(),
                        thread_id.to_string(),
                        message_id.to_string(),
                        source.url,
                        source.title,
                        source.excerpt,
                        source.domain,
                        source.fetched_at.to_rfc3339(),
                        source.content_path,
                        source.content_text,
                    ],
                )?;
            }

            Ok(())
        })
    }

    pub fn list_web_sources(&self, thread_id: Uuid) -> VResult<Vec<WebSource>> {
        self.with_conn(|conn| {
            let mut stmt = conn.prepare(
                "SELECT id, url, title, excerpt, domain, fetched_at, content_path, content_text
                 FROM web_sources
                 WHERE thread_id = ?1
                 ORDER BY fetched_at DESC",
            )?;
            let rows = stmt.query_map(params![thread_id.to_string()], |row| {
                Ok(WebSource {
                    id: parse_uuid(row.get::<_, String>(0)?).map_err(to_sql_error)?,
                    url: row.get(1)?,
                    title: row.get(2)?,
                    excerpt: row.get(3)?,
                    domain: row.get(4)?,
                    fetched_at: parse_datetime(&row.get::<_, String>(5)?).map_err(to_sql_error)?,
                    content_path: row.get(6)?,
                    content_text: row.get(7)?,
                })
            })?;
            rows.collect::<rusqlite::Result<Vec<_>>>()
        })
    }

    pub fn upsert_model_install_job(&self, job: &ModelInstallJob) -> VResult<()> {
        self.with_conn(|conn| {
            conn.execute(
                "INSERT INTO model_install_jobs
                 (id, model_id, status, progress_percent, downloaded_bytes, total_bytes, message, error, created_at, updated_at, completed_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)
                 ON CONFLICT(id) DO UPDATE SET
                    model_id = excluded.model_id,
                    status = excluded.status,
                    progress_percent = excluded.progress_percent,
                    downloaded_bytes = excluded.downloaded_bytes,
                    total_bytes = excluded.total_bytes,
                    message = excluded.message,
                    error = excluded.error,
                    updated_at = excluded.updated_at,
                    completed_at = excluded.completed_at",
                params![
                    job.id.to_string(),
                    job.model_id,
                    model_install_status_to_str(&job.status),
                    i64::from(job.progress_percent),
                    job.downloaded_bytes.map(|value| value.min(i64::MAX as u64) as i64),
                    job.total_bytes.map(|value| value.min(i64::MAX as u64) as i64),
                    job.message,
                    job.error,
                    job.created_at.to_rfc3339(),
                    job.updated_at.to_rfc3339(),
                    job.completed_at.map(|value| value.to_rfc3339()),
                ],
            )?;
            Ok(())
        })
    }

    pub fn get_model_install_job(&self, job_id: Uuid) -> VResult<Option<ModelInstallJob>> {
        self.with_conn(|conn| {
            conn.query_row(
                "SELECT id, model_id, status, progress_percent, downloaded_bytes, total_bytes, message, error, created_at, updated_at, completed_at
                 FROM model_install_jobs
                 WHERE id = ?1
                 LIMIT 1",
                params![job_id.to_string()],
                model_install_job_from_row,
            )
            .optional()
        })
    }

    pub fn get_active_model_install_job(&self, model_id: &str) -> VResult<Option<ModelInstallJob>> {
        self.with_conn(|conn| {
            conn.query_row(
                "SELECT id, model_id, status, progress_percent, downloaded_bytes, total_bytes, message, error, created_at, updated_at, completed_at
                 FROM model_install_jobs
                 WHERE model_id = ?1
                   AND status IN ('queued', 'downloading', 'verifying')
                 ORDER BY updated_at DESC
                 LIMIT 1",
                params![model_id],
                model_install_job_from_row,
            )
            .optional()
        })
    }

    pub fn list_active_model_install_jobs(&self) -> VResult<Vec<ModelInstallJob>> {
        self.with_conn(|conn| {
            let mut stmt = conn.prepare(
                "SELECT id, model_id, status, progress_percent, downloaded_bytes, total_bytes, message, error, created_at, updated_at, completed_at
                 FROM model_install_jobs
                 WHERE status IN ('queued', 'downloading', 'verifying')
                 ORDER BY updated_at DESC",
            )?;
            let rows = stmt.query_map([], model_install_job_from_row)?;
            rows.collect::<rusqlite::Result<Vec<_>>>()
        })
    }

    pub fn build_persisted_thread(
        &self,
        thread_id: Uuid,
        provider: ProviderConfig,
    ) -> VResult<PersistedThread> {
        let thread = self.get_thread(thread_id)?;
        let messages = self.list_messages(thread_id)?;
        let initial_mode = self.get_thread_initial_mode(thread_id)?;

        Ok(PersistedThread {
            id: thread.id,
            title: thread.title,
            messages,
            research_trails: Vec::new(),
            provider,
            initial_mode,
            attachment_ids: Vec::new(),
            archived: thread.archived,
            pinned: thread.pinned,
            created_at: thread.created_at,
            updated_at: thread.updated_at,
            last_opened_at: thread.last_opened_at,
        })
    }

    fn list_citations(&self, message_id: Uuid) -> VResult<Vec<Citation>> {
        self.with_conn(|conn| {
            let mut stmt = conn.prepare(
                "SELECT id, citation_idx, title, url, favicon_url, excerpt, domain
                 FROM citations
                 WHERE message_id = ?1
                 ORDER BY citation_idx ASC",
            )?;
            let rows = stmt.query_map(params![message_id.to_string()], |row| {
                Ok(Citation {
                    id: parse_uuid(row.get::<_, String>(0)?).map_err(to_sql_error)?,
                    index: row.get::<_, i64>(1)? as u32,
                    title: row.get(2)?,
                    url: row.get(3)?,
                    favicon_url: row.get(4)?,
                    excerpt: row.get(5)?,
                    domain: row.get(6)?,
                })
            })?;
            rows.collect()
        })
    }

    fn get_thread(&self, id: Uuid) -> VResult<ThreadSummary> {
        let thread = self.with_conn(|conn| {
            conn.query_row(
                "SELECT id, workspace_id, title, preview, archived, pinned, created_at, updated_at, last_opened_at
                 FROM threads
                 WHERE id = ?1
                 LIMIT 1",
                params![id.to_string()],
                thread_summary_from_row,
            )
            .optional()
        })?;

        thread.ok_or_else(|| VError::ThreadNotFound(id.to_string()))
    }

    fn get_thread_initial_mode(&self, id: Uuid) -> VResult<QueryMode> {
        let mode = self.with_conn(|conn| {
            conn.query_row(
                "SELECT initial_mode
                 FROM threads
                 WHERE id = ?1
                 LIMIT 1",
                params![id.to_string()],
                |row| row.get::<_, String>(0),
            )
            .optional()
        })?;

        let Some(mode) = mode else {
            return Err(VError::ThreadNotFound(id.to_string()));
        };

        query_mode_from_str(&mode).map_err(VError::Other)
    }

    fn upsert_imported_thread(
        &self,
        workspace_id: &Uuid,
        thread: &PersistedThread,
    ) -> VResult<ThreadSummary> {
        self.with_conn(|conn| {
            conn.execute(
                "INSERT OR REPLACE INTO threads
                 (id, workspace_id, title, preview, archived, pinned, initial_mode, created_at, updated_at, last_opened_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
                params![
                    thread.id.to_string(),
                    workspace_id.to_string(),
                    thread.title,
                    thread.preview(),
                    if thread.archived { 1 } else { 0 },
                    if thread.pinned { 1 } else { 0 },
                    query_mode_to_str(&thread.initial_mode),
                    thread.created_at.to_rfc3339(),
                    thread.updated_at.to_rfc3339(),
                    thread.last_opened_at.map(|dt| dt.to_rfc3339()),
                ],
            )?;
            Ok(())
        })?;

        self.get_thread(thread.id)
    }

    fn ensure_default_workspace(&self) -> VResult<()> {
        let count = self.with_conn(|conn| {
            conn.query_row("SELECT COUNT(*) FROM workspaces", [], |row| {
                row.get::<_, i64>(0)
            })
        })?;
        if count > 0 {
            return Ok(());
        }

        let now = now_string();
        let id = Uuid::new_v4();
        self.with_conn(|conn| {
            conn.execute(
                "INSERT INTO workspaces (id, name, root_path, is_active, created_at, updated_at)
                 VALUES (?1, 'Local', NULL, 1, ?2, ?2)",
                params![id.to_string(), now],
            )?;
            Ok(())
        })
    }

    fn with_conn<T, F>(&self, f: F) -> VResult<T>
    where
        F: FnOnce(&Connection) -> rusqlite::Result<T>,
    {
        let conn = self.conn.lock();
        Ok(f(&conn)?)
    }
}

fn workspace_from_row(row: &Row<'_>) -> rusqlite::Result<Workspace> {
    Ok(Workspace {
        id: parse_uuid(row.get::<_, String>(0)?).map_err(to_sql_error)?,
        name: row.get(1)?,
        root_path: row.get(2)?,
        is_active: row.get::<_, i64>(3)? == 1,
        created_at: parse_datetime(&row.get::<_, String>(4)?).map_err(to_sql_error)?,
        updated_at: parse_datetime(&row.get::<_, String>(5)?).map_err(to_sql_error)?,
    })
}

fn thread_summary_from_row(row: &Row<'_>) -> rusqlite::Result<ThreadSummary> {
    Ok(ThreadSummary {
        id: parse_uuid(row.get::<_, String>(0)?).map_err(to_sql_error)?,
        workspace_id: parse_uuid(row.get::<_, String>(1)?).map_err(to_sql_error)?,
        title: row.get(2)?,
        preview: row.get(3)?,
        archived: row.get::<_, i64>(4)? == 1,
        pinned: row.get::<_, i64>(5)? == 1,
        created_at: parse_datetime(&row.get::<_, String>(6)?).map_err(to_sql_error)?,
        updated_at: parse_datetime(&row.get::<_, String>(7)?).map_err(to_sql_error)?,
        last_opened_at: row
            .get::<_, Option<String>>(8)?
            .map(|value| parse_datetime(&value))
            .transpose()
            .map_err(to_sql_error)?,
    })
}

fn message_from_row(row: &Row<'_>) -> rusqlite::Result<Message> {
    let provider_id: Option<String> = row.get(5)?;
    let model_id: Option<String> = row.get(6)?;
    let model_used = if let (Some(provider_id), Some(model_id)) = (provider_id, model_id) {
        Some(ModelUsed {
            provider_id,
            model_id,
            tokens_in: row.get::<_, Option<i64>>(7)?.map(|value| value as u32),
            tokens_out: row.get::<_, Option<i64>>(8)?.map(|value| value as u32),
            latency_ms: row.get::<_, Option<i64>>(9)?.map(|value| value as u32),
        })
    } else {
        None
    };

    let follow_ups_json: String = row.get(4)?;
    let follow_ups = serde_json::from_str(&follow_ups_json).unwrap_or_default();

    Ok(Message {
        id: parse_uuid(row.get::<_, String>(0)?).map_err(to_sql_error)?,
        role: role_from_str(&row.get::<_, String>(1)?).map_err(to_sql_error)?,
        content: row.get(2)?,
        citations: Vec::new(),
        follow_ups,
        mode: query_mode_from_str(&row.get::<_, String>(3)?).map_err(to_sql_error)?,
        model_used,
        is_complete: row.get::<_, i64>(10)? == 1,
        created_at: parse_datetime(&row.get::<_, String>(11)?).map_err(to_sql_error)?,
        updated_at: parse_datetime(&row.get::<_, String>(12)?).map_err(to_sql_error)?,
    })
}

fn model_install_job_from_row(row: &Row<'_>) -> rusqlite::Result<ModelInstallJob> {
    Ok(ModelInstallJob {
        id: parse_uuid(row.get::<_, String>(0)?).map_err(to_sql_error)?,
        model_id: row.get(1)?,
        status: model_install_status_from_str(&row.get::<_, String>(2)?).map_err(to_sql_error)?,
        progress_percent: row.get::<_, i64>(3)?.clamp(0, 100) as u8,
        downloaded_bytes: row
            .get::<_, Option<i64>>(4)?
            .map(|value| value.max(0) as u64),
        total_bytes: row
            .get::<_, Option<i64>>(5)?
            .map(|value| value.max(0) as u64),
        message: row.get(6)?,
        error: row.get(7)?,
        created_at: parse_datetime(&row.get::<_, String>(8)?).map_err(to_sql_error)?,
        updated_at: parse_datetime(&row.get::<_, String>(9)?).map_err(to_sql_error)?,
        completed_at: row
            .get::<_, Option<String>>(10)?
            .map(|value| parse_datetime(&value))
            .transpose()
            .map_err(to_sql_error)?,
    })
}

fn parse_uuid(value: String) -> Result<Uuid, String> {
    Uuid::parse_str(&value).map_err(|err| err.to_string())
}

fn parse_datetime(value: &str) -> Result<DateTime<Utc>, String> {
    DateTime::parse_from_rfc3339(value)
        .map(|dt| dt.with_timezone(&Utc))
        .map_err(|err| err.to_string())
}

fn to_sql_error(err: String) -> rusqlite::Error {
    rusqlite::Error::FromSqlConversionFailure(
        0,
        rusqlite::types::Type::Text,
        Box::<dyn std::error::Error + Send + Sync>::from(err),
    )
}

fn role_to_str(role: &MessageRole) -> &'static str {
    match role {
        MessageRole::User => "user",
        MessageRole::Assistant => "assistant",
        MessageRole::System => "system",
    }
}

fn role_from_str(value: &str) -> Result<MessageRole, String> {
    match value {
        "user" => Ok(MessageRole::User),
        "assistant" => Ok(MessageRole::Assistant),
        "system" => Ok(MessageRole::System),
        other => Err(format!("Unknown message role: {other}")),
    }
}

fn query_mode_to_str(mode: &QueryMode) -> &'static str {
    match mode {
        QueryMode::Ask => "ask",
        QueryMode::Research => "research",
        QueryMode::DeepResearch => "deep_research",
        QueryMode::Rag => "rag",
    }
}

fn query_mode_from_str(value: &str) -> Result<QueryMode, String> {
    match value {
        "ask" => Ok(QueryMode::Ask),
        "research" => Ok(QueryMode::Research),
        "deep_research" => Ok(QueryMode::DeepResearch),
        "rag" => Ok(QueryMode::Rag),
        other => Err(format!("Unknown query mode: {other}")),
    }
}

fn model_install_status_to_str(status: &ModelInstallStatus) -> &'static str {
    match status {
        ModelInstallStatus::Queued => "queued",
        ModelInstallStatus::Downloading => "downloading",
        ModelInstallStatus::Verifying => "verifying",
        ModelInstallStatus::Complete => "complete",
        ModelInstallStatus::Failed => "failed",
        ModelInstallStatus::Cancelled => "cancelled",
    }
}

fn model_install_status_from_str(value: &str) -> Result<ModelInstallStatus, String> {
    match value {
        "queued" => Ok(ModelInstallStatus::Queued),
        "downloading" => Ok(ModelInstallStatus::Downloading),
        "verifying" => Ok(ModelInstallStatus::Verifying),
        "complete" => Ok(ModelInstallStatus::Complete),
        "failed" => Ok(ModelInstallStatus::Failed),
        "cancelled" => Ok(ModelInstallStatus::Cancelled),
        other => Err(format!("Unknown model install status: {other}")),
    }
}

fn now_string() -> String {
    Utc::now().to_rfc3339()
}

fn derive_title(query: &str) -> String {
    let trimmed = query.trim();
    let first = trimmed
        .split(['.', '!', '?', '\n'])
        .next()
        .unwrap_or(trimmed)
        .trim();
    if first.len() <= 60 {
        first.to_string()
    } else {
        format!("{}…", &first[..59])
    }
}

fn preview_text(content: &str) -> String {
    let trimmed = content.trim();
    if trimmed.len() <= 140 {
        trimmed.to_string()
    } else {
        format!("{}…", &trimmed[..139])
    }
}
