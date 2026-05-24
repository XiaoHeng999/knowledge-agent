'use client';

import type { ReactNode } from 'react';

type BadgeVariant =
  | 'default'
  | 'verified'
  | 'reviewed'
  | 'draft'
  | 'outdated'
  | 'error'
  | 'success'
  | 'warning'
  | 'info';

interface BadgeProps {
  variant?: BadgeVariant;
  children: ReactNode;
  icon?: ReactNode;
  className?: string;
}

const variantIconPaths: Partial<Record<BadgeVariant, string>> = {
  verified:
    'M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z',
  reviewed:
    'M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8zM1.173 8a13.133 13.133 0 0 1 1.66-2.043C4.12 4.668 5.88 3.5 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13.133 13.133 0 0 1 14.828 8c-.058.087-.122.183-.195.288-.335.48-.83 1.12-1.465 1.755C11.879 11.332 10.119 12.5 8 12.5c-2.12 0-3.879-1.168-5.168-2.457A13.134 13.134 0 0 1 1.172 8z',
  draft: 'M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168l10-10zM11.207 2.5 13.5 4.793 14.793 3.5 12.5 1.207 11.207 2.5zm1.586 3L10.5 3.207 4 9.707V10h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.293l6.5-6.5z',
  outdated:
    'M8 3.5a.5.5 0 0 0-1 0V9a.5.5 0 0 0 .252.434l3.5 2a.5.5 0 0 0 .496-.868L8 8.71V3.5z',
  error:
    'M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16zM5.354 5.354a.5.5 0 1 0-.708.708L7.293 8.5l-2.647 2.646a.5.5 0 0 0 .708.708L8 9.207l2.646 2.647a.5.5 0 0 0 .708-.708L8.707 8.5l2.647-2.646a.5.5 0 0 0-.708-.708L8 7.793 5.354 5.146z',
  success:
    'M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zM6.97 11.03a.75.75 0 0 0 1.07 0l3.992-3.992a.75.75 0 0 0 0-1.06.75.75 0 0 0-1.06 0L7.5 9.439 5.53 7.47a.75.75 0 0 0-1.06 0 .75.75 0 0 0 0 1.06l2.5 2.5z',
};

export function Badge({
  variant = 'default',
  children,
  icon,
  className = '',
}: BadgeProps) {
  const iconPath = variantIconPaths[variant];

  return (
    <span className={`ui-badge ui-badge--${variant} ${className}`}>
      {(icon || iconPath) && (
        <span className="ui-badge__icon" aria-hidden="true">
          {icon ?? (
            <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
              <path d={iconPath} />
            </svg>
          )}
        </span>
      )}
      <span className="ui-badge__label">{children}</span>
    </span>
  );
}
