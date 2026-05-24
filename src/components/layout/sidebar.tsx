'use client';

import { useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useLayout } from './layout-context';
import { DomainList } from '@/components/domain/domain-list';
import { SearchBar } from '@/components/search/search-bar';
import { useTheme } from '@/lib/hooks/use-theme';
import { QuickRecordDialog } from '@/components/inbox/quick-record-dialog';

export function Sidebar() {
  const { isSidebarCollapsed } = useLayout();
  const router = useRouter();
  const pathname = usePathname();
  const { cycleTheme, themeMeta } = useTheme();
  const [quickRecordOpen, setQuickRecordOpen] = useState(false);

  const handleSearchResultClick = useCallback(
    (nodeId: string) => {
      router.push(`/domain?id=${nodeId}`);
    },
    [router],
  );

  const isSettings = pathname.startsWith('/settings');

  const handleQuickRecord = useCallback(async (text: string) => {
    await window.api.inbox.addItem({ title: '', content: text, source: 'note' });
  }, []);

  if (isSidebarCollapsed) {
    return (
      <aside className="sidebar sidebar--collapsed" aria-label="Sidebar collapsed">
        <div className="sidebar__collapsed-icons">
          <DomainList collapsed />
          <button
            className={`sidebar__collapsed-item ${isSettings ? 'sidebar__collapsed-item--active' : ''}`}
            title="Settings"
            aria-label="Settings"
            onClick={() => router.push('/settings')}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 4.754a3.246 3.246 0 1 0 0 6.492 3.246 3.246 0 0 0 0-6.492zM5.754 8a2.246 2.246 0 1 1 4.492 0 2.246 2.246 0 0 1-4.492 0z" />
            </svg>
          </button>
        </div>
      </aside>
    );
  }

  return (
    <>
      <aside className="sidebar" aria-label="Sidebar">
        <div className="sidebar__search">
          <SearchBar
            onResultClick={handleSearchResultClick}
            placeholder="Search knowledge..."
            compact
          />
        </div>

        <nav className="sidebar__domains" aria-label="Domain navigation">
          <DomainList />
        </nav>

        <div className="sidebar__actions">
          <button className="sidebar__action-btn" aria-label="Quick record" onClick={() => setQuickRecordOpen(true)}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm3.5 7.5h-3v3h-1v-3h-3v-1h3v-3h1v3h3v1z" />
            </svg>
            <span>Quick Record</span>
          </button>
          <button className="sidebar__action-btn" aria-label="Research" onClick={() => router.push('/research')}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <circle cx="6.5" cy="6.5" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
              <path d="m10.5 10.5 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <span>Research</span>
          </button>
          <div className="sidebar__action-row">
            <button className="sidebar__action-btn" aria-label="Settings" onClick={() => router.push('/settings')}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 4.754a3.246 3.246 0 1 0 0 6.492 3.246 3.246 0 0 0 0-6.492zM5.754 8a2.246 2.246 0 1 1 4.492 0 2.246 2.246 0 0 1-4.492 0z" />
                <path d="M9.796 1.343c-.527-1.79-3.065-1.79-3.592 0l-.094.319a.873.873 0 0 1-1.255.52l-.292-.16c-1.64-.892-3.433.902-2.54 2.541l.159.292a.873.873 0 0 1-.52 1.255l-.319.094c-1.79.527-1.79 3.065 0 3.592l.319.094a.873.873 0 0 1 .52 1.255l-.16.292c-.892 1.64.901 3.434 2.541 2.54l.292-.159a.873.873 0 0 1 1.255.52l.094.319c.527 1.79 3.065 1.79 3.592 0l.094-.319a.873.873 0 0 1 1.255-.52l.292.16c1.64.893 3.434-.902 2.54-2.541l-.159-.292a.873.873 0 0 1 .52-1.255l.319-.094c1.79-.527 1.79-3.065 0-3.592l-.319-.094a.873.873 0 0 1-.52-1.255l.16-.292c.893-1.64-.902-3.433-2.541-2.54l-.292.159a.873.873 0 0 1-1.255-.52l-.094-.319zm-2.633.283c.246-.835 1.428-.835 1.674 0l.094.319a1.873 1.873 0 0 0 2.693 1.115l.291-.16c.764-.415 1.6.42 1.184 1.185l-.159.292a1.873 1.873 0 0 0 1.116 2.692l.318.094c.835.246.835 1.428 0 1.674l-.319.094a1.873 1.873 0 0 0-1.115 2.693l.16.291c.415.764-.42 1.6-1.185 1.184l-.291-.159a1.873 1.873 0 0 0-2.693 1.116l-.094.318c-.246.835-1.428.835-1.674 0l-.094-.319a1.873.873 0 0 0-2.692-1.115l-.292.16c-.764.415-1.6-.42-1.184-1.185l.159-.291A1.873 1.873 0 0 0 1.945 8.93l-.319-.094c-.835-.246-.835-1.428 0-1.674l.319-.094A1.873 1.873 0 0 0 3.06 4.377l-.16-.292c-.415-.764.42-1.6 1.185-1.184l.292.159a1.873 1.873 0 0 0 2.692-1.115l.094-.319z" />
              </svg>
              <span>Settings</span>
            </button>
            <button
              className="sidebar__theme-toggle"
              onClick={cycleTheme}
              title={`Current: ${themeMeta.label} — Click to switch`}
              aria-label={`Switch theme, current: ${themeMeta.label}`}
            >
              <span className="sidebar__theme-dot" style={{ background: themeMeta.accent }} />
            </button>
          </div>
        </div>
      </aside>

      <QuickRecordDialog
        open={quickRecordOpen}
        onClose={() => setQuickRecordOpen(false)}
        onSubmit={handleQuickRecord}
      />
    </>
  );
}
