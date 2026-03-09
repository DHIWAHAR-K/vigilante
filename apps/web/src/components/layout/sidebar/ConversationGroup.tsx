import React from 'react';
import { ConversationItem, type Conversation } from './ConversationItem';

interface ConversationGroupProps {
  label: string;
  items: Conversation[];
  onDelete?: (id: string) => void;
  onSelect?: (id: string) => void;
}

export function ConversationGroup({ label, items, onDelete, onSelect }: ConversationGroupProps) {
  if (items.length === 0) return null;

  return (
    <div className="flex flex-col mb-6">
      <div className="px-4 mb-2">
        <span className="text-caption text-text-muted">
          {label}
        </span>
      </div>
      <div className="flex flex-col gap-0.5 px-2">
        {items.map(item => (
          <ConversationItem 
            key={item.id} 
            item={item} 
            onDelete={onDelete}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  );
}
