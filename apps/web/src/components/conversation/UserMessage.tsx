'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Message } from '@/store/useConversationStore';

interface UserMessageProps {
  message: Message;
}

export function UserMessage({ message }: UserMessageProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="flex gap-4 py-4 px-6 max-w-[900px] mx-auto w-full"
    >
      <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
        <User className="w-4 h-4 text-accent" />
      </div>
      <div className="flex-1 min-w-0 pt-0.5">
        <p className="text-body-md text-text-primary whitespace-pre-wrap break-words leading-relaxed">
          {message.content}
        </p>
      </div>
    </motion.div>
  );
}
