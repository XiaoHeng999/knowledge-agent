'use client';

import { useState } from 'react';
import { useTheme, THEME_LIST, type ThemeMeta } from '@/lib/hooks/use-theme';
import { useLogStore } from '@/lib/error/error-recovery';
import { DebugPanel } from '@/components/debug/debug-panel';

function ThemeCard({ meta, isActive, onSelect }: { meta: ThemeMeta; isActive: boolean; onSelect: () => void }) {
  return (
    <button
      className={`theme-card ${isActive ? 'theme-card--active' : ''}`}
      onClick={onSelect}
      aria-label={`Select ${meta.label} theme`}
      aria-pressed={isActive}
    >
      <div className="theme-card__preview" style={{ background: meta.bgPrimary, borderColor: isActive ? meta.accent : undefined }}>
        <div className="theme-card__preview-accent" style={{ background: meta.accent }} />
        <div className="theme-card__preview-lines">
          <div className="theme-card__preview-line" style={{ background: meta.isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)' }} />
          <div className="theme-card__preview-line theme-card__preview-line--short" style={{ background: meta.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }} />
          <div className="theme-card__preview-line theme-card__preview-line--short" style={{ background: meta.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }} />
        </div>
      </div>
      <div className="theme-card__info">
        <div className="theme-card__name-row">
          <span className="theme-card__name">{meta.label}</span>
          <span className="theme-card__dot" style={{ background: meta.accent }} />
        </div>
        <span className="theme-card__desc">{meta.description}</span>
      </div>
    </button>
  );
}

export default function AppearanceSettingsPage() {
  const { theme, switchTheme } = useTheme();
  const [showDebug, setShowDebug] = useState(false);
  const debugMode = useLogStore((s) => s.debugMode);
  const setDebugMode = useLogStore((s) => s.setDebugMode);

  return (
    <div className="settings-page">
      <div className="settings-page__header">
        <h1 className="settings-page__title">Appearance</h1>
        <p className="settings-page__subtitle">
          Choose a style pack to personalize the look and feel
        </p>
      </div>

      <section className="settings-page__section">
        <h2 className="settings-page__section-title">Style Pack</h2>
        <div className="theme-grid">
          {THEME_LIST.map((meta) => (
            <ThemeCard
              key={meta.name}
              meta={meta}
              isActive={theme === meta.name}
              onSelect={() => switchTheme(meta.name)}
            />
          ))}
        </div>
      </section>

      <section className="settings-page__section">
        <h2 className="settings-page__section-title">About Themes</h2>
        <div className="theme-info">
          <p>
            Theme changes apply instantly. Your selection is saved and restored on the next launch.
          </p>
          <p>
            Switch themes anytime using the sidebar toggle or command palette.
          </p>
        </div>
      </section>

      <section className="settings-page__section">
        <h2 className="settings-page__section-title">Developer</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={debugMode}
              onChange={(e) => setDebugMode(e.target.checked)}
            />
            <span style={{ color: 'var(--text-primary)', fontSize: 'var(--font-size-base)' }}>
              Verbose logging
            </span>
          </label>
          <button
            onClick={() => setShowDebug(!showDebug)}
            type="button"
            style={{
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              padding: '6px 16px',
              color: 'var(--text-primary)',
              fontSize: 'var(--font-size-sm)',
              cursor: 'pointer',
            }}
          >
            {showDebug ? 'Hide Debug Panel' : 'Show Debug Panel'}
          </button>
        </div>
      </section>

      {showDebug && <DebugPanel />}
    </div>
  );
}
