"use client";

import { useState, useCallback } from "react";

interface EditAndApplyProps {
  initialContent: string;
  onApply: (content: string) => void;
  onCancel: () => void;
}

export function EditAndApply({ initialContent, onApply, onCancel }: EditAndApplyProps) {
  const [content, setContent] = useState(initialContent);

  const handleApply = useCallback(() => {
    onApply(content);
  }, [content, onApply]);

  return (
    <div className="edit-and-apply">
      <div className="edit-and-apply__header">
        <span className="edit-and-apply__title">Edit & Apply</span>
        <button
          className="edit-and-apply__close"
          onClick={onCancel}
          aria-label="Cancel editing"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" stroke="currentColor" strokeWidth="1.5">
            <line x1="3" y1="3" x2="13" y2="13" />
            <line x1="13" y1="3" x2="3" y2="13" />
          </svg>
        </button>
      </div>
      <textarea
        className="edit-and-apply__editor"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        spellCheck={false}
        aria-label="Edit proposed content"
      />
      <div className="edit-and-apply__actions">
        <button
          className="edit-and-apply__btn edit-and-apply__btn--cancel"
          onClick={onCancel}
        >
          Cancel
        </button>
        <button
          className="edit-and-apply__btn edit-and-apply__btn--apply"
          onClick={handleApply}
          disabled={content.trim().length === 0}
        >
          Apply Changes
        </button>
      </div>
    </div>
  );
}
