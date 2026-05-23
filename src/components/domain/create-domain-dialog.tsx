'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import type { DomainInfo } from '@/lib/ipc/channels';

// ---------------------------------------------------------------------------
// Template definitions (mirror server-side templates)
// ---------------------------------------------------------------------------

interface TemplateOption {
  id: string;
  label: string;
  icon: string;
  color: string;
  description: string;
  sourceTypes: string[];
}

const TEMPLATES: TemplateOption[] = [
  {
    id: 'ai-ml',
    label: 'AI & Machine Learning',
    icon: '🤖',
    color: '#7aa2f7',
    description: 'ML research with arXiv papers and model tracking',
    sourceTypes: ['arXiv', 'RSS', 'Papers'],
  },
  {
    id: 'web-dev',
    label: 'Web Development',
    icon: '💻',
    color: '#22c55e',
    description: 'Frontend/backend tech with GitHub and blog sources',
    sourceTypes: ['GitHub', 'RSS'],
  },
  {
    id: 'product-design',
    label: 'Product & Design',
    icon: '🎨',
    color: '#f472b6',
    description: 'Design research with RSS and case study sources',
    sourceTypes: ['RSS'],
  },
  {
    id: 'business-strategy',
    label: 'Business Strategy',
    icon: '📊',
    color: '#f9bd2b',
    description: 'Market research with news and report sources',
    sourceTypes: ['RSS'],
  },
  {
    id: 'custom',
    label: 'Custom',
    icon: '✏️',
    color: '#a9b1d6',
    description: 'Blank domain with default settings',
    sourceTypes: [],
  },
];

