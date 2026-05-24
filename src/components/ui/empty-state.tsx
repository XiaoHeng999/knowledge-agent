'use client';

import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: ReactNode;
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
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  secondaryAction,
  className = '',
}: EmptyStateProps) {
  return (
    <div className={`ui-empty-state ${className}`}>
      {icon && (
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
    </div>
  );
}
