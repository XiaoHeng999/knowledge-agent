export { ErrorBoundary } from '@/components/error/error-boundary';
export { ErrorBanner, RetryButton, GhostButton } from '@/components/error/error-banner';
export type { ErrorBannerVariant } from '@/components/error/error-banner';
export {
  ERROR_REGISTRY,
  getErrorEntry,
  severityToToastType,
} from './error-registry';
export type { ErrorEntry, ErrorSeverity, RecoveryStrategy, RetryConfig } from './error-registry';
export {
  retryWithBackoff,
  useErrorStore,
  useReportError,
  useLogStore,
  logger,
} from './error-recovery';
export type { TrackedError, LogEntry } from './error-recovery';
