import { useCallback, useRef, useState } from 'react';
import { useRuntimeStore } from '@/store/useRuntimeStore';
import { Source } from '@/store/useConversationStore';

function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
}

function formatBytesToSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

interface UseQueryStreamOptions {
  onToken: (token: string) => void;
  onSources: (sources: Source[]) => void;
  onFollowups: (questions: string[]) => void;
  onDone: (messageId: string, tokensUsed: number) => void;
  onError: (error: string) => void;
  onComplete: () => void;
}

interface UseQueryStreamReturn {
  submitQuery: (query: string, conversationId: string | null, selectedModel: string | null) => void;
  isStreaming: boolean;
  abort: () => void;
}

const OLLAMA_BASE_URL = 'http://localhost:11434';

async function* streamFromOllama(
  prompt: string,
  model: string,
  signal: AbortSignal
): AsyncGenerator<{ event: string; data: unknown }> {
  const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      prompt,
      stream: true,
    }),
    signal,
  });

  if (!response.ok) {
    const errorText = await response.text();
    yield { event: 'error', data: { message: `Ollama error: ${errorText}` } };
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
        if (!line.trim()) continue;
        try {
          const parsed = JSON.parse(line);
          if (parsed.response) {
            yield { event: 'token', data: { token: parsed.response } };
          }
          if (parsed.done) {
            yield { 
              event: 'done', 
              data: { 
                messageId: generateId(), 
                tokensUsed: parsed.prompt_eval_count + parsed.eval_count || 0 
              } 
            };
          }
        } catch {
          // Skip invalid JSON
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

export function useQueryStream(options: UseQueryStreamOptions): UseQueryStreamReturn {
  const { status: runtimeStatus, models, baseUrl } = useRuntimeStore();
  const isStreamingRef = useRef(false);
  const abortRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const submitQuery = useCallback((
    query: string,
    conversationId: string | null,
    selectedModel: string | null
  ) => {
    if (isStreamingRef.current || !selectedModel) {
      options.onError('No model selected or already streaming');
      return;
    }

    isStreamingRef.current = true;
    abortRef.current = false;
    abortControllerRef.current = new AbortController();

    const model = models.find(m => m.id === selectedModel)?.id || selectedModel;

    // Build conversation context for the prompt
    const conversationContext = '';

    const systemPrompt = `You are a helpful AI assistant. Answer the user's question concisely and accurately.`;

    const fullPrompt = `${systemPrompt}\n\nUser: ${query}`;

    (async () => {
      try {
        // Try orchestrator first, fall back to direct Ollama
        try {
          const response = await fetch(`${process.env.NEXT_PUBLIC_ORCHESTRATOR_URL || 'http://localhost:3000'}/api/query`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              query,
              conversationId,
              mode: 'ask',
              provider: { id: 'ollama', model },
              webSearch: false,
              files: [],
            }),
            signal: abortControllerRef.current?.signal,
          });

          if (!response.ok) {
            throw new Error(`Orchestrator returned ${response.status}`);
          }

          if (!response.body) {
            throw new Error('No response body');
          }

          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (line.startsWith('data:')) {
                const data = line.slice(5).trim();
                if (!data) continue;

                try {
                  const parsed = JSON.parse(data);
                  if (parsed.token) {
                    options.onToken(parsed.token);
                  } else if (parsed.sources) {
                    options.onSources(parsed.sources);
                  } else if (parsed.questions) {
                    options.onFollowups(parsed.questions);
                  } else if (parsed.messageId) {
                    options.onDone(parsed.messageId, parsed.tokensUsed || 0);
                  } else if (parsed.message) {
                    options.onError(parsed.message);
                  }
                } catch {
                  // Skip invalid JSON
                }
              }
            }
          }
        } catch (orchestratorError) {
          // Fall back to direct Ollama API
          console.log('Orchestrator not available, using direct Ollama:', orchestratorError);
          
          for await (const event of streamFromOllama(fullPrompt, model, abortControllerRef.current!.signal)) {
            if (abortRef.current) break;

            switch (event.event) {
              case 'token':
                options.onToken((event.data as { token: string }).token);
                break;
              case 'sources':
                options.onSources((event.data as { sources: Source[] }).sources);
                break;
              case 'followups':
                options.onFollowups((event.data as { questions: string[] }).questions);
                break;
              case 'done':
                const doneData = event.data as { messageId: string; tokensUsed: number };
                options.onDone(doneData.messageId, doneData.tokensUsed);
                break;
              case 'error':
                options.onError((event.data as { message: string }).message);
                break;
            }
          }
        }
      } catch (error) {
        if (!abortRef.current) {
          options.onError(error instanceof Error ? error.message : 'Stream failed');
        }
      } finally {
        isStreamingRef.current = false;
        abortControllerRef.current = null;
        options.onComplete();
      }
    })();
  }, [options, models]);

  const abort = useCallback(() => {
    abortRef.current = true;
    abortControllerRef.current?.abort();
    isStreamingRef.current = false;
  }, []);

  return {
    submitQuery,
    get isStreaming() { return isStreamingRef.current; },
    abort,
  };
}

export { generateId, formatBytesToSize };