const PRESET_COLORS = [
  '#7aa2f7', '#22c55e', '#f472b6', '#f9bd2b', '#a9b1d6',
  '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7',
];

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface CreateDomainDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: (domain: DomainInfo) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CreateDomainDialog({ open, onClose, onCreated }: CreateDomainDialogProps) {
  const [step, setStep] = useState<'template' | 'details'>('template');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('ai-ml');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#7aa2f7');
  const [icon, setIcon] = useState('folder');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  // Sync defaults from template
  useEffect(() => {
    const tmpl = TEMPLATES.find((t) => t.id === selectedTemplate);
    if (tmpl) {
      setName(tmpl.id === 'custom' ? '' : tmpl.label);
      setColor(tmpl.color);
      setIcon(tmpl.id === 'custom' ? 'folder' : tmpl.id);
    }
  }, [selectedTemplate]);

  // Open/close native dialog
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  const handleClose = useCallback(() => {
    setStep('template');
    setSelectedTemplate('ai-ml');
    setError(null);
    setCreating(false);
    onClose();
  }, [onClose]);

  const handleCreate = useCallback(async () => {
    if (!name.trim()) {
      setError('Domain name is required');
      return;
    }

    setCreating(true);
    setError(null);

    try {
      const domain = await window.api.domain.create({
        name: name.trim(),
        description: description.trim(),
        color,
        icon,
        template: selectedTemplate,
      });
      onCreated(domain);
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create domain');
    } finally {
      setCreating(false);
    }
  }, [name, description, color, icon, selectedTemplate, onCreated, handleClose]);

  return (
    <dialog
      ref={dialogRef}
      className="create-domain-dialog"
      onClose={handleClose}
      aria-label="Create new domain"
    >
      <div className="create-domain-dialog__content">
        <div className="create-domain-dialog__header">
          <h2 className="create-domain-dialog__title">Create New Domain</h2>
          <button
            className="create-domain-dialog__close"
            onClick={handleClose}
            aria-label="Close"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z" />
            </svg>
          </button>
        </div>

        {/* Step indicator */}
        <div className="create-domain-dialog__steps">
          <button
            className={`create-domain-dialog__step ${step === 'template' ? 'create-domain-dialog__step--active' : 'create-domain-dialog__step--done'}`}
            onClick={() => setStep('template')}
          >
            1. Template
          </button>
          <div className="create-domain-dialog__step-divider" />
          <button
            className={`create-domain-dialog__step ${step === 'details' ? 'create-domain-dialog__step--active' : ''}`}
            onClick={() => setStep('details')}
            disabled={step === 'template'}
          >
            2. Details
          </button>
        </div>

        {/* Template selection */}
        {step === 'template' && (
          <div className="create-domain-dialog__body">
            <p className="create-domain-dialog__hint">
              Choose a template to pre-populate your domain configuration
            </p>
            <div className="create-domain-dialog__templates">
              {TEMPLATES.map((tmpl) => (
                <button
                  key={tmpl.id}
                  className={`create-domain-dialog__template-card ${selectedTemplate === tmpl.id ? 'create-domain-dialog__template-card--selected' : ''}`}
                  onClick={() => setSelectedTemplate(tmpl.id)}
                >
                  <span className="create-domain-dialog__template-icon">{tmpl.icon}</span>
                  <span className="create-domain-dialog__template-name">{tmpl.label}</span>
                  <span className="create-domain-dialog__template-desc">{tmpl.description}</span>
                  {tmpl.sourceTypes.length > 0 && (
                    <span className="create-domain-dialog__template-sources">
                      {tmpl.sourceTypes.join(' · ')}
                    </span>
                  )}
                </button>
              ))}
            </div>
            <div className="create-domain-dialog__footer">
              <button className="create-domain-dialog__btn create-domain-dialog__btn--ghost" onClick={handleClose}>
                Cancel
              </button>
              <button
                className="create-domain-dialog__btn create-domain-dialog__btn--primary"
                onClick={() => setStep('details')}
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* Details form */}
        {step === 'details' && (
          <div className="create-domain-dialog__body">
            <div className="create-domain-dialog__field">
              <label className="create-domain-dialog__label" htmlFor="domain-name">
                Name <span className="create-domain-dialog__required">*</span>
              </label>
              <input
                id="domain-name"
                type="text"
                className="create-domain-dialog__input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Machine Learning"
                autoFocus
              />
            </div>

            <div className="create-domain-dialog__field">
              <label className="create-domain-dialog__label" htmlFor="domain-desc">
                Description
              </label>
              <textarea
                id="domain-desc"
                className="create-domain-dialog__textarea"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What is this domain about?"
                rows={3}
              />
            </div>

            <div className="create-domain-dialog__field">
              <label className="create-domain-dialog__label">Color</label>
              <div className="create-domain-dialog__colors">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    className={`create-domain-dialog__color-swatch ${color === c ? 'create-domain-dialog__color-swatch--active' : ''}`}
                    style={{ backgroundColor: c }}
                    onClick={() => setColor(c)}
                    aria-label={`Color ${c}`}
                  />
                ))}
              </div>
            </div>

            {error && <div className="create-domain-dialog__error">{error}</div>}

            <div className="create-domain-dialog__footer">
              <button
                className="create-domain-dialog__btn create-domain-dialog__btn--ghost"
                onClick={() => setStep('template')}
              >
                Back
              </button>
              <button
                className="create-domain-dialog__btn create-domain-dialog__btn--primary"
                onClick={handleCreate}
                disabled={creating || !name.trim()}
              >
                {creating ? 'Creating...' : 'Create Domain'}
              </button>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .create-domain-dialog {
          border: none;
          border-radius: 12px;
          padding: 0;
          background: var(--bg-primary, #1a1b26);
          color: var(--text-primary, #c0caf5);
          max-width: 560px;
          width: 90vw;
          box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);
        }
        .create-domain-dialog::backdrop {
          background: rgba(0, 0, 0, 0.6);
        }
        .create-domain-dialog__content {
          padding: 24px;
        }
        .create-domain-dialog__header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;
        }
        .create-domain-dialog__title {
          font-size: 18px;
          font-weight: 600;
          margin: 0;
        }
        .create-domain-dialog__close {
          background: none;
          border: none;
          color: var(--text-secondary, #565f89);
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
          display: flex;
          align-items: center;
        }
        .create-domain-dialog__close:hover {
          background: var(--bg-hover, rgba(255,255,255,0.05));
          color: var(--text-primary, #c0caf5);
        }
        .create-domain-dialog__steps {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 20px;
        }
        .create-domain-dialog__step {
          background: none;
          border: none;
          color: var(--text-secondary, #565f89);
          font-size: 13px;
          cursor: pointer;
          padding: 4px 8px;
          border-radius: 4px;
        }
        .create-domain-dialog__step--active {
          color: var(--accent, #7aa2f7);
          font-weight: 600;
        }
        .create-domain-dialog__step--done {
          color: var(--text-primary, #c0caf5);
        }
        .create-domain-dialog__step-divider {
          flex: 1;
          height: 1px;
          background: var(--border, #292e42);
        }
        .create-domain-dialog__body {
          min-height: 300px;
          display: flex;
          flex-direction: column;
        }
        .create-domain-dialog__hint {
          color: var(--text-secondary, #565f89);
          font-size: 13px;
          margin: 0 0 16px;
        }
        .create-domain-dialog__templates {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 12px;
          flex: 1;
          overflow-y: auto;
          max-height: 300px;
          margin-bottom: 16px;
        }
        .create-domain-dialog__template-card {
          display: flex;
          flex-direction: column;
          gap: 6px;
          padding: 16px;
          border-radius: 8px;
          border: 1px solid var(--border, #292e42);
          background: var(--bg-secondary, #1f2335);
          cursor: pointer;
          text-align: left;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .create-domain-dialog__template-card:hover {
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
          transform: scale(1.02);
        }
        .create-domain-dialog__template-card--selected {
          border-color: var(--accent, #7aa2f7);
          box-shadow: 0 0 0 1px var(--accent, #7aa2f7), 0 2px 8px rgba(122, 162, 247, 0.15);
        }
        .create-domain-dialog__template-icon {
          font-size: 24px;
        }
        .create-domain-dialog__template-name {
          font-size: 14px;
          font-weight: 600;
        }
        .create-domain-dialog__template-desc {
          font-size: 12px;
          color: var(--text-secondary, #565f89);
          line-height: 1.4;
        }
        .create-domain-dialog__template-sources {
          font-size: 11px;
          color: var(--text-tertiary, #3b4261);
        }
        .create-domain-dialog__field {
          margin-bottom: 16px;
        }
        .create-domain-dialog__label {
          display: block;
          font-size: 13px;
          font-weight: 500;
          margin-bottom: 6px;
          color: var(--text-secondary, #565f89);
        }
        .create-domain-dialog__required {
          color: #ff6b6b;
        }
        .create-domain-dialog__input,
        .create-domain-dialog__textarea {
          width: 100%;
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
        .create-domain-dialog__input:focus,
        .create-domain-dialog__textarea:focus {
          border-color: var(--accent, #7aa2f7);
        }
        .create-domain-dialog__textarea {
          resize: vertical;
        }
        .create-domain-dialog__colors {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        .create-domain-dialog__color-swatch {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          border: 2px solid transparent;
          cursor: pointer;
          transition: transform 0.1s;
        }
        .create-domain-dialog__color-swatch:hover {
          transform: scale(1.15);
        }
        .create-domain-dialog__color-swatch--active {
          border-color: white;
          box-shadow: 0 0 0 2px var(--bg-primary, #1a1b26);
        }
        .create-domain-dialog__error {
          color: #ff6b6b;
          font-size: 13px;
          margin-bottom: 12px;
        }
        .create-domain-dialog__footer {
          display: flex;
          justify-content: flex-end;
          gap: 8px;
          margin-top: auto;
          padding-top: 16px;
        }
        .create-domain-dialog__btn {
          padding: 8px 16px;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          border: none;
          transition: background 0.15s;
        }
        .create-domain-dialog__btn--primary {
          background: var(--accent, #7aa2f7);
          color: white;
        }
        .create-domain-dialog__btn--primary:hover:not(:disabled) {
          filter: brightness(1.1);
        }
        .create-domain-dialog__btn--primary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .create-domain-dialog__btn--ghost {
          background: transparent;
          color: var(--text-secondary, #565f89);
        }
        .create-domain-dialog__btn--ghost:hover {
          background: var(--bg-hover, rgba(255,255,255,0.05));
        }
      `}</style>
    </dialog>
  );
}
