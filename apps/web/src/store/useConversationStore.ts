import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Conversation {
  id: string;
  title: string;
  time?: string;
  active?: boolean;
  createdAt: Date;
}

interface ConversationState {
  conversations: Conversation[];
  activeConversationId: string | null;
  
  addConversation: (conversation: Conversation) => void;
  deleteConversation: (id: string) => void;
  setActiveConversation: (id: string | null) => void;
  getFallbackConversationId: () => string | null;
}

const generateId = () => Math.random().toString(36).substring(2, 15);

const initialConversations: Conversation[] = [
  { id: '1', title: 'React 19 vs Next.js 15 routing', time: '10m', active: true, createdAt: new Date() },
  { id: '2', title: 'Implementing RAG with local Llama 3', time: '2h', active: false, createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000) },
  { id: '3', title: 'Framer Motion layout animations', time: '1d', active: false, createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
  { id: '4', title: 'Tailwind CSS vs CSS Modules', time: '3d', active: false, createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) },
  { id: '5', title: 'Zustand state persistence', time: '4d', active: false, createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000) },
  { id: '6', title: 'Ollama local setup guide', time: 'Jan 12', active: false, createdAt: new Date('2025-01-12') },
  { id: '7', title: 'Python multi-threading basics', time: 'Jan 05', active: false, createdAt: new Date('2025-01-05') },
];

export const useConversationStore = create<ConversationState>()(
  persist(
    (set, get) => ({
      conversations: initialConversations,
      activeConversationId: '1',

      addConversation: (conversation) => set((state) => ({
        conversations: [
          { ...conversation, id: generateId(), createdAt: new Date(), active: true },
          ...state.conversations.map(c => ({ ...c, active: false }))
        ],
        activeConversationId: conversation.id || get().activeConversationId
      })),

      deleteConversation: (id) => set((state) => {
        const newConversations = state.conversations.filter(c => c.id !== id);
        let newActiveId = state.activeConversationId;

        if (state.activeConversationId === id) {
          newActiveId = get().getFallbackConversationId();
        }

        return {
          conversations: newConversations,
          activeConversationId: newActiveId
        };
      }),

      setActiveConversation: (id) => set((state) => ({
        conversations: state.conversations.map(c => ({
          ...c,
          active: c.id === id
        })),
        activeConversationId: id
      })),

      getFallbackConversationId: () => {
        const { conversations, activeConversationId } = get();
        const remaining = conversations.filter(c => c.id !== activeConversationId);
        return remaining.length > 0 ? remaining[0].id : null;
      }
    }),
    {
      name: 'vigilante-conversations-storage',
    }
  )
);
