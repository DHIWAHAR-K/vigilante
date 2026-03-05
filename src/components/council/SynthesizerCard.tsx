import { cn } from '@/lib/utils';
import { AgentResponse } from '@/lib/types';
import { StreamingIndicator } from './StreamingIndicator';
import { StarRating } from './StarRating';
import { ConsensusScore } from './ConsensusScore';
import { Card } from '@/components/ui/card';
import { Sparkles } from 'lucide-react';

interface SynthesizerCardProps {
  response: AgentResponse;
  consensusScore: number;
  large?: boolean;
  className?: string;
}

export function SynthesizerCard({ response, consensusScore, large = false, className }: SynthesizerCardProps) {
  const isDone = response.status === 'done';
  const isStreaming = response.status === 'streaming';

  return (
    <Card className={cn(
      'border-l-[3px] border-l-agent-synth relative',
      large ? 'p-6' : 'p-5',
      className
    )}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-agent-synth" />
          <span className={cn('font-semibold', large ? 'text-display' : 'text-title')}>Synthesizer</span>
          <StreamingIndicator status={response.status} large={large} />
          {isDone && consensusScore > 0 && <ConsensusScore score={consensusScore} compact />}
        </div>
        {isDone && response.rating !== undefined && (
          <StarRating rating={response.rating} readOnly size="md" />
        )}
      </div>

      {response.content ? (
        <div className={cn(
          'prose prose-sm dark:prose-invert max-w-none',
          large ? 'text-base leading-relaxed' : 'text-sm leading-relaxed'
        )}>
          {response.content}
          {isStreaming && <span className="inline-block w-0.5 h-4 bg-primary ml-0.5 align-middle animate-blink" />}
        </div>
      ) : (
        <div className="flex items-center gap-2 py-4">
          {response.status === 'idle' ? (
            <span className="text-caption text-muted-foreground">Waiting for agents to complete…</span>
          ) : (
            <div className="flex gap-1">
              {[0, 1, 2].map(i => (
                <span key={i} className="h-2 w-2 rounded-full bg-agent-synth/40 animate-pulse" style={{ animationDelay: `${i * 200}ms` }} />
              ))}
            </div>
          )}
        </div>
      )}

      {isDone && consensusScore > 0 && (
        <div className="mt-4 pt-3 border-t">
          <ConsensusScore score={consensusScore} />
        </div>
      )}
    </Card>
  );
}
