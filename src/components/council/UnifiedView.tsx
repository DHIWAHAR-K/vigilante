import { DebateRound } from '@/lib/types';
import { AGENTS } from '@/lib/mock-data';
import { SynthesizerCard } from './SynthesizerCard';
import { StarRating } from './StarRating';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

interface UnifiedViewProps {
  debate: DebateRound;
}

const agentDotColors: Record<string, string> = {
  '1': 'bg-agent-1',
  '2': 'bg-agent-2',
  '3': 'bg-agent-3',
  '4': 'bg-agent-4',
};

export function UnifiedView({ debate }: UnifiedViewProps) {
  return (
    <div className="space-y-4">
      <SynthesizerCard
        response={debate.synthesizerResponse}
        consensusScore={debate.consensusScore}
      />

      <Accordion type="multiple" className="space-y-2">
        {debate.agentResponses.map((response) => {
          const agent = AGENTS.find(a => a.id === response.agentId);
          if (!agent) return null;

          return (
            <AccordionItem key={response.agentId} value={response.agentId} className="border rounded-lg px-4">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${agentDotColors[String(agent.colorKey)]}`} />
                  <span className="font-medium text-sm">{agent.name}</span>
                  {response.rating !== undefined && (
                    <StarRating rating={response.rating} readOnly size="sm" />
                  )}
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <p className="text-sm leading-relaxed text-card-foreground whitespace-pre-wrap">
                  {response.content}
                </p>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
}
