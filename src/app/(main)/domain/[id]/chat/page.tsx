"use client";

import { useEffect, useCallback, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useChatStore } from "@/stores/chat-store";
import { useModelStore } from "@/stores/model-store";
import { MessageInput } from "@/components/chat/message-input";
import { ModelSwitcher } from "@/components/chat/model-switcher";
import { ConversationTree } from "@/components/chat/conversation-tree";
import { EmptyState } from "@/components/ui";
import type { ModelInfo } from "@/lib/ipc/channels";

export default function ChatPage() {
  const searchParams = useSearchParams();
  const domainId = searchParams.get("id");

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

  const hasConversation = !!currentConversationId;

  if (!domainId) {
    return (
      <div className="chat-page__empty">
        <EmptyState
          title="No domain selected"
          description="Select a domain from the sidebar to start a conversation."
        />
      </div>
    );
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
              title="Start a conversation"
              description="Create a new conversation to chat with the domain expert agent."
              action={{ label: "New Conversation", onClick: handleNewConversation }}
            />
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
          />
        </div>
      )}
    </div>
  );
}
