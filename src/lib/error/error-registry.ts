import type { ToastType } from '@/components/ui/toast';

// ---------------------------------------------------------------------------
// Error Registry — structured error definitions from the spec
// ---------------------------------------------------------------------------

export type ErrorSeverity = 'critical' | 'warning' | 'info';
export type RecoveryStrategy = 'retry' | 'fallback' | 'graceful-degrade' | 'user-action' | 'none';

export interface RetryConfig {
  maxAttempts: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

export interface ErrorEntry {
  code: string;
  feature: string;
  severity: ErrorSeverity;
  message: string;
  recovery: RecoveryStrategy;
  retryConfig?: RetryConfig;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  userAction?: string;
}

export const ERROR_REGISTRY: Record<string, ErrorEntry> = {
  // F1: GUI
  'GUI.WINDOW_CREATE_FAILURE': {
    code: 'GUI.WINDOW_CREATE_FAILURE', feature: 'gui', severity: 'critical',
    message: 'Failed to create application window. Please restart AgentClaw.',
    recovery: 'user-action', logLevel: 'error',
  },
  'GUI.LAYOUT_RENDER_FAILURE': {
    code: 'GUI.LAYOUT_RENDER_FAILURE', feature: 'gui', severity: 'warning',
    message: 'Layout rendering encountered an error. Attempting to recover...',
    recovery: 'retry', retryConfig: { maxAttempts: 1, initialDelayMs: 1000, maxDelayMs: 1000, backoffMultiplier: 1 },
    logLevel: 'warn',
  },

  // F2: Research
  'RESEARCH.SCHEDULER_INIT_FAILURE': {
    code: 'RESEARCH.SCHEDULER_INIT_FAILURE', feature: 'research', severity: 'warning',
    message: 'Research scheduler failed to initialize. Manual research is still available.',
    recovery: 'graceful-degrade', logLevel: 'error',
  },
  'RESEARCH.RUN_API_FAILURE': {
    code: 'RESEARCH.RUN_API_FAILURE', feature: 'research', severity: 'warning',
    message: 'Research run failed (API error).',
    recovery: 'retry', retryConfig: { maxAttempts: 5, initialDelayMs: 60000, maxDelayMs: 1800000, backoffMultiplier: 2 },
    logLevel: 'warn',
  },
  'RESEARCH.RUN_TIMEOUT': {
    code: 'RESEARCH.RUN_TIMEOUT', feature: 'research', severity: 'warning',
    message: 'Research run exceeded time limit. Partial results saved.',
    recovery: 'graceful-degrade', logLevel: 'warn',
  },
  'RESEARCH.RESULT_PARSE_FAILURE': {
    code: 'RESEARCH.RESULT_PARSE_FAILURE', feature: 'research', severity: 'warning',
    message: 'Research completed but results could not be parsed. Raw output saved.',
    recovery: 'graceful-degrade', logLevel: 'warn',
  },

  // F3: Framework
  'FRAMEWORK.EXECUTION_FAILURE': {
    code: 'FRAMEWORK.EXECUTION_FAILURE', feature: 'framework', severity: 'warning',
    message: 'Framework analysis failed.',
    recovery: 'retry', retryConfig: { maxAttempts: 1, initialDelayMs: 0, maxDelayMs: 0, backoffMultiplier: 1 },
    logLevel: 'warn',
  },
  'FRAMEWORK.DECISION_RECORD_WRITE_FAILURE': {
    code: 'FRAMEWORK.DECISION_RECORD_WRITE_FAILURE', feature: 'framework', severity: 'warning',
    message: 'Failed to save decision record. Analysis results are preserved.',
    recovery: 'retry', retryConfig: { maxAttempts: 3, initialDelayMs: 1000, maxDelayMs: 1000, backoffMultiplier: 1 },
    logLevel: 'error',
  },

  // F4: Timeline
  'TIMELINE.PREDICTION_GENERATION_FAILURE': {
    code: 'TIMELINE.PREDICTION_GENERATION_FAILURE', feature: 'timeline', severity: 'warning',
    message: 'Prediction generation failed.',
    recovery: 'retry', logLevel: 'warn',
  },
  'TIMELINE.TREND_ANALYSIS_FAILURE': {
    code: 'TIMELINE.TREND_ANALYSIS_FAILURE', feature: 'timeline', severity: 'info',
    message: 'Trend analysis could not be generated.',
    recovery: 'graceful-degrade', logLevel: 'warn',
  },

  // F5: Knowledge / Expert Chat
  'KNOWLEDGE.CHAT_API_FAILURE': {
    code: 'KNOWLEDGE.CHAT_API_FAILURE', feature: 'knowledge', severity: 'critical',
    message: 'Generation failed. Your message has been saved.',
    recovery: 'retry', retryConfig: { maxAttempts: 10, initialDelayMs: 1000, maxDelayMs: 30000, backoffMultiplier: 2 },
    logLevel: 'error',
  },
  'KNOWLEDGE.CHAT_STREAM_INTERRUPTED': {
    code: 'KNOWLEDGE.CHAT_STREAM_INTERRUPTED', feature: 'knowledge', severity: 'warning',
    message: 'Response was interrupted. Partial response saved.',
    recovery: 'retry', logLevel: 'warn',
  },
  'KNOWLEDGE.CHAT_MODEL_SWITCH_FAILURE': {
    code: 'KNOWLEDGE.CHAT_MODEL_SWITCH_FAILURE', feature: 'knowledge', severity: 'warning',
    message: 'Failed to switch model. Continuing with current.',
    recovery: 'fallback', logLevel: 'warn',
  },
  'KNOWLEDGE.INBOX_PROCESS_FAILURE': {
    code: 'KNOWLEDGE.INBOX_PROCESS_FAILURE', feature: 'knowledge', severity: 'warning',
    message: 'Failed to process inbox item. Original content preserved.',
    recovery: 'retry', logLevel: 'warn',
  },
  'KNOWLEDGE.INBOX_CONFIRM_FAILURE': {
    code: 'KNOWLEDGE.INBOX_CONFIRM_FAILURE', feature: 'knowledge', severity: 'warning',
    message: 'Failed to save to domain. Your item is still in the inbox.',
    recovery: 'retry', retryConfig: { maxAttempts: 3, initialDelayMs: 1000, maxDelayMs: 4000, backoffMultiplier: 2 },
    logLevel: 'error',
  },

  // F6: Domain
  'DOMAIN.CREATE_FAILURE': {
    code: 'DOMAIN.CREATE_FAILURE', feature: 'domain', severity: 'critical',
    message: 'Failed to create domain. Please try again.',
    recovery: 'retry', logLevel: 'error',
  },
  'DOMAIN.CONFIG_PARSE_FAILURE': {
    code: 'DOMAIN.CONFIG_PARSE_FAILURE', feature: 'domain', severity: 'warning',
    message: 'Domain configuration is corrupted. Using defaults.',
    recovery: 'graceful-degrade', logLevel: 'warn',
  },
  'DOMAIN.DELETE_FAILURE': {
    code: 'DOMAIN.DELETE_FAILURE', feature: 'domain', severity: 'warning',
    message: 'Failed to delete domain. Some files may still exist.',
    recovery: 'retry', logLevel: 'error',
  },

  // F7: Skill
  'SKILL.PARSE_FAILURE': {
    code: 'SKILL.PARSE_FAILURE', feature: 'skill', severity: 'warning',
    message: 'Skill has invalid format and was not loaded.',
    recovery: 'graceful-degrade', logLevel: 'warn',
  },
  'SKILL.EXECUTION_FAILURE': {
    code: 'SKILL.EXECUTION_FAILURE', feature: 'skill', severity: 'warning',
    message: 'Skill failed to execute.',
    recovery: 'retry', logLevel: 'warn',
  },
  'SKILL.EXECUTION_TIMEOUT': {
    code: 'SKILL.EXECUTION_TIMEOUT', feature: 'skill', severity: 'warning',
    message: 'Skill timed out.',
    recovery: 'retry', logLevel: 'warn',
  },

  // F8: Import
  'IMPORT.URL_FETCH_FAILURE': {
    code: 'IMPORT.URL_FETCH_FAILURE', feature: 'import', severity: 'warning',
    message: 'Failed to fetch URL.',
    recovery: 'retry', retryConfig: { maxAttempts: 3, initialDelayMs: 1000, maxDelayMs: 4000, backoffMultiplier: 2 },
    logLevel: 'warn',
  },
  'IMPORT.PDF_PARSE_FAILURE': {
    code: 'IMPORT.PDF_PARSE_FAILURE', feature: 'import', severity: 'warning',
    message: 'Failed to extract text from PDF. The file may be image-based or corrupted.',
    recovery: 'user-action', logLevel: 'warn',
  },
  'IMPORT.PDF_TOO_LARGE': {
    code: 'IMPORT.PDF_TOO_LARGE', feature: 'import', severity: 'warning',
    message: 'PDF exceeds maximum size.',
    recovery: 'user-action', logLevel: 'info',
  },
  'IMPORT.RSS_PARSE_FAILURE': {
    code: 'IMPORT.RSS_PARSE_FAILURE', feature: 'import', severity: 'info',
    message: 'RSS feed could not be parsed. Will retry on next poll.',
    recovery: 'retry', logLevel: 'warn',
  },
  'IMPORT.PARTIAL_SUCCESS': {
    code: 'IMPORT.PARTIAL_SUCCESS', feature: 'import', severity: 'info',
    message: 'Partial import success.',
    recovery: 'retry', logLevel: 'info',
  },

  // F9: Model
  'MODEL.API_KEY_INVALID': {
    code: 'MODEL.API_KEY_INVALID', feature: 'model', severity: 'warning',
    message: 'API key is invalid or expired. Please update it.',
    recovery: 'user-action', logLevel: 'warn',
  },
  'MODEL.API_KEY_ENCRYPTION_FAILURE': {
    code: 'MODEL.API_KEY_ENCRYPTION_FAILURE', feature: 'model', severity: 'critical',
    message: 'Failed to securely store API key.',
    recovery: 'user-action', logLevel: 'error',
  },
  'MODEL.ALL_MODELS_UNAVAILABLE': {
    code: 'MODEL.ALL_MODELS_UNAVAILABLE', feature: 'model', severity: 'critical',
    message: 'No AI models are currently available. Check your API keys or set up a local model.',
    recovery: 'user-action', logLevel: 'error',
  },
  'MODEL.SWITCH_FAILURE': {
    code: 'MODEL.SWITCH_FAILURE', feature: 'model', severity: 'warning',
    message: 'Failed to switch model. Staying on current.',
    recovery: 'fallback', logLevel: 'warn',
  },

  // F10: Graph
  'GRAPH.RENDER_FAILURE': {
    code: 'GRAPH.RENDER_FAILURE', feature: 'graph', severity: 'warning',
    message: 'Graph rendering failed. Switched to list view.',
    recovery: 'graceful-degrade', logLevel: 'warn',
  },
  'GRAPH.LAYOUT_COMPUTATION_TIMEOUT': {
    code: 'GRAPH.LAYOUT_COMPUTATION_TIMEOUT', feature: 'graph', severity: 'info',
    message: 'Graph layout is taking longer than expected.',
    recovery: 'graceful-degrade', logLevel: 'info',
  },
  'GRAPH.TOO_MANY_NODES': {
    code: 'GRAPH.TOO_MANY_NODES', feature: 'graph', severity: 'info',
    message: 'Too many nodes for SVG renderer.',
    recovery: 'graceful-degrade', logLevel: 'info',
  },

  // F11: Version Control
  'VERSION.GIT_INIT_FAILURE': {
    code: 'VERSION.GIT_INIT_FAILURE', feature: 'version', severity: 'critical',
    message: 'Version control initialization failed. Changes will not be tracked.',
    recovery: 'retry', logLevel: 'error',
  },
  'VERSION.AUTO_COMMIT_FAILURE': {
    code: 'VERSION.AUTO_COMMIT_FAILURE', feature: 'version', severity: 'warning',
    message: 'Auto-save checkpoint failed. Your changes are saved but not versioned.',
    recovery: 'retry', retryConfig: { maxAttempts: 3, initialDelayMs: 1000, maxDelayMs: 1000, backoffMultiplier: 1 },
    logLevel: 'error',
  },
  'VERSION.ROLLBACK_FAILURE': {
    code: 'VERSION.ROLLBACK_FAILURE', feature: 'version', severity: 'critical',
    message: 'Rollback failed. Please check the version history.',
    recovery: 'user-action', logLevel: 'error',
  },
  'VERSION.WRITE_OUT_OF_SCOPE': {
    code: 'VERSION.WRITE_OUT_OF_SCOPE', feature: 'version', severity: 'warning',
    message: 'Agent attempted to write outside domain directory. Write blocked.',
    recovery: 'none', logLevel: 'error',
  },

  // F12: Platform
  'PLATFORM.PATH_RESOLVE_FAILURE': {
    code: 'PLATFORM.PATH_RESOLVE_FAILURE', feature: 'platform', severity: 'critical',
    message: 'Failed to resolve application data directory.',
    recovery: 'user-action', logLevel: 'error',
  },
  'PLATFORM.AUTO_UPDATE_FAILURE': {
    code: 'PLATFORM.AUTO_UPDATE_FAILURE', feature: 'platform', severity: 'info',
    message: 'Auto-update check failed.',
    recovery: 'retry', logLevel: 'info',
  },
  'PLATFORM.DATABASE_MIGRATION_FAILURE': {
    code: 'PLATFORM.DATABASE_MIGRATION_FAILURE', feature: 'platform', severity: 'critical',
    message: 'Database migration failed. Application cannot start.',
    recovery: 'user-action', logLevel: 'error',
  },

  // System
  'SYSTEM.UNKNOWN': {
    code: 'SYSTEM.UNKNOWN', feature: 'system', severity: 'critical',
    message: 'An unexpected error occurred.',
    recovery: 'user-action', logLevel: 'error',
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function getErrorEntry(code: string): ErrorEntry {
  return ERROR_REGISTRY[code] ?? ERROR_REGISTRY['SYSTEM.UNKNOWN'];
}

export function severityToToastType(severity: ErrorSeverity): ToastType {
  switch (severity) {
    case 'critical': return 'error';
    case 'warning': return 'warning';
    case 'info': return 'info';
  }
}
