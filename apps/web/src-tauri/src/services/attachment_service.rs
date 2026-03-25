use std::path::{Path, PathBuf};

use chrono::Utc;
use uuid::Uuid;

use crate::error::VResult;
use crate::models::attachment::{
    AttachmentKind, AttachmentMetadata, AttachmentSummary, ComposerAttachment,
};
use crate::storage::json_store::{read_json, write_json_atomic};
use crate::storage::paths::StoragePaths;

const MAX_INLINE_PREVIEW_BYTES: u64 = 6 * 1024 * 1024;
const MAX_INLINE_TEXT_BYTES: u64 = 64 * 1024;

pub fn import_attachments(
    paths: &StoragePaths,
    owner_id: &Uuid,
    source_paths: Vec<String>,
) -> VResult<Vec<AttachmentSummary>> {
    for raw_path in source_paths {
        let source_path = PathBuf::from(raw_path);
        if !source_path.is_file() {
            continue;
        }

        let original_filename = source_path
            .file_name()
            .and_then(|value| value.to_str())
            .unwrap_or("attachment")
            .to_string();
        let extension = normalized_extension(&source_path);
        let mime_type = mime_type_for_extension(&extension);
        let kind = attachment_kind_for(&extension, &mime_type);
        let metadata = std::fs::metadata(&source_path)?;
        let attachment_id = Uuid::new_v4();
        let attachment_dir = paths.attachment_dir(owner_id, &attachment_id);
        std::fs::create_dir_all(&attachment_dir)?;

        let model = AttachmentMetadata {
            id: attachment_id,
            thread_id: *owner_id,
            display_name: original_filename.clone(),
            original_filename,
            extension: extension.clone(),
            mime_type,
            kind,
            size_bytes: metadata.len(),
            has_extracted_text: false,
            has_preview: false,
            created_at: Utc::now(),
        };

        let original_path = paths.attachment_original(owner_id, &attachment_id, &extension);
        std::fs::copy(&source_path, &original_path)?;
        write_json_atomic(
            paths
                .attachment_metadata(owner_id, &attachment_id)
                .as_path(),
            &model,
        )?;
    }

    list_attachments(paths, owner_id)
}

pub fn list_attachments(paths: &StoragePaths, owner_id: &Uuid) -> VResult<Vec<AttachmentSummary>> {
    let base_dir = paths.attachments_dir().join(owner_id.to_string());
    let Ok(entries) = std::fs::read_dir(base_dir) else {
        return Ok(Vec::new());
    };

    let mut attachments = entries
        .filter_map(|entry| entry.ok())
        .filter_map(|entry| {
            let attachment_dir = entry.path();
            let metadata_path = attachment_dir.join("metadata.json");
            if !metadata_path.is_file() {
                return None;
            }

            let metadata = read_json::<AttachmentMetadata>(&metadata_path).ok()?;
            let original_path = paths
                .attachment_original(owner_id, &metadata.id, &metadata.extension)
                .display()
                .to_string();

            Some(AttachmentSummary {
                id: metadata.id,
                display_name: metadata.display_name,
                original_filename: metadata.original_filename,
                mime_type: metadata.mime_type.clone(),
                size_bytes: metadata.size_bytes,
                kind: metadata.kind,
                preview_data_url: preview_data_url(
                    Path::new(&original_path),
                    &metadata.mime_type,
                    metadata.size_bytes,
                ),
                original_path,
                created_at: metadata.created_at,
            })
        })
        .collect::<Vec<_>>();

    attachments.sort_by(|left, right| left.created_at.cmp(&right.created_at));
    Ok(attachments)
}

pub fn remove_attachment(
    paths: &StoragePaths,
    owner_id: &Uuid,
    attachment_id: &Uuid,
) -> VResult<()> {
    let attachment_dir = paths.attachment_dir(owner_id, attachment_id);
    if attachment_dir.exists() {
        std::fs::remove_dir_all(attachment_dir)?;
    }
    Ok(())
}

pub fn attachment_context_blocks(paths: &StoragePaths, owner_id: &Uuid) -> VResult<Vec<String>> {
    let base_dir = paths.attachments_dir().join(owner_id.to_string());
    let Ok(entries) = std::fs::read_dir(base_dir) else {
        return Ok(Vec::new());
    };

    let mut blocks = Vec::new();

    for entry in entries.filter_map(|entry| entry.ok()) {
        let attachment_dir = entry.path();
        let metadata_path = attachment_dir.join("metadata.json");
        if !metadata_path.is_file() {
            continue;
        }

        let Ok(metadata) = read_json::<AttachmentMetadata>(&metadata_path) else {
            continue;
        };
        let original_path = paths.attachment_original(owner_id, &metadata.id, &metadata.extension);

        match metadata.kind {
            AttachmentKind::Image => {
                blocks.push(format!(
                    "Attached image: {} ({}). The current desktop runtime path does not inline image pixels into the model request, so use this only as user-provided context metadata.",
                    metadata.display_name, metadata.mime_type
                ));
            }
            _ => {
                let Some(contents) = read_text_attachment(&original_path, metadata.size_bytes)
                else {
                    blocks.push(format!(
                        "Attached file: {} ({}).",
                        metadata.display_name, metadata.mime_type
                    ));
                    continue;
                };

                blocks.push(format!(
                    "Attached file {}:\n{}",
                    metadata.display_name,
                    trim_for_prompt(&contents)
                ));
            }
        }
    }

    Ok(blocks)
}

