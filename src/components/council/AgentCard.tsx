import { cn } from '@/lib/utils';
import { AgentResponse, Agent } from '@/lib/types';
import { AGENTS } from '@/lib/mock-data';
import { StreamingIndicator } from './StreamingIndicator';
import { StarRating } from './StarRating';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

interface AgentCardProps {
  response: AgentResponse;
  large?: boolean;
  className?: string;
}

const agentBorderColors: Record<string, string> = {
  '1': 'border-l-agent-1',
  '2': 'border-l-agent-2',
  '3': 'border-l-agent-3',
  '4': 'border-l-agent-4',
  'synth': 'border-l-agent-synth',
};

export function AgentCard({ response, large = false, className }: AgentCardProps) {
  const agent = AGENTS.find(a => a.id === response.agentId);
  if (!agent) return null;

  const isError = response.status === 'error';
  const isStreaming = response.status === 'streaming';
  const isDone = response.status === 'done';

  return (
    <Card className={cn(
      'border-l-[3px] transition-all',
      agentBorderColors[String(agent.colorKey)],
      isError && 'border-l-destructive bg-destructive/5',
      large ? 'p-5' : 'p-4',
      className
    )}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className={cn('font-semibold', large ? 'text-title' : 'text-sm')}>{agent.name}</span>
          <StreamingIndicator status={response.status} large={large} />
        </div>
        {isDone && response.rating !== undefined && (
          <StarRating rating={response.rating} readOnly size={large ? 'md' : 'sm'} />
        )}
      </div>

      {response.content && (
        <div className={cn(
          'text-card-foreground whitespace-pre-wrap',
          large ? 'text-body leading-relaxed' : 'text-sm leading-relaxed'
        )}>
          {response.content}
          {isStreaming && <span className="inline-block w-0.5 h-4 bg-primary ml-0.5 align-middle animate-blink" />}
        </div>
      )}

      {response.status === 'thinking' && (
        <div className="h-12 flex items-center">
          <div className="flex gap-1">
            {[0, 1, 2].map(i => (
              <span key={i} className="h-1.5 w-1.5 rounded-full bg-muted-foreground/30 animate-pulse" style={{ animationDelay: `${i * 200}ms` }} />
            ))}
          </div>
        </div>
      )}

      {response.status === 'idle' && !response.content && (
        <div className="h-12 flex items-center">
          <span className="text-caption text-muted-foreground">Waiting…</span>
        </div>
      )}

      {isError && (
        <div className="flex items-center gap-2 mt-2">
          <span className="text-caption text-destructive">{response.error || 'An error occurred'}</span>
          <Button variant="ghost" size="sm" className="h-7 text-xs">
            <RefreshCw className="h-3 w-3 mr-1" /> Retry
          </Button>
        </div>
      )}
    </Card>
  );
}
