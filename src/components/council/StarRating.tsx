import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StarRatingProps {
  rating?: number;
  onRate?: (rating: number) => void;
  readOnly?: boolean;
  size?: 'sm' | 'md';
}

export function StarRating({ rating = 0, onRate, readOnly = false, size = 'sm' }: StarRatingProps) {
  const sizeClass = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4';

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readOnly}
          onClick={() => onRate?.(star)}
          className={cn(
            'transition-colors',
            readOnly ? 'cursor-default' : 'cursor-pointer hover:text-amber-400'
          )}
        >
          <Star
            className={cn(
              sizeClass,
              star <= rating
                ? 'fill-amber-400 text-amber-400'
                : 'fill-none text-muted-foreground/40'
            )}
          />
        </button>
      ))}
    </div>
  );
}
