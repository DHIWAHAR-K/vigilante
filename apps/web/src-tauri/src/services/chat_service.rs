use std::time::{Duration, Instant};

use futures_util::StreamExt;
use tauri::{AppHandle, Emitter};
use tokio::time::sleep;
use uuid::Uuid;

use crate::error::{VError, VResult};
use crate::models::desktop::{
    DesktopContextItem, DesktopContextKind, DesktopQueryRequest, QueryFinished, QuerySubmission,
    ResearchProgressEvent,
};
use crate::models::message::{Citation, Message, ModelUsed};
use crate::models::settings::{AppSettings, RuntimeSettings};
use crate::services::attachment_service::attachment_context_blocks;
use crate::services::database_service::AppDatabase;
use crate::services::draft_service::discard_draft;
use crate::services::mcp_service::collect_context_blocks;
use crate::services::model_service::{ensure_model_available, normalize_model_id};
use crate::services::runtime_service::{ensure_runtime_ready, normalize_runtime_config};
use crate::services::web_service::{discover_urls, fetch_sources};
use crate::storage::json_store::read_json_or_default;
use crate::storage::paths::StoragePaths;

pub const EVENT_ASSISTANT_TOKEN: &str = "vigilante://assistant-token";
pub const EVENT_ASSISTANT_STARTED: &str = "vigilante://assistant-started";
pub const EVENT_ASSISTANT_FINISHED: &str = "vigilante://assistant-finished";
pub const EVENT_ASSISTANT_CITATIONS: &str = "vigilante://assistant-citations";
pub const EVENT_RESEARCH_PROGRESS: &str = "vigilante://research-progress";

