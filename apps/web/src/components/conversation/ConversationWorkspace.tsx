'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useConversationStore, Message, Source } from '@/store/useConversationStore';
import { useUIStore } from '@/store/useUIStore';
import { ConversationThread } from './ConversationThread';
import { QueryInput } from '@/components/query/QueryInput';
import { ContextItem } from '@/components/query/types';
import { HomeIntro } from '@/components/layout/HomeIntro';
import { SourceTray } from '@/components/sources/SourceTray';
import { RuntimeStatusChip } from '@/components/runtime/RuntimeStatusChip';
import { useRuntimeStore } from '@/store/useRuntimeStore';
import { conversationStateVariants, TRANSITIONS } from '@/lib/motion-config';

function generateId() {
  return Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
}

function generateTitle(content: string): string {
  const firstLine = content.split('\n')[0];
  return firstLine.length > 50 ? firstLine.substring(0, 47) + '...' : firstLine;
}

export function ConversationWorkspace() {
  const { 
    activeConversationId, 
    conversations, 
    isDraftMode,
    setDraftInput,
    createConversationFromDraft,
    addMessage,
    updateAssistantMessage,
  } = useConversationStore();
  
  const { setRuntimeCenterOpen } = useUIStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [streamingSources, setStreamingSources] = useState<Source[]>([]);
  const [streamingFollowups, setStreamingFollowups] = useState<string[]>([]);
  const [sourceTrayExpanded, setSourceTrayExpanded] = useState(false);
  const [justSentFirstMessage, setJustSentFirstMessage] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);
  
  const streamingMessageIdRef = useRef<string | null>(null);
  
  const activeConversation = conversations.find(c => c.id === activeConversationId);
  const hasMessages = activeConversation?.messages && activeConversation.messages.length > 0;
  const isInConversation = isDraftMode || hasMessages;
  const { status, isOnline, selectedModel, checkRuntime } = useRuntimeStore();

  // Initialize runtime on mount
  useEffect(() => {
    checkRuntime();
  }, []);

  const handleToken = useCallback((token: string) => {
    setStreamingContent(prev => prev + token);
  }, []);

  const handleSources = useCallback((sources: Source[]) => {
    setStreamingSources(sources);
  }, []);

  const handleFollowups = useCallback((questions: string[]) => {
    setStreamingFollowups(questions);
  }, []);

  const handleDone = useCallback((messageId: string, tokensUsed: number) => {
    streamingMessageIdRef.current = messageId;
  }, []);

  const handleStreamError = useCallback((error: string) => {
    setStreamError(error);
  }, []);

  const handleStreamComplete = useCallback(() => {
    if (streamingMessageIdRef.current && activeConversationId) {
      const assistantMessage: Message = {
        id: streamingMessageIdRef.current,
        role: 'assistant',
        content: streamingContent,
        sources: streamingSources.length > 0 ? streamingSources : undefined,
        createdAt: new Date()
      };
      
      addMessage(activeConversationId, assistantMessage);
    }
    
    setStreamingContent('');
    setStreamingSources([]);
    setStreamingFollowups([]);
    streamingMessageIdRef.current = null;
    setIsSubmitting(false);
    setStreamError(null);
  }, [activeConversationId, streamingContent, streamingSources, addMessage]);

  const handleSubmit = useCallback((query: string, context: ContextItem[]) => {
    if (!query.trim() || isSubmitting) return;
    
    const wasDraft = isDraftMode;
    setIsSubmitting(true);
    setStreamError(null);
    setStreamingContent('');
    setStreamingSources([]);
    setStreamingFollowups([]);
    
    let conversationId = activeConversationId;
    
    if (wasDraft) {
      const newConv = createConversationFromDraft(generateTitle(query));
      conversationId = newConv.id;
      setJustSentFirstMessage(true);
      setTimeout(() => setJustSentFirstMessage(false), 600);
    }
    
    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content: query,
      createdAt: new Date()
    };
    
    addMessage(conversationId!, userMessage);
    setDraftInput('');

    // Stream from Ollama directly
    const streamFromOllama = async () => {
      const model = selectedModel || 'llama3.2';
      
      try {
        const response = await fetch('http://localhost:11434/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model,
            prompt: `You are a helpful AI assistant. Answer the user's question concisely and accurately.\n\nUser: ${query}\n\nAssistant:`,
            stream: true,
          }),
        });

        if (!response.ok) {
          throw new Error(`Ollama error: ${response.status}`);
        }

        if (!response.body) {
          throw new Error('No response body');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let messageId = generateId();
        streamingMessageIdRef.current = messageId;

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
                handleToken(parsed.response);
              }
              if (parsed.done) {
                handleDone(messageId, parsed.prompt_eval_count + parsed.eval_count || 0);
              }
            } catch {
              // Skip invalid JSON
            }
          }
        }
      } catch (error) {
        handleStreamError(error instanceof Error ? error.message : 'Failed to connect to Ollama');
      } finally {
        handleStreamComplete();
      }
    };

    // Start streaming with a small delay
    setTimeout(streamFromOllama, 300);
  }, [
    activeConversationId, 
    isDraftMode, 
    createConversationFromDraft, 
    addMessage, 
    setDraftInput, 
    isSubmitting,
    selectedModel,
    handleToken,
    handleDone,
    handleStreamError,
    handleStreamComplete,
  ]);

  // Close source tray when new message comes in
  useEffect(() => {
    if (activeConversation?.messages && activeConversation.messages.length > 0) {
      setSourceTrayExpanded(false);
    }
  }, [activeConversation?.messages?.length]);

  // Combine streaming content with existing messages for display
  const displayMessages = activeConversation?.messages || [];
  const hasStreamingContent = streamingContent.length > 0 || isSubmitting;

  return (
    <div className="flex flex-col h-full w-full relative">
      {/* Runtime Status Header */}
      <div className="flex items-center justify-between px-6 pt-4 pb-2">
        <div className="flex items-center gap-3">
          {isInConversation && activeConversation && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-2"
            >
              <h2 className="text-body-sm font-medium text-text-primary truncate max-w-[300px]">
                {activeConversation.title}
              </h2>
              <span className="text-caption text-text-muted">
                {activeConversation.messages.length} message{activeConversation.messages.length !== 1 ? 's' : ''}
              </span>
            </motion.div>
          )}
        </div>
        
            <RuntimeStatusChip onClick={() => setRuntimeCenterOpen(true)} />
      </div>

      <AnimatePresence mode="wait">
        {isInConversation ? (
          <motion.div
            key="conversation"
            variants={conversationStateVariants}
            initial="empty"
            animate={justSentFirstMessage ? "draft" : "active"}
            transition={TRANSITIONS.smooth}
            className="flex flex-col flex-1 overflow-hidden"
          >
            <ConversationThread 
              conversation={activeConversation || null} 
              isDraft={isDraftMode}
            />
            
            {/* Streaming Response */}
            <AnimatePresence>
              {hasStreamingContent && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                  className="px-6 py-4 max-w-[900px] mx-auto w-full"
                >
                  <div className="flex gap-4">
                    <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center shrink-0">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        className="w-4 h-4 border-2 border-bg-base border-t-transparent rounded-full"
                      />
                    </div>
                    <div className="flex-1">
                      <p className="text-body-md text-text-primary whitespace-pre-wrap leading-relaxed">
                        {streamingContent}
                        <motion.span
                          animate={{ opacity: [0, 1, 0] }}
                          transition={{ duration: 0.8, repeat: Infinity }}
                          className="inline-block w-0.5 h-4 bg-accent ml-0.5 align-middle"
                        />
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Error Display */}
            <AnimatePresence>
              {streamError && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="px-6 py-4 max-w-[900px] mx-auto w-full"
                >
                  <div className="p-4 rounded-lg bg-error/10 border border-error/20">
                    <p className="text-body-sm text-error">
                      {streamError}
                    </p>
                    <button
                      onClick={() => setStreamError(null)}
                      className="mt-2 text-caption text-text-muted hover:text-text-primary"
                    >
                      Dismiss
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Source Tray */}
            {activeConversation?.messages && activeConversation.messages.some(m => m.sources) && (
              <SourceTray 
                sources={activeConversation.messages.flatMap(m => m.sources || [])}
                isExpanded={sourceTrayExpanded}
                onToggle={() => setSourceTrayExpanded(!sourceTrayExpanded)}
              />
            )}
            
            {/* Composer */}
            <div className="absolute bottom-0 left-0 right-0 pb-6 pt-4 bg-gradient-to-t from-bg-base via-bg-base to-transparent">
              <div className="max-w-[760px] mx-auto w-full px-6">
                <QueryInput 
                  onSubmit={handleSubmit}
                  disabled={isSubmitting}
                />
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={TRANSITIONS.standard}
            className="flex flex-col items-center min-h-full w-full relative"
          >
            {/* Ambient Background */}
            <div className="absolute inset-0 rounded-xl pointer-events-none overflow-hidden">
              <div className="absolute inset-0 bg-gradient-radial from-accent/5 via-transparent to-transparent opacity-30" />
            </div>
            
            <div className="flex-1 w-full max-w-[760px] flex flex-col justify-center items-center px-6 pb-[15vh]">
              <HomeIntro />
              
              <div className="w-full flex flex-col gap-6 relative z-10">
                <QueryInput 
                  onSubmit={handleSubmit}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
