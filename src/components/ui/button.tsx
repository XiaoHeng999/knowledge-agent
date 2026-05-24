'use client';

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: ReactNode;
  iconRight?: ReactNode;
  fullWidth?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      icon,
      iconRight,
      fullWidth = false,
      disabled,
      children,
      className = '',
      ...props
    },
    ref,
  ) => {
    const classes = [
      'ui-btn',
      `ui-btn--${variant}`,
      `ui-btn--${size}`,
      fullWidth ? 'ui-btn--full' : '',
      loading ? 'ui-btn--loading' : '',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <button
        ref={ref}
        className={classes}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <span className="ui-btn__spinner" aria-hidden="true">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle
                cx="8"
                cy="8"
                r="6"
                stroke="currentColor"
                strokeWidth="2"
                strokeDasharray="28 12"
                strokeLinecap="round"
              />
            </svg>
          </span>
        )}
        {icon && !loading && (
          <span className="ui-btn__icon" aria-hidden="true">
            {icon}
          </span>
        )}
        {children && <span className="ui-btn__label">{children}</span>}
        {iconRight && (
          <span className="ui-btn__icon ui-btn__icon--right" aria-hidden="true">
            {iconRight}
          </span>
        )}
      </button>
    );
  },
);

Button.displayName = 'Button';
