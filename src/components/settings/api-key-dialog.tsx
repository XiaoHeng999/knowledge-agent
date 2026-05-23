"use client";

import { useState, useCallback } from "react";
import { useModelStore } from "@/stores/model-store";

const PROVIDERS = [
  { id: "anthropic", name: "Anthropic", prefix: "sk-ant-", placeholder: "sk-ant-api03-..." },
  { id: "openai", name: "OpenAI", prefix: "sk-", placeholder: "sk-..." },
  { id: "deepseek", name: "DeepSeek", prefix: "sk-", placeholder: "sk-..." },
  { id: "google", name: "Google AI", prefix: "", placeholder: "AIza..." },
  { id: "groq", name: "Groq", prefix: "gsk_", placeholder: "gsk_..." },
  { id: "ollama", name: "Ollama (Local)", prefix: "", placeholder: "http://localhost:11434" },
  { id: "openrouter", name: "OpenRouter", prefix: "sk-or-", placeholder: "sk-or-..." },
  { id: "xai", name: "xAI", prefix: "", placeholder: "xai-..." },
  { id: "mistral", name: "Mistral", prefix: "", placeholder: "..." },
];

interface ApiKeyDialogProps {
  open: boolean;
  onClose: () => void;
}

type ValidationState = "idle" | "validating" | "success" | "error";

export function ApiKeyDialog({ open, onClose }: ApiKeyDialogProps) {
  const [selectedProvider, setSelectedProvider] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [validationState, setValidationState] = useState<ValidationState>("idle");
  const [validationError, setValidationError] = useState("");
  const addApiKey = useModelStore((s) => s.addApiKey);
  const validateApiKey = useModelStore((s) => s.validateApiKey);

  const selectedProviderDef = PROVIDERS.find((p) => p.id === selectedProvider);

  const handleValidate = useCallback(async () => {
    if (!selectedProvider || !apiKey.trim()) return;

    setValidationState("validating");
    setValidationError("");

    try {
      const result = await validateApiKey(selectedProvider, apiKey.trim());
      if (result.valid) {
        await addApiKey(selectedProvider, apiKey.trim());
        setValidationState("success");
        setTimeout(() => {
          setApiKey("");
          setSelectedProvider("");
          setValidationState("idle");
          onClose();
        }, 800);
      } else {
        setValidationState("error");
        setValidationError("API key verification failed. Please check your key.");
      }
    } catch (err) {
      setValidationState("error");
      setValidationError(err instanceof Error ? err.message : "Verification failed");
    }
  }, [selectedProvider, apiKey, validateApiKey, addApiKey, onClose]);

  const handleClose = useCallback(() => {
    if (validationState === "validating") return;
    setApiKey("");
    setSelectedProvider("");
    setValidationState("idle");
    setValidationError("");
    onClose();
  }, [validationState, onClose]);

  if (!open) return null;

  return (
    <div className="dialog-overlay" onClick={handleClose}>
      <div
        className="dialog"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Import API Key"
      >
        <div className="dialog__header">
          <h2 className="dialog__title">Import API Key</h2>
          <button className="dialog__close" onClick={handleClose} aria-label="Close">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="dialog__body">
          <label className="dialog__label">
            Provider
            <select
              className="dialog__select"
              value={selectedProvider}
              onChange={(e) => {
                setSelectedProvider(e.target.value);
                setValidationState("idle");
              }}
            >
              <option value="">Select a provider...</option>
              {PROVIDERS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>

          {selectedProviderDef && (
            <label className="dialog__label">
              API Key
              <input
                className="dialog__input"
                type="password"
                value={apiKey}
                onChange={(e) => {
                  setApiKey(e.target.value);
                  setValidationState("idle");
                }}
                placeholder={selectedProviderDef.placeholder}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleValidate();
                }}
              />
            </label>
          )}

          {validationState === "error" && (
            <p className="dialog__error">{validationError}</p>
          )}
          {validationState === "success" && (
            <p className="dialog__success">Key verified and saved successfully!</p>
          )}
        </div>

        <div className="dialog__footer">
          <button className="dialog__btn dialog__btn--secondary" onClick={handleClose}>
            Cancel
          </button>
          <button
            className="dialog__btn dialog__btn--primary"
            onClick={handleValidate}
            disabled={!selectedProvider || !apiKey.trim() || validationState === "validating"}
          >
            {validationState === "validating" ? "Verifying..." : "Save & Verify"}
          </button>
        </div>
      </div>
    </div>
  );
}
