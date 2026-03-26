use std::path::PathBuf;
use std::time::Duration;

use regex::Regex;
use serde_json::{json, Value};
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader, Lines};
use tokio::process::{Child, ChildStdin, ChildStdout, Command};
use tokio::time::timeout;
use url::Url;

use crate::error::{VError, VResult};
use crate::models::desktop::DesktopContextItem;
use crate::models::mcp::{
    McpConnectorStatus, McpContextAction, McpContextActionKind, McpContextBlock, McpResourceInfo,
    McpToolInfo,
};
use crate::models::settings::{
    AppSettings, McpConnectorConfig, McpEnvironmentVariable, McpSettings, McpTransport,
};
use crate::models::workspace::{Workspace, WorkspaceContextItem, WorkspaceContextKind};
use crate::storage::paths::StoragePaths;

const MCP_PROTOCOL_VERSION: &str = "2024-11-05";

pub fn lookup_context_action_items(
    settings: &McpSettings,
    workspace: &Workspace,
    query: &str,
) -> Vec<WorkspaceContextItem> {
    let needle = query.trim().to_lowercase();
    if needle.is_empty() && !settings.enabled_by_default {
        return Vec::new();
    }

    let mut items = Vec::new();

    for connector in settings
        .connectors
        .iter()
        .filter(|connector| connector.enabled)
    {
        if connector.workspace_root_required && workspace.root_path.is_none() {
            continue;
        }

        for action in actions_for_connector(connector) {
            let haystacks = [
                connector.id.as_str(),
                connector.name.as_str(),
                connector.description.as_str(),
                action.title,
                action.description,
            ];

            if !needle.is_empty()
                && !haystacks
                    .iter()
                    .any(|value| value.to_lowercase().contains(&needle))
            {
                continue;
            }

            items.push(WorkspaceContextItem {
                id: format!("mcp:{}:{}", connector.id, action.kind.as_str()),
                kind: WorkspaceContextKind::Mcp,
                title: action.title.to_string(),
                path: None,
                subtitle: Some(format!("{} connector", connector.name)),
                value: Some(action.description.to_string()),
                source: Some(connector.id.clone()),
                mcp_action: Some(McpContextAction {
                    connector_id: connector.id.clone(),
                    kind: action.kind.clone(),
                }),
            });
        }
    }

    if needle.is_empty() {
        items.truncate(settings.max_context_items.max(1) as usize);
    }

    items
}

pub async fn probe_connector(
    paths: &StoragePaths,
    connector: &McpConnectorConfig,
    workspace: Option<&Workspace>,
) -> McpConnectorStatus {
    match connector.transport {
        McpTransport::StreamableHttp => McpConnectorStatus {
            connector_id: connector.id.clone(),
            name: connector.name.clone(),
            enabled: connector.enabled,
            transport: connector.transport.clone(),
            available: false,
            server_name: None,
            server_version: None,
            tools: Vec::new(),
            resources: Vec::new(),
            error: Some("Streamable HTTP MCP transport is not implemented yet.".into()),
        },
        McpTransport::Stdio => match connect_stdio(paths, connector, workspace).await {
            Ok(mut client) => {
                let tools = client.list_tools().await.unwrap_or_default();
                let resources = client.list_resources().await.unwrap_or_default();
                let _ = client.shutdown().await;
                McpConnectorStatus {
                    connector_id: connector.id.clone(),
                    name: connector.name.clone(),
                    enabled: connector.enabled,
                    transport: connector.transport.clone(),
                    available: true,
                    server_name: client.server_name,
                    server_version: client.server_version,
                    tools,
                    resources,
                    error: None,
                }
            }
            Err(error) => McpConnectorStatus {
                connector_id: connector.id.clone(),
                name: connector.name.clone(),
                enabled: connector.enabled,
                transport: connector.transport.clone(),
                available: false,
                server_name: None,
                server_version: None,
                tools: Vec::new(),
                resources: Vec::new(),
                error: Some(error.to_string()),
            },
        },
    }
}

