use std::path::Path;

use uuid::Uuid;
use walkdir::WalkDir;

use crate::error::VResult;
use crate::models::workspace::{WorkspaceContextItem, WorkspaceContextKind};
use crate::services::database_service::AppDatabase;

pub fn lookup_context_items(
    db: &AppDatabase,
    workspace_id: Uuid,
    query: &str,
) -> VResult<Vec<WorkspaceContextItem>> {
    let workspace = db.get_workspace(workspace_id)?;
    let needle = query.trim().to_lowercase();
    let mut items = Vec::new();

    if let Some(root_path) = workspace.root_path.as_deref() {
        if !needle.is_empty() && Path::new(root_path).exists() {
            for entry in WalkDir::new(root_path)
                .max_depth(4)
                .into_iter()
                .filter_map(|entry| entry.ok())
                .filter(|entry| entry.depth() > 0)
            {
                let name = entry.file_name().to_string_lossy().to_string();
                if !name.to_lowercase().contains(&needle) {
                    continue;
                }

                let kind = if entry.file_type().is_dir() {
                    WorkspaceContextKind::Directory
                } else {
                    WorkspaceContextKind::File
                };

                items.push(WorkspaceContextItem {
                    id: entry.path().display().to_string(),
                    kind,
                    title: name,
                    path: Some(entry.path().display().to_string()),
                    subtitle: entry
                        .path()
                        .parent()
                        .map(|parent| parent.display().to_string()),
                });

                if items.len() >= 12 {
                    break;
                }
            }
        }
    }

    if !needle.is_empty() {
        for thread in db.list_threads(workspace_id)? {
            if thread.title.to_lowercase().contains(&needle) {
                items.push(WorkspaceContextItem {
                    id: thread.id.to_string(),
                    kind: WorkspaceContextKind::Thread,
                    title: thread.title,
                    path: None,
                    subtitle: Some(thread.preview),
                });
            }

            if items.len() >= 16 {
                break;
            }
        }
    }

    Ok(items)
}
