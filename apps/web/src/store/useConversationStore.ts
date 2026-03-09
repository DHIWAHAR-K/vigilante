import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ConversationStatus = 'draft' | 'persisted';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: Source[];
  createdAt: Date;
}

export interface Source {
  id: string;
  title: string;
  url: string;
  favicon?: string;
  excerpt?: string;
}

export interface Conversation {
  id: string;
  status: ConversationStatus;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
  archived?: boolean;
}

interface ConversationState {
  conversations: Conversation[];
  activeConversationId: string | null;
  draftInput: string;
  
  startDraftThread: () => void;
  setDraftInput: (input: string) => void;
  clearDraft: () => void;
  
  openConversation: (id: string | null) => void;
  createConversationFromDraft: (title: string) => Conversation;
  
  addMessage: (conversationId: string, message: Message) => void;
  updateAssistantMessage: (conversationId: string, messageId: string, content: string) => void;
  
  addConversation: (conversation: Conversation) => void;
  deleteConversation: (id: string) => void;
  
  getActiveConversation: () => Conversation | null;
  getConversationsList: () => Conversation[];
}

const generateId = () => Math.random().toString(36).substring(2, 15) + Date.now().toString(36);

const initialConversations: Conversation[] = [
  { 
    id: '1', 
    status: 'persisted',
    title: 'React 19 vs Next.js 15 routing', 
    messages: [
      { id: 'm1', role: 'user', content: 'What are the key differences between React 19 and Next.js 15 routing?', createdAt: new Date(Date.now() - 10 * 60 * 1000) },
      { id: 'm2', role: 'assistant', content: 'React 19 and Next.js 15 have some overlapping features but serve different purposes:\n\n**React 19** is a library focused on UI updates:\n- Uses the new React Compiler for automatic memoization\n- Actions for handling form submissions\n- use() hook for reading promises/resources\n- Improved server components support\n\n**Next.js 15** is a full framework built on React:\n- File-based routing with App Router\n- Server Actions built on React 19 actions\n- Streaming and Suspense improvements\n- Partial prerendering capabilities\n\nThe main difference is that React 19 is the underlying library, while Next.js 15 uses React 19 to power its framework features.', createdAt: new Date(Date.now() - 9 * 60 * 1000) }
    ],
    createdAt: new Date(Date.now() - 10 * 60 * 1000), 
    updatedAt: new Date(Date.now() - 9 * 60 * 1000) 
  },
  { 
    id: '2', 
    status: 'persisted',
    title: 'Implementing RAG with local Llama 3', 
    messages: [
      { id: 'm3', role: 'user', content: 'How do I implement RAG using Llama 3 locally?', createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000) }
    ],
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), 
    updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000) 
  },
  { 
    id: '3', 
    status: 'persisted',
    title: 'Framer Motion layout animations', 
    messages: [],
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000), 
    updatedAt: new Date(Date.now() - 24 * 60 * 60 * 1000) 
  },
  { 
    id: '4', 
    status: 'persisted',
    title: 'Tailwind CSS vs CSS Modules', 
    messages: [],
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), 
    updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) 
  },
  { 
    id: '5', 
    status: 'persisted',
    title: 'Zustand state persistence', 
    messages: [],
    createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000), 
    updatedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000) 
  },
];

export const useConversationStore = create<ConversationState>()(
  persist(
    (set, get) => ({
      conversations: initialConversations,
      activeConversationId: '1',
      draftInput: '',

      startDraftThread: () => set({ 
        activeConversationId: null,
        draftInput: ''
      }),

      setDraftInput: (input) => set({ draftInput: input }),

      clearDraft: () => set({ draftInput: '' }),

      openConversation: (id) => set({ 
        activeConversationId: id,
        draftInput: ''
      }),

      createConversationFromDraft: (title) => {
        const newConversation: Conversation = {
          id: generateId(),
          status: 'persisted',
          title: title || 'New Conversation',
          messages: [],
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        set((state) => ({
          conversations: [
            newConversation,
            ...state.conversations.map(c => ({ ...c, status: 'persisted' as const }))
          ],
          activeConversationId: newConversation.id,
          draftInput: ''
        }));
        
        return newConversation;
      },

      addMessage: (conversationId, message) => set((state) => ({
        conversations: state.conversations.map(c => {
          if (c.id === conversationId) {
            return {
              ...c,
              messages: [...c.messages, message],
              updatedAt: new Date()
            };
          }
          return c;
        })
      })),

      updateAssistantMessage: (conversationId, messageId, content) => set((state) => ({
        conversations: state.conversations.map(c => {
          if (c.id === conversationId) {
            return {
              ...c,
              messages: c.messages.map(m => 
                m.id === messageId ? { ...m, content } : m
              ),
              updatedAt: new Date()
            };
          }
          return c;
        })
      })),

      addConversation: (conversation) => set((state) => ({
        conversations: [
          conversation,
          ...state.conversations
        ]
      })),

      deleteConversation: (id) => set((state) => {
        const newConversations = state.conversations.filter(c => c.id !== id);
        let newActiveId = state.activeConversationId;

        if (state.activeConversationId === id) {
          newActiveId = newConversations.length > 0 ? newConversations[0].id : null;
        }

        return {
          conversations: newConversations,
          activeConversationId: newActiveId
        };
      }),

      getActiveConversation: () => {
        const { conversations, activeConversationId } = get();
        if (!activeConversationId) return null;
        return conversations.find(c => c.id === activeConversationId) || null;
      },

      getConversationsList: () => {
        const { conversations } = get();
        return conversations.filter(c => c.status === 'persisted');
      }
    }),
    {
      name: 'vigilante-conversations-storage',
      partialize: (state) => ({
        conversations: state.conversations,
        activeConversationId: state.activeConversationId,
        draftInput: state.draftInput
      })
    }
  )
);
