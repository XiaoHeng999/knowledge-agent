'use client';

import { useState, useCallback } from 'react';
import { useOnboardingStore } from '@/stores/onboarding-store';

interface DomainTemplate {
  id: string;
  name: string;
  icon: string;
  color: string;
  description: string;
  sources: string[];
}

const TEMPLATES: DomainTemplate[] = [
  {
    id: 'ai-ml',
    name: 'AI & Machine Learning',
    icon: '🤖',
    color: '#7aa2f7',
    description: 'ML research with arXiv papers and model tracking',
    sources: ['arXiv', 'Papers', 'RSS'],
  },
  {
    id: 'web-dev',
    name: 'Web Development',
    icon: '💻',
    color: '#22c55e',
    description: 'Frontend/backend tech with GitHub and blog sources',
    sources: ['GitHub', 'Blogs', 'RSS'],
  },
  {
    id: 'product-design',
    name: 'Product & Design',
    icon: '🎨',
    color: '#f472b6',
    description: 'Design research with RSS and case study sources',
    sources: ['RSS', 'Case Studies'],
  },
  {
    id: 'business',
    name: 'Business Strategy',
    icon: '📊',
    color: '#f9bd2b',
    description: 'Market research with news and report sources',
    sources: ['News', 'Reports'],
  },
  {
    id: 'custom',
    name: 'Custom',
    icon: '✏️',
    color: '#a9b1d6',
    description: 'Blank domain with default settings',
    sources: [],
  },
];

export function CreateFirstDomain() {
  const { nextStep, prevStep, skip } = useOnboardingStore();
  const [selected, setSelected] = useState<string>('ai-ml');
  const [domainName, setDomainName] = useState('AI & Machine Learning');
  const [isCreating, setIsCreating] = useState(false);

  const activeTemplate = TEMPLATES.find((t) => t.id === selected) ?? TEMPLATES[0];

  const handleSelectTemplate = useCallback((t: DomainTemplate) => {
    setSelected(t.id);
    setDomainName(t.id === 'custom' ? '' : t.name);
  }, []);

  const handleCreate = useCallback(async () => {
    if (!domainName.trim()) return;
    setIsCreating(true);

    try {
      if (typeof window !== 'undefined' && window.api) {
        await window.api.domain.create({
          name: domainName.trim(),
          description: activeTemplate.description,
          color: activeTemplate.color,
          icon: activeTemplate.icon,
          template: selected,
        });
      }
      // In dev mode without IPC, just proceed
      nextStep();
    } catch {
      setIsCreating(false);
    }
  }, [domainName, activeTemplate, selected, nextStep]);

  return (
    <div className="onboarding__content">
      <h2 className="onboarding__step-title">Create Your First Domain</h2>
      <p className="onboarding__step-desc">
        Domains organize your research into focused knowledge areas.
      </p>

      <div className="onboarding__templates">
        {TEMPLATES.map((t) => (
          <button
            key={t.id}
            className={`onboarding__template-card ${selected === t.id ? 'onboarding__template-card--active' : ''}`}
            onClick={() => handleSelectTemplate(t)}
            style={selected === t.id ? { borderColor: t.color } : undefined}
          >
            <span className="onboarding__template-icon">{t.icon}</span>
            <span className="onboarding__template-name">{t.name}</span>
            <span className="onboarding__template-desc">{t.description}</span>
            {t.sources.length > 0 && (
              <div className="onboarding__template-sources">
                {t.sources.map((s) => (
                  <span key={s} className="onboarding__template-source-tag">
                    {s}
                  </span>
                ))}
              </div>
            )}
          </button>
        ))}
      </div>

      <label className="onboarding__label">
        Domain Name
        <input
          className="onboarding__input"
          type="text"
          placeholder={selected === 'custom' ? 'Enter domain name...' : domainName}
          value={domainName}
          onChange={(e) => setDomainName(e.target.value)}
        />
      </label>

      <div className="onboarding__nav">
        <button className="onboarding__btn-ghost" onClick={prevStep}>
          Back
        </button>
        <button className="onboarding__btn-ghost" onClick={skip}>
          Skip →
        </button>
        <button
          className="onboarding__btn-primary"
          onClick={handleCreate}
          disabled={!domainName.trim() || isCreating}
        >
          {isCreating ? 'Creating...' : 'Create Domain →'}
        </button>
      </div>
    </div>
  );
}
