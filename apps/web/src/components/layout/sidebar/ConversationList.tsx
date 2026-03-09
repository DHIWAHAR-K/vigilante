'use client';

import React, { useMemo, useEffect, useState } from 'react';
import { ConversationGroup } from './ConversationGroup';
import { ConversationItem } from './ConversationItem';
import { useConversationStore } from '@/store/useConversationStore';

function getTimeGroup(conversation: { createdAt: Date }): string {
  const now = new Date();
  const created = new Date(conversation.createdAt);
  const diffMs = now.getTime() - created.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return 'Previous 7 Days';
  if (diffDays < 30) return 'Previous 30 Days';
  return 'Older';
}

interface ConversationListProps {
  searchQuery: string;
}

export function ConversationList({ searchQuery }: ConversationListProps) {
  const { conversations, activeConversationId, deleteConversation, openConversation } = useConversationStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const filteredConversations = useMemo(() => {
    return conversations
      .filter(c => c.status === 'persisted')
      .filter(c =>
        c.title.toLowerCase().includes(searchQuery.toLowerCase())
      );
  }, [conversations, searchQuery]);

  const groupedConversations = useMemo(() => {
    const groups: Record<string, typeof filteredConversations> = {};

    filteredConversations.forEach(conv => {
      const group = getTimeGroup(conv);
      if (!groups[group]) {
        groups[group] = [];
      }
      groups[group].push(conv);
    });

    return groups;
  }, [filteredConversations]);

  const handleDelete = (id: string) => {
    deleteConversation(id);
  };

  const handleSelect = (id: string) => {
    openConversation(id);
  };

  const groupOrder = ['Today', 'Yesterday', 'Previous 7 Days', 'Previous 30 Days', 'Older'];

  const hasConversations = filteredConversations.length > 0;

  if (!hasConversations) {
    return (
      <div className="flex-1 overflow-y-auto sidebar-scroll pb-6 w-full">
        <div className="flex flex-col items-center justify-center h-40 px-4">
          <p className="text-body-sm text-text-muted text-center">
            No conversations yet
          </p>
          <p className="text-caption text-text-ghost text-center mt-1">
            Start a new chat to begin
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto sidebar-scroll pb-6 w-full">
      {groupOrder.map(group => {
        const items = groupedConversations[group];
        if (!items || items.length === 0) return null;
        return (
          <ConversationGroup 
            key={group} 
            label={group}
          >
            {items.map(conv => (
              <ConversationItem
                key={conv.id}
                item={conv}
                onDelete={handleDelete}
                onSelect={handleSelect}
                isActive={conv.id === activeConversationId}
              />
            ))}
          </ConversationGroup>
        );
      })}
    </div>
  );
}
