import { cn } from '@/lib/utils';
import { AgentStatus } from '@/lib/types';

interface StreamingIndicatorProps {
  status: AgentStatus;
  className?: string;
  large?: boolean;
}

export function StreamingIndicator({ status, className, large = false }: StreamingIndicatorProps) {
  if (status === 'idle') return null;

  const dotSize = large ? 'h-2.5 w-2.5' : 'h-1.5 w-1.5';
  const textSize = large ? 'text-sm' : 'text-caption';

  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      {status === 'thinking' && (
        <>
          <span className={cn(dotSize, 'rounded-full bg-amber-500 animate-pulse-dot')} />
          <span className={cn(textSize, 'text-muted-foreground')}>Thinking…</span>
        </>
      )}
      {status === 'streaming' && (
        <>
          <span className={cn(dotSize, 'rounded-full bg-primary animate-pulse-dot')} />
          <span className={cn(textSize, 'text-muted-foreground')}>Streaming…</span>
        </>
      )}
      {status === 'done' && (
        <>
          <span className={cn(dotSize, 'rounded-full bg-success')} />
          <span className={cn(textSize, 'text-muted-foreground')}>Done</span>
        </>
      )}
      {status === 'error' && (
        <>
          <span className={cn(dotSize, 'rounded-full bg-destructive')} />
          <span className={cn(textSize, 'text-destructive')}>Error</span>
        </>
      )}
    </div>
  );
}
