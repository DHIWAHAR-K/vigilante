'use client';

import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserMessage } from './UserMessage';
import { AssistantMessage } from './AssistantMessage';
import { Conversation, Message } from '@/store/useConversationStore';

interface ConversationThreadProps {
  conversation: Conversation | null;
  isDraft?: boolean;
}

export function ConversationThread({ conversation, isDraft }: ConversationThreadProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [conversation?.messages]);

  if (!conversation && !isDraft) {
    return null;
  }

  const messages = conversation?.messages || [];

  return (
    <div className="flex-1 overflow-y-auto pb-32 pt-4">
      <AnimatePresence mode="popLayout">
        {messages.map((message, index) => (
          <React.Fragment key={message.id}>
            {message.role === 'user' ? (
              <UserMessage message={message} />
            ) : (
              <AssistantMessage 
                message={message} 
                isStreaming={index === messages.length - 1 && message.role === 'assistant'}
              />
            )}
          </React.Fragment>
        ))}
      </AnimatePresence>
      
      {messages.length === 0 && isDraft && (
        <div className="flex items-center justify-center h-full min-h-[200px]">
          <p className="text-body-md text-text-muted">
            Start a new conversation...
          </p>
        </div>
      )}
      
      <div ref={messagesEndRef} />
    </div>
  );
}