pub async fn collect_context_blocks(
    paths: &StoragePaths,
    settings: &AppSettings,
    workspace: &Workspace,
    query: &str,
    items: &[DesktopContextItem],
) -> Vec<McpContextBlock> {
    let mut blocks = Vec::new();

    for item in items {
        let Some(action) = item.mcp_action.as_ref() else {
            continue;
        };
        let Some(connector) = settings
            .mcp
            .connectors
            .iter()
            .find(|connector| connector.id == action.connector_id && connector.enabled)
        else {
            continue;
        };

        match execute_action(paths, connector, workspace, query, action).await {
            Ok(Some(block)) => blocks.push(block),
            Ok(None) => {}
            Err(_) => {}
        }

        if blocks.len() >= settings.mcp.max_context_items.max(1) as usize {
            break;
        }
    }

    blocks
}

async fn execute_action(
    paths: &StoragePaths,
    connector: &McpConnectorConfig,
    workspace: &Workspace,
    query: &str,
    action: &McpContextAction,
) -> VResult<Option<McpContextBlock>> {
    let mut client = connect_stdio(paths, connector, Some(workspace)).await?;
    let tools = client.list_tools().await.unwrap_or_default();

    let block = match action.kind {
        McpContextActionKind::FilesystemSearch => {
            let workspace_root = workspace_root_path(workspace)?;
            let Some(tool_name) = pick_tool_name(&tools, &["search_files", "search-files"]) else {
                client.shutdown().await?;
                return Ok(None);
            };
            let result = client
                .call_tool(
                    &tool_name,
                    json!({
                        "path": workspace_root,
                        "pattern": query,
                    }),
                )
                .await?;
            McpContextBlock {
                title: "Filesystem search".into(),
                body: render_tool_result(&result),
            }
        }
        McpContextActionKind::GitStatus => {
            let repo_path = workspace_root_path(workspace)?;
            let Some(tool_name) = pick_tool_name(&tools, &["git_status", "status"]) else {
                client.shutdown().await?;
                return Ok(None);
            };
            let result = client
                .call_tool(&tool_name, json!({ "repo_path": repo_path }))
                .await?;
            McpContextBlock {
                title: "Git status".into(),
                body: render_tool_result(&result),
            }
        }
        McpContextActionKind::GitLog => {
            let repo_path = workspace_root_path(workspace)?;
            let Some(tool_name) = pick_tool_name(&tools, &["git_log", "log", "list_commits"])
            else {
                client.shutdown().await?;
                return Ok(None);
            };
            let result = client
                .call_tool(
                    &tool_name,
                    json!({
                        "repo_path": repo_path,
                        "max_count": 10,
                    }),
                )
                .await?;
            McpContextBlock {
                title: "Recent commits".into(),
                body: render_tool_result(&result),
            }
        }
        McpContextActionKind::SqliteSchema => {
            let list_tool = pick_tool_name(&tools, &["list_tables", "list-tables", "tables"]);
            let describe_tool = pick_tool_name(
                &tools,
                &["describe_table", "describe-table", "table_schema", "schema"],
            );

            let body = if let Some(list_tool) = list_tool {
                let tables = client.call_tool(&list_tool, json!({})).await?;
                let mut rendered = vec![render_tool_result(&tables)];

                if let Some(describe_tool) = describe_tool {
                    let table_names = extract_named_items(&tables);
                    for table in table_names.into_iter().take(3) {
                        let details = match client
                            .call_tool(&describe_tool, json!({ "table": table }))
                            .await
                        {
                            Ok(value) => Some(value),
                            Err(_) => client
                                .call_tool(&describe_tool, json!({ "name": table }))
                                .await
                                .ok(),
                        };
                        if let Some(details) = details {
                            rendered.push(render_tool_result(&details));
                        }
                    }
                }

                rendered.join("\n\n")
            } else {
                "No SQLite schema tools were exposed by the configured connector.".into()
            };

            McpContextBlock {
                title: "SQLite schema".into(),
                body,
            }
        }
        McpContextActionKind::PostgresSchema => {
            let resources = client.list_resources().await.unwrap_or_default();
            let body = if !resources.is_empty() {
                let mut rendered = Vec::new();
                for resource in resources.iter().take(5) {
                    let result = client.read_resource(&resource.uri).await?;
                    rendered.push(render_resource_result(&result));
                }
                rendered.join("\n\n")
            } else {
                let Some(tool_name) =
                    pick_tool_name(&tools, &["query", "run_query", "execute_sql"])
                else {
                    client.shutdown().await?;
                    return Ok(None);
                };
                let result = client
                    .call_tool(
                        &tool_name,
                        json!({
                            "sql": "select table_schema, table_name from information_schema.tables where table_schema not in ('pg_catalog', 'information_schema') order by table_schema, table_name limit 25;",
                        }),
                    )
                    .await?;
                render_tool_result(&result)
            };

            McpContextBlock {
                title: "PostgreSQL schema".into(),
                body,
            }
        }
        McpContextActionKind::FetchUrl => {
            let Some(url) = extract_first_url(query) else {
                client.shutdown().await?;
                return Ok(Some(McpContextBlock {
                    title: "Fetch URL".into(),
                    body: "No direct URL was found in the query.".into(),
                }));
            };
            let Some(tool_name) = pick_tool_name(&tools, &["fetch", "fetch_url", "get_url"]) else {
                client.shutdown().await?;
                return Ok(None);
            };
            let result = client
                .call_tool(
                    &tool_name,
                    json!({
                        "url": url,
                        "max_length": 8000,
                    }),
                )
                .await?;
            McpContextBlock {
                title: "Fetched URL".into(),
                body: render_tool_result(&result),
            }
        }
        McpContextActionKind::GithubSearchRepositories => {
            let Some(tool_name) = pick_tool_name(&tools, &["search_repositories"]) else {
                client.shutdown().await?;
                return Ok(None);
            };
            let result = client
                .call_tool(&tool_name, json!({ "query": query }))
                .await?;
            McpContextBlock {
                title: "GitHub repositories".into(),
                body: render_tool_result(&result),
            }
        }
        McpContextActionKind::GithubSearchIssues => {
            let Some(tool_name) = pick_tool_name(&tools, &["search_issues"]) else {
                client.shutdown().await?;
                return Ok(None);
            };
            let result = client.call_tool(&tool_name, json!({ "q": query })).await?;
            McpContextBlock {
                title: "GitHub issues and PRs".into(),
                body: render_tool_result(&result),
            }
        }
        McpContextActionKind::GithubSearchCode => {
            let Some(tool_name) = pick_tool_name(&tools, &["search_code"]) else {
                client.shutdown().await?;
                return Ok(None);
            };
            let result = client.call_tool(&tool_name, json!({ "q": query })).await?;
            McpContextBlock {
                title: "GitHub code search".into(),
                body: render_tool_result(&result),
            }
        }
    };

    client.shutdown().await?;
    Ok(Some(block))
}

