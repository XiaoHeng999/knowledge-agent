"use client";

import { useEffect, useCallback, useState } from "react";
import { use } from "react";
import { useChatStore } from "@/stores/chat-store";
import { useModelStore } from "@/stores/model-store";
import { useOnboardingStore } from "@/stores/onboarding-store";
import { MessageInput } from "@/components/chat/message-input";
import { ModelSwitcher } from "@/components/chat/model-switcher";
import { ConversationTree } from "@/components/chat/conversation-tree";
import { NoApiKeyBlocker } from "@/components/onboarding/no-api-key-blocker";
import { EmptyState } from "@/components/ui";
import type { ModelInfo } from "@/lib/ipc/channels";

export default function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const domainId = decodeURIComponent(id);

  const hasApiKey = useOnboardingStore((s) => s.hasApiKey);
  const setHasApiKey = useOnboardingStore((s) => s.setHasApiKey);

  // All hooks must be called unconditionally
  const {
    currentConversationId,
    currentConversation,
    messages,
    rootId,
    streaming,
    streamingContent,
    streamingMessageId,
    fetchConversations,
    createConversation,
    openConversation,
    conversations,
    clearCurrent,
  } = useChatStore();

  const [selectedModelId, setSelectedModelId] = useState<string | undefined>();

  const fetchModels = useModelStore((s) => s.fetchModels);
  const globalDefault = useModelStore((s) => s.globalDefault);

  useEffect(() => {
    fetchModels();
  }, [fetchModels]);

  useEffect(() => {
    if (domainId) {
      fetchConversations(domainId);
    }
    return () => clearCurrent();
  }, [domainId, fetchConversations, clearCurrent]);

  useEffect(() => {
    if (globalDefault?.modelId && !selectedModelId) {
      setSelectedModelId(globalDefault.modelId);
    }
  }, [globalDefault, selectedModelId]);

  const handleNewConversation = useCallback(async () => {
    if (!domainId) return;
    await createConversation(domainId, selectedModelId);
  }, [domainId, selectedModelId, createConversation]);

  const handleModelSelect = useCallback((model: ModelInfo) => {
    setSelectedModelId(model.id);
  }, []);

  const handleOpenConversation = useCallback(
    (convId: string) => {
      openConversation(convId);
    },
    [openConversation],
  );

  const handleApiKeyConnected = useCallback(() => {
    setHasApiKey(true);
  }, [setHasApiKey]);

  const hasConversation = !!currentConversationId;

  if (!domainId) {
    return (
      <div className="chat-page__empty">
        <EmptyState
          emoji="💬"
          title="No domain selected"
          description="Select a domain from the sidebar to start a conversation with its expert agent."
        />
      </div>
    );
  }

  // API key blocker — full-screen guidance card
  if (!hasApiKey) {
    return <NoApiKeyBlocker onConnected={handleApiKeyConnected} />;
  }

  return (
    <div className="chat-page">
      <div className="chat-page__header">
        <div className="chat-page__header-left">
          <h1 className="chat-page__title">
            {currentConversation?.title ?? "Expert Chat"}
          </h1>
          {hasConversation && (
            <button
              className="chat-page__new-btn"
              onClick={handleNewConversation}
            >
              + New
            </button>
          )}
        </div>
        <div className="chat-page__header-right">
          <ModelSwitcher
            currentModelId={selectedModelId}
            onModelSelect={handleModelSelect}
          />
        </div>
      </div>

      <div className="chat-page__body">
        {!hasConversation ? (
          <div className="chat-page__welcome">
            <EmptyState
              emoji="💬"
              title="Ask anything about this domain"
              description="Your AI expert is ready to discuss topics, answer questions, and help you explore deeper."
            >
              <div className="chat-page__starters">
                <p className="chat-page__starters-title">Suggested starters:</p>
                {[
                  'What are the key concepts in this domain?',
                  'Summarize recent developments',
                  'What should I learn next?',
                ].map((prompt) => (
                  <button
                    key={prompt}
                    className="chat-page__starter-btn"
                    onClick={() => {
                      handleNewConversation();
                    }}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </EmptyState>
            {conversations.length > 0 && (
              <div className="chat-page__history">
                <h2 className="chat-page__history-title">Recent conversations</h2>
                {conversations.slice(0, 5).map((conv) => (
                  <button
                    key={conv.id}
                    className="chat-page__history-item"
                    onClick={() => handleOpenConversation(conv.id)}
                  >
                    <span className="chat-page__history-item-title">
                      {conv.title ?? "Untitled"}
                    </span>
                    <span className="chat-page__history-item-date">
                      {new Date(conv.updatedAt).toLocaleDateString()}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <ConversationTree
            messages={messages}
            rootId={rootId}
            streaming={streaming}
            streamingContent={streamingContent}
            streamingMessageId={streamingMessageId}
          />
        )}
      </div>

      {hasConversation && (
        <div className="chat-page__input-area">
          <MessageInput
            onSend={(content) => {
              if (selectedModelId) {
                useChatStore.getState().sendMessage(content, selectedModelId);
              }
            }}
            disabled={streaming || !selectedModelId}
            streaming={streaming}
            onAbort={useChatStore.getState().abortStream}
            domainId={domainId}
            conversationId={currentConversationId ?? undefined}
            modelId={selectedModelId}
          />
        </div>
      )}
    </div>
  );
}
