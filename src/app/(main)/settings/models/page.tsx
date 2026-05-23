"use client";

import { useEffect, useState, useCallback } from "react";
import { useModelStore } from "@/stores/model-store";
import { ApiKeyDialog } from "@/components/settings/api-key-dialog";
import { ModelList } from "@/components/settings/model-list";

export default function ModelsSettingsPage() {
  const providers = useModelStore((s) => s.providers);
  const models = useModelStore((s) => s.models);
  const loading = useModelStore((s) => s.loading);
  const error = useModelStore((s) => s.error);
  const fetchProviders = useModelStore((s) => s.fetchProviders);
  const fetchModels = useModelStore((s) => s.fetchModels);
  const removeApiKey = useModelStore((s) => s.removeApiKey);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    fetchProviders();
    fetchModels();
  }, [fetchProviders, fetchModels]);

  const handleRemoveKey = useCallback(
    async (providerId: string) => {
      await removeApiKey(providerId);
      await fetchModels();
    },
    [removeApiKey, fetchModels],
  );

  return (
    <div className="settings-page">
      <div className="settings-page__header">
        <h1 className="settings-page__title">Model Management</h1>
        <p className="settings-page__subtitle">
          Configure API keys and manage available models
        </p>
      </div>

      {error && <div className="settings-page__error">{error}</div>}

      {/* API Keys Section */}
      <section className="settings-page__section">
        <div className="settings-page__section-header">
          <h2 className="settings-page__section-title">API Keys</h2>
          <button
            className="settings-page__btn settings-page__btn--primary"
            onClick={() => setDialogOpen(true)}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 1V13M1 7H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            Add Key
          </button>
        </div>

        <div className="settings-page__key-list">
          {providers.length === 0 && !loading && (
            <p className="settings-page__empty">
              No API keys configured. Click &quot;Add Key&quot; to import your first key.
            </p>
          )}
          {providers.map((provider) => (
            <div key={provider.id} className="settings-page__key-item">
              <div className="settings-page__key-info">
                <span
                  className={`settings-page__key-status ${provider.enabled ? "settings-page__key-status--active" : ""}`}
                />
                <span className="settings-page__key-provider">{provider.name}</span>
                {provider.enabled && (
                  <span className="settings-page__key-badge">Active</span>
                )}
              </div>
              <div className="settings-page__key-actions">
                {provider.enabled && (
                  <button
                    className="settings-page__btn settings-page__btn--ghost settings-page__btn--danger"
                    onClick={() => handleRemoveKey(provider.id)}
                    title="Remove API key"
                  >
                    Remove
                  </button>
                )}
                {!provider.enabled && (
                  <button
                    className="settings-page__btn settings-page__btn--ghost"
                    onClick={() => setDialogOpen(true)}
                  >
                    Configure
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Models Section */}
      <section className="settings-page__section">
        <h2 className="settings-page__section-title">Available Models</h2>
        <ModelList models={models} loading={loading} />
      </section>

      <ApiKeyDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
    </div>
  );
}
