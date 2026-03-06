'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Plus, Monitor, Mic, ArrowRight, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface QueryInputProps {
  onSubmit?: (query: string) => void;
}

export function QueryInput({ onSubmit }: QueryInputProps) {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 300)}px`;
    }
  }, [query]);

  const handleSubmit = () => {
    if (query.trim() && onSubmit) {
      onSubmit(query.trim());
      setQuery('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div 
      className={cn(
        "w-full bg-bg-surface border border-border-subtle rounded-lg transition-colors flex flex-col shadow-sm",
        isFocused ? "border-border-strong bg-bg-elevated" : ""
      )}
    >
      <textarea
        ref={textareaRef}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        onKeyDown={handleKeyDown}
        placeholder="Research anything..."
        className="w-full min-h-[80px] bg-transparent text-text-primary placeholder-text-muted text-[15px] px-4 pt-4 pb-2 resize-none focus:outline-none rounded-t-lg leading-relaxed"
        rows={1}
        autoFocus
      />
      
      <div className="flex items-center justify-between px-2 pb-2 pt-1">
        {/* Left side actions */}
        <div className="flex items-center gap-1">
          <button className="w-8 h-8 flex items-center justify-center rounded-md text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-colors">
            <Plus className="w-4 h-4 stroke-[1.5]" />
          </button>
        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-1">
          <button className="flex items-center gap-1.5 px-2.5 h-8 rounded-md text-text-secondary hover:text-text-primary hover:bg-bg-elevated transition-colors text-[12px] font-medium">
            <span>Claude 3.5 Sonnet</span>
            <ChevronDown className="w-3.5 h-3.5 opacity-70" />
          </button>
          
          <div className="w-[1px] h-3 bg-border-subtle mx-1" />

          <button className="flex items-center gap-1.5 px-2.5 h-8 rounded-md text-text-secondary hover:text-text-primary hover:bg-bg-elevated transition-colors text-[12px] font-medium">
            <Monitor className="w-3.5 h-3.5 stroke-[1.5]" />
            <span>Local</span>
          </button>

          <button className="w-8 h-8 flex items-center justify-center rounded-md text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-colors ml-1">
            <Mic className="w-4 h-4 stroke-[1.5]" />
          </button>

          <button 
            onClick={handleSubmit}
            disabled={!query.trim()}
            className="w-8 h-8 flex items-center justify-center rounded-md bg-accent text-bg-base disabled:opacity-20 disabled:bg-border-subtle disabled:text-text-muted transition-colors [&:not(:disabled)]:hover:bg-accent-hover ml-2"
          >
            <ArrowRight className="w-4 h-4 stroke-[2]" />
          </button>
        </div>
      </div>
    </div>
  );
}
