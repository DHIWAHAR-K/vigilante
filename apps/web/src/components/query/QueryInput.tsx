'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Paperclip, Globe, ArrowUp } from 'lucide-react';
import { isComposerSubmitShortcut } from '@/lib/keyboard/composerSubmitShortcut';
import { cn } from '@/lib/utils';
import { ContextItem } from './types';
import { ContextChip } from './ContextChip';
import { MentionPicker } from './MentionPicker';
import { ModelSelector } from './ModelSelector';
import { useUIStore } from '@/store/useUIStore';
import { useRuntimeStore } from '@/store/useRuntimeStore';
import { breatheVariants, sendReadyVariants } from '@/lib/motion-config';

interface QueryInputProps {
  onSubmit?: (query: string, context: ContextItem[]) => void;
  disabled?: boolean;
}

export function QueryInput({ onSubmit, disabled = false }: QueryInputProps) {
  const { isSidebarCollapsed, toggleSidebar } = useUIStore();
  const { selection, installedModels } = useRuntimeStore();
  
  const [query, setQuery] = useState('');
  const [lastQuery, setLastQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [isWebSearch, setIsWebSearch] = useState(false);
  const [mode, setMode] = useState<'Ask' | 'Deep Research'>('Ask');
  
  const [contextChips, setContextChips] = useState<ContextItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [cursorPos, setCursorPos] = useState(0);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const isReady = query.trim() || contextChips.length > 0;

  // Auto-resize textarea - now always behaves as expanded
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(Math.max(textareaRef.current.scrollHeight, 40), 200)}px`;
    }
  }, [query]);

  const cycleMode = React.useCallback(() => {
    setMode(prev => {
      const modes: typeof mode[] = ['Ask', 'Deep Research'];
      return modes[(modes.indexOf(prev) + 1) % modes.length];
    });
  }, []);

  // Global shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        textareaRef.current?.focus();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'm') {
        e.preventDefault();
        cycleMode();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        e.preventDefault();
        setIsWebSearch(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cycleMode]);

  // Handle click outside to blur
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Mention Detection
  useEffect(() => {
    if (!isFocused) {
      const resetMention = () => setMentionQuery(null);
      requestAnimationFrame(resetMention);
      return;
    }
    const textBeforeCursor = query.slice(0, cursorPos);
    const match = textBeforeCursor.match(/(?:^|\s)@([^\s]*)$/);
    if (match) {
      const setMatch = () => setMentionQuery(match[1]);
      requestAnimationFrame(setMatch);
    } else {
      const resetMatch = () => setMentionQuery(null);
      requestAnimationFrame(resetMatch);
    }
  }, [query, cursorPos, isFocused]);

  const updateCursor = () => {
    if (textareaRef.current) {
      setCursorPos(textareaRef.current.selectionStart);
    }
  };

  const removeChip = (id: string) => {
    setContextChips(prev => prev.filter(c => c.id !== id));
  };

  const handleMentionSelect = (item: ContextItem) => {
    const textBeforeCursor = query.slice(0, cursorPos);
    const match = textBeforeCursor.match(/(?:^|\s)@([^\s]*)$/);
    
    if (match) {
      // Calculate where the exact match started
      const matchStart = cursorPos - match[0].length + (match[0].startsWith(' ') ? 1 : 0);
      const newQuery = query.slice(0, matchStart) + query.slice(cursorPos);
      setQuery(newQuery);
    }
    
    if (!contextChips.find(c => c.id === item.id)) {
      setContextChips(prev => [...prev, item]);
    }
    
    setMentionQuery(null);
    
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 0);
  };

  const handleSubmit = () => {
    if (!isReady || disabled) return;
    if (!selection && installedModels.length === 0) return;
    
    setIsSubmitting(true);
    if (query.trim()) setLastQuery(query.trim());
    
    setTimeout(() => {
      if (onSubmit) onSubmit(query.trim(), contextChips);
      setQuery('');
      setContextChips([]);
      setIsSubmitting(false);
      
      // Auto-collapse sidebar when submitting a message
      if (!isSidebarCollapsed) {
        toggleSidebar();
      }
      
      textareaRef.current?.focus();
    }, 150);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (mentionQuery !== null) {
      if (['ArrowUp', 'ArrowDown', 'Enter', 'Escape'].includes(e.key)) {
        e.preventDefault();
        return;
      }
    }

    if (e.key === 'ArrowUp' && query === '') {
      e.preventDefault();
      setQuery(lastQuery);
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = textareaRef.current.value.length;
          textareaRef.current.selectionEnd = textareaRef.current.value.length;
        }
      }, 0);
    } else if (isComposerSubmitShortcut(e)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="w-full flex justify-center relative">
      
      {mentionQuery !== null && isFocused && (
        <div className="absolute bottom-full mb-2 w-full max-w-[760px] z-50 flex justify-start pointer-events-none">
          <MentionPicker 
            search={mentionQuery} 
            onSelect={handleMentionSelect} 
            onClose={() => {
              setMentionQuery(null);
              textareaRef.current?.focus();
            }} 
          />
        </div>
      )}

      <motion.div 
        ref={containerRef}
        layout
        variants={breatheVariants}
        initial="idle"
        animate={isFocused && !isReady ? "idle" : "focused"}
        style={{
          borderColor: isFocused ? 'var(--accent)' : 'var(--border-subtle)',
        }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
        className={cn(
          "w-full max-w-[760px] border rounded-xl overflow-visible flex flex-col transition-colors relative z-40 min-h-[120px] relative",
          isFocused ? "glass-surface" : "bg-bg-elevated"
        )}
        onClick={() => {
          if (!isFocused) {
            textareaRef.current?.focus();
          }
        }}
      >
        {/* Ambient stage field - subtle radial glow */}
        <div className="absolute inset-0 rounded-xl pointer-events-none overflow-hidden">
          <div className="absolute inset-0 bg-gradient-radial from-accent/5 via-transparent to-transparent opacity-30" />
        </div>
        

        
        {/* Context Chips Zone */}
        <AnimatePresence>
          {contextChips.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex flex-wrap gap-2 px-4 pt-4 pb-1 overflow-hidden"
            >
              {contextChips.map(chip => (
                <ContextChip key={chip.id} item={chip} onRemove={removeChip} />
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Text Area */}
        <motion.div 
          animate={{ opacity: isSubmitting ? 0 : 1 }}
          transition={{ duration: 0.1 }}
          className="relative w-full flex-1 flex pt-3 pb-2"
        >
          <textarea
            ref={textareaRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              updateCursor();
            }}
            onKeyUp={updateCursor}
            onClick={updateCursor}
            onFocus={() => setIsFocused(true)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything, search the web, or @ a document..."
            className="w-full bg-transparent text-text-primary placeholder-text-muted text-body-lg px-4 resize-none focus:outline-none leading-relaxed scrollbar-hide relative z-10"
            style={{ 
              lineHeight: '1.6',
            }}
            rows={1}
          />
        </motion.div>

        {/* Toolbar - Now Permanently Visible */}
        <div className="flex items-center justify-between px-3 pb-3 pt-2 mt-auto border-t border-border-subtle/50 mx-2 relative z-10">
          {/* Left Actions */}
          <div className="flex items-center gap-3">
            <button 
              onClick={(e) => { e.stopPropagation(); cycleMode(); }}
              className="flex items-center pl-2 pr-1.5 py-1 rounded hover:bg-bg-elevated transition-colors border-l-2 border-accent group relative"
              title="Cycle Mode (Cmd+M)"
            >
              <AnimatePresence mode="wait">
                <motion.span 
                  key={mode}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.15, ease: 'easeOut' }}
                  className="text-caption text-accent tracking-wide uppercase group-hover:text-accent-bright transition-colors"
                >
                  {mode}
                </motion.span>
              </AnimatePresence>

            </button>

            <div className="w-[1px] h-3 bg-border-strong" />

            <div className="flex items-center gap-1">
              <button 
                onClick={(e) => { e.stopPropagation(); setIsWebSearch(!isWebSearch); }}
                className="w-7 h-7 flex items-center justify-center rounded hover:bg-bg-elevated transition-colors"
                title="Toggle Web Search (Cmd+/)"
              >
                <Globe className={cn("w-[18px] h-[18px] transition-colors", isWebSearch ? "text-accent fill-accent/20" : "text-text-muted stroke-[1.5]")} />
              </button>
              <button 
                onClick={(e) => e.stopPropagation()}
                className="w-7 h-7 flex items-center justify-center rounded hover:bg-bg-elevated text-text-muted hover:text-text-primary transition-colors"
                title="Attach Context (@)"
              >
                <Paperclip className="w-[18px] h-[18px] stroke-[1.5]" />
              </button>
            </div>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-2">
            <ModelSelector />

            <motion.button 
              variants={sendReadyVariants}
              initial="idle"
              animate={isReady && !disabled ? "ready" : "idle"}
              whileTap="pressed"
              onClick={(e) => { e.stopPropagation(); handleSubmit(); }}
              disabled={!isReady || disabled}
              className={cn(
                "w-9 h-9 flex items-center justify-center rounded-lg transition-colors ml-1 relative z-10",
                isReady && !disabled
                  ? "bg-accent text-bg-base hover:bg-accent-hover shadow-shadow-glow"
                  : "bg-bg-elevated text-text-muted border border-border-subtle"
              )}
            >
              <ArrowUp className={cn("w-5 h-5", isReady ? "stroke-[2.5]" : "stroke-[2]")} />
            </motion.button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
