import React from 'react';
import { FileText, MessageSquare, Globe, X } from 'lucide-react';
import { ContextItem } from './types';

interface ContextChipProps {
  item: ContextItem;
  onRemove: (id: string) => void;
}

export function ContextChip({ item, onRemove }: ContextChipProps) {
  return (
    <div className="flex items-center gap-1.5 px-2 py-0.5 h-6 rounded bg-bg-elevated border border-border-subtle group relative">
      {item.type === 'doc' && <FileText className="w-3 h-3 text-accent" />}
      {item.type === 'chat' && <MessageSquare className="w-3 h-3 text-text-muted" />}
      {item.type === 'url' && <Globe className="w-3 h-3 text-text-muted" />}
      <span className="text-caption text-text-secondary">{item.title}</span>
      <button 
        type="button"
        onClick={(e) => { e.stopPropagation(); onRemove(item.id); }} 
        className="opacity-0 group-hover:opacity-100 hover:text-text-primary transition-opacity"
        title="Remove"
      >
        <X className="w-3 h-3 text-text-muted" />
      </button>
      {/* Precision notch */}
      <div className="absolute top-0 right-0 w-0.5 h-full bg-accent" />
    </div>
  );
}