fn workspace_root_path(workspace: &Workspace) -> VResult<&str> {
    workspace
        .root_path
        .as_deref()
        .ok_or_else(|| VError::Other("This connector requires an active workspace root.".into()))
}

fn pick_tool_name(tools: &[McpToolInfo], candidates: &[&str]) -> Option<String> {
    for candidate in candidates {
        if let Some(tool) = tools
            .iter()
            .find(|tool| tool.name.eq_ignore_ascii_case(candidate))
        {
            return Some(tool.name.clone());
        }
    }
    None
}

fn render_tool_result(result: &Value) -> String {
    if let Some(content) = result.get("content").and_then(|content| content.as_array()) {
        let text = content
            .iter()
            .filter_map(render_content_block)
            .collect::<Vec<_>>()
            .join("\n\n");
        if !text.is_empty() {
            return text;
        }
    }

    if let Some(structured) = result.get("structuredContent") {
        return pretty_json(structured);
    }

    pretty_json(result)
}

fn render_resource_result(result: &Value) -> String {
    if let Some(contents) = result
        .get("contents")
        .and_then(|contents| contents.as_array())
    {
        let text = contents
            .iter()
            .filter_map(render_content_block)
            .collect::<Vec<_>>()
            .join("\n\n");
        if !text.is_empty() {
            return text;
        }
    }

    pretty_json(result)
}

