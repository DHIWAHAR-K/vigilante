import { invoke } from '@tauri-apps/api/core';

export type RuntimeStatus = 'unknown' | 'running' | 'available' | 'stopped' | 'not-installed' | 'error';

export interface RuntimeModel {
  id: string;
  name: string;
  size_bytes: number;
  modified_at: string | null;
  family: string | null;
  parameter_size: string | null;
  quantization: string | null;
}

export interface RuntimeStatusResponse {
  status: RuntimeStatus;
  version: string | null;
  models: RuntimeModel[];
  base_url: string;
  probed_at: string;
}

export interface QueryRequest {
  query: string;
  conversationId: string | null;
  mode: 'ask' | 'research' | 'rag' | 'agent';
  provider: {
    id: string;
    model: string;
  };
  webSearch: boolean;
  files: string[];
}

export interface QueryResponse {}

export interface SSETokenEvent {
  event: 'token';
  data: {
    token: string;
  };
}

export interface SSESourcesEvent {
  event: 'sources';
  data: {
    sources: Source[];
  };
}

export interface SSEFollowupsEvent {
  event: 'followups';
  data: {
    questions: string[];
  };
}

export interface SSEDoneEvent {
  event: 'done';
  data: {
    messageId: string;
    tokensUsed: number;
  };
}

export interface SSEErrorEvent {
  event: 'error';
  data: {
    message: string;
  };
}

export type SSEEvent = 
  | SSETokenEvent 
  | SSESourcesEvent 
  | SSEFollowupsEvent 
  | SSEDoneEvent 
  | SSEErrorEvent;

export interface Source {
  id: string;
  title: string;
  url: string;
  favicon?: string;
  excerpt?: string;
}

export const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

export async function checkRuntime(): Promise<RuntimeStatusResponse> {
  return invoke<RuntimeStatusResponse>('check_runtime');
}

export async function getCachedRuntimeStatus(): Promise<RuntimeStatusResponse> {
  return invoke<RuntimeStatusResponse>('get_cached_runtime_status');
}

export async function listModels(): Promise<RuntimeModel[]> {
  return invoke<RuntimeModel[]>('list_models');
}

let abortController: AbortController | null = null;

export async function* streamQuery(request: QueryRequest): AsyncGenerator<SSEEvent> {
  abortController = new AbortController();
  
  const response = await fetch('http://localhost:3000/api/query', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
    signal: abortController.signal,
  });

  if (!response.ok) {
    const error = await response.text();
    yield { event: 'error', data: { message: error || 'Request failed' } };
    return;
  }

  if (!response.body) {
    yield { event: 'error', data: { message: 'No response body' } };
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      
      if (done) break;
      
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('event:')) {
          continue;
        }
        
        if (line.startsWith('data:')) {
          const data = line.slice(5).trim();
          if (!data) continue;
          
          try {
            const parsed = JSON.parse(data);
            
            if (parsed.token) {
              yield { event: 'token', data: { token: parsed.token } };
            } else if (parsed.sources) {
              yield { event: 'sources', data: { sources: parsed.sources } };
            } else if (parsed.questions) {
              yield { event: 'followups', data: { questions: parsed.questions } };
            } else if (parsed.messageId) {
              yield { event: 'done', data: parsed };
            } else if (parsed.message) {
              yield { event: 'error', data: parsed };
            }
          } catch {
            // Skip invalid JSON
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
    abortController = null;
  }
}

export function abortQuery(): void {
  if (abortController) {
    abortController.abort();
    abortController = null;
  }
}
