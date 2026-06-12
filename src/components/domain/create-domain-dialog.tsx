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

    if (typeof window === 'undefined' || !window.api) {
      setError('Electron API not available. Please restart the app with "pnpm dev".');
      setCreating(false);
      return;
    }

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
    </dialog>
  );
}
