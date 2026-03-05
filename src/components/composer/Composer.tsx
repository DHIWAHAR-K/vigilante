import { useState, useRef, KeyboardEvent } from 'react';
import { Send, Plus, Mic, Users, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface ComposerProps {
  onSend?: (message: string) => void;
  disabled?: boolean;
  rateLimited?: boolean;
  rateLimitCountdown?: number;
}

export function Composer({ onSend, disabled = false, rateLimited = false, rateLimitCountdown = 0 }: ComposerProps) {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    if (!message.trim() || disabled) return;
    onSend?.(message);
    setMessage('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
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
    <div className="border-t bg-card/50 px-4 py-3">
      {rateLimited && (
        <div className="max-w-3xl mx-auto mb-2 rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2 text-xs text-destructive">
          Rate limited — try again in {rateLimitCountdown}s
        </div>
      )}
      <div className="max-w-3xl mx-auto">
        <div className="rounded-2xl border bg-card p-3 space-y-3">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={e => setMessage(e.target.value)}
            onInput={handleInput}
            onKeyDown={handleKeyDown}
            placeholder="Ask follow-up…"
            rows={1}
            disabled={disabled || rateLimited}
            className={cn(
              'w-full resize-none bg-transparent text-sm',
              'placeholder:text-muted-foreground',
              'focus:outline-none',
              'min-h-[36px] max-h-[160px]',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground rounded-full border">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                <Users className="h-3.5 w-3.5" />
                <span>Agents</span>
                <ChevronDown className="h-3 w-3" />
              </button>
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
                disabled={!message.trim() || disabled || rateLimited}
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
