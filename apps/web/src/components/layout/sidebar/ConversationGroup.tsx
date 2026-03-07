import React from 'react';
import { ConversationItem, type Conversation } from './ConversationItem';

interface ConversationGroupProps {
  label: string;
  items: Conversation[];
}

export function ConversationGroup({ label, items }: ConversationGroupProps) {
  if (items.length === 0) return null;

  return (
    <div className="flex flex-col mb-6">
      <div className="px-4 mb-2">
        <span className="text-[11px] font-medium text-text-muted tracking-wide">
          {label}
        </span>
      </div>
      <div className="flex flex-col gap-0.5 px-2">
        {items.map(item => (
          <ConversationItem key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}
