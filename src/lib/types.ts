export type AgentStatus = 'idle' | 'thinking' | 'streaming' | 'done' | 'error';

export interface Agent {
  id: string;
  name: string;
  colorKey: 1 | 2 | 3 | 4 | 'synth';
}

export interface AgentResponse {
  agentId: string;
  status: AgentStatus;
  content: string;
  rating?: number;
  error?: string;
}

export interface DebateRound {
  roundNumber: number;
  agentResponses: AgentResponse[];
  synthesizerResponse: AgentResponse;
  consensusScore: number;
}

export interface Source {
  id: string;
  title: string;
  url: string;
  favicon?: string;
  domain: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'council';
  content?: string;
  debate?: DebateRound;
  sources?: Source[];
  attachments?: FileAttachment[];
  timestamp: Date;
}

export interface FileAttachment {
  id: string;
  name: string;
  size: number;
  progress: number;
  status: 'uploading' | 'done' | 'error';
}

export interface Chat {
  id: string;
  title: string;
  lastMessage: string;
  timestamp: Date;
  pinned: boolean;
}

export type ViewMode = 'council' | 'unified';
export type ConnectionStatus = 'connected' | 'reconnecting' | 'disconnected';
