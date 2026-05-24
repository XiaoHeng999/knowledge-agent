import { create } from 'zustand';
import type {
  ConversationInfo,
  MessageInfo,
  ConversationTree,
  StreamChunk,
} from '@/lib/ipc/channels';

interface ChatState {
  conversations: ConversationInfo[];
  currentConversationId: string | null;
  currentConversation: ConversationInfo | null;
  messages: MessageInfo[];
  rootId: string | null;
  totalConversations: number;
  loading: boolean;
  error: string | null;

  // Streaming state
  streaming: boolean;
  streamingMessageId: string | null;
  streamingContent: string;
  streamError: string | null;

  // Branch navigation
  activeBranchPaths: Record<string, number>; // parentId → active branchIndex
  collapsedNodeIds: Set<string>;
}

interface ChatActions {
  fetchConversations: (domainId: string) => Promise<void>;
  createConversation: (domainId: string, modelId?: string, title?: string) => Promise<ConversationInfo>;
  openConversation: (conversationId: string) => Promise<void>;
  deleteConversation: (conversationId: string) => Promise<void>;

  sendMessage: (content: string, modelId: string) => Promise<void>;
  abortStream: () => void;

  branchFromMessage: (parentMessageId: string, content: string) => Promise<MessageInfo>;
  switchBranch: (parentId: string, branchIndex: number) => void;
  toggleCollapse: (nodeId: string) => void;

  clearCurrent: () => void;
}

