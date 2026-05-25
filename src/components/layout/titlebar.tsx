'use client';

import { useState, useEffect, useCallback } from 'react';
import { useLayout } from './layout-context';

export function Titlebar() {
  const { toggleSidebar } = useLayout();
  const [isMaximized, setIsMaximized] = useState(false);
  const isElectron = typeof window !== 'undefined' && window.api;

  useEffect(() => {
    if (!isElectron) return;
    window.api.window.isMaximized().then(r => setIsMaximized(r.maximized)).catch(() => {});
  }, [isElectron]);

  const handleMinimize = useCallback(() => {
    window.api?.window.minimize();
  }, []);

  const handleMaximize = useCallback(() => {
    window.api?.window.toggleMaximize();
    setIsMaximized(prev => !prev);
  }, []);

  const handleClose = useCallback(() => {
    window.api?.window.close();
  }, []);

  return (
    <header className="titlebar" role="banner">
      <div className="titlebar__left">
        <button
          className="titlebar__menu-btn"
          onClick={toggleSidebar}
          aria-label="Toggle sidebar"
          title="Toggle sidebar"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <rect x="1" y="3" width="14" height="1.5" rx="0.5" />
            <rect x="1" y="7" width="14" height="1.5" rx="0.5" />
            <rect x="1" y="11" width="14" height="1.5" rx="0.5" />
          </svg>
        </button>
        <span className="titlebar__domain-dot" aria-hidden="true" />
        <span className="titlebar__title">AgentClaw</span>
      </div>

      <div className="titlebar__center" />

      <div className="titlebar__right">
        <span className="titlebar__shortcut-hint">
          <kbd>&#8984;</kbd><kbd>K</kbd>
        </span>
        {isElectron && (
          <div className="titlebar__controls">
            <button
              className="titlebar__control"
              onClick={handleMinimize}
              aria-label="Minimize"
            >
              <svg width="12" height="12" viewBox="0 0 12 12">
                <rect x="1" y="5.5" width="10" height="1" fill="currentColor" />
              </svg>
            </button>
            <button
              className="titlebar__control"
              onClick={handleMaximize}
              aria-label={isMaximized ? 'Restore' : 'Maximize'}
            >
              {isMaximized ? (
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1">
                  <rect x="3" y="0.5" width="8" height="8" rx="1" />
                  <rect x="1" y="3" width="8" height="8" rx="1" />
                </svg>
              ) : (
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1">
                  <rect x="1" y="1" width="10" height="10" rx="1" />
                </svg>
              )}
            </button>
            <button
              className="titlebar__control titlebar__control--close"
              onClick={handleClose}
              aria-label="Close"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" stroke="currentColor" strokeWidth="1.2">
                <line x1="1" y1="1" x2="11" y2="11" />
                <line x1="11" y1="1" x2="1" y2="11" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
