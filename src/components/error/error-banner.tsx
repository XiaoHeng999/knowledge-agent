'use client';

import type { ReactNode } from 'react';

export type ErrorBannerVariant = 'error' | 'warning' | 'info';

interface ErrorBannerProps {
  variant?: ErrorBannerVariant;
  message: string;
  description?: string;
  actions?: ReactNode;
  icon?: ReactNode;
}

const defaultIcons: Record<ErrorBannerVariant, string> = {
  error: 'M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16zm-3.146-4.146a.5.5 0 0 1-.708-.708L7.293 8 4.146 4.854a.5.5 0 1 1 .708-.708L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647z',
  warning: 'M7.938 2.016A.13.13 0 0 1 8.002 2a.13.13 0 0 1 .063.016.15.15 0 0 1 .054.057l6.857 11.667c.036.06.035.124.002.183a.16.16 0 0 1-.054.06.18.18 0 0 1-.065.017H1.141a.18.18 0 0 1-.065-.017.16.16 0 0 1-.054-.06.18.18 0 0 1 .002-.183L7.884 2.073a.15.15 0 0 1 .054-.057zm1.044-.45a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566z',
  info: 'M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16zm.93-9.412-1 4.705c-.07.34.029.533.304.533.194 0 .487-.07.686-.246l-.088.416c-.287.346-.92.598-1.465.598-.703 0-1.002-.422-.808-1.319l.738-3.468c.064-.293.064-.474 0-.587-.1-.158-.272-.2-.503-.2l.135-.416c.516-.086 1.003-.152 1.501-.152.293 0 .512.06.634.2.122.14.122.348.006.634zM8 5.5a1 1 0 1 1 0-2 1 1 0 0 1 0 2z',
};

export function ErrorBanner({
  variant = 'error',
  message,
  description,
  actions,
  icon,
}: ErrorBannerProps) {
  return (
    <div className={`error-banner error-banner--${variant}`} role="alert">
      <span className="error-banner__icon" aria-hidden="true">
        {icon ?? (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d={defaultIcons[variant]} />
          </svg>
        )}
      </span>
      <div className="error-banner__body">
        <p className="error-banner__message">{message}</p>
        {description && <p className="error-banner__description">{description}</p>}
        {actions && <div className="error-banner__actions">{actions}</div>}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pre-built action buttons for common error banner patterns
// ---------------------------------------------------------------------------

interface RetryButtonProps {
  onRetry: () => void;
  label?: string;
}

export function RetryButton({ onRetry, label = 'Retry' }: RetryButtonProps) {
  return (
    <button className="error-banner__action-btn error-banner__action-btn--error" onClick={onRetry} type="button">
      {label}
    </button>
  );
}

interface GhostButtonProps {
  onClick: () => void;
  label: string;
}

export function GhostButton({ onClick, label }: GhostButtonProps) {
  return (
    <button className="error-banner__action-btn error-banner__action-btn--ghost" onClick={onClick} type="button">
      {label}
    </button>
  );
}
