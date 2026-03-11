'use client';

import React, { useEffect, useState, useCallback } from 'react';
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

const mockAssistantResponse = `Great question! Here's what you need to know:

**Key Points:**

1. **First consideration** - This is an important factor that impacts how you should approach the problem.

2. **Second point** - Another critical aspect to keep in mind when working through this topic.

3. **Third insight** - This builds on the previous points and provides additional context.

**Conclusion:**
The answer depends on your specific use case, but generally speaking, you should consider your requirements carefully before making a decision.

Would you like me to elaborate on any of these points?`;

const mockSources: Source[] = [
  { id: 's1', title: 'React 19 Documentation', url: 'https://react.dev', excerpt: 'Official React documentation with the latest updates on hooks and server components.' },
  { id: 's2', title: 'Next.js 15 Release Notes', url: 'https://nextjs.org/blog', excerpt: 'Learn about the new features in Next.js 15 including partial prerendering.' },
];

export function ConversationWorkspace() {
  const { 
    activeConversationId, 
    conversations, 
    isDraftMode,
    setDraftInput,
    createConversationFromDraft,
    addMessage,
  } = useConversationStore();
  
  const { setRuntimeCenterOpen } = useUIStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [sourceTrayExpanded, setSourceTrayExpanded] = useState(false);
  const [justSentFirstMessage, setJustSentFirstMessage] = useState(false);
  
  const activeConversation = conversations.find(c => c.id === activeConversationId);
  const hasMessages = activeConversation?.messages && activeConversation.messages.length > 0;
  const isInConversation = isDraftMode || hasMessages;
  const { status, isOnline } = useRuntimeStore();

  const handleSubmit = useCallback((query: string, context: ContextItem[]) => {
    if (!query.trim() || isSubmitting) return;
    
    const wasDraft = isDraftMode;
    setIsSubmitting(true);
    
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
    
    setTimeout(() => {
      let currentIndex = 0;
      const responseInterval = setInterval(() => {
        if (currentIndex < mockAssistantResponse.length) {
          setStreamingContent(mockAssistantResponse.substring(0, currentIndex + 1));
          currentIndex += 3;
        } else {
          clearInterval(responseInterval);
          
          const assistantMessage: Message = {
            id: generateId(),
            role: 'assistant',
            content: mockAssistantResponse,
            sources: mockSources,
            createdAt: new Date()
          };
          
          addMessage(conversationId!, assistantMessage);
          setStreamingContent('');
          setIsSubmitting(false);
        }
      }, 20);
    }, 300);
  }, [activeConversationId, isDraftMode, createConversationFromDraft, addMessage, setDraftInput, isSubmitting]);

  // Close source tray when new message comes in
  useEffect(() => {
    if (activeConversation?.messages && activeConversation.messages.length > 0) {
      setSourceTrayExpanded(false);
    }
  }, [activeConversation?.messages?.length]);

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
              {(streamingContent || isSubmitting) && (
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
