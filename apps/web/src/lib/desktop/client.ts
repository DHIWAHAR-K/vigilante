'use client';

export type QueryMode = 'ask' | 'research' | 'deep_research' | 'rag';
export type Theme = 'light' | 'dark' | 'system';
export type FontSize = 'small' | 'medium' | 'large';
export type SearchProvider = 'brave' | 'serper' | 'searx_ng';
export type AttachmentKind = 'image' | 'document' | 'code' | 'data' | 'other';
export type McpTransport = 'stdio' | 'streamable_http';
export type McpTier = 'tier1' | 'tier2' | 'tier3';
export type McpContextActionKind =
  | 'filesystem_search'
  | 'git_status'
  | 'git_log'
  | 'sqlite_schema'
  | 'postgres_schema'
  | 'fetch_url'
  | 'github_search_repositories'
  | 'github_search_issues'
  | 'github_search_code';
export type OllamaStatus =
  | 'unknown'
  | 'running'
  | 'available'
  | 'stopped'
  | 'not_installed'
  | 'error';
export type StartOutcome =
  | 'already_running'
  | 'started'
  | 'not_installed'
  | 'timeout'
  | 'failed';

export interface Workspace {
  id: string;
  name: string;
  rootPath: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceContextItem {
  id: string;
  kind: 'file' | 'directory' | 'thread' | 'url' | 'mcp';
  title: string;
  path: string | null;
  subtitle: string | null;
  value?: string | null;
  source?: string | null;
  mcpAction?: McpContextAction | null;
}

export interface Citation {
  id: string;
  index: number;
  title: string;
  url: string;
  faviconUrl?: string | null;
  excerpt?: string | null;
  domain?: string | null;
}

export interface ModelUsed {
  providerId: string;
  modelId: string;
  tokensIn?: number | null;
  tokensOut?: number | null;
  latencyMs?: number | null;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  citations: Citation[];
  followUps: string[];
  mode: QueryMode;
  modelUsed?: ModelUsed | null;
  isComplete: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ThreadSummary {
  id: string;
  workspaceId: string;
  title: string;
  preview: string;
  archived: boolean;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
  lastOpenedAt?: string | null;
}

export interface ThreadDetail {
  thread: ThreadSummary;
  messages: Message[];
  attachments: AttachmentSummary[];
}

export interface DesktopContextItem {
  id: string;
  kind: 'file' | 'directory' | 'thread' | 'url' | 'text';
  title: string;
  path?: string | null;
  value?: string | null;
  source?: string | null;
  mcpAction?: McpContextAction | null;
}

export interface AttachmentSummary {
  id: string;
  displayName: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  kind: AttachmentKind;
  previewDataUrl?: string | null;
  originalPath: string;
  createdAt: string;
}

export type ComposerAttachment = AttachmentSummary;

export interface DraftContextItem {
  kind: 'file_ref' | 'url' | 'clipboard_text';
  label: string;
  value: string;
}

export interface DraftThread {
  id: string;
  inputText: string;
  provider: ProviderConfig;
  contextItems: DraftContextItem[];
  attachments: ComposerAttachment[];
  createdAt: string;
  updatedAt: string;
}

export interface PersistedThread {
  id: string;
  title: string;
  messages: Message[];
  attachmentIds: string[];
  archived: boolean;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
  lastOpenedAt?: string | null;
}

export interface QuerySubmission {
  threadId: string;
  userMessageId: string;
  assistantMessageId: string;
}

export interface QueryFinished {
  threadId: string;
  assistantMessageId: string;
  citations: Citation[];
}

export interface AssistantTokenEvent {
  threadId: string;
  messageId: string;
  token: string;
}

export interface AssistantCitationsEvent {
  threadId: string;
  messageId: string;
  citations: Citation[];
}

export interface ResearchProgressEvent {
  threadId: string;
  phase: string;
  message: string;
}

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  rank: number;
}

export interface WebSource {
  id: string;
  url: string;
  title: string;
  excerpt: string;
  domain: string | null;
  fetchedAt: string;
  contentPath: string | null;
  contentText: string;
}

export interface StorageInfo {
  basePath: string;
  threadCount: number;
  draftCount: number;
  totalSizeBytes: number;
}

export interface AppearanceSettings {
  theme: Theme;
  sidebarCollapsed: boolean;
  fontSize: FontSize;
}

export interface ProviderConfig {
  providerId: string;
  modelId: string;
}

export interface ProviderKeys {
  openai?: string | null;
  anthropic?: string | null;
  groq?: string | null;
  gemini?: string | null;
  openrouter?: string | null;
}

export interface SearchSettings {
  enabledByDefault: boolean;
  provider: SearchProvider;
  braveApiKey: string | null;
  searxngBaseUrl: string | null;
}

export interface McpEnvironmentVariable {
  key: string;
  value: string | null;
  sourceEnv: string | null;
}

export interface McpConnectorConfig {
  id: string;
  name: string;
  description: string;
  tier: McpTier;
  transport: McpTransport;
  enabled: boolean;
  readOnly: boolean;
  command: string | null;
  args: string[];
  url: string | null;
  env: McpEnvironmentVariable[];
  allowedRoots: string[];
  workspaceRootRequired: boolean;
  startupTimeoutMs: number;
}

export interface McpSettings {
  enabledByDefault: boolean;
  maxContextItems: number;
  connectors: McpConnectorConfig[];
}

export interface McpContextAction {
  connectorId: string;
  kind: McpContextActionKind;
}

export interface McpToolInfo {
  name: string;
  description?: string | null;
}

export interface McpResourceInfo {
  uri: string;
  name?: string | null;
  description?: string | null;
  mimeType?: string | null;
}

export interface McpConnectorStatus {
  connectorId: string;
  name: string;
  enabled: boolean;
  transport: McpTransport;
  available: boolean;
  serverName?: string | null;
  serverVersion?: string | null;
  tools: McpToolInfo[];
  resources: McpResourceInfo[];
  error?: string | null;
}

export interface AppSettings {
  schemaVersion: number;
  appearance: AppearanceSettings;
  defaultProvider: ProviderConfig;
  providerKeys: ProviderKeys;
  search: SearchSettings;
  mcp: McpSettings;
  hasCompletedOnboarding: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RuntimeSettings {
  ollamaBaseUrl: string;
  defaultModel: string | null;
  connectionTimeoutMs: number;
  updatedAt: string;
}

export interface ModelInfo {
  id: string;
  name: string;
  sizeBytes: number;
  modifiedAt: string | null;
  family: string | null;
  parameterSize: string | null;
  quantization: string | null;
}

export interface RuntimeSnapshot {
  runtime: OllamaRuntimeStatusInfo;
  selectedModelId: string | null;
  installedModels: ModelInfo[];
}

export interface CatalogModel {
  id: string;
  name: string;
  description: string;
  family: string | null;
  sizeBytes: number;
  parameterSize: string;
  quantization: string;
  contextWindow: number;
  tags: string[];
  supportsCpu: boolean;
  supportsAppleSilicon: boolean;
  supportsNvidia: boolean;
  minMemoryGb: number | null;
}

export type ModelInstallStatus =
  | 'queued'
  | 'downloading'
  | 'verifying'
  | 'complete'
  | 'failed'
  | 'cancelled';

export interface ModelInstallJob {
  id: string;
  modelId: string;
  status: ModelInstallStatus;
  progressPercent: number;
  downloadedBytes: number | null;
  totalBytes: number | null;
  message: string | null;
  error: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export interface OllamaRuntimeStatusInfo {
  status: OllamaStatus;
  version: string | null;
  models: ModelInfo[];
  baseUrl: string;
  probedAt: string;
}

export interface EnsureReadyResult {
  runtime: OllamaRuntimeStatusInfo;
  startAttempted: boolean;
  startOutcome: StartOutcome | null;
}

async function invokeCommand<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke<T>(cmd, args);
}

export async function listenEvent<T>(
  event: string,
  handler: (payload: T) => void,
): Promise<() => void> {
  const { listen } = await import('@tauri-apps/api/event');
  const unlisten = await listen<T>(event, (evt) => handler(evt.payload));
  return unlisten;
}

export function isDesktopApp(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

export function listWorkspaces(): Promise<Workspace[]> {
  return invokeCommand('list_workspaces');
}

export function getActiveWorkspace(): Promise<Workspace> {
  return invokeCommand('get_active_workspace');
}

export function pickWorkspaceDirectory(): Promise<string | null> {
  return invokeCommand('pick_workspace_directory_cmd');
}

export function pickAttachmentFiles(): Promise<string[]> {
  return invokeCommand('pick_attachment_files_cmd');
}

export function importAttachments(ownerId: string, paths: string[]): Promise<AttachmentSummary[]> {
  return invokeCommand('import_attachments_cmd', {
    ownerId,
    paths,
  });
}

export function listAttachments(ownerId: string): Promise<AttachmentSummary[]> {
  return invokeCommand('list_attachments_cmd', { ownerId });
}

export function removeAttachment(ownerId: string, attachmentId: string): Promise<void> {
  return invokeCommand('remove_attachment_cmd', {
    ownerId,
    attachmentId,
  });
}

export function createWorkspace(name: string, rootPath: string | null): Promise<Workspace> {
  return invokeCommand('create_workspace_cmd', {
    request: {
      name,
      rootPath,
    },
  });
}

export function setActiveWorkspace(id: string): Promise<Workspace> {
  return invokeCommand('set_active_workspace_cmd', { id });
}

export function lookupContextItems(
  workspaceId: string,
  query: string,
): Promise<WorkspaceContextItem[]> {
  return invokeCommand('lookup_context_items_cmd', { workspaceId, query });
}

export function listThreads(workspaceId: string): Promise<ThreadSummary[]> {
  return invokeCommand('list_workspace_threads', { workspaceId });
}

export function openThread(threadId: string): Promise<ThreadDetail> {
  return invokeCommand('open_workspace_thread', { threadId });
}

export function archiveThread(threadId: string): Promise<void> {
  return invokeCommand('archive_workspace_thread', { threadId });
}

export function deleteThread(threadId: string): Promise<void> {
  return invokeCommand('delete_workspace_thread', { threadId });
}

export function listThreadSources(threadId: string): Promise<WebSource[]> {
  return invokeCommand('list_thread_sources', { threadId });
}

export function exportWorkspaceThread(
  threadId: string,
  format: 'md' | 'json' = 'md',
): Promise<string> {
  return invokeCommand('export_workspace_thread', { threadId, format });
}

export function submitDesktopQuery(input: {
  workspaceId: string;
  threadId?: string | null;
  draftId?: string | null;
  query: string;
  mode: QueryMode;
  webSearch: boolean;
  contextItems: DesktopContextItem[];
  attachments: ComposerAttachment[];
}): Promise<QuerySubmission> {
  return invokeCommand('submit_desktop_query', {
    request: {
      workspaceId: input.workspaceId,
      threadId: input.threadId ?? null,
      draftId: input.draftId ?? null,
      query: input.query,
      mode: input.mode,
      webSearch: input.webSearch,
      contextItems: input.contextItems,
      attachments: input.attachments,
    },
  });
}

export function createDraft(provider: ProviderConfig): Promise<DraftThread> {
  return invokeCommand('create_draft_cmd', { provider });
}

export function getDraft(id: string): Promise<DraftThread> {
  return invokeCommand('get_draft_cmd', { id });
}

export function saveDraft(
  id: string,
  inputText: string,
  contextItems: DraftContextItem[],
): Promise<DraftThread> {
  return invokeCommand('save_draft_cmd', {
    id,
    inputText,
    contextItems,
  });
}

export function discardDraft(id: string): Promise<void> {
  return invokeCommand('discard_draft_cmd', { id });
}

export function promoteDraft(draftId: string, firstMessage: Message): Promise<PersistedThread> {
  return invokeCommand('promote_draft_cmd', {
    draftId,
    firstMessage,
  });
}

export function getSettings(): Promise<AppSettings> {
  return invokeCommand('get_settings');
}

export function updateSettings(settings: AppSettings): Promise<AppSettings> {
  return invokeCommand('update_settings', { settings });
}

export function probeMcpConnector(connectorId: string): Promise<McpConnectorStatus> {
  return invokeCommand('probe_mcp_connector_cmd', { connectorId });
}

export function getRuntimeConfig(): Promise<RuntimeSettings> {
  return invokeCommand('get_runtime_config');
}

export function updateRuntimeConfig(config: RuntimeSettings): Promise<RuntimeSettings> {
  return invokeCommand('update_runtime_config', { config });
}

export function getCachedRuntimeStatus(): Promise<OllamaRuntimeStatusInfo> {
  return invokeCommand('get_cached_runtime_status');
}

export function probeRuntime(): Promise<OllamaRuntimeStatusInfo> {
  return invokeCommand('probe_runtime');
}

export function ensureRuntimeReady(): Promise<EnsureReadyResult> {
  return invokeCommand('ensure_runtime_ready');
}

export function listRuntimeModels(): Promise<ModelInfo[]> {
  return invokeCommand('list_models');
}

export function getRuntimeSnapshot(): Promise<RuntimeSnapshot> {
  return invokeCommand('get_runtime_snapshot');
}

export function listModelCatalog(): Promise<CatalogModel[]> {
  return invokeCommand('list_model_catalog');
}

export function listInstalledModels(): Promise<ModelInfo[]> {
  return invokeCommand('list_installed_models_cmd');
}

export function getSelectedModel(): Promise<string> {
  return invokeCommand('get_selected_model_cmd');
}

export function selectModel(modelId: string): Promise<string> {
  return invokeCommand('select_model_cmd', { modelId });
}

export function installModel(modelId: string): Promise<ModelInstallJob> {
  return invokeCommand('install_model_cmd', { modelId });
}

export function getInstallJob(jobId: string): Promise<ModelInstallJob | null> {
  return invokeCommand('get_install_job_cmd', { jobId });
}

export function cancelInstallJob(jobId: string): Promise<ModelInstallJob | null> {
  return invokeCommand('cancel_install_job_cmd', { jobId });
}

export function deleteModel(modelId: string): Promise<void> {
  return invokeCommand('delete_model_cmd', { modelId });
}

export function getStorageInfo(): Promise<StorageInfo> {
  return invokeCommand('get_storage_info_cmd');
}