fn render_content_block(value: &Value) -> Option<String> {
    if let Some(text) = value.get("text").and_then(|text| text.as_str()) {
        return Some(text.to_string());
    }

    value
        .get("resource")
        .and_then(|resource| resource.get("text"))
        .and_then(|text| text.as_str())
        .map(|text| text.to_string())
}

fn extract_named_items(result: &Value) -> Vec<String> {
    if let Some(structured) = result.get("structuredContent") {
        if let Some(items) = structured.as_array() {
            return items
                .iter()
                .filter_map(|item| {
                    item.get("name")
                        .or_else(|| item.get("table"))
                        .and_then(|value| value.as_str())
                        .map(|value| value.to_string())
                })
                .collect();
        }
    }

    Vec::new()
}

fn pretty_json(value: &Value) -> String {
    serde_json::to_string_pretty(value).unwrap_or_else(|_| value.to_string())
}

fn extract_first_url(value: &str) -> Option<String> {
    let regex = Regex::new(r#"https?://[^\s]+"#).expect("valid MCP URL regex");
    regex.find(value).map(|capture| {
        capture
            .as_str()
            .trim_end_matches([')', ']', ',', '.'])
            .to_string()
    })
}

struct ConnectorActionSpec {
    title: &'static str,
    description: &'static str,
    kind: McpContextActionKind,
}

impl McpContextActionKind {
    fn as_str(&self) -> &'static str {
        match self {
            Self::FilesystemSearch => "filesystem_search",
            Self::GitStatus => "git_status",
            Self::GitLog => "git_log",
            Self::SqliteSchema => "sqlite_schema",
            Self::PostgresSchema => "postgres_schema",
            Self::FetchUrl => "fetch_url",
            Self::GithubSearchRepositories => "github_search_repositories",
            Self::GithubSearchIssues => "github_search_issues",
            Self::GithubSearchCode => "github_search_code",
        }
    }
}

fn actions_for_connector(connector: &McpConnectorConfig) -> &'static [ConnectorActionSpec] {
    match connector.id.as_str() {
        "filesystem" => &[ConnectorActionSpec {
            title: "Filesystem search",
            description: "Search workspace files through the MCP filesystem connector.",
            kind: McpContextActionKind::FilesystemSearch,
        }],
        "git" => &[
            ConnectorActionSpec {
                title: "Git status",
                description: "Include the repository working tree status.",
                kind: McpContextActionKind::GitStatus,
            },
            ConnectorActionSpec {
                title: "Recent commits",
                description: "Include the latest commit history from the active repository.",
                kind: McpContextActionKind::GitLog,
            },
        ],
        "sqlite" => &[ConnectorActionSpec {
            title: "SQLite schema",
            description: "Inspect the configured SQLite database schema.",
            kind: McpContextActionKind::SqliteSchema,
        }],
        "postgres" => &[ConnectorActionSpec {
            title: "PostgreSQL schema",
            description: "Inspect the configured PostgreSQL schema.",
            kind: McpContextActionKind::PostgresSchema,
        }],
        "fetch" => &[ConnectorActionSpec {
            title: "Fetch URL in query",
            description: "Fetch the first direct URL in the prompt with the MCP fetch connector.",
            kind: McpContextActionKind::FetchUrl,
        }],
        "github" => &[
            ConnectorActionSpec {
                title: "GitHub repositories",
                description: "Search GitHub repositories with the current query.",
                kind: McpContextActionKind::GithubSearchRepositories,
            },
            ConnectorActionSpec {
                title: "GitHub issues and PRs",
                description: "Search GitHub issues and pull requests with the current query.",
                kind: McpContextActionKind::GithubSearchIssues,
            },
            ConnectorActionSpec {
                title: "GitHub code search",
                description: "Search GitHub code with the current query.",
                kind: McpContextActionKind::GithubSearchCode,
            },
        ],
        _ => &[],
    }
}