pub async fn submit_query(
    app: &AppHandle,
    db: &AppDatabase,
    paths: &StoragePaths,
    request: DesktopQueryRequest,
) -> VResult<QuerySubmission> {
    let settings: AppSettings = read_json_or_default(paths.settings().as_path());
    let runtime_config = normalize_runtime_config(read_json_or_default(paths.runtime_config().as_path()));
    let workspace = db.get_workspace(request.workspace_id)?;

    let mut provider = settings.default_provider.clone();
    provider.provider_id = "ollama".into();
    provider.model_id = normalize_model_id(&provider.model_id);

    let mut thread_id = request.thread_id;
    if thread_id.is_none() {
        if let Some(draft_id) = request.draft_id {
            thread_id = Some(
                db.create_thread_with_id(
                    draft_id,
                    request.workspace_id,
                    &request.query,
                    request.mode.clone(),
                )?
                .id,
            );
            let _ = discard_draft(paths, &draft_id);
        } else {
            thread_id = Some(
                db.create_thread(request.workspace_id, &request.query, request.mode.clone())?
                    .id,
            );
        }
    }
    let thread_id = thread_id.expect("thread id is set");
    let attachment_context = attachment_context_blocks(paths, &thread_id)?;

    let user_message = Message::new_user(request.query.clone(), request.mode.clone());
    db.insert_message(&thread_id, &user_message)?;

    let history = db.list_messages(thread_id)?;

    emit_research_progress(
        app,
        thread_id,
        "model",
        &format!("Preparing model {}.", provider.model_id),
    );
    if let Some(job) = db.get_active_model_install_job(&provider.model_id)? {
        emit_research_progress(
            app,
            thread_id,
            "model",
            &format!("Waiting for {} to finish installing.", provider.model_id),
        );
        wait_for_model_install(db, job.id).await?;
    } else {
        ensure_model_available(paths, &provider.model_id).await?;
    }
    let assistant_message = Message::new_assistant(
        request.mode.clone(),
        ModelUsed {
            provider_id: provider.provider_id.clone(),
            model_id: provider.model_id.clone(),
            tokens_in: None,
            tokens_out: None,
            latency_ms: None,
        },
    );
    let assistant_message_id = assistant_message.id;
    db.insert_message(&thread_id, &assistant_message)?;

    let submission = QuerySubmission {
        thread_id,
        user_message_id: user_message.id,
        assistant_message_id,
    };
    app.emit(EVENT_ASSISTANT_STARTED, &submission).ok();
    emit_research_progress(
        app,
        thread_id,
        "planning",
        if request.web_search {
            "Preparing local context and web retrieval."
        } else {
            "Preparing local context."
        },
    );

    let web_sources = if request.web_search {
        emit_research_progress(
            app,
            thread_id,
            "discovery",
            "Discovering candidate web sources.",
        );
        let search_results = discover_urls(&request.query, &settings.search).await?;
        emit_research_progress(
            app,
            thread_id,
            "scraping",
            &format!(
                "Fetching {} web sources with Scrapling.",
                search_results
                    .len()
                    .min(max_sources_for_mode(&request.mode))
            ),
        );
        fetch_sources(paths, &search_results, max_sources_for_mode(&request.mode)).await?
    } else {
        Vec::new()
    };
    db.save_web_sources(thread_id, assistant_message_id, &web_sources)?;
    let citations = to_citations(&web_sources);
    let mut prompt_context_items = request.context_items.clone();
    let mcp_context_blocks = collect_context_blocks(
        paths,
        &settings,
        &workspace,
        &request.query,
        &request.context_items,
    )
    .await;
    if !mcp_context_blocks.is_empty() {
        emit_research_progress(
            app,
            thread_id,
            "mcp",
            &format!(
                "Collected {} MCP context block(s).",
                mcp_context_blocks.len()
            ),
        );

        for (index, block) in mcp_context_blocks.into_iter().enumerate() {
            prompt_context_items.push(DesktopContextItem {
                id: format!("mcp-context-{thread_id}-{index}"),
                kind: DesktopContextKind::Text,
                title: format!("MCP · {}", block.title),
                path: None,
                value: Some(block.body),
                source: Some("mcp".into()),
                mcp_action: None,
            });
        }
    }
    emit_research_progress(
        app,
        thread_id,
        "synthesis",
        "Synthesizing the final answer.",
    );

    let started = Instant::now();
    let model_used = stream_ollama_response(
        app,
        db,
        paths,
        &runtime_config,
        &provider.model_id,
        thread_id,
        assistant_message_id,
        &history,
        &request.query,
        &prompt_context_items,
        &attachment_context,
        &citations,
    )
    .await?;

    db.update_assistant_message(
        thread_id,
        assistant_message_id,
        db.open_thread(thread_id)?
            .messages
            .into_iter()
            .find(|message| message.id == assistant_message_id)
            .map(|message| message.content)
            .unwrap_or_default(),
        true,
        Some(ModelUsed {
            latency_ms: Some(started.elapsed().as_millis().min(u128::from(u32::MAX)) as u32),
            ..model_used.clone()
        }),
    )?;
    db.replace_citations(assistant_message_id, &citations)?;

    app.emit(
        EVENT_ASSISTANT_CITATIONS,
        serde_json::json!({
            "threadId": thread_id,
            "messageId": assistant_message_id,
            "citations": citations,
        }),
    )
    .ok();
    app.emit(
        EVENT_ASSISTANT_FINISHED,
        QueryFinished {
            thread_id,
            assistant_message_id,
            citations,
        },
    )
    .ok();
    emit_research_progress(app, thread_id, "complete", "Answer complete.");

    Ok(submission)
}

