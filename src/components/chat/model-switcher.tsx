"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useModelStore } from "@/stores/model-store";
import type { ModelInfo } from "@/lib/ipc/channels";

interface ModelSwitcherProps {
  currentModelId?: string;
  onModelSelect: (model: ModelInfo) => void;
}

export function ModelSwitcher({ currentModelId, onModelSelect }: ModelSwitcherProps) {
  const models = useModelStore((s) => s.models);
  const fetchModels = useModelStore((s) => s.fetchModels);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchModels();
  }, [fetchModels]);

  const available = models.filter((m) => m.available);
  const current = available.find((m) => m.id === currentModelId);

  const filtered = search.trim()
    ? available.filter(
        (m) =>
          m.name.toLowerCase().includes(search.toLowerCase()) ||
          m.provider.toLowerCase().includes(search.toLowerCase()),
      )
    : available;

  const handleSelect = useCallback(
    (model: ModelInfo) => {
      onModelSelect(model);
      setOpen(false);
      setSearch("");
    },
    [onModelSelect],
  );

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div className="model-switcher" ref={containerRef}>
      <button
        className="model-switcher__trigger"
        onClick={() => setOpen(!open)}
        title="Switch model"
      >
        <span className="model-switcher__name">{current?.name ?? "Select model"}</span>
        <svg
          className={`model-switcher__chevron ${open ? "model-switcher__chevron--open" : ""}`}
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
        >
          <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>

      {open && (
        <div className="model-switcher__dropdown" role="listbox">
          <input
            className="model-switcher__search"
            type="text"
            placeholder="Search models..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
          <div className="model-switcher__list">
            {filtered.length === 0 && (
              <p className="model-switcher__empty">No available models found</p>
            )}
            {filtered.map((model) => (
              <button
                key={model.id}
                className={`model-switcher__item ${model.id === currentModelId ? "model-switcher__item--active" : ""}`}
                onClick={() => handleSelect(model)}
                role="option"
                aria-selected={model.id === currentModelId}
              >
                <span className="model-switcher__item-name">{model.name}</span>
                <span className="model-switcher__item-provider">{model.provider}</span>
                {model.costPerMillion > 0 && (
                  <span className="model-switcher__item-cost">
                    ${model.costPerMillion.toFixed(2)}/M
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
