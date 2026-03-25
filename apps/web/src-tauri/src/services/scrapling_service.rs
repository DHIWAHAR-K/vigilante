use std::path::PathBuf;

use chrono::Utc;
use serde::Deserialize;
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
use tokio::process::Command;
use uuid::Uuid;

use crate::error::{VError, VResult};
use crate::models::desktop::WebSource;
use crate::storage::paths::StoragePaths;

const WORKER_SOURCE: &str = include_str!("../../python/scrapling_worker.py");

#[derive(Debug, Deserialize)]
struct WorkerResponse {
    ok: bool,
    url: Option<String>,
    title: Option<String>,
    text: Option<String>,
    excerpt: Option<String>,
    error: Option<String>,
}

pub async fn fetch_url(paths: &StoragePaths, url: &str) -> VResult<WebSource> {
    ensure_worker(paths)?;

    let mut child = Command::new("python3")
        .arg(paths.scrapling_worker())
        .stdin(std::process::Stdio::piped())
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped())
        .spawn()
        .map_err(|err| VError::Other(format!("Failed to start Scrapling worker: {err}")))?;

    let mut stdin = child
        .stdin
        .take()
        .ok_or_else(|| VError::Other("Scrapling worker stdin unavailable".into()))?;
    let stdout = child
        .stdout
        .take()
        .ok_or_else(|| VError::Other("Scrapling worker stdout unavailable".into()))?;

    let request = serde_json::json!({
        "action": "fetch",
        "url": url,
    });
    stdin
        .write_all(format!("{}\n", request).as_bytes())
        .await
        .map_err(|err| VError::Other(format!("Failed to send Scrapling request: {err}")))?;
    drop(stdin);

    let mut reader = BufReader::new(stdout);
    let mut line = String::new();
    reader
        .read_line(&mut line)
        .await
        .map_err(|err| VError::Other(format!("Failed to read Scrapling response: {err}")))?;

    let status = child.wait().await.map_err(|err| VError::Other(format!("Failed to wait for Scrapling worker: {err}")))?;
    if !status.success() {
        return Err(VError::Other(format!(
            "Scrapling worker exited with status {status}"
        )));
    }

    let response: WorkerResponse = serde_json::from_str(line.trim()).map_err(|err| {
        VError::Other(format!("Invalid Scrapling worker response: {err}"))
    })?;

    if !response.ok {
        return Err(VError::Other(
            response
                .error
                .unwrap_or_else(|| "Scrapling request failed".into()),
        ));
    }

    let content_text = response.text.unwrap_or_default();
    let source_id = Uuid::new_v4();
    let content_path = write_source_text(paths, source_id, &content_text)?;

    Ok(WebSource {
        id: source_id,
        url: response.url.unwrap_or_else(|| url.to_string()),
        title: response.title.unwrap_or_else(|| url.to_string()),
        excerpt: response.excerpt.unwrap_or_else(|| content_text.chars().take(300).collect()),
        domain: url::Url::parse(url)
            .ok()
            .and_then(|parsed| parsed.domain().map(|domain| domain.to_string())),
        fetched_at: Utc::now(),
        content_path: Some(content_path.display().to_string()),
        content_text,
    })
}

fn ensure_worker(paths: &StoragePaths) -> VResult<()> {
    std::fs::create_dir_all(paths.workers_dir())?;
    std::fs::write(paths.scrapling_worker(), WORKER_SOURCE)?;
    Ok(())
}

fn write_source_text(paths: &StoragePaths, id: Uuid, content: &str) -> VResult<PathBuf> {
    std::fs::create_dir_all(paths.web_cache_dir())?;
    let path = paths.web_cache_dir().join(format!("{id}.txt"));
    std::fs::write(&path, content)?;
    Ok(path)
}