async fn stream_ollama_response(
    app: &AppHandle,
    db: &AppDatabase,
    paths: &StoragePaths,
    runtime_config: &RuntimeSettings,
    model_id: &str,
    thread_id: Uuid,
    assistant_message_id: Uuid,
    history: &[Message],
    query: &str,
    context_items: &[DesktopContextItem],
    attachment_context: &[String],
    citations: &[Citation],
) -> VResult<ModelUsed> {
    let ensured = ensure_runtime_ready(paths, runtime_config).await?;
    if ensured.runtime.status != crate::models::runtime::OllamaStatus::Running
        && ensured.runtime.status != crate::models::runtime::OllamaStatus::Available
    {
        return Err(VError::Ollama("Ollama is not ready".into()));
    }

    let client = reqwest::Client::new();
    let prompt_messages =
        build_prompt_messages(history, query, context_items, attachment_context, citations);
    let response = client
        .post(format!(
            "{}/api/chat",
            runtime_config.ollama_base_url.trim_end_matches('/')
        ))
        .json(&serde_json::json!({
            "model": model_id,
            "stream": true,
            "messages": prompt_messages,
        }))
        .send()
        .await?;

    let response_status = response.status();
    if !response_status.is_success() {
        let body = response.text().await.unwrap_or_default();
        return Err(VError::Ollama(format!(
            "Ollama error {}: {}",
            response_status, body
        )));
    }

    let mut full_content = String::new();
    let mut prompt_tokens = None;
    let mut completion_tokens = None;
    let mut buffer = String::new();
    let mut stream = response.bytes_stream();

    while let Some(chunk) = stream.next().await {
        let bytes = chunk?;
        buffer.push_str(&String::from_utf8_lossy(&bytes));

        while let Some(newline_idx) = buffer.find('\n') {
            let line = buffer[..newline_idx].trim().to_string();
            buffer = buffer[newline_idx + 1..].to_string();

            if line.is_empty() {
                continue;
            }

            let value: serde_json::Value = match serde_json::from_str(&line) {
                Ok(value) => value,
                Err(_) => continue,
            };

            if value.get("done").and_then(|done| done.as_bool()) == Some(true) {
                prompt_tokens = value
                    .get("prompt_eval_count")
                    .and_then(|count| count.as_u64())
                    .map(|count| count as u32);
                completion_tokens = value
                    .get("eval_count")
                    .and_then(|count| count.as_u64())
                    .map(|count| count as u32);
                continue;
            }

            let token = value
                .get("message")
                .and_then(|message| message.get("content"))
                .and_then(|content| content.as_str())
                .unwrap_or_default();

            if token.is_empty() {
                continue;
            }

            full_content.push_str(token);
            db.update_assistant_message(
                thread_id,
                assistant_message_id,
                full_content.clone(),
                false,
                None,
            )?;
            app.emit(
                EVENT_ASSISTANT_TOKEN,
                serde_json::json!({
                    "threadId": thread_id,
                    "messageId": assistant_message_id,
                    "token": token,
                }),
            )
            .ok();
        }
    }

    db.update_assistant_message(
        thread_id,
        assistant_message_id,
        full_content,
        true,
        Some(ModelUsed {
            provider_id: "ollama".into(),
            model_id: model_id.to_string(),
            tokens_in: prompt_tokens,
            tokens_out: completion_tokens,
            latency_ms: None,
        }),
    )?;

    Ok(ModelUsed {
        provider_id: "ollama".into(),
        model_id: model_id.to_string(),
        tokens_in: prompt_tokens,
        tokens_out: completion_tokens,
        latency_ms: None,
    })
}

fn build_prompt_messages(
    history: &[Message],
    query: &str,
    context_items: &[DesktopContextItem],
    attachment_context: &[String],
    citations: &[Citation],
) -> Vec<serde_json::Value> {
    let mut messages = Vec::new();
    let system_prompt = build_system_prompt(context_items, attachment_context, citations);
    messages.push(serde_json::json!({
        "role": "system",
        "content": system_prompt,
    }));

    for message in history {
        messages.push(serde_json::json!({
            "role": match message.role {
                crate::models::message::MessageRole::User => "user",
                crate::models::message::MessageRole::Assistant => "assistant",
                crate::models::message::MessageRole::System => "system",
            },
            "content": message.content,
        }));
    }

    messages.push(serde_json::json!({
        "role": "user",
        "content": query,
    }));

    messages
}