async fn connect_stdio(
    paths: &StoragePaths,
    connector: &McpConnectorConfig,
    workspace: Option<&Workspace>,
) -> VResult<StdioMcpClient> {
    let command = connector.command.as_deref().ok_or_else(|| {
        VError::Other(format!(
            "Connector {} has no command configured.",
            connector.name
        ))
    })?;
    let workspace_root = workspace.and_then(|workspace| workspace.root_path.as_deref());
    let args = resolve_args(paths, connector, workspace_root)?;
    let envs = resolve_env(connector.env.as_slice());
    let roots = resolve_roots(paths, connector, workspace_root)?;

    let mut child = Command::new(command);
    child
        .args(&args)
        .stdin(std::process::Stdio::piped())
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::null())
        .kill_on_drop(true);

    for (key, value) in envs {
        child.env(key, value);
    }

    let mut child = child
        .spawn()
        .map_err(|error| VError::Other(format!("Failed to start {}: {error}", connector.name)))?;

    let stdin = child
        .stdin
        .take()
        .ok_or_else(|| VError::Other(format!("{} stdin was unavailable.", connector.name)))?;
    let stdout = child
        .stdout
        .take()
        .ok_or_else(|| VError::Other(format!("{} stdout was unavailable.", connector.name)))?;

    let mut client = StdioMcpClient {
        child,
        stdin,
        reader: BufReader::new(stdout).lines(),
        next_id: 1,
        timeout: Duration::from_millis(connector.startup_timeout_ms.max(1_000)),
        roots,
        server_name: None,
        server_version: None,
    };

    client.initialize().await?;
    Ok(client)
}

fn resolve_args(
    paths: &StoragePaths,
    connector: &McpConnectorConfig,
    workspace_root: Option<&str>,
) -> VResult<Vec<String>> {
    connector
        .args
        .iter()
        .map(|arg| resolve_template(paths, connector, workspace_root, arg))
        .collect()
}

fn resolve_roots(
    paths: &StoragePaths,
    connector: &McpConnectorConfig,
    workspace_root: Option<&str>,
) -> VResult<Vec<String>> {
    connector
        .allowed_roots
        .iter()
        .map(|root| resolve_template(paths, connector, workspace_root, root))
        .collect()
}

fn resolve_template(
    paths: &StoragePaths,
    connector: &McpConnectorConfig,
    workspace_root: Option<&str>,
    value: &str,
) -> VResult<String> {
    if value.contains("${workspace_root}") && workspace_root.is_none() {
        return Err(VError::Other(format!(
            "Connector {} requires an active workspace root.",
            connector.name
        )));
    }

    if value.contains("${connector_url}")
        && connector.url.as_deref().unwrap_or("").trim().is_empty()
    {
        return Err(VError::Other(format!(
            "Connector {} requires a connector URL before it can run.",
            connector.name
        )));
    }

    let workspace_root = workspace_root.unwrap_or_default();
    let connector_url = connector.url.clone().unwrap_or_default();
    let resolved = value
        .replace("${workspace_root}", workspace_root)
        .replace("${vigilante_db}", &paths.database().display().to_string())
        .replace("${vigilante_data_dir}", &paths.base.display().to_string())
        .replace("${connector_url}", &connector_url);

    if resolved.contains("${workspace_root}") || resolved.contains("${connector_url}") {
        return Err(VError::Other(format!(
            "Connector {} requires additional configuration before it can run.",
            connector.name
        )));
    }

    Ok(resolved)
}

fn resolve_env(envs: &[McpEnvironmentVariable]) -> Vec<(String, String)> {
    envs.iter()
        .filter_map(|item| {
            if let Some(value) = item.value.as_ref() {
                Some((item.key.clone(), value.clone()))
            } else if let Some(source) = item.source_env.as_ref() {
                std::env::var(source)
                    .ok()
                    .map(|value| (item.key.clone(), value))
            } else {
                None
            }
        })
        .collect()
}

