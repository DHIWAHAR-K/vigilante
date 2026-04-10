'use client';

import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Bot, ExternalLink, Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Message, Source } from '@/store/useConversationStore';

interface AssistantMessageProps {
  message: Message;
  isStreaming?: boolean;
}

function SourceCard({ source, index }: { source: Source; index: number }) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(source.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.a
      href={source.url}
      target="_blank"
      rel="noopener noreferrer"
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: index * 0.05 }}
      className="group flex items-start gap-3 p-3 rounded-lg bg-bg-elevated border border-border-subtle hover:border-accent/30 transition-colors cursor-pointer"
    >
      {source.favicon ? (
        <img src={source.favicon} alt="" className="w-5 h-5 rounded shrink-0 mt-0.5" />
      ) : (
        <div className="w-5 h-5 rounded bg-accent/10 flex items-center justify-center shrink-0 mt-0.5">
          <ExternalLink className="w-3 h-3 text-accent" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-body-sm text-text-primary font-medium truncate group-hover:text-accent transition-colors">
          {source.title}
        </p>
        {source.excerpt && (
          <p className="text-caption text-text-muted line-clamp-2 mt-0.5">
            {source.excerpt}
          </p>
        )}
        <p className="text-mono-xs text-text-ghost truncate mt-1">
          {new URL(source.url).hostname}
        </p>
      </div>
      <button
        onClick={handleCopy}
        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-bg-surface rounded"
      >
        {copied ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5 text-text-muted" />}
      </button>
    </motion.a>
  );
}

export function AssistantMessage({ message, isStreaming }: AssistantMessageProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = React.useState(false);

  useEffect(() => {
    if (contentRef.current && isStreaming) {
      contentRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [message.content, isStreaming]);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const hasSources = message.sources && message.sources.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="flex gap-4 py-4 px-6 max-w-[900px] mx-auto w-full"
    >
      <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center shrink-0">
        <Bot className="w-4 h-4 text-bg-base" />
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-body-sm font-medium text-accent">Vigilante</span>
          {isStreaming && (
            <span className="flex gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce" style={{ animationDelay: '300ms' }} />
            </span>
          )}
          <button
            onClick={handleCopy}
            className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-bg-surface rounded text-text-muted hover:text-text-primary"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
        
        <div ref={contentRef} className="prose prose-sm max-w-none">
          <p className={cn(
            "text-body-md text-text-primary whitespace-pre-wrap break-words leading-relaxed",
            isStreaming && "after:content-['▊'] after:animate-pulse after:text-accent"
          )}>
            {message.content}
          </p>
        </div>

        {hasSources && (
          <div className="mt-4 pt-4 border-t border-border-subtle">
            <p className="text-caption text-text-muted mb-3">Sources</p>
            <div className="grid gap-2">
              {message.sources!.map((source, idx) => (
                <SourceCard key={source.id} source={source} index={idx} />
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
