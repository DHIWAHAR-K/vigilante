'use client';

export type QueryMode = 'ask' | 'research' | 'deep_research' | 'rag';
export type Theme = 'light' | 'dark' | 'system';
export type FontSize = 'small' | 'medium' | 'large';
export type SearchProvider = 'brave' | 'serper' | 'searx_ng';
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
  kind: 'file' | 'directory' | 'thread' | 'url';
  title: string;
  path: string | null;
  subtitle: string | null;
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
}

export interface DesktopContextItem {
  id: string;
  kind: 'file' | 'directory' | 'thread' | 'url' | 'text';
  title: string;
  path?: string | null;
  value?: string | null;
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

export interface AppSettings {
  schemaVersion: number;
  appearance: AppearanceSettings;
  defaultProvider: ProviderConfig;
  providerKeys: ProviderKeys;
  search: SearchSettings;
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
  query: string;
  mode: QueryMode;
  webSearch: boolean;
  contextItems: DesktopContextItem[];
}): Promise<QuerySubmission> {
  return invokeCommand('submit_desktop_query', {
    request: {
      workspaceId: input.workspaceId,
      threadId: input.threadId ?? null,
      query: input.query,
      mode: input.mode,
      webSearch: input.webSearch,
      contextItems: input.contextItems,
    },
  });
}

export function getSettings(): Promise<AppSettings> {
  return invokeCommand('get_settings');
}

export function updateSettings(settings: AppSettings): Promise<AppSettings> {
  return invokeCommand('update_settings', { settings });
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