struct StdioMcpClient {
    child: Child,
    stdin: ChildStdin,
    reader: Lines<BufReader<ChildStdout>>,
    next_id: u64,
    timeout: Duration,
    roots: Vec<String>,
    server_name: Option<String>,
    server_version: Option<String>,
}

impl StdioMcpClient {
    async fn initialize(&mut self) -> VResult<()> {
        let result = self
            .request(
                "initialize",
                json!({
                    "protocolVersion": MCP_PROTOCOL_VERSION,
                    "capabilities": {
                        "roots": {
                            "listChanged": false,
                        },
                    },
                    "clientInfo": {
                        "name": "Vigilante",
                        "version": "0.1.0",
                    },
                }),
            )
            .await?;

        self.server_name = result
            .get("serverInfo")
            .and_then(|info| info.get("name"))
            .and_then(|name| name.as_str())
            .map(|name| name.to_string());
        self.server_version = result
            .get("serverInfo")
            .and_then(|info| info.get("version"))
            .and_then(|version| version.as_str())
            .map(|version| version.to_string());

        self.notification("notifications/initialized", json!({}))
            .await
    }

    async fn list_tools(&mut self) -> VResult<Vec<McpToolInfo>> {
        let result = self.request("tools/list", json!({})).await?;
        Ok(result
            .get("tools")
            .and_then(|tools| tools.as_array())
            .map(|tools| {
                tools
                    .iter()
                    .filter_map(|tool| {
                        Some(McpToolInfo {
                            name: tool.get("name")?.as_str()?.to_string(),
                            description: tool
                                .get("description")
                                .and_then(|description| description.as_str())
                                .map(|description| description.to_string()),
                        })
                    })
                    .collect()
            })
            .unwrap_or_default())
    }

    async fn list_resources(&mut self) -> VResult<Vec<McpResourceInfo>> {
        let result = self.request("resources/list", json!({})).await?;
        Ok(result
            .get("resources")
            .and_then(|resources| resources.as_array())
            .map(|resources| {
                resources
                    .iter()
                    .filter_map(|resource| {
                        Some(McpResourceInfo {
                            uri: resource.get("uri")?.as_str()?.to_string(),
                            name: resource
                                .get("name")
                                .and_then(|name| name.as_str())
                                .map(|name| name.to_string()),
                            description: resource
                                .get("description")
                                .and_then(|description| description.as_str())
                                .map(|description| description.to_string()),
                            mime_type: resource
                                .get("mimeType")
                                .and_then(|mime_type| mime_type.as_str())
                                .map(|mime_type| mime_type.to_string()),
                        })
                    })
                    .collect()
            })
            .unwrap_or_default())
    }

    async fn call_tool(&mut self, name: &str, arguments: Value) -> VResult<Value> {
        self.request(
            "tools/call",
            json!({
                "name": name,
                "arguments": arguments,
            }),
        )
        .await
    }

    async fn read_resource(&mut self, uri: &str) -> VResult<Value> {
        self.request("resources/read", json!({ "uri": uri })).await
    }

    async fn request(&mut self, method: &str, params: Value) -> VResult<Value> {
        let id = self.next_id;
        self.next_id += 1;
        self.write(json!({
            "jsonrpc": "2.0",
            "id": id,
            "method": method,
            "params": params,
        }))
        .await?;

        loop {
            let message = self.read_message().await?;

            if message.get("id").and_then(|value| value.as_u64()) == Some(id) {
                if let Some(error) = message.get("error") {
                    return Err(VError::Other(format!(
                        "MCP request {method} failed: {}",
                        pretty_json(error)
                    )));
                }

                return Ok(message.get("result").cloned().unwrap_or(Value::Null));
            }

            if message.get("method").is_some() {
                self.handle_server_message(message).await?;
            }
        }
    }

    async fn notification(&mut self, method: &str, params: Value) -> VResult<()> {
        self.write(json!({
            "jsonrpc": "2.0",
            "method": method,
            "params": params,
        }))
        .await
    }

