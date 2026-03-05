import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Chat } from '@/lib/types';
import { Pin, MessageSquare } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ChatListProps {
  chats: Chat[];
  activeChatId?: string;
  onSelectChat: (id: string) => void;
  collapsed?: boolean;
}

export function ChatList({ chats, activeChatId, onSelectChat, collapsed = false }: ChatListProps) {
  const pinned = chats.filter(c => c.pinned);
  const recent = chats.filter(c => !c.pinned);

  if (collapsed) {
    return (
      <div className="space-y-1 px-1">
        {chats.map(chat => (
          <button
            key={chat.id}
            onClick={() => onSelectChat(chat.id)}
            className={cn(
              'w-full flex items-center justify-center rounded-md p-2 transition-colors',
              activeChatId === chat.id ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'hover:bg-sidebar-accent/50 text-sidebar-foreground'
            )}
          >
            <MessageSquare className="h-4 w-4" />
          </button>
        ))}
      </div>
    );
  }

  const renderGroup = (title: string, items: Chat[], icon?: React.ReactNode) => {
    if (items.length === 0) return null;
    return (
      <div className="space-y-0.5">
        <p className="px-3 py-1.5 text-caption text-muted-foreground flex items-center gap-1.5">
          {icon}
          {title}
        </p>
        {items.map(chat => (
          <button
            key={chat.id}
            onClick={() => onSelectChat(chat.id)}
            className={cn(
              'w-full text-left rounded-md px-3 py-2 transition-all group',
              activeChatId === chat.id
                ? 'bg-sidebar-accent text-sidebar-accent-foreground border-l-2 border-l-primary'
                : 'hover:bg-sidebar-accent/50 text-sidebar-foreground border-l-2 border-l-transparent'
            )}
          >
            <p className="text-sm font-medium truncate">{chat.title}</p>
            <p className="text-caption text-muted-foreground truncate mt-0.5">{chat.lastMessage}</p>
            <p className="text-[10px] text-muted-foreground/60 mt-0.5">
              {formatDistanceToNow(chat.timestamp, { addSuffix: true })}
            </p>
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-3">
      {renderGroup('Pinned', pinned, <Pin className="h-3 w-3" />)}
      {renderGroup('Recent', recent)}
    </div>
  );
}
