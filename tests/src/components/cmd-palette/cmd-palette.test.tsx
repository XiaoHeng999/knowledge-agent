import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, act, waitFor } from '@testing-library/react';

// jsdom polyfills
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false, media: query, onchange: null,
    addListener: vi.fn(), removeListener: vi.fn(),
    addEventListener: vi.fn(), removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});
Element.prototype.scrollIntoView = vi.fn();

// Stable mock objects — returning new objects per call causes infinite re-render loops
vi.mock('next/navigation', () => {
  const router = { push: vi.fn(), replace: vi.fn(), back: vi.fn() };
  return { useRouter: () => router };
});

vi.mock('@/lib/commands/registry', () => ({
  getAllCommands: () => [],
  findMatching: () => [],
  getCommand: () => undefined,
}));

vi.mock('@/lib/commands/history', () => ({
  initHistory: () => Promise.resolve(),
  getRecentItems: () => [],
  addHistoryEntry: vi.fn(),
  clearHistory: vi.fn(),
}));

vi.mock('@/stores/app-store', () => {
  const mockFns = {
    setOpen: vi.fn(),
    setCurrentView: vi.fn(),
    toggleSidebar: vi.fn(),
    setTheme: vi.fn(),
    setImportDialogOpen: vi.fn(),
    setQuickRecordDialogOpen: vi.fn(),
  };

  let state: Record<string, unknown> = {
    commandPaletteOpen: false,
    currentDomainId: 'domain-1',
    theme: 'tokyo-night',
    setCommandPaletteOpen: (open: boolean) => {
      state = { ...state, commandPaletteOpen: open };
      mockFns.setOpen(open);
    },
    setCurrentView: mockFns.setCurrentView,
    toggleSidebar: mockFns.toggleSidebar,
    setTheme: mockFns.setTheme,
    setImportDialogOpen: mockFns.setImportDialogOpen,
    setQuickRecordDialogOpen: mockFns.setQuickRecordDialogOpen,
  };

  const useStore = (selector?: (s: Record<string, unknown>) => unknown) =>
    selector ? selector(state) : state;
  useStore.getState = () => state;
  useStore.setState = (partial: Record<string, unknown>) => {
    state = { ...state, ...(typeof partial === 'function' ? partial(state) : partial) };
  };
  useStore.__mocks = mockFns;

  return { useAppStore: useStore };
});

import { CommandPalette } from '@/components/cmd-palette/cmd-palette';
import { useAppStore } from '@/stores/app-store';
import { addHistoryEntry } from '@/lib/commands/history';

const mocks = (useAppStore as unknown as { __mocks: typeof useAppStore.__mocks }).__mocks;

afterEach(cleanup);