    async fn write(&mut self, payload: Value) -> VResult<()> {
        let line = serde_json::to_string(&payload)?;
        self.stdin.write_all(line.as_bytes()).await?;
        self.stdin.write_all(b"\n").await?;
        self.stdin.flush().await?;
        Ok(())
    }

    async fn read_message(&mut self) -> VResult<Value> {
        loop {
            let next_line = timeout(self.timeout, self.reader.next_line())
                .await
                .map_err(|_| VError::Other("Timed out waiting for MCP server response.".into()))?;
            let line = next_line?
                .ok_or_else(|| VError::Other("MCP server closed the connection.".into()))?;
            if line.trim().is_empty() {
                continue;
            }

            match serde_json::from_str::<Value>(&line) {
                Ok(value) => return Ok(value),
                Err(_) => continue,
            }
        }
    }

    async fn handle_server_message(&mut self, message: Value) -> VResult<()> {
        let Some(method) = message.get("method").and_then(|method| method.as_str()) else {
            return Ok(());
        };

        let Some(id) = message.get("id").cloned() else {
            return Ok(());
        };

        let result = match method {
            "roots/list" => json!({
                "roots": self
                    .roots
                    .iter()
                    .filter_map(|root| build_root_descriptor(root))
                    .collect::<Vec<_>>(),
            }),
            "ping" => json!({}),
            _ => {
                self.write(json!({
                    "jsonrpc": "2.0",
                    "id": id,
                    "error": {
                        "code": -32601,
                        "message": format!("Client method {method} is not supported by Vigilante."),
                    }
                }))
                .await?;
                return Ok(());
            }
        };

        self.write(json!({
            "jsonrpc": "2.0",
            "id": id,
            "result": result,
        }))
        .await
    }

    async fn shutdown(&mut self) -> VResult<()> {
        let _ = self.child.start_kill();
        let _ = timeout(Duration::from_secs(1), self.child.wait()).await;
        Ok(())
    }
}

fn build_root_descriptor(root: &str) -> Option<Value> {
    let path = PathBuf::from(root);
    let uri = Url::from_file_path(&path).ok()?;
    let name = path
        .file_name()
        .and_then(|name| name.to_str())
        .unwrap_or("workspace");
    Some(json!({
        "uri": uri.to_string(),
        "name": name,
    }))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::settings::{McpTier, McpTransport};

    fn sample_connector() -> McpConnectorConfig {
        McpConnectorConfig {
            id: "filesystem".into(),
            name: "Filesystem".into(),
            description: "Filesystem connector".into(),
            tier: McpTier::Tier1,
            transport: McpTransport::Stdio,
            enabled: true,
            read_only: true,
            command: Some("npx".into()),
            args: vec!["${workspace_root}".into(), "${vigilante_db}".into()],
            url: None,
            env: Vec::new(),
            allowed_roots: vec!["${workspace_root}".into()],
            workspace_root_required: true,
            startup_timeout_ms: 8_000,
        }
    }

    #[test]
    fn resolves_builtin_templates() {
        let connector = sample_connector();
        let paths = StoragePaths::new(PathBuf::from("/tmp/vigilante"));

        let args = resolve_args(&paths, &connector, Some("/tmp/workspace")).expect("args");
        assert_eq!(args[0], "/tmp/workspace");
        assert_eq!(args[1], "/tmp/vigilante/vigilante.sqlite3");
    }

    #[test]
    fn lookup_returns_enabled_connector_actions() {
        let workspace = Workspace {
            id: uuid::Uuid::new_v4(),
            name: "Repo".into(),
            root_path: Some("/tmp/repo".into()),
            is_active: true,
            created_at: chrono::Utc::now(),
            updated_at: chrono::Utc::now(),
        };
        let settings = McpSettings {
            enabled_by_default: false,
            max_context_items: 6,
            connectors: vec![sample_connector()],
        };

        let items = lookup_context_action_items(&settings, &workspace, "git");
        assert!(items.is_empty());

        let items = lookup_context_action_items(&settings, &workspace, "filesystem");
        assert_eq!(items.len(), 1);
        assert!(items[0].mcp_action.is_some());
    }
}
