import React from 'react';
import { Search, MessageSquarePlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/store/useUIStore';

interface SidebarNavProps {
  activeTab: 'chat' | 'search';
  setActiveTab: (tab: 'chat' | 'search') => void;
}

export function SidebarNav({ activeTab, setActiveTab }: SidebarNavProps) {
  const { isSidebarCollapsed } = useUIStore();

  if (isSidebarCollapsed) {
    return (
      <div className="flex flex-col gap-2 px-2 w-full items-center mb-4">
        <button 
          onClick={() => setActiveTab('chat')}
          className={cn(
            "w-10 h-10 flex items-center justify-center rounded-xl transition-all",
            activeTab === 'chat' ? "bg-accent-subtle text-accent" : "text-text-secondary hover:bg-bg-elevated hover:text-text-primary"
          )}
          title="New Chat"
        >
          <MessageSquarePlus className="w-[18px] h-[18px]" />
        </button>
        <button 
          onClick={() => setActiveTab('search')}
          className={cn(
            "w-10 h-10 flex items-center justify-center rounded-xl transition-all",
            activeTab === 'search' ? "bg-accent-subtle text-accent" : "text-text-secondary hover:bg-bg-elevated hover:text-text-primary"
          )}
          title="Search"
        >
          <Search className="w-[18px] h-[18px]" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1 px-3 mb-6 w-full">
      <button 
        onClick={() => setActiveTab('chat')}
        className={cn(
          "w-full flex items-center gap-3 px-3 h-10 rounded-xl transition-all group",
          activeTab === 'chat' 
            ? "bg-accent-subtle text-accent font-medium" 
            : "text-text-secondary hover:bg-bg-elevated hover:text-text-primary"
        )}
      >
        <MessageSquarePlus className={cn("w-[18px] h-[18px]", activeTab === 'chat' ? "text-accent" : "text-text-muted group-hover:text-text-primary")} />
        <span className="text-[13px]">Chat</span>
        <span className={cn(
          "ml-auto text-[10px] font-mono tracking-tighter opacity-0 group-hover:opacity-100 transition-opacity",
          activeTab === 'chat' ? "text-accent/70" : "text-text-muted"
        )}>⌘N</span>
      </button>

      <button 
        onClick={() => setActiveTab('search')}
        className={cn(
          "w-full flex items-center gap-3 px-3 h-10 rounded-xl transition-all group",
          activeTab === 'search' 
            ? "bg-bg-elevated text-text-primary font-medium" 
            : "text-text-secondary hover:bg-bg-elevated hover:text-text-primary"
        )}
      >
        <Search className={cn("w-[18px] h-[18px]", activeTab === 'search' ? "text-text-primary" : "text-text-muted group-hover:text-text-primary")} />
        <span className="text-[13px]">Search</span>
        <span className={cn(
          "ml-auto text-[10px] font-mono tracking-tighter opacity-0 group-hover:opacity-100 transition-opacity",
          activeTab === 'search' ? "text-text-muted" : "text-text-muted"
        )}>⌘F</span>
      </button>
    </div>
  );
}
