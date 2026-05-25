'use client';

import type { ReactNode } from 'react';

interface EmptyStateProps {
  /** SVG icon or emoji string for the illustration area */
  icon?: ReactNode;
  /** Emoji-only illustration (renders as large decorative text) */
  emoji?: string;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: ReactNode;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  /** Extra content rendered below actions (e.g. starter prompts) */
  children?: ReactNode;
  className?: string;
}

export function EmptyState({
  icon,
  emoji,
  title,
  description,
  action,
  secondaryAction,
  children,
  className = '',
}: EmptyStateProps) {
  return (
    <div className={`ui-empty-state ${className}`}>
      {emoji && (
        <div className="ui-empty-state__emoji" aria-hidden="true">
          {emoji}
        </div>
      )}
      {!emoji && icon && (
        <div className="ui-empty-state__icon" aria-hidden="true">
          {icon}
        </div>
      )}
      <h3 className="ui-empty-state__title">{title}</h3>
      {description && (
        <p className="ui-empty-state__desc">{description}</p>
      )}
      {action && (
        <div className="ui-empty-state__actions">
          <button
            className="ui-empty-state__action"
            onClick={action.onClick}
            type="button"
          >
            {action.icon && (
              <span className="ui-empty-state__action-icon" aria-hidden="true">
                {action.icon}
              </span>
            )}
            {action.label}
          </button>
          {secondaryAction && (
            <button
              className="ui-empty-state__secondary"
              onClick={secondaryAction.onClick}
              type="button"
            >
              {secondaryAction.label}
            </button>
          )}
        </div>
      )}
      {children}
    </div>
  );
}
