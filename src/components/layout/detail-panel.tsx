'use client';

import { useCallback, useRef, useState, useEffect } from 'react';
import { useLayout } from './layout-context';

const MAIN_CONTENT_MIN_WIDTH = 640;

export function DetailPanel() {
  const { panelOpen, panelWidth, panelContentType, panelContent, closePanel, setPanelWidth, viewportBreakpoint } =
    useLayout();
  const [isDragging, setIsDragging] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const handleDragStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsDragging(true);

      const startX = e.clientX;
      const startWidth = panelWidth;

      const onMove = (moveEvent: MouseEvent) => {
        const sidebarEl = document.querySelector('.sidebar');
        const sidebarWidth = sidebarEl?.getBoundingClientRect().width ?? 240;
        const viewportWidth = window.innerWidth;
        const maxWidth = viewportWidth - sidebarWidth - MAIN_CONTENT_MIN_WIDTH;
        const minPanelWidth = panelContentType === 'diff-preview' ? 400 : 280;
        const newWidth = Math.max(minPanelWidth, Math.min(maxWidth, startWidth + (startX - moveEvent.clientX)));
        setPanelWidth(newWidth);
      };

      const onUp = () => {
        setIsDragging(false);
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };

      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    },
    [panelWidth, setPanelWidth, panelContentType],
  );

  useEffect(() => {
    if (!panelOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closePanel();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [panelOpen, closePanel]);

  if (!panelOpen) return null;

  const isOverlay = viewportBreakpoint === 'compact';
  const title = panelContentType
    ? panelContentType.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    : 'Details';

  return (
    <aside
      ref={panelRef}
      className={`detail-panel ${isDragging ? 'detail-panel--dragging' : ''} ${isOverlay ? 'detail-panel--overlay' : ''}`}
      style={isOverlay ? undefined : { width: `${panelWidth}px` }}
      aria-label="Detail panel"
    >
      {!isOverlay && (
        <div
          className="detail-panel__drag-handle"
          onMouseDown={handleDragStart}
          role="separator"
          aria-orientation="vertical"
          aria-valuenow={panelWidth}
          aria-valuemin={280}
          aria-valuemax={400}
        >
          <span className="detail-panel__drag-indicator" />
        </div>
      )}

      <div className="detail-panel__header">
        <span className="detail-panel__title">{title}</span>
        <button className="detail-panel__close" onClick={closePanel} aria-label="Close panel">
          <svg width="16" height="16" viewBox="0 0 16 16" stroke="currentColor" strokeWidth="1.5">
            <line x1="3" y1="3" x2="13" y2="13" />
            <line x1="13" y1="3" x2="3" y2="13" />
          </svg>
        </button>
      </div>

      <div className="detail-panel__content">
        {panelContent ?? (
          <div className="detail-panel__empty">
            <p className="detail-panel__empty-text">Select an item to view details</p>
          </div>
        )}
      </div>
    </aside>
  );
}
