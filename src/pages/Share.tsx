import { useParams, Link } from 'react-router-dom';
import { MOCK_MESSAGES, AGENTS } from '@/lib/mock-data';
import { SynthesizerCard } from '@/components/council/SynthesizerCard';
import { StarRating } from '@/components/council/StarRating';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Calendar, ExternalLink } from 'lucide-react';

const agentDotColors: Record<string, string> = {
  '1': 'bg-agent-1', '2': 'bg-agent-2', '3': 'bg-agent-3', '4': 'bg-agent-4',
};

export default function SharePage() {
  const { id } = useParams();
  // Mock: use first council message
  const debate = MOCK_MESSAGES.find(m => m.debate)?.debate;

  if (!debate) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Session not found.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="max-w-3xl mx-auto flex items-center justify-between px-4 py-3">
          <h1 className="text-title font-bold tracking-tight">Council</h1>
          <ThemeToggle />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <div className="space-y-1">
          <h2 className="text-display font-bold">Council Session</h2>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            <span>Shared session #{id}</span>
          </div>
        </div>

        <SynthesizerCard response={debate.synthesizerResponse} consensusScore={debate.consensusScore} large />

        <Accordion type="multiple" className="space-y-2">
          {debate.agentResponses.map(response => {
            const agent = AGENTS.find(a => a.id === response.agentId);
            if (!agent) return null;
            return (
              <AccordionItem key={response.agentId} value={response.agentId} className="border rounded-lg px-4">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${agentDotColors[String(agent.colorKey)]}`} />
                    <span className="font-medium text-sm">{agent.name}</span>
                    {response.rating !== undefined && <StarRating rating={response.rating} readOnly />}
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{response.content}</p>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>

        <div className="text-center pt-6 border-t">
          <Link to="/">
            <Button size="lg" className="gap-2">
              Start your own Council <ExternalLink className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </main>
    </div>
  );
}
