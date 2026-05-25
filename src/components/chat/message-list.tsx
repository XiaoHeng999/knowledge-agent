"use client";

import { useRef, useEffect, useMemo } from "react";
import type { MessageInfo } from "@/lib/ipc/channels";

interface MessageListProps {
  messages: MessageInfo[];
  streaming?: boolean;
  streamingContent?: string;
  streamingMessageId?: string | null;
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function renderMarkdownContent(content: string): string {
  // Basic markdown → HTML for display.
  // Full markdown rendering (marked + highlight.js) will be integrated in production.
  let html = content
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Code blocks
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_match, lang, code) => {
    return `<pre class="msg-code-block"><code class="lang-${lang || "text"}">${code.trim()}</code></pre>`;
  });

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code class="msg-inline-code">$1</code>');

  // Bold
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");

  // Italic
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");

  // Line breaks
  html = html.replace(/\n/g, "<br />");

  return html;
}

function MessageBubble({
  message,
}: {
  message: MessageInfo;
}) {
  const isUser = message.role === "user";

  return (
    <div
      className={`message-list__item ${isUser ? "message-list__item--user" : "message-list__item--assistant"}`}
      role="article"
      aria-label={isUser ? "User message" : "AI assistant message"}
    >
      <div className="message-list__avatar">
        {isUser ? (
          <span role="img" aria-label="User avatar">&#x1F464;</span>
        ) : (
          <span role="img" aria-label="AI assistant avatar">&#x1F916;</span>
        )}
      </div>
      <div className="message-list__content">
        <div className="message-list__header">
          <span className="message-list__role">{isUser ? "You" : "Expert"}</span>
          <span className="message-list__time">{formatTime(message.createdAt)}</span>
        </div>
        <div
          className="message-list__body"
          dangerouslySetInnerHTML={{ __html: renderMarkdownContent(message.content) }}
        />
      </div>
    </div>
  );
}

export function MessageList({
  messages,
  streaming,
  streamingContent,
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    if (bottomRef.current) {
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      bottomRef.current.scrollIntoView({
        behavior: prefersReducedMotion ? 'auto' : 'smooth',
      });
    }
  }, [messages.length, streamingContent]);

  const visibleMessages = useMemo(
    () => messages.filter((m) => m.role !== "system"),
    [messages],
  );

  return (
    <div
      className="message-list"
      ref={containerRef}
      role="log"
      aria-label="Chat messages"
      aria-live="polite"
    >
      {visibleMessages.map((msg) => (
        <MessageBubble key={msg.id} message={msg} />
      ))}

      {streaming && streamingContent && (
        <div className="message-list__item message-list__item--assistant message-list__item--streaming">
          <div className="message-list__avatar">
            <span role="img" aria-label="AI assistant avatar">&#x1F916;</span>
          </div>
          <div className="message-list__content">
            <div className="message-list__header">
              <span className="message-list__role">Expert</span>
              <span className="message-list__typing">typing...</span>
            </div>
            <div
              className="message-list__body"
              dangerouslySetInnerHTML={{ __html: renderMarkdownContent(streamingContent) }}
            />
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