describe('CommandPalette', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAppStore.setState({ commandPaletteOpen: false });

    (globalThis as Record<string, unknown>).api = {
      search: { search: vi.fn().mockResolvedValue({ results: [] }) },
      settings: {
        get: vi.fn().mockResolvedValue(null),
        set: vi.fn().mockResolvedValue(undefined),
      },
    };
  });

  // ── Opening / Closing ──

  it('renders nothing when closed', () => {
    const { container } = render(<CommandPalette />);
    expect(container.innerHTML).toBe('');
  });

  it('renders search input when opened', () => {
    useAppStore.setState({ commandPaletteOpen: true });
    render(<CommandPalette />);
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('closes on Escape key', () => {
    useAppStore.setState({ commandPaletteOpen: true });
    render(<CommandPalette />);
    fireEvent.keyDown(screen.getByRole('combobox'), { key: 'Escape' });
    expect(mocks.setOpen).toHaveBeenCalledWith(false);
  });

  it('closes when clicking overlay backdrop', () => {
    useAppStore.setState({ commandPaletteOpen: true });
    render(<CommandPalette />);
    const dialog = screen.getByRole('dialog');
    const overlay = dialog.parentElement!;
    fireEvent.click(overlay);
    expect(mocks.setOpen).toHaveBeenCalledWith(false);
  });

  it('toggles on Cmd+K global shortcut', () => {
    render(<CommandPalette />);
    fireEvent.keyDown(document, { key: 'k', metaKey: true });
    expect(mocks.setOpen).toHaveBeenCalledWith(true);
  });

  // ── Search / Filtering ──

  it('shows navigation items by default when opened', () => {
    useAppStore.setState({ commandPaletteOpen: true });
    render(<CommandPalette />);
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Inbox')).toBeInTheDocument();
    // Only first 5 NAV_ITEMS are shown (MAX_PER_GROUP)
    expect(screen.getByText('Research Dashboard')).toBeInTheDocument();
  });

  it('filters navigation items as user types', () => {
    useAppStore.setState({ commandPaletteOpen: true });
    render(<CommandPalette />);
    const input = screen.getByRole('combobox');
    fireEvent.change(input, { target: { value: 'inbox' } });
    expect(screen.getByText('Inbox')).toBeInTheDocument();
    expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
  });

  // ── Keyboard Navigation ──

  describe('keyboard navigation', () => {
    beforeEach(() => {
      useAppStore.setState({ commandPaletteOpen: true });
    });

    it('selects first item on ArrowDown', () => {
      render(<CommandPalette />);
      const input = screen.getByRole('combobox');
      fireEvent.keyDown(input, { key: 'ArrowDown' });
      expect(input).toHaveAttribute('aria-activedescendant', 'nav-/');
    });

    it('wraps to first on ArrowDown from last', () => {
      render(<CommandPalette />);
      const input = screen.getByRole('combobox');
      fireEvent.keyDown(input, { key: 'End' });
      fireEvent.keyDown(input, { key: 'ArrowDown' });
      expect(input).toHaveAttribute('aria-activedescendant', 'nav-/');
    });

    it('wraps to last on ArrowUp from first', () => {
      render(<CommandPalette />);
      const input = screen.getByRole('combobox');
      fireEvent.keyDown(input, { key: 'ArrowUp' });
      expect(input.getAttribute('aria-activedescendant')).toMatch(/^act-/);
    });

    it('jumps to first on Home', () => {
      render(<CommandPalette />);
      const input = screen.getByRole('combobox');
      fireEvent.keyDown(input, { key: 'ArrowDown' });
      fireEvent.keyDown(input, { key: 'ArrowDown' });
      fireEvent.keyDown(input, { key: 'Home' });
      expect(input).toHaveAttribute('aria-activedescendant', 'nav-/');
    });

    it('jumps to last on End', () => {
      render(<CommandPalette />);
      const input = screen.getByRole('combobox');
      fireEvent.keyDown(input, { key: 'End' });
      expect(input.getAttribute('aria-activedescendant')).toMatch(/^act-/);
    });

    it('executes selected item on Enter and records history', () => {
      render(<CommandPalette />);
      const input = screen.getByRole('combobox');
      fireEvent.keyDown(input, { key: 'ArrowDown' });
      fireEvent.keyDown(input, { key: 'Enter' });
      expect(addHistoryEntry).toHaveBeenCalledTimes(1);
      expect(vi.mocked(addHistoryEntry).mock.calls[0][0]).toMatchObject({
        id: 'nav-/',
        group: 'navigation',
        label: 'Dashboard',
      });
    });
  });

  // ── Slash Command Mode ──

  it('filters to commands only when query starts with /', () => {
    useAppStore.setState({ commandPaletteOpen: true });
    render(<CommandPalette />);
    const input = screen.getByRole('combobox');
    fireEvent.change(input, { target: { value: '/xyz' } });
    expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
  });

  // ── Action Dispatches ──

  describe('action dispatches', () => {
    beforeEach(() => {
      useAppStore.setState({ commandPaletteOpen: true });
    });

    it('dispatches new-domain', () => {
      render(<CommandPalette />);
      fireEvent.click(screen.getByText('New Domain'));
      expect(mocks.setCurrentView).toHaveBeenCalledWith('settings');
    });

    it('dispatches toggle-sidebar', () => {
      render(<CommandPalette />);
      fireEvent.click(screen.getByText('Toggle Sidebar'));
      expect(mocks.toggleSidebar).toHaveBeenCalledTimes(1);
    });

    it('dispatches toggle-theme', () => {
      render(<CommandPalette />);
      fireEvent.click(screen.getByText('Toggle Theme'));
      expect(mocks.setTheme).toHaveBeenCalledWith('linear');
    });

    it('dispatches import', () => {
      render(<CommandPalette />);
      fireEvent.click(screen.getByText('Import URL'));
      expect(mocks.setImportDialogOpen).toHaveBeenCalledWith(true);
    });

    it('dispatches quick-record', () => {
      render(<CommandPalette />);
      fireEvent.click(screen.getByText('Quick Record'));
      expect(mocks.setQuickRecordDialogOpen).toHaveBeenCalledWith(true);
    });
  });

  // ── History Recording ──

  it('records clicked nav items in history', () => {
    useAppStore.setState({ commandPaletteOpen: true });
    render(<CommandPalette />);
    fireEvent.click(screen.getByText('Dashboard'));
    expect(addHistoryEntry).toHaveBeenCalledTimes(1);
  });

  // ── Knowledge Search ──

  describe('knowledge search', () => {
    it('debounces search by 200ms', async () => {
      const searchFn = vi.fn().mockResolvedValue({ results: [] });
      (globalThis as Record<string, unknown>).api = {
        search: { search: searchFn },
        settings: { get: vi.fn().mockResolvedValue(null), set: vi.fn().mockResolvedValue(undefined) },
      };
      useAppStore.setState({ commandPaletteOpen: true });
      render(<CommandPalette />);
      const input = screen.getByRole('combobox');
      fireEvent.change(input, { target: { value: 'machine learning' } });
      expect(searchFn).not.toHaveBeenCalled();

      // Wait for the 200ms debounce to fire
      await waitFor(() => {
        expect(searchFn).toHaveBeenCalledWith({ query: 'machine learning', limit: 5 });
      }, { timeout: 500 });
    });

    it('does not call search for empty query', () => {
      const searchFn = vi.fn().mockResolvedValue({ results: [] });
      (globalThis as Record<string, unknown>).api = {
        search: { search: searchFn },
        settings: { get: vi.fn().mockResolvedValue(null), set: vi.fn().mockResolvedValue(undefined) },
      };
      useAppStore.setState({ commandPaletteOpen: true });
      render(<CommandPalette />);
      expect(searchFn).not.toHaveBeenCalled();
    });
  });
});
