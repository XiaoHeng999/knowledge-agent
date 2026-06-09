import { create } from 'zustand';
import type {
  ConversationInfo,
  MessageInfo,
  ConversationTree,
  StreamChunk,
} from '@/lib/ipc/channels';

// Active stream handler reference — needed so abortStream can remove the listener
let activeStreamHandler: ((...args: unknown[]) => void) | null = null;
let activeStreamChannel: string | null = null;

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
  streamingUserMsgId: string | null;

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
  retryLastMessage: (modelId: string) => Promise<void>;
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
    streamingUserMsgId: null,

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
      if (get().streaming) return;

      set({ streaming: true, streamingContent: '', streamError: null, streamingUserMsgId: null });

      // Subscribe to stream events
      const channel = `chat:stream:${currentConversationId}`;
      activeStreamChannel = channel;
      const handler = (...args: unknown[]) => {
        const chunk = args[1] as StreamChunk;
        const state = get();
        switch (chunk.type) {
          case 'start':
            set({
              streamingMessageId: chunk.assistantMessageId ?? null,
              streamingUserMsgId: chunk.userMessageId ?? null,
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
                  status: 'complete' as const,
                  createdAt: new Date().toISOString(),
                }],
              }));
            }
            break;
          case 'token':
            set((s) => ({ streamingContent: s.streamingContent + chunk.content }));
            break;
          case 'tool_call':
            set((s) => ({ streamingContent: s.streamingContent + `\n\`\`\`tool:${chunk.content}\n\`\`\`\n` }));
            break;
          case 'done': {
            const streamingId = state.streamingMessageId;
            const finalContent = state.streamingContent;
            const userMsgId = state.streamingUserMsgId;
            set((s) => ({
              streaming: false,
              streamingMessageId: null,
              streamingContent: '',
              streamingUserMsgId: null,
              messages: [
                ...s.messages,
                {
                  id: streamingId ?? '',
                  conversationId: s.currentConversationId!,
                  parentId: userMsgId,
                  role: 'assistant' as const,
                  content: finalContent,
                  modelId,
                  tokenCount: null,
                  costUsd: null,
                  metadata: null,
                  branchIndex: 0,
                  status: 'complete' as const,
                  createdAt: new Date().toISOString(),
                },
              ],
            }));
            // Unsubscribe
            window.api.removeListener(channel, handler);
            activeStreamHandler = null;
            activeStreamChannel = null;
            break;
          }
          case 'error': {
            const partialContent = state.streamingContent;
            const errMsgId = state.streamingMessageId;
            const errUserMsgId = state.streamingUserMsgId;
            const hasPartial = partialContent.length > 0 && errMsgId;
            set((s) => ({
              streaming: false,
              streamingMessageId: null,
              streamingContent: '',
              streamingUserMsgId: null,
              streamError: chunk.content,
              ...(hasPartial ? {
                messages: [...s.messages, {
                  id: errMsgId!,
                  conversationId: s.currentConversationId!,
                  parentId: errUserMsgId,
                  role: 'assistant' as const,
                  content: `⚠️ Response interrupted\n\n${partialContent}`,
                  modelId: null,
                  tokenCount: null,
                  costUsd: null,
                  metadata: null,
                  branchIndex: 0,
                  status: 'incomplete' as const,
                  createdAt: new Date().toISOString(),
                }],
              } : {}),
            }));
            window.api.removeListener(channel, handler);
            activeStreamHandler = null;
            activeStreamChannel = null;
            break;
          }
        }
      };

      window.api.on(channel, handler);
      activeStreamHandler = handler;

      try {
        await window.api.chat.sendMessage({
          conversationId: currentConversationId,
          content,
          modelId,
        });
      } catch (err) {
        window.api.removeListener(channel, handler);
        activeStreamHandler = null;
        activeStreamChannel = null;
        set({
          streaming: false,
          streamError: err instanceof Error ? err.message : String(err),
        });
      }
    },

    retryLastMessage: async (modelId) => {
      const { messages } = get();
      // Find the last incomplete assistant message and its parent user message
      for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].role === 'assistant' && messages[i].status === 'incomplete') {
          const parentId = messages[i].parentId;
          const userMsg = parentId ? messages.find((m) => m.id === parentId) : null;
          const content = userMsg?.content ?? '';
          if (content) {
            await get().sendMessage(content, modelId);
          }
          return;
        }
      }
    },

    abortStream: () => {
      const { currentConversationId } = get();
      if (!currentConversationId) return;

      // Remove listener before clearing state to prevent stale handler firings
      if (activeStreamHandler && activeStreamChannel) {
        window.api.removeListener(activeStreamChannel, activeStreamHandler);
        activeStreamHandler = null;
        activeStreamChannel = null;
      }

      window.api.chat.abortStream({ id: currentConversationId });
      set({ streaming: false, streamingContent: '', streamingMessageId: null, streamingUserMsgId: null });
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
      if (activeStreamHandler && activeStreamChannel) {
        window.api.removeListener(activeStreamChannel, activeStreamHandler);
        activeStreamHandler = null;
        activeStreamChannel = null;
      }
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
