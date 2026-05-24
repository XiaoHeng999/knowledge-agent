"use client";

import { useState, useEffect, useRef, useImperativeHandle, forwardRef } from "react";
import type { CommandDefinition } from "@/lib/commands/types";
import { findMatching } from "@/lib/commands/registry";

interface CommandAutocompleteProps {
  input: string;
  cursorPosition: number;
  onSelect: (command: CommandDefinition) => void;
  visible: boolean;
}

export interface CommandAutocompleteHandle {
  handleKey: (key: string) => boolean;
}

export const CommandAutocomplete = forwardRef<CommandAutocompleteHandle, CommandAutocompleteProps>(
  function CommandAutocomplete({ input, cursorPosition, onSelect, visible }, ref) {
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [filtered, setFiltered] = useState<CommandDefinition[]>([]);
    const listRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      setSelectedIndex(0);
    }, [input]);

    useEffect(() => {
      if (!visible) return;
      const textBeforeCursor = input.slice(0, cursorPosition);
      const slashIndex = textBeforeCursor.lastIndexOf("/");
      if (slashIndex === -1) {
        setFiltered([]);
        return;
      }
      const partial = textBeforeCursor.slice(slashIndex + 1);
      if (partial.includes(" ")) {
        setFiltered([]);
        return;
      }
      setFiltered(findMatching(partial));
    }, [input, cursorPosition, visible]);

    useImperativeHandle(ref, () => ({
      handleKey(key: string): boolean {
        if (!visible || filtered.length === 0) return false;
        switch (key) {
          case "ArrowDown":
            setSelectedIndex((i) => (i + 1) % filtered.length);
            return true;
          case "ArrowUp":
            setSelectedIndex((i) => (i - 1 + filtered.length) % filtered.length);
            return true;
          case "Enter":
          case "Tab":
            onSelect(filtered[selectedIndex]);
            return true;
          case "Escape":
            return true;
        }
        return false;
      },
    }), [visible, filtered, selectedIndex, onSelect]);

    useEffect(() => {
      if (listRef.current) {
        const selected = listRef.current.children[selectedIndex] as HTMLElement;
        selected?.scrollIntoView({ block: "nearest" });
      }
    }, [selectedIndex]);

    if (!visible || filtered.length === 0) return null;

    return (
      <div className="command-autocomplete" ref={listRef} role="listbox">
        {filtered.map((cmd, i) => (
          <button
            key={cmd.name}
            className={`command-autocomplete__item ${i === selectedIndex ? "command-autocomplete__item--active" : ""}`}
            onClick={() => onSelect(cmd)}
            onMouseEnter={() => setSelectedIndex(i)}
            role="option"
            aria-selected={i === selectedIndex}
          >
            <span className="command-autocomplete__name">/{cmd.name}</span>
            <span className="command-autocomplete__desc">{cmd.description}</span>
            {cmd.params.length > 0 && (
              <span className="command-autocomplete__params">
                {cmd.params.map((p) => (p.required ? `<${p.name}>` : `[${p.name}]`)).join(" ")}
              </span>
            )}
          </button>
        ))}
      </div>
    );
  },
);
