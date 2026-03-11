use chrono::Utc;
use uuid::Uuid;

use crate::error::{VError, VResult};
use crate::models::thread::PersistedThread;
use crate::storage::json_store::write_json_atomic;
use crate::storage::paths::StoragePaths;

/// Export a thread to Markdown and write to `exports/<id>.md`.
/// Returns the absolute path of the generated file.
pub fn export_thread_markdown(paths: &StoragePaths, thread: &PersistedThread) -> VResult<String> {
    let export_id = Uuid::new_v4();
    let out_path = paths.export_file(&export_id, "md");

    std::fs::create_dir_all(paths.exports_dir())?;

    let mut md = String::new();

    // Header
    md.push_str(&format!("# {}\n\n", thread.title));
    md.push_str(&format!(
        "_Created: {}_\n\n",
        thread.created_at.format("%Y-%m-%d %H:%M UTC")
    ));
    md.push_str("---\n\n");

    // Messages
    for msg in &thread.messages {
        let role_label = match msg.role {
            crate::models::message::MessageRole::User => "**You**",
            crate::models::message::MessageRole::Assistant => "**Vigilante**",
            crate::models::message::MessageRole::System => "**System**",
        };
        md.push_str(&format!("{}\n\n", role_label));
        md.push_str(&msg.content);
        md.push_str("\n\n");

        // Citations
        if !msg.citations.is_empty() {
            md.push_str("**Sources:**\n\n");
            for cite in &msg.citations {
                md.push_str(&format!("{}. [{}]({})\n", cite.index, cite.title, cite.url));
            }
            md.push('\n');
        }

        md.push_str("---\n\n");
    }

    std::fs::write(&out_path, md.as_bytes())?;
    tracing::info!(path = %out_path.display(), "Exported thread as Markdown");
    Ok(out_path.display().to_string())
}

/// Export a thread as a JSON document and write to `exports/<id>.json`.
/// Returns the absolute path of the generated file.
pub fn export_thread_json(paths: &StoragePaths, thread: &PersistedThread) -> VResult<String> {
    let export_id = Uuid::new_v4();
    let out_path = paths.export_file(&export_id, "json");

    std::fs::create_dir_all(paths.exports_dir())?;
    write_json_atomic(&out_path, thread)?;

    tracing::info!(path = %out_path.display(), "Exported thread as JSON");
    Ok(out_path.display().to_string())
}
