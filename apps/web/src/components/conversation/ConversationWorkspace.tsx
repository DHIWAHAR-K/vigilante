'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useConversationStore, Message, Source } from '@/store/useConversationStore';
import { useUIStore } from '@/store/useUIStore';
import { ConversationThread } from './ConversationThread';
import { QueryInput } from '@/components/query/QueryInput';
import { ContextItem } from '@/components/query/types';
import { HomeIntro } from '@/components/layout/HomeIntro';

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
    draftInput,
    setDraftInput,
    createConversationFromDraft,
    addMessage,
    openConversation,
    startDraftThread,
    clearDraft
  } = useConversationStore();
  
  const { isSidebarCollapsed, toggleSidebar } = useUIStore();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  
  const activeConversation = conversations.find(c => c.id === activeConversationId);
  const isDraft = !activeConversationId;
  const hasMessages = activeConversation?.messages && activeConversation.messages.length > 0;
  const isInConversation = isDraft || hasMessages;

  const handleSubmit = useCallback((query: string, context: ContextItem[]) => {
    if (!query.trim() || isSubmitting) return;
    
    setIsSubmitting(true);
    
    let conversationId = activeConversationId;
    let conversation = activeConversation;
    
    if (isDraft) {
      conversation = createConversationFromDraft(generateTitle(query));
      conversationId = conversation.id;
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
  }, [activeConversationId, activeConversation, isDraft, createConversationFromDraft, addMessage, setDraftInput, isSubmitting]);

  useEffect(() => {
    if (streamingContent && activeConversationId) {
      const tempMessage: Message = {
        id: 'streaming',
        role: 'assistant',
        content: streamingContent,
        createdAt: new Date()
      };
    }
  }, [streamingContent, activeConversationId]);

  return (
    <div className="flex flex-col h-full w-full relative">
      <AnimatePresence mode="wait">
        {isInConversation ? (
          <motion.div
            key="conversation"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col h-full"
          >
            <ConversationThread 
              conversation={activeConversation || null} 
              isDraft={isDraft}
            />
            
            {(streamingContent || isSubmitting) && (
              <div className="px-6 py-4 max-w-[900px] mx-auto w-full">
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center shrink-0">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      className="w-4 h-4 border-2 border-bg-base border-t-transparent rounded-full"
                    />
                  </div>
                  <div className="flex-1">
                    <p className="text-body-md text-text-primary whitespace-pre-wrap">
                      {streamingContent}
                      <motion.span
                        animate={{ opacity: [0, 1, 0] }}
                        transition={{ duration: 0.8, repeat: Infinity }}
                        className="inline-block w-0.5 h-4 bg-accent ml-0.5 align-middle"
                      />
                    </p>
                  </div>
                </div>
              </div>
            )}
            
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
            transition={{ duration: 0.2 }}
            className="flex flex-col items-center min-h-full w-full relative"
          >
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
