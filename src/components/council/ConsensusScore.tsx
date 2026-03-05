import { cn } from '@/lib/utils';

interface ConsensusScoreProps {
  score: number;
  compact?: boolean;
  className?: string;
}

export function ConsensusScore({ score, compact = false, className }: ConsensusScoreProps) {
  if (compact) {
    return (
      <span className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-caption font-medium',
        score >= 70 ? 'bg-success/10 text-success' : score >= 40 ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' : 'bg-destructive/10 text-destructive',
        className
      )}>
        {score}% consensus
      </span>
    );
  }

  return (
    <div className={cn('space-y-1.5', className)}>
      <div className="flex items-center justify-between">
        <span className="text-caption text-muted-foreground">Consensus</span>
        <span className="text-caption font-medium">{score}%</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-500',
            score >= 70 ? 'bg-success' : score >= 40 ? 'bg-amber-500' : 'bg-destructive'
          )}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}
