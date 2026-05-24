'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

interface QuickRecordDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (text: string) => Promise<void>;
}

export function QuickRecordDialog({ open, onClose, onSubmit }: QuickRecordDialogProps) {
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) {
      setText('');
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  }, [open]);

  const handleSubmit = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    try {
      await onSubmit(trimmed);
      setText('');
      onClose();
    } finally {
      setSubmitting(false);
    }
  }, [text, submitting, onSubmit, onClose]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleSubmit();
      }
      if (e.key === 'Escape') {
        onClose();
      }
    },
    [handleSubmit, onClose],
  );

  if (!open) return null;

  return (
    <div className="quick-record-overlay" onClick={onClose} role="dialog" aria-label="Quick Record">
      <div className="quick-record-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="quick-record-dialog__header">
          <h3 className="quick-record-dialog__title">Quick Record</h3>
          <button
            className="quick-record-dialog__close"
            onClick={onClose}
            aria-label="Close"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M1 1L13 13M13 1L1 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <textarea
          ref={textareaRef}
          className="quick-record-dialog__input"
          placeholder="Paste a link, write a note, or capture an idea..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={4}
          aria-label="Quick record text"
        />
        <div className="quick-record-dialog__footer">
          <span className="quick-record-dialog__hint">
            {typeof navigator !== 'undefined' && /Mac/i.test(navigator.userAgent) ? '⌘' : 'Ctrl'}+Enter to save
          </span>
          <button
            className="quick-record-dialog__submit"
            disabled={!text.trim() || submitting}
            onClick={handleSubmit}
          >
            {submitting ? 'Saving...' : 'Save to Inbox'}
          </button>
        </div>
      </div>
    </div>
  );
}
