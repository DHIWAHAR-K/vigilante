import { ChatMessage, Source } from '@/lib/types';
import { Globe, Copy, Share2, RotateCcw, ThumbsUp, ThumbsDown, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface ChatThreadProps {
  messages: ChatMessage[];
  viewMode?: string;
}

function SourcesRow({ sources }: { sources: Source[] }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Globe className="h-3.5 w-3.5" />
        <span>Sources</span>
      </div>
      <div className="flex gap-2 overflow-x-auto scrollbar-thin pb-1">
        {sources.map((source, index) => (
          <a
            key={source.id}
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-shrink-0 group"
          >
            <div className="w-[180px] rounded-lg border bg-card hover:bg-accent/50 transition-colors p-2.5 space-y-1.5">
              <p className="text-xs font-medium text-foreground line-clamp-2 leading-snug group-hover:text-primary transition-colors">
                {source.title}
              </p>
              <div className="flex items-center gap-1.5">
                <div className="h-3.5 w-3.5 rounded-sm bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                  {source.favicon ? (
                    <img src={source.favicon} alt="" className="h-3 w-3" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  ) : (
                    <Globe className="h-2.5 w-2.5 text-muted-foreground" />
                  )}
                </div>
                <span className="text-[10px] text-muted-foreground truncate">{source.domain}</span>
                <span className="text-[10px] text-muted-foreground/50 ml-auto flex-shrink-0">{index + 1}</span>
              </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}

function AnswerContent({ content, isStreaming }: { content: string; isStreaming?: boolean }) {
  // Simple markdown-like rendering
  const renderContent = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, i) => {
      // Bold text
      let processed: React.ReactNode = line;
      
      // Handle headers
      if (line.startsWith('**') && line.endsWith('**') && !line.includes('—')) {
        return (
          <h3 key={i} className="text-sm font-semibold text-foreground mt-4 mb-1">
            {line.replace(/\*\*/g, '')}
          </h3>
        );
      }
      
      // Handle list items with bold labels
      if (line.startsWith('- **')) {
        const parts = line.replace(/^- /, '').split('**');
        return (
          <li key={i} className="text-sm text-foreground/90 leading-relaxed ml-4 list-disc">
            {parts.map((part, j) => j % 2 === 1 ? <strong key={j} className="font-semibold text-foreground">{part}</strong> : part)}
          </li>
        );
      }

      // Handle numbered items with bold
      if (/^\*\*\d+\./.test(line)) {
        const parts = line.split('**');
        return (
          <p key={i} className="text-sm text-foreground/90 leading-relaxed mt-2">
            {parts.map((part, j) => j % 2 === 1 ? <strong key={j} className="font-semibold text-foreground">{part}</strong> : renderInlineCitations(part))}
          </p>
        );
      }

      // Regular paragraph with inline formatting
      if (line.trim() === '') return <div key={i} className="h-2" />;
      
      const parts = line.split('**');
      return (
        <p key={i} className="text-sm text-foreground/90 leading-relaxed">
          {parts.map((part, j) => j % 2 === 1 ? <strong key={j} className="font-semibold text-foreground">{part}</strong> : renderInlineCitations(part))}
        </p>
      );
    });
  };

  const renderInlineCitations = (text: string) => {
    // Replace [1], [2], etc. with styled citation badges
    const parts = text.split(/(\[\d+\])/g);
    return parts.map((part, i) => {
      const match = part.match(/^\[(\d+)\]$/);
      if (match) {
        return (
          <span key={i} className="inline-flex items-center justify-center h-4 min-w-[16px] px-1 rounded text-[10px] font-medium bg-primary/10 text-primary ml-0.5 cursor-pointer hover:bg-primary/20 transition-colors">
            {match[1]}
          </span>
        );
      }
      return part;
    });
  };

  return (
    <div className="space-y-0.5">
      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-3">
        <span>Answer</span>
      </div>
      <div className="space-y-1">
        {renderContent(content)}
        {isStreaming && (
          <span className="inline-block w-0.5 h-4 bg-primary ml-0.5 align-middle animate-blink" />
        )}
      </div>
    </div>
  );
}

function ActionBar() {
  return (
    <div className="flex items-center gap-1 pt-2 border-t mt-4">
      <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground gap-1.5">
        <Copy className="h-3 w-3" />
        Copy
      </Button>
      <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground gap-1.5">
        <Share2 className="h-3 w-3" />
        Share
      </Button>
      <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground gap-1.5">
        <RotateCcw className="h-3 w-3" />
        Rewrite
      </Button>
      <div className="ml-auto flex items-center gap-0.5">
        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground">
          <ThumbsUp className="h-3 w-3" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground">
          <ThumbsDown className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

export function ChatThread({ messages }: ChatThreadProps) {
  return (
    <div className="max-w-3xl mx-auto p-4 md:p-6 space-y-8">
      {messages.map(msg => (
        <div key={msg.id}>
          {msg.role === 'user' ? (
            <div className="space-y-2">
              <h2 className="text-lg font-semibold text-foreground leading-snug">
                {msg.content}
              </h2>
              {msg.attachments && msg.attachments.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {msg.attachments.map(f => (
                    <span key={f.id} className="inline-flex items-center gap-1.5 rounded-md bg-secondary px-2 py-1 text-xs text-muted-foreground">
                      <ExternalLink className="h-3 w-3" />
                      {f.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ) : msg.debate ? (
            <div className="space-y-4">
              {msg.sources && msg.sources.length > 0 && (
                <SourcesRow sources={msg.sources} />
              )}
              <AnswerContent
                content={msg.debate.synthesizerResponse.content}
                isStreaming={msg.debate.synthesizerResponse.status === 'streaming'}
              />
              {msg.debate.synthesizerResponse.status === 'done' && <ActionBar />}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}
