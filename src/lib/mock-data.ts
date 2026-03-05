import { Agent, Chat, ChatMessage, DebateRound, Source } from './types';

export const AGENTS: Agent[] = [
  { id: 'agent-1', name: 'Analyst', colorKey: 1 },
  { id: 'agent-2', name: 'Creative', colorKey: 2 },
  { id: 'agent-3', name: 'Pragmatist', colorKey: 3 },
  { id: 'agent-4', name: 'Critic', colorKey: 4 },
];

export const SYNTHESIZER: Agent = { id: 'synthesizer', name: 'Synthesizer', colorKey: 'synth' };

export const MOCK_CHATS: Chat[] = [
  { id: '1', title: 'Best practices for React state management', lastMessage: 'The council recommends using…', timestamp: new Date(Date.now() - 1000 * 60 * 5), pinned: true },
  { id: '2', title: 'Marketing strategy for Q2 launch', lastMessage: 'Based on the analysis…', timestamp: new Date(Date.now() - 1000 * 60 * 60), pinned: true },
  { id: '3', title: 'Database schema design review', lastMessage: 'The consensus is to normalize…', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3), pinned: false },
  { id: '4', title: 'Should we adopt microservices?', lastMessage: 'There are trade-offs to consider…', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), pinned: false },
  { id: '5', title: 'User onboarding flow improvements', lastMessage: 'Reducing friction at step 2…', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48), pinned: false },
];

const mockSources: Source[] = [
  { id: 's1', title: 'React State Management in 2024', url: 'https://react.dev/learn/managing-state', domain: 'react.dev', favicon: 'https://react.dev/favicon.ico' },
  { id: 's2', title: 'Zustand vs Redux Toolkit', url: 'https://blog.logrocket.com/zustand-vs-redux', domain: 'logrocket.com', favicon: 'https://blog.logrocket.com/favicon.ico' },
  { id: 's3', title: 'TanStack Query Overview', url: 'https://tanstack.com/query/latest', domain: 'tanstack.com', favicon: 'https://tanstack.com/favicon.ico' },
  { id: 's4', title: 'Jotai: Primitive and Flexible State', url: 'https://jotai.org', domain: 'jotai.org', favicon: 'https://jotai.org/favicon.ico' },
  { id: 's5', title: 'State Management Comparison', url: 'https://dev.to/state-management', domain: 'dev.to', favicon: 'https://dev.to/favicon.ico' },
];

const streamingSources: Source[] = [
  { id: 'ss1', title: 'B2B Marketing Strategy Guide', url: 'https://hubspot.com/marketing', domain: 'hubspot.com', favicon: 'https://hubspot.com/favicon.ico' },
  { id: 'ss2', title: 'Product Launch Playbook', url: 'https://productplan.com/launch', domain: 'productplan.com', favicon: 'https://productplan.com/favicon.ico' },
  { id: 'ss3', title: 'Content Marketing ROI', url: 'https://contentmarketinginstitute.com', domain: 'contentmarketinginstitute.com', favicon: 'https://contentmarketinginstitute.com/favicon.ico' },
];

const sampleDebate: DebateRound = {
  roundNumber: 1,
  agentResponses: [
    { agentId: 'agent-1', status: 'done', content: '', rating: 4 },
    { agentId: 'agent-2', status: 'done', content: '', rating: 5 },
    { agentId: 'agent-3', status: 'done', content: '', rating: 4 },
    { agentId: 'agent-4', status: 'done', content: '', rating: 3 },
  ],
  synthesizerResponse: {
    agentId: 'synthesizer',
    status: 'done',
    content: 'React state management should follow a **3-tier model** for optimal results [1]:\n\n**1. Local state** — Use `useState` and `useReducer` for component-scoped state. This should be your default for any state that doesn\'t need to be shared [1].\n\n**2. Server state** — TanStack Query handles API data fetching, caching, and synchronization elegantly. This alone eliminates 50-60% of what teams traditionally put in global stores [3].\n\n**3. Global client state** — For remaining cross-component state (auth, UI preferences), Zustand offers the best balance of simplicity and capability [2].\n\nThe most common mistake is treating all state as "global." By properly separating server state, teams typically find their global store becomes trivial to manage.\n\n**When to consider alternatives:**\n- **Redux Toolkit** — Large teams that benefit from strict patterns and comprehensive devtools [2]\n- **Jotai** — Apps with many independent pieces of atomic state [4]\n- **Context alone** — Very simple apps with fewer than 5 shared state values',
    rating: 5,
  },
  consensusScore: 82,
};

const streamingDebate: DebateRound = {
  roundNumber: 1,
  agentResponses: [
    { agentId: 'agent-1', status: 'done', content: '', rating: 4 },
    { agentId: 'agent-2', status: 'streaming', content: '' },
    { agentId: 'agent-3', status: 'thinking', content: '' },
    { agentId: 'agent-4', status: 'idle', content: '' },
  ],
  synthesizerResponse: { agentId: 'synthesizer', status: 'streaming', content: 'For the Q2 launch, a multi-channel approach combining content marketing with targeted outreach will yield the best results [1]. Based on Q1 data, content-led strategies showed **3.2x better ROI** than paid channels alone [3].\n\nThe strategy should focus on three pillars:\n\n**1. Narrative-driven content** — Instead of leading with features, tell the story of the problem you solve' },
  consensusScore: 0,
};

export const MOCK_MESSAGES: ChatMessage[] = [
  {
    id: 'msg-1',
    role: 'user',
    content: 'What are the best practices for React state management in 2024? Should we use Redux, Zustand, Jotai, or something else?',
    timestamp: new Date(Date.now() - 1000 * 60 * 10),
  },
  {
    id: 'msg-2',
    role: 'council',
    debate: sampleDebate,
    sources: mockSources,
    timestamp: new Date(Date.now() - 1000 * 60 * 8),
  },
];

export const STREAMING_MESSAGES: ChatMessage[] = [
  {
    id: 'msg-s1',
    role: 'user',
    content: 'What should our marketing strategy be for the Q2 product launch?',
    timestamp: new Date(Date.now() - 1000 * 60 * 2),
    attachments: [
      { id: 'f1', name: 'Q1-marketing-report.pdf', size: 2400000, progress: 100, status: 'done' },
    ],
  },
  {
    id: 'msg-s2',
    role: 'council',
    debate: streamingDebate,
    sources: streamingSources,
    timestamp: new Date(Date.now() - 1000 * 60 * 1),
  },
];
