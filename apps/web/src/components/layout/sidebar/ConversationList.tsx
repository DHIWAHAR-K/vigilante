import React from 'react';
import { ConversationGroup } from './ConversationGroup';
import { type Conversation } from './ConversationItem';

const CONVERSATIONS: Record<string, Conversation[]> = {
  'Today': [
    { id: '1', title: 'React 19 vs Next.js 15 routing', time: '10m', active: true },
    { id: '2', title: 'Implementing RAG with local Llama 3', time: '2h', active: false },
  ],
  'Yesterday': [
    { id: '3', title: 'Framer Motion layout animations', time: '1d', active: false },
  ],
  'Previous 7 Days': [
    { id: '4', title: 'Tailwind CSS vs CSS Modules', time: '3d', active: false },
    { id: '5', title: 'Zustand state persistence', time: '4d', active: false },
  ],
  'Older': [
    { id: '6', title: 'Ollama local setup guide', time: 'Jan 12', active: false },
    { id: '7', title: 'Python multi-threading basics', time: 'Jan 05', active: false },
  ]
};

interface ConversationListProps {
  searchQuery: string;
}

export function ConversationList({ searchQuery }: ConversationListProps) {
  return (
    <div className="flex-1 overflow-y-auto sidebar-scroll pb-6 w-full">
      {Object.entries(CONVERSATIONS).map(([group, items]) => {
        const filteredItems = items.filter(i => 
          i.title.toLowerCase().includes(searchQuery.toLowerCase())
        );
        return <ConversationGroup key={group} label={group} items={filteredItems} />;
      })}
    </div>
  );
}
