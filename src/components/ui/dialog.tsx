'use client';

import {
  useEffect,
  useRef,
  useCallback,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { useFocusTrap, useFocusTransfer } from '@/lib/hooks/use-focus-trap';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  width?: number;
  modal?: boolean;
  className?: string;
}

export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  width = 420,
  modal = true,
  className = '',
}: DialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useFocusTrap(dialogRef, open && modal);
  useFocusTransfer(dialogRef, open);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    },
    [onClose],
  );

  useEffect(() => {
    if (!open) return;

    document.addEventListener('keydown', handleKeyDown);

    if (modal) {
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [open, handleKeyDown, modal]);

  if (!open) return null;

  const content = (
    <div
      className={`ui-dialog-overlay ${modal ? 'ui-dialog-overlay--modal' : ''}`}
      onClick={modal ? (e) => e.target === e.currentTarget && onClose() : undefined}
    >
      <div
        ref={dialogRef}
        className={`ui-dialog ${className}`}
        style={{ width: `${width}px`, maxWidth: '90vw' }}
        role={modal ? 'dialog' : undefined}
        aria-modal={modal || undefined}
        aria-label={title}
        aria-describedby={description ? `${title}-desc` : undefined}
      >
        {title && (
          <div className="ui-dialog__header">
            <h2 className="ui-dialog__title" id={`${title}-heading`}>{title}</h2>
            <button
              className="ui-dialog__close"
              onClick={onClose}
              aria-label="Close dialog"
              type="button"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z" />
              </svg>
            </button>
          </div>
        )}
        {description && (
          <p id={`${title}-desc`} className="ui-dialog__description" hidden>
            {description}
          </p>
        )}
        <div className="ui-dialog__body">{children}</div>
        {footer && <div className="ui-dialog__footer">{footer}</div>}
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
