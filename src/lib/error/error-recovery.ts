import { create } from 'zustand';
import { getErrorEntry, type ErrorEntry } from './error-registry';

// ---------------------------------------------------------------------------
// Retry with exponential backoff
// ---------------------------------------------------------------------------

export interface RetryOptions {
  maxAttempts: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
};

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: Partial<RetryOptions> = {},
  onAttempt?: (attempt: number, maxAttempts: number) => void,
): Promise<T> {
  const opts = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < opts.maxAttempts) {
        onAttempt?.(attempt + 1, opts.maxAttempts);
        const delay = Math.min(
          opts.initialDelayMs * Math.pow(opts.backoffMultiplier, attempt),
          opts.maxDelayMs,
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

// ---------------------------------------------------------------------------
// Error Store — centralized error state with toast integration
// ---------------------------------------------------------------------------

export interface TrackedError {
  id: string;
  code: string;
  entry: ErrorEntry;
  message: string;
  details?: string;
  timestamp: number;
  dismissed: boolean;
}

let errorCounter = 0;

interface ErrorStoreState {
  errors: TrackedError[];
}

interface ErrorStoreActions {
  reportError: (code: string, message?: string, details?: string) => TrackedError;
  dismissError: (id: string) => void;
  clearAll: () => void;
  getActiveErrors: () => TrackedError[];
  getErrorsByFeature: (feature: string) => TrackedError[];
}

export const useErrorStore = create<ErrorStoreState & ErrorStoreActions>()(
  (set, get) => ({
    errors: [],

    reportError: (code, message, details) => {
      const entry = getErrorEntry(code);
      const tracked: TrackedError = {
        id: `err-${++errorCounter}`,
        code,
        entry,
        message: message ?? entry.message,
        details,
        timestamp: Date.now(),
        dismissed: false,
      };

      set((s) => ({ errors: [...s.errors, tracked] }));

      // Log to console with appropriate level
      const logFn = entry.logLevel === 'error' ? console.error
        : entry.logLevel === 'warn' ? console.warn
        : console.info;
      logFn(`[ErrorRegistry] ${code}: ${tracked.message}`, details ?? '');

      return tracked;
    },

    dismissError: (id) => {
      set((s) => ({
        errors: s.errors.map((e) =>
          e.id === id ? { ...e, dismissed: true } : e,
        ),
      }));
    },

    clearAll: () => set({ errors: [] }),

    getActiveErrors: () => get().errors.filter((e) => !e.dismissed),

    getErrorsByFeature: (feature) =>
      get().errors.filter((e) => e.entry.feature === feature && !e.dismissed),
  }),
);

// ---------------------------------------------------------------------------
// Error-to-Toast bridge — call from components/hooks
// ---------------------------------------------------------------------------

export function useReportError() {
  const reportError = useErrorStore((s) => s.reportError);
  return reportError;
}

// ---------------------------------------------------------------------------
// Debug log store — collects in-memory logs for the debug panel
// ---------------------------------------------------------------------------

export interface LogEntry {
  id: number;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  timestamp: number;
  data?: unknown;
}

interface LogStoreState {
  entries: LogEntry[];
  debugMode: boolean;
}

interface LogStoreActions {
  log: (level: LogEntry['level'], message: string, data?: unknown) => void;
  setDebugMode: (enabled: boolean) => void;
  clearLogs: () => void;
}

let logCounter = 0;
const MAX_LOG_ENTRIES = 500;

export const useLogStore = create<LogStoreState & LogStoreActions>()(
  (set, get) => ({
    entries: [],
    debugMode: false,

    log: (level, message, data) => {
      // Only store debug-level logs when debug mode is on
      if (level === 'debug' && !get().debugMode) return;

      const entry: LogEntry = {
        id: ++logCounter,
        level,
        message,
        timestamp: Date.now(),
        data,
      };

      set((s) => ({
        entries: [...s.entries.slice(-(MAX_LOG_ENTRIES - 1)), entry],
      }));
    },

    setDebugMode: (enabled) => set({ debugMode: enabled }),
    clearLogs: () => set({ entries: [] }),
  }),
);

// Convenience logger that mirrors to both console and log store
export const logger = {
  debug: (msg: string, data?: unknown) => {
    useLogStore.getState().log('debug', msg, data);
  },
  info: (msg: string, data?: unknown) => {
    console.info(msg, data ?? '');
    useLogStore.getState().log('info', msg, data);
  },
  warn: (msg: string, data?: unknown) => {
    console.warn(msg, data ?? '');
    useLogStore.getState().log('warn', msg, data);
  },
  error: (msg: string, data?: unknown) => {
    console.error(msg, data ?? '');
    useLogStore.getState().log('error', msg, data);
  },
};
