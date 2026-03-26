use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// Metadata for one attachment — stored at `attachments/<thread-id>/<attachment-id>/metadata.json`.
///
/// The actual file bytes live next to this file as `original.<ext>`.
/// Optional derived assets (`extracted.txt`, `preview.png`) live in the same directory.
///
/// The app ALWAYS keeps its own copy of the original file so it does not depend
/// on the source path remaining valid.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AttachmentMetadata {
    pub id: Uuid,
    pub thread_id: Uuid,
    /// User-visible name (shown in UI).
    pub display_name: String,
    /// Original filename as provided by the OS.
    pub original_filename: String,
    /// File extension without leading dot, e.g. "pdf", "txt", "png".
    pub extension: String,
    pub mime_type: String,
    #[serde(default)]
    pub kind: AttachmentKind,
    pub size_bytes: u64,
    /// Whether `extracted.txt` is present alongside this metadata.
    pub has_extracted_text: bool,
    /// Whether `preview.png` is present alongside this metadata.
    pub has_preview: bool,
    pub created_at: DateTime<Utc>,
}

impl AttachmentMetadata {
    /// Filename for the original copy inside the attachment directory.
    pub fn original_filename_on_disk(&self) -> String {
        format!("original.{}", self.extension)
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Default)]
#[serde(rename_all = "snake_case")]
pub enum AttachmentKind {
    Image,
    Document,
    Code,
    Data,
    #[default]
    Other,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AttachmentSummary {
    pub id: Uuid,
    pub display_name: String,
    pub original_filename: String,
    pub mime_type: String,
    pub size_bytes: u64,
    pub kind: AttachmentKind,
    pub preview_data_url: Option<String>,
    pub original_path: String,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ComposerAttachment {
    pub id: Uuid,
    pub display_name: String,
    pub original_filename: String,
    pub mime_type: String,
    pub size_bytes: u64,
    pub kind: AttachmentKind,
    pub preview_data_url: Option<String>,
    pub original_path: String,
    pub created_at: DateTime<Utc>,
}
