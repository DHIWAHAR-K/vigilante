'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ExternalLink, Copy, Check, ChevronUp, ChevronDown, FileText, Globe, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Source } from '@/store/useConversationStore';
import { sourceTrayVariants, listItemVariants, staggerContainer } from '@/lib/motion-config';

interface SourceTrayProps {
  sources: Source[];
  isExpanded: boolean;
  onToggle: () => void;
}

export function SourceTray({ sources, isExpanded, onToggle }: SourceTrayProps) {
  if (!sources || sources.length === 0) return null;

  const getSourceIcon = (url: string) => {
    try {
      const hostname = new URL(url).hostname;
      if (hostname.includes('github') || hostname.includes('stackoverflow')) {
        return MessageSquare;
      }
    } catch {}
    return Globe;
  };

  return (
    <motion.div
      variants={sourceTrayVariants}
      initial="hidden"
      animate={isExpanded ? "visible" : "hidden"}
      exit="exit"
      className="border-t border-border-subtle bg-bg-base/50"
    >
      {/* Toggle Button */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-6 py-3 hover:bg-bg-elevated/50 transition-colors"
      >
        <span className="text-caption text-text-muted">
          {sources.length} source{sources.length !== 1 ? 's' : ''}
        </span>
        <div className="flex items-center gap-2">
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-text-muted" />
          ) : (
            <ChevronUp className="w-4 h-4 text-text-muted" />
          )}
        </div>
      </button>

      {/* Source Cards */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="px-6 pb-4"
          >
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
              className="grid gap-2"
            >
              {sources.map((source, idx) => (
                <SourceCard key={source.id} source={source} index={idx} icon={getSourceIcon(source.url)} />
              ))}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function SourceCard({ source, index, icon: Icon }: { source: Source; index: number; icon: React.ElementType }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(source.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getDomain = (url: string) => {
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch {
      return url;
    }
  };

  return (
    <motion.a
      variants={listItemVariants}
      href={source.url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "group flex items-start gap-3 p-3 rounded-lg",
        "bg-bg-elevated border border-border-subtle",
        "hover:border-accent/30 hover:bg-bg-surface transition-all"
      )}
    >
      <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-accent" />
      </div>
      
      <div className="flex-1 min-w-0">
        <p className="text-body-sm text-text-primary font-medium truncate group-hover:text-accent transition-colors">
          {source.title}
        </p>
        {source.excerpt && (
          <p className="text-caption text-text-muted line-clamp-2 mt-0.5">
            {source.excerpt}
          </p>
        )}
        <div className="flex items-center gap-2 mt-1.5">
          <span className="text-mono-xs text-text-ghost">
            {getDomain(source.url)}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={handleCopy}
          className="p-1.5 hover:bg-bg-elevated rounded transition-colors"
          title="Copy URL"
        >
          {copied ? (
            <Check className="w-3.5 h-3.5 text-success" />
          ) : (
            <Copy className="w-3.5 h-3.5 text-text-muted" />
          )}
        </button>
        <ExternalLink className="w-3.5 h-3.5 text-text-muted" />
      </div>
    </motion.a>
  );
}

// Inline citation component for use in message content
export function CitationBadge({ 
  index, 
  onClick 
}: { 
  index: number; 
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 px-1.5 py-0.5 rounded",
        "bg-accent/10 text-accent text-caption font-medium",
        "hover:bg-accent/20 transition-colors"
      )}
      title="View source"
    >
      <span className="text-[10px]">[{index + 1}]</span>
    </button>
  );
}
