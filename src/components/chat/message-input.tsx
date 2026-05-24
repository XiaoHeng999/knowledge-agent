"use client";

import { useState, useRef, useCallback, type KeyboardEvent } from "react";

interface MessageInputProps {
  onSend: (content: string) => void;
  disabled?: boolean;
  streaming?: boolean;
  onAbort?: () => void;
}

export function MessageInput({ onSend, disabled, streaming, onAbort }: MessageInputProps) {
  const [content, setContent] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = useCallback(() => {
    const trimmed = content.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setContent("");
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, [content, disabled, onSend]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  const handleInput = useCallback(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
    }
  }, []);

  return (
    <div className="message-input">
      <div className="message-input__container">
        <textarea
          ref={textareaRef}
          className="message-input__textarea"
          placeholder={disabled ? "Select a model to start chatting..." : "Type a message... (Enter to send, Shift+Enter for new line)"}
          value={content}
          onChange={(e) => {
            setContent(e.target.value);
            handleInput();
          }}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          rows={1}
          aria-label="Chat message input"
        />
        <div className="message-input__actions">
          {streaming ? (
            <button
              className="message-input__btn message-input__btn--abort"
              onClick={onAbort}
              title="Stop generating"
              aria-label="Stop generating"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <rect x="3" y="3" width="10" height="10" rx="1" />
              </svg>
            </button>
          ) : (
            <button
              className="message-input__btn message-input__btn--send"
              onClick={handleSend}
              disabled={disabled || !content.trim()}
              title="Send message"
              aria-label="Send message"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M2 8L14 2L10 14L8 9L2 8Z" strokeLinejoin="round" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
