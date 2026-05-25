'use client';

import {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from 'react';
import { createPortal } from 'react-dom';
import { useAppStore } from '@/stores/app-store';
import { getAllCommands, findMatching } from '@/lib/commands/registry';
import { fuzzyMatch } from './search';
import { ResultList } from './result-list';
import { ParameterInput } from './parameter-input';
import type {
  PaletteMode,
  PaletteResultItem,
  ResultGroup,
  ResultGroupType,
  ParameterState,
  ParameterStep,
} from './types';

const GROUP_CONFIG: Array<{ type: ResultGroupType; label: string; icon: string }> = [
  { type: 'recent', label: 'Recent', icon: '🕐' },
  { type: 'commands', label: 'Commands', icon: '⚡' },
  { type: 'navigation', label: 'Navigation', icon: '🫑' },
  { type: 'knowledge', label: 'Knowledge', icon: '📌' },
  { type: 'actions', label: 'Actions', icon: '⚙️' },
];

const NAV_ITEMS: Array<{ label: string; path: string; keywords: string }> = [
  { label: 'Dashboard', path: '/', keywords: 'dashboard home' },
  { label: 'Knowledge List', path: '/domain', keywords: 'knowledge list nodes' },
  { label: 'Knowledge Graph', path: '/domain/graph', keywords: 'graph visualization' },
  { label: 'Inbox', path: '/inbox', keywords: 'inbox incoming' },
  { label: 'Research Dashboard', path: '/research', keywords: 'research scheduler' },
  { label: 'Timeline', path: '/timeline', keywords: 'timeline predictions events' },
  { label: 'Framework Analysis', path: '/framework', keywords: 'framework analysis' },
  { label: 'Settings', path: '/settings', keywords: 'settings preferences' },
  { label: 'Model Management', path: '/settings/models', keywords: 'models api keys' },
  { label: 'Domain Settings', path: '/settings/domains', keywords: 'domains' },
  { label: 'Skill Management', path: '/settings/skills', keywords: 'skills' },
];

const ACTION_ITEMS: Array<{ label: string; description: string; actionId: string; keywords: string }> = [
  { label: 'New Domain', description: 'Create a new knowledge domain', actionId: 'new-domain', keywords: 'new domain create' },
  { label: 'Import URL', description: 'Import knowledge from a URL', actionId: 'import', keywords: 'import url' },
  { label: 'Quick Record', description: 'Add a quick note to inbox', actionId: 'quick-record', keywords: 'quick record note' },
  { label: 'Toggle Sidebar', description: 'Show or hide sidebar', actionId: 'toggle-sidebar', keywords: 'sidebar toggle' },
  { label: 'Toggle Theme', description: 'Switch between themes', actionId: 'toggle-theme', keywords: 'theme switch' },
];

const MAX_PER_GROUP = 5;
const MAX_RECENT = 3;

export function CommandPalette() {
  const open = useAppStore((s) => s.commandPaletteOpen);
  const setOpen = useAppStore((s) => s.setCommandPaletteOpen);
  const currentDomainId = useAppStore((s) => s.currentDomainId);
  const setCurrentView = useAppStore((s) => s.setCurrentView);

  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<PaletteMode>('search');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [paramState, setParamState] = useState<ParameterState | null>(null);
  const [recentItems] = useState<PaletteResultItem[]>([]);

  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flatItemsRef = useRef<PaletteResultItem[]>([]);

  // Build search results
  const groups = useMemo((): ResultGroup[] => {
    const result: ResultGroup[] = [];
    const q = query.trim();
    const slashMode = q.startsWith('/');

    for (const cfg of GROUP_CONFIG) {
      let items: PaletteResultItem[] = [];

      if (cfg.type === 'recent') {
        items = recentItems.slice(0, MAX_RECENT);
      } else if (cfg.type === 'commands') {
        const commands = slashMode
          ? findMatching(q.slice(1))
          : q
            ? findMatching(q)
            : getAllCommands();

        items = commands
          .map((cmd) => {
            const match = q ? fuzzyMatch(slashMode ? q.slice(1) : q, `/${cmd.name} ${cmd.label}`) : null;
            return {
              item: {
                id: `cmd-${cmd.name}`,
                label: `/${cmd.name}`,
                description: cmd.description,
                group: 'commands' as ResultGroupType,
                action: () => {
                  if (cmd.params.length > 0 && cmd.params.some((p) => p.required)) {
                    const steps: ParameterStep[] = cmd.params.map((p) => ({
                      name: p.name,
                      placeholder: `Enter ${p.description}...`,
                      hint: p.description,
                      required: p.required,
                    }));
                    setParamState({
                      commandName: cmd.name,
                      commandLabel: cmd.label,
                      params: steps,
                      currentStep: 0,
                    });
                    setMode('parameter');
                  } else {
                    cmd.execute('', { domainId: currentDomainId || '', conversationId: '', modelId: '' });
                    setOpen(false);
                  }
                },
              },
              match,
            };
          })
          .filter((entry) => !q || entry.match)
          .sort((a, b) => (b.match?.score ?? 0) - (a.match?.score ?? 0))
          .map((entry) => entry.item);
      } else if (cfg.type === 'navigation') {
        items = NAV_ITEMS.filter((nav) => {
          if (!q) return true;
          return fuzzyMatch(q, `${nav.label} ${nav.keywords}`);
        }).map((nav) => ({
          id: `nav-${nav.path}`,
          label: nav.label,
          group: 'navigation' as ResultGroupType,
          action: () => {
            window.location.hash = nav.path;
            setOpen(false);
          },
        }));
      } else if (cfg.type === 'knowledge') {
        // Knowledge search requires IPC — placeholder for now
        items = [];
      } else if (cfg.type === 'actions') {
        items = ACTION_ITEMS.filter((act) => {
          if (!q) return true;
          return fuzzyMatch(q, `${act.label} ${act.keywords}`);
        }).map((act) => ({
          id: `act-${act.actionId}`,
          label: act.label,
          description: act.description,
          group: 'actions' as ResultGroupType,
          action: () => {
            handleAction(act.actionId);
            setOpen(false);
          },
        }));
      }

      result.push({
        type: cfg.type,
        label: cfg.label,
        icon: cfg.icon,
        items,
        total: items.length,
      });
    }

    return result;
  }, [query, currentDomainId, recentItems, setOpen]);

  // Flat items list for keyboard navigation
  useEffect(() => {
    const flat: PaletteResultItem[] = [];
    for (const g of groups) {
      const visible = expandedGroups.has(g.type) ? g.items : g.items.slice(0, MAX_PER_GROUP);
      flat.push(...visible);
    }
    flatItemsRef.current = flat;
  }, [groups, expandedGroups]);

  // Focus management
  useEffect(() => {
    if (!open) {
      setQuery('');
      setMode('search');
      setSelectedId(null);
      setExpandedGroups(new Set());
      setParamState(null);
      return;
    }

    triggerRef.current = document.activeElement as HTMLElement;
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [open]);

  // Global Cmd+K handler
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        e.stopPropagation();
        setOpen(!open);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, setOpen]);

  const handleAction = useCallback(
    (actionId: string) => {
      switch (actionId) {
        case 'new-domain':
          setCurrentView('settings');
          break;
        case 'toggle-sidebar':
          useAppStore.getState().toggleSidebar();
          break;
        case 'toggle-theme': {
          const themes: Array<string> = ['tokyo-night', 'linear', 'cursor', 'notion', 'posthog'];
          const current = useAppStore.getState().theme;
          const idx = themes.indexOf(current);
          useAppStore.getState().setTheme(themes[(idx + 1) % themes.length] as 'tokyo-night');
          break;
        }
      }
    },
    [setCurrentView],
  );

  const handleInputChange = useCallback((value: string) => {
    setQuery(value);
    setSelectedId(null);
  }, []);

  const handleSelectItem = useCallback(
    (item: PaletteResultItem) => {
      item.action();
    },
    [],
  );

  const handleHoverItem = useCallback((id: string) => {
    setSelectedId(id);
  }, []);

  const handleToggleExpand = useCallback((groupType: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupType)) next.delete(groupType);
      else next.add(groupType);
      return next;
    });
  }, []);

  const handleParamSubmit = useCallback(
    (_params: Record<string, string>) => {
      // Execute the command with params
      setOpen(false);
    },
    [setOpen],
  );

  const handleParamBack = useCallback(() => {
    setMode('search');
    setParamState(null);
    requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  // Keyboard navigation in search mode
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (mode === 'parameter') return;

      const items = flatItemsRef.current;
      if (items.length === 0) {
        if (e.key === 'Escape') {
          e.preventDefault();
          setOpen(false);
        }
        return;
      }

      const currentIdx = items.findIndex((item) => item.id === selectedId);

      switch (e.key) {
        case 'ArrowDown': {
          e.preventDefault();
          const nextIdx = currentIdx < items.length - 1 ? currentIdx + 1 : 0;
          setSelectedId(items[nextIdx].id);
          scrollToItem(items[nextIdx].id);
          break;
        }
        case 'ArrowUp': {
          e.preventDefault();
          const prevIdx = currentIdx > 0 ? currentIdx - 1 : items.length - 1;
          setSelectedId(items[prevIdx].id);
          scrollToItem(items[prevIdx].id);
          break;
        }
        case 'Tab': {
          e.preventDefault();
          // Tab moves between groups
          const currentGroup = currentIdx >= 0 ? items[currentIdx]?.group : null;
          const groupTypes = GROUP_CONFIG.map((g) => g.type);
          const currentGroupIdx = currentGroup ? groupTypes.indexOf(currentGroup) : -1;
          const nextGroupIdx = e.shiftKey
            ? Math.max(0, currentGroupIdx - 1)
            : Math.min(groupTypes.length - 1, currentGroupIdx + 1);
          const nextGroup = groups.find((g) => g.type === groupTypes[nextGroupIdx]);
          if (nextGroup && nextGroup.items.length > 0) {
            setSelectedId(nextGroup.items[0].id);
            scrollToItem(nextGroup.items[0].id);
          }
          break;
        }
        case 'Enter': {
          e.preventDefault();
          if (currentIdx >= 0) {
            items[currentIdx].action();
          }
          break;
        }
        case 'Escape': {
          e.preventDefault();
          setOpen(false);
          break;
        }
        case 'Home': {
          e.preventDefault();
          setSelectedId(items[0].id);
          scrollToItem(items[0].id);
          break;
        }
        case 'End': {
          e.preventDefault();
          setSelectedId(items[items.length - 1].id);
          scrollToItem(items[items.length - 1].id);
          break;
        }
      }
    },
    [mode, selectedId, groups, setOpen],
  );

  const scrollToItem = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (el) {
      const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      el.scrollIntoView({ block: 'nearest', behavior: prefersReduced ? 'auto' : 'smooth' });
    }
  }, []);

  // Focus trap
  useEffect(() => {
    if (!open || !containerRef.current) return;

    const handleTabTrap = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const container = containerRef.current;
      if (!container) return;

      const focusable = container.querySelectorAll<HTMLElement>(
        'input, button, [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleTabTrap);
    return () => document.removeEventListener('keydown', handleTabTrap);
  }, [open]);

  // Restore focus on close
  useEffect(() => {
    if (open) return;
    if (triggerRef.current) {
      triggerRef.current.focus({ preventScroll: true });
      triggerRef.current = null;
    }
  }, [open]);

  if (!open) return null;

  const content = (
    <div className="cmd-palette-overlay" onClick={(e) => e.target === e.currentTarget && setOpen(false)}>
      <div
        ref={containerRef}
        className="cmd-palette"
        role="dialog"
        aria-label="Command palette"
        aria-modal="true"
      >
        {mode === 'search' ? (
          <>
            <div className="cmd-palette__input-wrap">
              <svg className="cmd-palette__search-icon" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                <circle cx="6.5" cy="6.5" r="5" />
                <line x1="10.5" y1="10.5" x2="15" y2="15" />
              </svg>
              <input
                ref={inputRef}
                className="cmd-palette__input"
                type="text"
                placeholder="Search commands, knowledge, domains..."
                value={query}
                onChange={(e) => handleInputChange(e.target.value)}
                onKeyDown={handleKeyDown}
                role="combobox"
                aria-expanded="true"
                aria-controls="cmd-results"
                aria-autocomplete="list"
                aria-activedescendant={selectedId || undefined}
              />
            </div>
            <div className="cmd-palette__body" id="cmd-results">
              <ResultList
                groups={groups}
                expandedGroups={expandedGroups}
                selectedId={selectedId}
                onSelectItem={handleSelectItem}
                onHoverItem={handleHoverItem}
                onToggleExpand={handleToggleExpand}
              />
            </div>
            <div className="cmd-palette__footer-hint">
              <span>&#8593;&#8595; navigate</span>
              <span>Tab group</span>
              <span>&#9166; select</span>
              <span>Esc &#10005;</span>
            </div>
          </>
        ) : paramState ? (
          <ParameterInput
            paramState={paramState}
            onSubmit={handleParamSubmit}
            onBack={handleParamBack}
          />
        ) : null}
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
