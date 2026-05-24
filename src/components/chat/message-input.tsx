"use client";

import { useState, useRef, useCallback, useEffect, type KeyboardEvent } from "react";
import { parseCommand } from "@/lib/commands/parser";
import type { CommandDefinition, CommandResult } from "@/lib/commands/types";
import { executeCommand } from "@/lib/commands/registry";
import { CommandAutocomplete } from "./command-autocomplete";
import type { CommandAutocompleteHandle } from "./command-autocomplete";

interface MessageInputProps {
  onSend: (content: string) => void;
  disabled?: boolean;
  streaming?: boolean;
  onAbort?: () => void;
  domainId?: string;
  conversationId?: string;
  modelId?: string;
  onError?: (message: string) => void;
}

export function MessageInput({
  onSend,
  disabled,
  streaming,
  onAbort,
  domainId,
  conversationId,
  modelId,
  onError,
}: MessageInputProps) {
  const [content, setContent] = useState("");
  const [autocompleteVisible, setAutocompleteVisible] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const autocompleteRef = useRef<CommandAutocompleteHandle>(null);

  useEffect(() => {
    const trimmed = content.trimStart();
    if (trimmed.startsWith("/") && !trimmed.includes(" ")) {
      setAutocompleteVisible(true);
    } else {
      setAutocompleteVisible(false);
    }
  }, [content]);

  const handleSend = useCallback(() => {
    const trimmed = content.trim();
    if (!trimmed || disabled) return;

    const parsed = parseCommand(trimmed);
    if (parsed && domainId && conversationId && modelId) {
      executeCommand(parsed, { domainId, conversationId, modelId }).then(
        (result: CommandResult) => {
          if (result.type === "error") {
            onError?.(result.message);
          } else {
            onSend(result.content);
          }
        },
      );
    } else {
      onSend(trimmed);
    }
    setContent("");
    setAutocompleteVisible(false);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, [content, disabled, onSend, domainId, conversationId, modelId, onError]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (autocompleteVisible && autocompleteRef.current) {
        const handled = autocompleteRef.current.handleKey(e.key);
        if (handled) {
          e.preventDefault();
          if (e.key === "Escape") {
            setAutocompleteVisible(false);
          }
          return;
        }
      }
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend, autocompleteVisible],
  );

  const handleCommandSelect = useCallback(
    (cmd: CommandDefinition) => {
      const paramHint = cmd.params.length > 0
        ? " " + cmd.params.map((p) => (p.required ? `<${p.name}>` : `[${p.name}]`)).join(" ")
        : "";
      setContent(`/${cmd.name}${paramHint} `);
      setAutocompleteVisible(false);
      textareaRef.current?.focus();
    },
    [],
  );

  const handleInput = useCallback(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
    }
  }, []);

  const placeholder = disabled
    ? "Select a model to start chatting..."
    : "Type a message or / for commands... (Enter to send)";

  return (
    <div className="message-input">
      <div className="message-input__container">
        <CommandAutocomplete
          ref={autocompleteRef}
          input={content}
          cursorPosition={content.length}
          onSelect={handleCommandSelect}
          visible={autocompleteVisible}
        />
        <textarea
          ref={textareaRef}
          className="message-input__textarea"
          placeholder={placeholder}
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
