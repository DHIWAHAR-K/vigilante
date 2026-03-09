'use client';

import React, { useMemo, useEffect, useState } from 'react';
import { ConversationGroup } from './ConversationGroup';
import { type Conversation } from './ConversationItem';
import { useConversationStore } from '@/store/useConversationStore';

function getTimeGroup(conversation: Conversation): string {
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

function formatTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays === 1) return '1d';
  if (diffDays < 7) return `${diffDays}d`;
  
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

interface ConversationListProps {
  searchQuery: string;
}

export function ConversationList({ searchQuery }: ConversationListProps) {
  const { conversations, activeConversationId, deleteConversation, setActiveConversation } = useConversationStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const groupedConversations = useMemo(() => {
    const filtered = conversations.filter(c =>
      c.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const groups: Record<string, Conversation[]> = {};

    filtered.forEach(conv => {
      const group = getTimeGroup(conv);
      if (!groups[group]) {
        groups[group] = [];
      }
      groups[group].push({
        ...conv,
        time: mounted ? formatTime(new Date(conv.createdAt)) : (conv.time ?? ''),
        active: conv.id === activeConversationId
      });
    });

    return groups;
  }, [conversations, activeConversationId, searchQuery, mounted]);

  const handleDelete = (id: string) => {
    deleteConversation(id);
  };

  const handleSelect = (id: string) => {
    setActiveConversation(id);
  };

  const groupOrder = ['Today', 'Yesterday', 'Previous 7 Days', 'Previous 30 Days', 'Older'];

  const hasConversations = Object.keys(groupedConversations).length > 0;

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
            items={items} 
            onDelete={handleDelete}
            onSelect={handleSelect}
          />
        );
      })}
    </div>
  );
}
