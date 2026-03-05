import { Link } from 'react-router-dom';
import { STREAMING_MESSAGES } from '@/lib/mock-data';
import { CouncilPanel } from '@/components/council/CouncilPanel';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

export default function WatchPage() {
  const debate = STREAMING_MESSAGES.find(m => m.debate)?.debate;

  if (!debate) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">No active debate to watch.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6 md:p-10 relative">
      <Link to="/" className="absolute top-4 right-4 z-10">
        <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" /> Exit
        </Button>
      </Link>

      <div className="max-w-6xl mx-auto space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-display font-bold tracking-tight">Council Debate</h1>
          <p className="text-sm text-muted-foreground">Live session — Presentation mode</p>
        </div>

        <CouncilPanel debate={debate} large />
      </div>
    </div>
  );
}
