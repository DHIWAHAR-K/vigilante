import React, { useEffect, useState } from 'react';
import { FileText, MessageSquare, Globe } from 'lucide-react';
import { ContextItem } from './types';
import { cn } from '@/lib/utils';

const MOCK_DB: ContextItem[] = [
  { id: 'm1', type: 'doc', title: 'Q4_Financial_Report.pdf' },
  { id: 'm2', type: 'doc', title: 'Product_Roadmap_2025.md' },
  { id: 'm3', type: 'chat', title: 'RAG vs Fine-tuning' },
  { id: 'm4', type: 'chat', title: 'React 19 Server Components' },
  { id: 'm5', type: 'url', title: 'https://linear.app/method' },
  { id: 'm6', type: 'url', title: 'https://react.dev/blog/2024' },
];

interface MentionPickerProps {
  search: string;
  onSelect: (item: ContextItem) => void;
  onClose: () => void;
}

export function MentionPicker({ search, onSelect, onClose }: MentionPickerProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const filtered = MOCK_DB.filter(item => 
    item.title.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    const updateIndex = () => setSelectedIndex(0);
    requestAnimationFrame(updateIndex);
  }, [search]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (filtered.length === 0) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        e.stopPropagation();
        setSelectedIndex(prev => (prev + 1) % filtered.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        e.stopPropagation();
        setSelectedIndex(prev => (prev - 1 + filtered.length) % filtered.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        if (filtered[selectedIndex]) {
          onSelect(filtered[selectedIndex]);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [filtered, selectedIndex, onSelect, onClose]);

  if (filtered.length === 0) return null;

  return (
    <div className="w-[300px] bg-bg-surface border border-border-strong rounded-lg shadow-2xl overflow-hidden flex flex-col pointer-events-auto">
      <div className="px-3 py-2 border-b border-border-subtle bg-bg-base/50 shrink-0">
        <span className="text-[10px] uppercase tracking-wider font-mono text-text-muted">
          Add Context
        </span>
      </div>
      <div className="max-h-64 overflow-y-auto custom-scrollbar py-1">
        {filtered.map((item, idx) => (
          <button
            key={item.id}
            onClick={(e) => {
              e.stopPropagation();
              onSelect(item);
            }}
            onMouseEnter={() => setSelectedIndex(idx)}
            className={cn(
              "w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors",
              idx === selectedIndex ? "bg-bg-elevated text-text-primary" : "text-text-secondary hover:bg-bg-elevated/50 hover:text-text-primary"
            )}
          >
            {item.type === 'doc' && <FileText className="w-4 h-4 text-accent shrink-0" />}
            {item.type === 'chat' && <MessageSquare className="w-4 h-4 text-text-muted shrink-0" />}
            {item.type === 'url' && <Globe className="w-4 h-4 text-text-muted shrink-0" />}
            <span className="text-[13px] truncate font-medium">{item.title}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
