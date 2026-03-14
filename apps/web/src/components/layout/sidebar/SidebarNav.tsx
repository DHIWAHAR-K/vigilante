import React from 'react';
import { Search, MessageSquarePlus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/store/useUIStore';
import { useConversationStore } from '@/store/useConversationStore';

interface SidebarNavProps {
  activeTab: 'chat' | 'search';
  setActiveTab: (tab: 'chat' | 'search') => void;
}

export function SidebarNav({ activeTab, setActiveTab }: SidebarNavProps) {
  const router = useRouter();
  const { isSidebarCollapsed } = useUIStore();
  const { createConversationFromDraft, openConversation, activeConversationId } = useConversationStore();

  const handleNewChat = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Create a new conversation directly
    const newConv = createConversationFromDraft('New Chat');
    openConversation(newConv.id);
    setActiveTab('chat');
    // Navigate to home
    if (window.location.pathname === '/') {
      // Already on home, just refresh
      window.location.reload();
    } else {
      window.location.replace('/');
    }
  };

  if (isSidebarCollapsed) {
    return (
      <div className="flex flex-col gap-2 w-[64px] items-center mb-4 pointer-events-auto">
        <button 
          onClick={handleNewChat}
          data-testid="chat-button"
          className={cn(
            "w-10 h-10 flex items-center justify-center rounded-xl transition-all relative cursor-pointer",
            !activeConversationId
              ? "bg-accent-subtle text-accent" 
              : "text-text-secondary hover:bg-bg-elevated hover:text-text-primary"
          )}
          title="New Chat"
        >
          <MessageSquarePlus className="w-[18px] h-[18px]" />
          {!activeConversationId && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-accent" />
            </div>
          )}
        </button>
        <button 
          onClick={() => setActiveTab('search')}
          className={cn(
            "w-10 h-10 flex items-center justify-center rounded-xl transition-all relative",
            activeTab === 'search' 
              ? "bg-accent-subtle text-accent" 
              : "text-text-secondary hover:bg-bg-elevated hover:text-text-primary"
          )}
          title="Search"
        >
          <Search className="w-[18px] h-[18px]" />
          {activeTab === 'search' && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-accent" />
            </div>
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1 px-3 mb-6 w-full pointer-events-auto">
      <button 
        onClick={handleNewChat}
        data-testid="chat-button"
        className={cn(
          "w-full flex items-center gap-3 px-3 h-10 rounded-xl transition-all group relative cursor-pointer",
          !activeConversationId 
            ? "bg-accent-subtle text-accent font-medium" 
            : "text-text-secondary hover:bg-bg-elevated hover:text-text-primary"
        )}
      >
        <MessageSquarePlus className={cn("w-[18px] h-[18px]", !activeConversationId ? "text-accent" : "text-text-muted group-hover:text-text-primary")} />
        <span className="text-body-md">Chat</span>
        <span className={cn(
          "ml-auto text-mono-xs opacity-0 group-hover:opacity-100 transition-opacity",
          !activeConversationId ? "text-accent/70" : "text-text-muted"
        )}>⌘N</span>
        {!activeConversationId && (
          <div className="absolute top-0 right-0 w-0.5 h-full bg-accent rounded-r-full" />
        )}
      </button>

      <button 
        onClick={() => setActiveTab('search')}
        className={cn(
          "w-full flex items-center gap-3 px-3 h-10 rounded-xl transition-all group relative",
          activeTab === 'search' 
            ? "bg-bg-elevated text-text-primary font-medium" 
            : "text-text-secondary hover:bg-bg-elevated hover:text-text-primary"
        )}
      >
        <Search className={cn("w-[18px] h-[18px]", activeTab === 'search' ? "text-text-primary" : "text-text-muted group-hover:text-text-primary")} />
        <span className="text-body-md">Search</span>
        <span className={cn(
          "ml-auto text-mono-xs opacity-0 group-hover:opacity-100 transition-opacity",
          activeTab === 'search' ? "text-text-muted" : "text-text-muted"
        )}>⌘F</span>
        {activeTab === 'search' && (
          <div className="absolute top-0 right-0 w-0.5 h-full bg-accent rounded-r-full" />
        )}
      </button>
    </div>
  );
}
