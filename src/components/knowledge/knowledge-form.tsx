'use client';

import { useState, useCallback } from 'react';
import type { KnowledgeNode } from '@/lib/ipc/channels';

interface KnowledgeFormProps {
  domainId: string;
  initialData?: KnowledgeNode;
  onSubmit: (data: {
    domainId: string;
    title: string;
    type: string;
    content: string;
    sources?: string[];
  }) => Promise<void>;
  onCancel: () => void;
}

const NODE_TYPES = [
  { value: 'concept', label: 'Concept' },
  { value: 'technology', label: 'Technology' },
  { value: 'person', label: 'Person' },
  { value: 'event', label: 'Event' },
  { value: 'decision', label: 'Decision' },
  { value: 'resource', label: 'Resource' },
  { value: 'question', label: 'Question' },
];

export function KnowledgeForm({ domainId, initialData, onSubmit, onCancel }: KnowledgeFormProps) {
  const [title, setTitle] = useState(initialData?.title ?? '');
  const [type, setType] = useState(initialData?.type ?? 'concept');
  const [content, setContent] = useState(initialData?.content ?? '');
  const [sourceInput, setSourceInput] = useState('');
  const [sources, setSources] = useState<string[]>(initialData?.sources ?? []);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAddSource = useCallback(() => {
    const trimmed = sourceInput.trim();
    if (trimmed && !sources.includes(trimmed)) {
      setSources((prev) => [...prev, trimmed]);
      setSourceInput('');
    }
  }, [sourceInput, sources]);

  const handleRemoveSource = useCallback((src: string) => {
    setSources((prev) => prev.filter((s) => s !== src));
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!title.trim()) {
        setError('Title is required');
        return;
      }

      setSubmitting(true);
      setError(null);
      try {
        await onSubmit({
          domainId,
          title: title.trim(),
          type,
          content,
          sources: sources.length > 0 ? sources : undefined,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setSubmitting(false);
      }
    },
    [domainId, title, type, content, sources, onSubmit],
  );

  return (
    <form className="knowledge-form" onSubmit={handleSubmit}>
      <div className="knowledge-form__field">
        <label className="knowledge-form__label" htmlFor="kf-title">Title</label>
        <input
          id="kf-title"
          className="knowledge-form__input"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter knowledge title..."
          autoFocus
        />
      </div>

      <div className="knowledge-form__field">
        <label className="knowledge-form__label" htmlFor="kf-type">Type</label>
        <select
          id="kf-type"
          className="knowledge-form__select"
          value={type}
          onChange={(e) => setType(e.target.value)}
        >
          {NODE_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </div>

      <div className="knowledge-form__field">
        <label className="knowledge-form__label" htmlFor="kf-content">Content</label>
        <textarea
          id="kf-content"
          className="knowledge-form__textarea"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write knowledge content in Markdown..."
          rows={8}
        />
      </div>

      <div className="knowledge-form__field">
        <label className="knowledge-form__label" htmlFor="kf-source">Sources</label>
        <div className="knowledge-form__source-row">
          <input
            id="kf-source"
            className="knowledge-form__input knowledge-form__source-input"
            type="text"
            value={sourceInput}
            onChange={(e) => setSourceInput(e.target.value)}
            placeholder="Add a source URL or reference..."
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddSource();
              }
            }}
          />
          <button
            type="button"
            className="knowledge-form__source-add"
            onClick={handleAddSource}
            disabled={!sourceInput.trim()}
          >
            Add
          </button>
        </div>
        {sources.length > 0 && (
          <ul className="knowledge-form__source-list">
            {sources.map((src) => (
              <li key={src} className="knowledge-form__source-tag">
                <span className="knowledge-form__source-text">{src}</span>
                <button
                  type="button"
                  className="knowledge-form__source-remove"
                  onClick={() => handleRemoveSource(src)}
                  aria-label={`Remove source: ${src}`}
                >
                  x
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {error && <p className="knowledge-form__error">{error}</p>}

      <div className="knowledge-form__actions">
        <button
          type="button"
          className="knowledge-form__cancel"
          onClick={onCancel}
          disabled={submitting}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="knowledge-form__submit"
          disabled={submitting || !title.trim()}
        >
          {submitting ? 'Saving...' : initialData ? 'Update' : 'Create'}
        </button>
      </div>
    </form>
  );
}