pub fn to_composer_attachments(items: &[AttachmentSummary]) -> Vec<ComposerAttachment> {
    items
        .iter()
        .map(|item| ComposerAttachment {
            id: item.id,
            display_name: item.display_name.clone(),
            original_filename: item.original_filename.clone(),
            mime_type: item.mime_type.clone(),
            size_bytes: item.size_bytes,
            kind: item.kind.clone(),
            preview_data_url: item.preview_data_url.clone(),
            original_path: item.original_path.clone(),
            created_at: item.created_at,
        })
        .collect()
}

fn normalized_extension(path: &Path) -> String {
    path.extension()
        .and_then(|value| value.to_str())
        .map(|value| value.trim().to_ascii_lowercase())
        .filter(|value| !value.is_empty())
        .unwrap_or_else(|| "bin".to_string())
}

fn mime_type_for_extension(extension: &str) -> String {
    match extension {
        "png" => "image/png",
        "jpg" | "jpeg" => "image/jpeg",
        "webp" => "image/webp",
        "gif" => "image/gif",
        "bmp" => "image/bmp",
        "svg" => "image/svg+xml",
        "pdf" => "application/pdf",
        "md" => "text/markdown",
        "txt" | "log" => "text/plain",
        "json" => "application/json",
        "csv" => "text/csv",
        "tsv" => "text/tab-separated-values",
        "html" => "text/html",
        "xml" => "application/xml",
        "yaml" | "yml" => "application/yaml",
        "toml" => "application/toml",
        "js" | "mjs" | "cjs" => "text/javascript",
        "ts" | "tsx" => "text/typescript",
        "jsx" => "text/jsx",
        "py" => "text/x-python",
        "rs" => "text/rust",
        "go" => "text/x-go",
        "java" => "text/x-java",
        "c" | "h" => "text/x-c",
        "cpp" | "cc" | "cxx" | "hpp" => "text/x-c++",
        "css" | "scss" => "text/css",
        "sql" => "application/sql",
        _ => "application/octet-stream",
    }
    .to_string()
}

fn attachment_kind_for(extension: &str, mime_type: &str) -> AttachmentKind {
    if mime_type.starts_with("image/") {
        AttachmentKind::Image
    } else if matches!(
        extension,
        "js" | "mjs"
            | "cjs"
            | "ts"
            | "tsx"
            | "jsx"
            | "py"
            | "rs"
            | "go"
            | "java"
            | "c"
            | "cc"
            | "cpp"
            | "cxx"
            | "h"
            | "hpp"
            | "css"
            | "scss"
            | "sql"
            | "sh"
    ) {
        AttachmentKind::Code
    } else if matches!(
        extension,
        "csv" | "tsv" | "json" | "xml" | "yaml" | "yml" | "toml"
    ) {
        AttachmentKind::Data
    } else if mime_type.starts_with("text/")
        || matches!(extension, "md" | "txt" | "pdf" | "doc" | "docx")
    {
        AttachmentKind::Document
    } else {
        AttachmentKind::Other
    }
}

fn preview_data_url(path: &Path, mime_type: &str, size_bytes: u64) -> Option<String> {
    if !mime_type.starts_with("image/") || size_bytes > MAX_INLINE_PREVIEW_BYTES {
        return None;
    }

    let bytes = std::fs::read(path).ok()?;
    Some(format!(
        "data:{};base64,{}",
        mime_type,
        encode_base64(&bytes)
    ))
}

fn read_text_attachment(path: &Path, size_bytes: u64) -> Option<String> {
    if size_bytes > MAX_INLINE_TEXT_BYTES {
        return None;
    }
    std::fs::read_to_string(path).ok()
}

fn trim_for_prompt(value: &str) -> String {
    const MAX_CHARS: usize = 8_000;
    if value.len() <= MAX_CHARS {
        value.to_string()
    } else {
        format!("{}…", &value[..MAX_CHARS])
    }
}

fn encode_base64(bytes: &[u8]) -> String {
    const TABLE: &[u8; 64] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut output = String::with_capacity(bytes.len().div_ceil(3) * 4);
    let mut index = 0;

    while index < bytes.len() {
        let first = bytes[index];
        let second = bytes.get(index + 1).copied();
        let third = bytes.get(index + 2).copied();

        output.push(TABLE[(first >> 2) as usize] as char);
        output.push(
            TABLE[(((first & 0b0000_0011) << 4) | (second.unwrap_or(0) >> 4)) as usize] as char,
        );

        match second {
            Some(second) => {
                output.push(
                    TABLE[(((second & 0b0000_1111) << 2) | (third.unwrap_or(0) >> 6)) as usize]
                        as char,
                );
            }
            None => output.push('='),
        }

        match third {
            Some(third) => output.push(TABLE[(third & 0b0011_1111) as usize] as char),
            None => output.push('='),
        }

        index += 3;
    }

    output
}