fn build_system_prompt(
    context_items: &[DesktopContextItem],
    attachment_context: &[String],
    citations: &[Citation],
) -> String {
    let mut sections = vec![
        "You are Vigilante, a local-first research assistant running in a desktop app.".to_string(),
        "When sources are provided, ground the answer in them and reference source numbers like [1], [2] in plain text.".to_string(),
    ];

    let local_context = collect_local_context(context_items);
    if !local_context.is_empty() {
        sections.push("Local context:".into());
        sections.push(local_context);
    }

    if !attachment_context.is_empty() {
        sections.push("Attachments available to use as context:".into());
        sections.push(attachment_context.join("\n\n"));
    }

    if !citations.is_empty() {
        sections.push("Web sources available to cite:".into());
        sections.push(
            citations
                .iter()
                .map(|citation| {
                    format!("[{}] {} ({})", citation.index, citation.title, citation.url)
                })
                .collect::<Vec<_>>()
                .join("\n"),
        );
    }

    sections.join("\n\n")
}

fn collect_local_context(context_items: &[DesktopContextItem]) -> String {
    let mut parts = Vec::new();

    for item in context_items {
        if item.mcp_action.is_some() {
            continue;
        }

        match item.kind {
            DesktopContextKind::File | DesktopContextKind::Text => {
                if let Some(value) = item.value.as_deref() {
                    parts.push(format!("{}:\n{}", item.title, trim_for_prompt(value)));
                } else if let Some(path) = item.path.as_deref() {
                    if let Ok(contents) = std::fs::read_to_string(path) {
                        parts.push(format!("{}:\n{}", item.title, trim_for_prompt(&contents)));
                    }
                }
            }
            DesktopContextKind::Url => {
                if let Some(value) = item.value.as_deref() {
                    parts.push(format!("URL hint: {}", value));
                }
            }
            DesktopContextKind::Directory | DesktopContextKind::Thread => {}
        }
    }

    parts.join("\n\n")
}

fn trim_for_prompt(value: &str) -> String {
    const MAX_CHARS: usize = 8_000;
    if value.len() <= MAX_CHARS {
        value.to_string()
    } else {
        format!("{}…", &value[..MAX_CHARS])
    }
}

fn to_citations(sources: &[crate::models::desktop::WebSource]) -> Vec<Citation> {
    sources
        .iter()
        .enumerate()
        .map(|(index, source)| Citation {
            id: source.id,
            index: (index + 1) as u32,
            title: source.title.clone(),
            url: source.url.clone(),
            favicon_url: None,
            excerpt: Some(source.excerpt.clone()),
            domain: source.domain.clone(),
        })
        .collect()
}

fn emit_research_progress(app: &AppHandle, thread_id: Uuid, phase: &str, message: &str) {
    app.emit(
        EVENT_RESEARCH_PROGRESS,
        ResearchProgressEvent {
            thread_id,
            phase: phase.to_string(),
            message: message.to_string(),
        },
    )
    .ok();
}

fn max_sources_for_mode(mode: &crate::models::message::QueryMode) -> usize {
    match mode {
        crate::models::message::QueryMode::DeepResearch => 5,
        crate::models::message::QueryMode::Research => 4,
        _ => 3,
    }
}

async fn wait_for_model_install(db: &AppDatabase, job_id: Uuid) -> VResult<()> {
    loop {
        let Some(job) = db.get_model_install_job(job_id)? else {
            return Ok(());
        };

        match job.status {
            crate::models::runtime::ModelInstallStatus::Queued
            | crate::models::runtime::ModelInstallStatus::Downloading
            | crate::models::runtime::ModelInstallStatus::Verifying => {
                sleep(Duration::from_millis(500)).await;
            }
            crate::models::runtime::ModelInstallStatus::Complete => return Ok(()),
            crate::models::runtime::ModelInstallStatus::Cancelled => {
                return Err(VError::Other("Model installation was cancelled".into()))
            }
            crate::models::runtime::ModelInstallStatus::Failed => {
                return Err(VError::Other(
                    job.error
                        .unwrap_or_else(|| "Model installation failed".into()),
                ))
            }
        }
    }
}