export const useChatStore = create<ChatState & ChatActions>()(
  (set, get) => ({
    conversations: [],
    currentConversationId: null,
    currentConversation: null,
    messages: [],
    rootId: null,
    totalConversations: 0,
    loading: false,
    error: null,

    streaming: false,
    streamingMessageId: null,
    streamingContent: '',
    streamError: null,

    activeBranchPaths: {},
    collapsedNodeIds: new Set(),

    fetchConversations: async (domainId) => {
      set({ loading: true, error: null });
      try {
        const result = await window.api.chat.listConversations({ domainId });
        set({
          conversations: result.conversations,
          totalConversations: result.total,
          loading: false,
        });
      } catch (err) {
        set({
          error: err instanceof Error ? err.message : String(err),
          loading: false,
        });
      }
    },

    createConversation: async (domainId, modelId, title) => {
      set({ loading: true, error: null });
      try {
        const conv = await window.api.chat.createConversation({
          domainId,
          modelId,
          title,
        });
        set((s) => ({
          conversations: [conv, ...s.conversations],
          totalConversations: s.totalConversations + 1,
          currentConversationId: conv.id,
          currentConversation: conv,
          messages: [],
          rootId: null,
          loading: false,
        }));
        return conv;
      } catch (err) {
        set({
          error: err instanceof Error ? err.message : String(err),
          loading: false,
        });
        throw err;
      }
    },

    openConversation: async (conversationId) => {
      set({ loading: true, error: null });
      try {
        const tree: ConversationTree = await window.api.chat.getTree({ conversationId });
        set({
          currentConversationId: tree.conversation.id,
          currentConversation: tree.conversation,
          messages: tree.messages,
          rootId: tree.rootId,
          activeBranchPaths: {},
          collapsedNodeIds: new Set(),
          loading: false,
        });
      } catch (err) {
        set({
          error: err instanceof Error ? err.message : String(err),
          loading: false,
        });
      }
    },

    deleteConversation: async (conversationId) => {
      try {
        await window.api.chat.deleteConversation({ id: conversationId });
        set((s) => {
          const isActive = s.currentConversationId === conversationId;
          return {
            conversations: s.conversations.filter((c) => c.id !== conversationId),
            totalConversations: s.totalConversations - 1,
            ...(isActive
              ? { currentConversationId: null, currentConversation: null, messages: [], rootId: null }
              : {}),
          };
        });
      } catch (err) {
        set({ error: err instanceof Error ? err.message : String(err) });
      }
    },

    sendMessage: async (content, modelId) => {
      const { currentConversationId } = get();
      if (!currentConversationId) return;

      set({ streaming: true, streamingContent: '', streamError: null });

      // Subscribe to stream events
      const channel = `chat:stream:${currentConversationId}`;
      const handler = (...args: unknown[]) => {
        const chunk = args[1] as StreamChunk;
        const state = get();
        switch (chunk.type) {
          case 'start':
            set({
              streamingMessageId: chunk.assistantMessageId ?? null,
            });
            // Add user message to local state immediately
            if (chunk.userMessageId) {
              set((s) => ({
                messages: [...s.messages, {
                  id: chunk.userMessageId!,
                  conversationId: s.currentConversationId!,
                  parentId: s.messages.length > 0 ? s.messages[s.messages.length - 1].id : null,
                  role: 'user' as const,
                  content,
                  modelId: null,
                  tokenCount: null,
                  costUsd: null,
                  metadata: null,
                  branchIndex: 0,
                  createdAt: new Date().toISOString(),
                }],
              }));
            }
            break;
          case 'token':
            set({ streamingContent: state.streamingContent + chunk.content });
            break;
          case 'tool_call':
            set({ streamingContent: state.streamingContent + `\n\`\`\`tool:${chunk.content}\n\`\`\`\n` });
            break;
          case 'done': {
            // Finalize streaming message
            const streamingId = state.streamingMessageId;
            const finalContent = state.streamingContent;
            set((s) => ({
              streaming: false,
              streamingMessageId: null,
              streamingContent: '',
              messages: [
                ...s.messages,
                {
                  id: streamingId ?? '',
                  conversationId: s.currentConversationId!,
                  parentId: chunk.messageId === streamingId
                    ? s.messages.find((m) => m.role === 'user')?.id ?? null
                    : null,
                  role: 'assistant' as const,
                  content: finalContent,
                  modelId,
                  tokenCount: null,
                  costUsd: null,
                  metadata: null,
                  branchIndex: 0,
                  createdAt: new Date().toISOString(),
                },
              ],
            }));
            // Unsubscribe
            window.api.removeListener(channel, handler);
            break;
          }
          case 'error':
            set({
              streaming: false,
              streamError: chunk.content,
            });
            window.api.removeListener(channel, handler);
            break;
        }
      };

      window.api.on(channel, handler);

      try {
        await window.api.chat.sendMessage({
          conversationId: currentConversationId,
          content,
          modelId,
        });
      } catch (err) {
        window.api.removeListener(channel, handler);
        set({
          streaming: false,
          streamError: err instanceof Error ? err.message : String(err),
        });
      }
    },

    abortStream: () => {
      const { currentConversationId } = get();
      if (!currentConversationId) return;
      window.api.chat.abortStream({ id: currentConversationId });
      set({ streaming: false, streamingContent: '', streamingMessageId: null });
    },

    branchFromMessage: async (parentMessageId, content) => {
      const msg = await window.api.chat.branchFromMessage({
        parentMessageId,
        content,
      });
      set((s) => ({ messages: [...s.messages, msg] }));
      return msg;
    },

    switchBranch: (parentId, branchIndex) => {
      set((s) => ({
        activeBranchPaths: { ...s.activeBranchPaths, [parentId]: branchIndex },
      }));
    },

    toggleCollapse: (nodeId) => {
      set((s) => {
        const next = new Set(s.collapsedNodeIds);
        if (next.has(nodeId)) {
          next.delete(nodeId);
        } else {
          next.add(nodeId);
        }
        return { collapsedNodeIds: next };
      });
    },

    clearCurrent: () => {
      set({
        currentConversationId: null,
        currentConversation: null,
        messages: [],
        rootId: null,
        streaming: false,
        streamingContent: '',
        streamingMessageId: null,
        streamError: null,
        activeBranchPaths: {},
        collapsedNodeIds: new Set(),
      });
    },
  }),
);
