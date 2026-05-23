'use client';

import { useEffect, useState, useCallback } from 'react';
import { useDomainStore } from '@/stores/domain-store';
import type { DomainConfig } from '@/lib/ipc/channels';

export default function DomainsSettingsPage() {
  const domains = useDomainStore((s) => s.domains);
  const loading = useDomainStore((s) => s.loading);
  const error = useDomainStore((s) => s.error);
  const fetchDomains = useDomainStore((s) => s.fetchDomains);
  const updateDomain = useDomainStore((s) => s.updateDomain);
  const deleteDomain = useDomainStore((s) => s.deleteDomain);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [config, setConfig] = useState<DomainConfig | null>(null);
  const [configLoading, setConfigLoading] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editColor, setEditColor] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  useEffect(() => {
    fetchDomains();
  }, [fetchDomains]);

  // When a domain is selected, load its config
  const selectedDomain = domains.find((d) => d.id === selectedId) ?? null;

  useEffect(() => {
    if (!selectedId) {
      setConfig(null);
      return;
    }
    let cancelled = false;
    setConfigLoading(true);
    window.api.domain.getConfig({ id: selectedId }).then((res) => {
      if (!cancelled) {
        setConfig(res.config);
        setConfigLoading(false);
      }
    }).catch(() => {
      if (!cancelled) setConfigLoading(false);
    });
    return () => { cancelled = true; };
  }, [selectedId]);

  // Sync edit fields when selection changes
  useEffect(() => {
    if (selectedDomain) {
      setEditName(selectedDomain.name);
      setEditDescription(selectedDomain.description);
      setEditColor(selectedDomain.color);
      setDeleteConfirm(false);
    }
  }, [selectedDomain]);

  const handleSave = useCallback(async () => {
    if (!selectedId) return;
    setSaving(true);
    try {
      await updateDomain({
        id: selectedId,
        name: editName,
        description: editDescription,
        color: editColor,
      });
    } finally {
      setSaving(false);
    }
  }, [selectedId, editName, editDescription, editColor, updateDomain]);

  const handleDelete = useCallback(async () => {
    if (!selectedId) return;
    await deleteDomain(selectedId);
    setSelectedId(null);
    setDeleteConfirm(false);
  }, [selectedId, deleteDomain]);

  return (
    <div className="settings-page">
      <div className="settings-page__header">
        <h1 className="settings-page__title">Domain Management</h1>
        <p className="settings-page__subtitle">
          Create, configure, and manage your knowledge domains
        </p>
      </div>

      {error && <div className="settings-page__error">{error}</div>}

      <div className="domain-settings">
        {/* Domain list sidebar */}
        <div className="domain-settings__list">
          <h2 className="domain-settings__list-title">Domains ({domains.length})</h2>
          {loading && domains.length === 0 && (
            <div className="domain-settings__loading">Loading...</div>
          )}
          {domains.map((domain) => (
            <button
              key={domain.id}
              className={`domain-settings__item ${selectedId === domain.id ? 'domain-settings__item--active' : ''}`}
              onClick={() => setSelectedId(domain.id)}
            >
              <span
                className="domain-settings__dot"
                style={{ backgroundColor: domain.color }}
              />
              <span className="domain-settings__item-name">{domain.name}</span>
              <span className="domain-settings__item-count">{domain.knowledgeCount}</span>
            </button>
          ))}
          {domains.length === 0 && !loading && (
            <p className="domain-settings__empty">No domains created yet.</p>
          )}
        </div>

        {/* Domain detail/editor */}
        <div className="domain-settings__detail">
          {!selectedDomain ? (
            <div className="domain-settings__no-selection">
              <p>Select a domain from the list to edit its configuration</p>
            </div>
          ) : (
            <div className="domain-settings__editor">
              <div className="domain-settings__editor-header">
                <span
                  className="domain-settings__editor-dot"
                  style={{ backgroundColor: selectedDomain.color }}
                />
                <h2 className="domain-settings__editor-title">{selectedDomain.name}</h2>
              </div>

              {/* Basic info */}
              <section className="domain-settings__section">
                <h3 className="domain-settings__section-title">General</h3>
                <div className="domain-settings__field">
                  <label className="domain-settings__label">Name</label>
                  <input
                    className="domain-settings__input"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                  />
                </div>
                <div className="domain-settings__field">
                  <label className="domain-settings__label">Description</label>
                  <textarea
                    className="domain-settings__textarea"
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    rows={3}
                  />
                </div>
                <div className="domain-settings__field">
                  <label className="domain-settings__label">Color</label>
                  <div className="domain-settings__color-row">
                    <input
                      type="color"
                      className="domain-settings__color-picker"
                      value={editColor}
                      onChange={(e) => setEditColor(e.target.value)}
                    />
                    <span className="domain-settings__color-value">{editColor}</span>
                  </div>
                </div>
                <button
                  className="domain-settings__btn domain-settings__btn--primary"
                  onClick={handleSave}
                  disabled={saving || !editName.trim()}
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </section>

              {/* Config section */}
              <section className="domain-settings__section">
                <h3 className="domain-settings__section-title">Configuration</h3>
                {configLoading ? (
                  <p className="domain-settings__loading">Loading config...</p>
                ) : config ? (
                  <>
                    <div className="domain-settings__field">
                      <label className="domain-settings__label">Tags</label>
                      <div className="domain-settings__tags">
                        {config.tags.map((tag) => (
                          <span key={tag} className="domain-settings__tag">{tag}</span>
                        ))}
                        {config.tags.length === 0 && (
                          <span className="domain-settings__no-tags">No tags configured</span>
                        )}
                      </div>
                    </div>
                    <div className="domain-settings__field">
                      <label className="domain-settings__label">Skills</label>
                      <div className="domain-settings__tags">
                        {config.skills.map((skill) => (
                          <span key={skill} className="domain-settings__tag">{skill}</span>
                        ))}
                        {config.skills.length === 0 && (
                          <span className="domain-settings__no-tags">No skills configured</span>
                        )}
                      </div>
                    </div>
                    <div className="domain-settings__field">
                      <label className="domain-settings__label">Sources</label>
                      <ul className="domain-settings__sources">
                        {config.sources.map((src) => (
                          <li key={src} className="domain-settings__source">{src}</li>
                        ))}
                        {config.sources.length === 0 && (
                          <li className="domain-settings__no-tags">No sources configured</li>
                        )}
                      </ul>
                    </div>
                    <div className="domain-settings__field">
                      <label className="domain-settings__label">Frameworks</label>
                      <div className="domain-settings__tags">
                        {config.frameworks.map((fw) => (
                          <span key={fw} className="domain-settings__tag">{fw}</span>
                        ))}
                        {config.frameworks.length === 0 && (
                          <span className="domain-settings__no-tags">No frameworks configured</span>
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="domain-settings__no-tags">No configuration file found</p>
                )}
              </section>

              {/* Danger zone */}
              <section className="domain-settings__section domain-settings__section--danger">
                <h3 className="domain-settings__section-title">Danger Zone</h3>
                {!deleteConfirm ? (
                  <button
                    className="domain-settings__btn domain-settings__btn--danger"
                    onClick={() => setDeleteConfirm(true)}
                  >
                    Delete Domain
                  </button>
                ) : (
                  <div className="domain-settings__confirm">
                    <p>
                      Are you sure you want to delete &ldquo;{selectedDomain.name}&rdquo;?
                      This action cannot be undone.
                    </p>
                    <div className="domain-settings__confirm-actions">
                      <button
                        className="domain-settings__btn domain-settings__btn--ghost"
                        onClick={() => setDeleteConfirm(false)}
                      >
                        Cancel
                      </button>
                      <button
                        className="domain-settings__btn domain-settings__btn--danger"
                        onClick={handleDelete}
                      >
                        Yes, Delete
                      </button>
                    </div>
                  </div>
                )}
              </section>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .domain-settings {
          display: grid;
          grid-template-columns: 280px 1fr;
          gap: 24px;
          min-height: 400px;
        }
        .domain-settings__list {
          border-right: 1px solid var(--border, #292e42);
          padding-right: 16px;
        }
        .domain-settings__list-title {
          font-size: 14px;
          font-weight: 600;
          margin: 0 0 12px;
          color: var(--text-secondary, #565f89);
        }
        .domain-settings__item {
          display: flex;
          align-items: center;
          gap: 8px;
          width: 100%;
          padding: 8px 12px;
          border-radius: 6px;
          border: none;
          background: transparent;
          color: var(--text-primary, #c0caf5);
          cursor: pointer;
          text-align: left;
          font-size: 13px;
          margin-bottom: 2px;
        }
        .domain-settings__item:hover {
          background: var(--bg-hover, rgba(255,255,255,0.05));
        }
        .domain-settings__item--active {
          background: var(--bg-active, rgba(122,162,247,0.1));
        }
        .domain-settings__dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .domain-settings__item-name {
          flex: 1;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .domain-settings__item-count {
          font-size: 11px;
          color: var(--text-tertiary, #3b4261);
        }
        .domain-settings__empty, .domain-settings__loading {
          color: var(--text-secondary, #565f89);
          font-size: 13px;
        }
        .domain-settings__no-selection {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100%;
          color: var(--text-secondary, #565f89);
          font-size: 14px;
        }
        .domain-settings__editor-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 20px;
        }
        .domain-settings__editor-dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
        }
        .domain-settings__editor-title {
          font-size: 18px;
          font-weight: 600;
          margin: 0;
        }
        .domain-settings__section {
          margin-bottom: 24px;
          padding-bottom: 20px;
          border-bottom: 1px solid var(--border, #292e42);
        }
        .domain-settings__section--danger {
          border-bottom: none;
          border-top: 1px solid #3b1c1c;
          padding-top: 20px;
        }
        .domain-settings__section-title {
          font-size: 14px;
          font-weight: 600;
          margin: 0 0 12px;
        }
        .domain-settings__field {
          margin-bottom: 12px;
        }
        .domain-settings__label {
          display: block;
          font-size: 12px;
          font-weight: 500;
          color: var(--text-secondary, #565f89);
          margin-bottom: 4px;
        }
        .domain-settings__input,
        .domain-settings__textarea {
          width: 100%;
          max-width: 400px;
          padding: 8px 12px;
          border-radius: 6px;
          border: 1px solid var(--border, #292e42);
          background: var(--bg-secondary, #1f2335);
          color: var(--text-primary, #c0caf5);
          font-size: 14px;
          font-family: inherit;
          outline: none;
          box-sizing: border-box;
        }
        .domain-settings__input:focus,
        .domain-settings__textarea:focus {
          border-color: var(--accent, #7aa2f7);
        }
        .domain-settings__textarea {
          resize: vertical;
        }
        .domain-settings__color-row {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .domain-settings__color-picker {
          width: 32px;
          height: 32px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          padding: 0;
          background: none;
        }
        .domain-settings__color-value {
          font-size: 13px;
          color: var(--text-secondary, #565f89);
          font-family: monospace;
        }
        .domain-settings__tags {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }
        .domain-settings__tag {
          display: inline-block;
          padding: 2px 8px;
          border-radius: 4px;
          background: var(--bg-secondary, #1f2335);
          border: 1px solid var(--border, #292e42);
          font-size: 12px;
          color: var(--text-secondary, #565f89);
        }
        .domain-settings__no-tags {
          color: var(--text-tertiary, #3b4261);
          font-size: 13px;
        }
        .domain-settings__sources {
          list-style: none;
          padding: 0;
          margin: 0;
        }
        .domain-settings__source {
          padding: 4px 0;
          font-size: 13px;
          color: var(--text-secondary, #565f89);
        }
        .domain-settings__btn {
          padding: 8px 16px;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          border: none;
          transition: background 0.15s;
        }
        .domain-settings__btn--primary {
          background: var(--accent, #7aa2f7);
          color: white;
        }
        .domain-settings__btn--primary:hover:not(:disabled) {
          filter: brightness(1.1);
        }
        .domain-settings__btn--primary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .domain-settings__btn--ghost {
          background: transparent;
          color: var(--text-secondary, #565f89);
        }
        .domain-settings__btn--ghost:hover {
          background: var(--bg-hover, rgba(255,255,255,0.05));
        }
        .domain-settings__btn--danger {
          background: transparent;
          color: #ff6b6b;
          border: 1px solid #ff6b6b33;
        }
        .domain-settings__btn--danger:hover {
          background: rgba(255, 107, 107, 0.1);
        }
        .domain-settings__confirm p {
          font-size: 13px;
          margin: 0 0 12px;
          color: var(--text-secondary, #565f89);
        }
        .domain-settings__confirm-actions {
          display: flex;
          gap: 8px;
        }
      `}</style>
    </div>
  );
}
