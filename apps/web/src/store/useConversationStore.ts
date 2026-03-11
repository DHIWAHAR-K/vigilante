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
  isDraftMode: boolean;
  
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

const initialConversations: Conversation[] = [];

export const useConversationStore = create<ConversationState>()(
  persist(
    (set, get) => ({
      conversations: initialConversations,
      activeConversationId: null,
      draftInput: '',
      isDraftMode: false,

      startDraftThread: () => set({ 
        activeConversationId: null,
        draftInput: '',
        isDraftMode: true
      }),

      setDraftInput: (input) => set({ draftInput: input }),

      clearDraft: () => set({ draftInput: '', isDraftMode: false }),

      openConversation: (id) => set({ 
        activeConversationId: id,
        draftInput: '',
        isDraftMode: false
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
        draftInput: state.draftInput,
        isDraftMode: state.isDraftMode
      })
    }
  )
);
