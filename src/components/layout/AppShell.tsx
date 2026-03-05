import { useState, useRef, KeyboardEvent } from 'react';
import { cn } from '@/lib/utils';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { ChatList } from '@/components/chat/ChatList';
import { ChatThread } from '@/components/chat/ChatThread';
import { Composer } from '@/components/composer/Composer';
import { MOCK_CHATS, MOCK_MESSAGES, STREAMING_MESSAGES } from '@/lib/mock-data';
import { ViewMode, ConnectionStatus, ChatMessage } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Plus, Search, Menu, X, Share2, Settings, PanelLeftClose, PanelLeft, LayoutGrid, List, Bug, Code,
  MessageSquare, Clock, Compass, BookOpen, BarChart3, MoreHorizontal, Sparkles,
  Users, FileText, Lightbulb, Send, Paperclip, Bell, ChevronDown, Mic,
} from 'lucide-react';

interface SuggestionCard {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const SUGGESTIONS: SuggestionCard[] = [
  {
    icon: <Sparkles className="h-4 w-4 text-primary" />,
    title: '/brainstorm',
    description: 'Get multiple perspectives on your idea from the Council',
  },
  {
    icon: <Sparkles className="h-4 w-4 text-primary" />,
    title: '/analyze',
    description: 'Break down a complex problem with multi-agent analysis',
  },
  {
    icon: <Sparkles className="h-4 w-4 text-primary" />,
    title: '/debate',
    description: 'Have agents argue different sides of a decision',
  },
  {
    icon: <Sparkles className="h-4 w-4 text-primary" />,
    title: '/review',
    description: 'Get a thorough review of your document or code',
  },
];

function EmptyState({ onSend }: { onSend: (msg: string) => void }) {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    if (!message.trim()) return;
    onSend(message);
    setMessage('');
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = () => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = Math.min(el.scrollHeight, 160) + 'px';
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-2xl space-y-4">
        {/* Composer box */}
        <div className="rounded-2xl border bg-card p-3 space-y-3">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={e => setMessage(e.target.value)}
            onInput={handleInput}
            onKeyDown={handleKeyDown}
            placeholder="Type @ for connectors and sources"
            rows={1}
            className={cn(
              'w-full resize-none bg-transparent text-sm',
              'placeholder:text-muted-foreground',
              'focus:outline-none',
              'min-h-[36px] max-h-[160px]'
            )}
          />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground rounded-full border">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center gap-2">
              {/* Agents dropdown */}
              <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                <Users className="h-3.5 w-3.5" />
                <span>Agents</span>
                <ChevronDown className="h-3 w-3" />
              </button>
              {/* Rounds dropdown */}
              <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                <span>Rounds</span>
                <ChevronDown className="h-3 w-3" />
              </button>
              <button className="text-muted-foreground hover:text-foreground transition-colors">
                <Mic className="h-4 w-4" />
              </button>
              <Button
                size="icon"
                className="h-7 w-7 rounded-full"
                onClick={handleSend}
                disabled={!message.trim()}
              >
                <Send className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

export function AppShell() {
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('council');
  const [searchQuery, setSearchQuery] = useState('');
  const connectionStatus: ConnectionStatus = 'connected';

  const messages: ChatMessage[] = activeChatId === '2' ? STREAMING_MESSAGES : activeChatId ? MOCK_MESSAGES : [];

  const filteredChats = MOCK_CHATS.filter(c =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const statusDot: Record<ConnectionStatus, string> = {
    connected: 'bg-success',
    reconnecting: 'bg-amber-500',
    disconnected: 'bg-destructive',
  };


  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Mobile sidebar overlay */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm md:hidden" onClick={() => setMobileSidebarOpen(false)} />
      )}

      {/* Collapsible sidebar — desktop (Perplexity-style) */}
      <aside className={cn(
        "hidden md:flex flex-col border-r bg-card shrink-0 transition-[width] duration-200 ease-in-out overflow-hidden",
        sidebarOpen ? "w-56" : "w-12"
      )}>
        {/* Top section */}
        <div className="flex flex-col gap-1 p-1.5 shrink-0">
          {/* Toggle (Bug / Code) */}
          <div className={cn(
            "flex rounded-lg border bg-muted p-0.5 gap-0.5 shrink-0",
            sidebarOpen ? "flex-row" : "flex-col"
          )}>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className={cn(
                "rounded-md flex items-center justify-center transition-colors gap-2",
                sidebarOpen ? "h-7 flex-1 bg-primary text-primary-foreground px-2" : "h-7 w-7 text-muted-foreground hover:text-foreground"
              )}
            >
              <Bug className="h-3.5 w-3.5 shrink-0" />
              {sidebarOpen && <span className="text-xs font-medium truncate">Search</span>}
            </button>
            <button className={cn(
              "rounded-md flex items-center justify-center transition-colors gap-2",
              sidebarOpen ? "h-7 flex-1 text-muted-foreground hover:text-foreground px-2" : "h-7 w-7 text-muted-foreground hover:text-foreground"
            )}>
              <Code className="h-3.5 w-3.5 shrink-0" />
              {sidebarOpen && <span className="text-xs font-medium truncate">Computer</span>}
            </button>
          </div>

          {/* New Thread */}
          <button
            onClick={() => setActiveChatId(null)}
            className={cn(
              "flex items-center rounded-md transition-colors text-muted-foreground hover:text-foreground hover:bg-accent",
              sidebarOpen ? "gap-2.5 px-2.5 h-8" : "justify-center h-8 w-8 mx-auto"
            )}
          >
            <Plus className="h-4 w-4 shrink-0" />
            {sidebarOpen && <span className="text-sm truncate">New Thread</span>}
          </button>
        </div>

        {/* Separator */}
        <div className="mx-2 border-b mt-3 mb-2" />

        {/* Chat history */}
        <div className="flex-1 overflow-y-auto scrollbar-thin py-2">
          {sidebarOpen ? (
            <>
              <p className="px-3 py-1.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Recent</p>
              {filteredChats.map(chat => (
                <div
                  key={chat.id}
                  onClick={() => setActiveChatId(chat.id)}
                  className={cn(
                    "w-full text-left px-3 py-2 text-sm truncate transition-colors cursor-pointer group flex items-center justify-between gap-1",
                    activeChatId === chat.id
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                  )}
                >
                  <span className="truncate">{chat.title}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); /* TODO: delete chat */ }}
                    className="opacity-0 group-hover:opacity-100 shrink-0 text-muted-foreground hover:text-destructive transition-all"
                    title="Delete chat"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </>
          ) : (
            <div className="flex flex-col items-center gap-1 px-1">
              {filteredChats.slice(0, 5).map(chat => (
                <button
                  key={chat.id}
                  onClick={() => setActiveChatId(chat.id)}
                  className={cn(
                    "h-8 w-8 rounded-md flex items-center justify-center transition-colors",
                    activeChatId === chat.id
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                  )}
                  title={chat.title}
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Bottom section */}
        <div className={cn(
          "flex items-center gap-2 p-2 border-t shrink-0",
          sidebarOpen ? "justify-between" : "justify-center flex-col"
        )}>
          {sidebarOpen ? (
            <>
              <div className="flex items-center gap-2 min-w-0">
                <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center shrink-0">
                  <span className="text-[10px] font-bold text-muted-foreground">U</span>
                </div>
                <span className="text-xs text-muted-foreground truncate">User</span>
              </div>
              <button className="text-muted-foreground hover:text-foreground transition-colors">
                <Bell className="h-4 w-4" />
              </button>
            </>
          ) : (
            <>
              <button className="text-muted-foreground hover:text-foreground transition-colors">
                <Bell className="h-4 w-4" />
              </button>
              <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center">
                <span className="text-[10px] font-bold text-muted-foreground">U</span>
              </div>
            </>
          )}
        </div>
      </aside>

      {/* Mobile sidebar */}
      <aside className={cn(
        'fixed inset-y-0 left-0 z-50 w-72 flex flex-col border-r bg-card transition-transform duration-200 md:hidden',
        mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        <div className="flex items-center gap-2 p-3 border-b">
          <h1 className="text-title font-bold flex-1 tracking-tight">Council</h1>
          <ThemeToggle />
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setMobileSidebarOpen(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="p-3 space-y-2">
          <Button className="w-full justify-start gap-2" size="sm" onClick={() => { setActiveChatId(null); setMobileSidebarOpen(false); }}>
            <Plus className="h-4 w-4" /> New Chat
          </Button>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input placeholder="Search chats…" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="h-8 pl-8 text-sm" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-thin py-1">
          <ChatList chats={filteredChats} activeChatId={activeChatId || undefined} onSelectChat={(id) => { setActiveChatId(id); setMobileSidebarOpen(false); }} />
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar — only when in a chat */}
        {activeChatId && (
          <header className="flex items-center gap-3 h-12 px-4 border-b bg-card shrink-0">
            <Button variant="ghost" size="icon" className="h-8 w-8 md:hidden" onClick={() => setMobileSidebarOpen(true)}>
              <Menu className="h-4 w-4" />
            </Button>

            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className={cn('h-2 w-2 rounded-full shrink-0', statusDot[connectionStatus])} />
              <h2 className="text-sm font-semibold truncate">
                {MOCK_CHATS.find(c => c.id === activeChatId)?.title || 'New Chat'}
              </h2>
            </div>




            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Share2 className="h-4 w-4" />
            </Button>
          </header>
        )}

        {/* Mobile hamburger when no chat active */}
        {!activeChatId && (
          <div className="md:hidden flex items-center h-12 px-4 shrink-0">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setMobileSidebarOpen(true)}>
              <Menu className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Content */}
        {activeChatId ? (
          <>
            <main className="flex-1 overflow-y-auto scrollbar-thin">
              <ChatThread messages={messages} viewMode={viewMode} />
            </main>
            <Composer />
          </>
        ) : (
          <EmptyState onSend={(msg) => {
            setActiveChatId('1');
          }} />
        )}

        {/* Footer — only on empty state */}
        {!activeChatId && (
          <div className="flex items-center justify-center gap-4 py-3 text-caption text-muted-foreground">
            <button className="flex items-center gap-1 hover:text-foreground transition-colors">
              <Sparkles className="h-3 w-3" /> Try Council
            </button>
            <button className="flex items-center gap-1 hover:text-foreground transition-colors">
              <Settings className="h-3 w-3" /> Customize
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
