import { DebateRound } from '@/lib/types';
import { AgentCard } from './AgentCard';
import { SynthesizerCard } from './SynthesizerCard';

interface CouncilPanelProps {
  debate: DebateRound;
  large?: boolean;
}

export function CouncilPanel({ debate, large = false }: CouncilPanelProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {debate.agentResponses.map((response) => (
          <AgentCard key={response.agentId} response={response} large={large} />
        ))}
      </div>
      <SynthesizerCard
        response={debate.synthesizerResponse}
        consensusScore={debate.consensusScore}
        large={large}
      />
    </div>
  );
}
