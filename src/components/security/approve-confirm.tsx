"use client";

import { useState, useCallback } from "react";

interface ApproveConfirmProps {
  fileName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ApproveConfirm({ fileName, onConfirm, onCancel }: ApproveConfirmProps) {
  const [value, setValue] = useState("");

  const isConfirmed = value === "APPROVE";

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (isConfirmed) onConfirm();
    },
    [isConfirmed, onConfirm],
  );

  return (
    <div className="approve-confirm">
      <div className="approve-confirm__header">
        <span className="approve-confirm__title">Confirm Destructive Action</span>
      </div>
      <p className="approve-confirm__message">
        You are about to approve a high-risk operation on{" "}
        <strong>{fileName}</strong>. Please type <code>APPROVE</code> to confirm.
      </p>
      <form onSubmit={handleSubmit} className="approve-confirm__form">
        <input
          className="approve-confirm__input"
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder='Type "APPROVE" to confirm'
          autoFocus
          autoComplete="off"
          aria-label="Type APPROVE to confirm"
        />
        <div className="approve-confirm__actions">
          <button
            type="button"
            className="approve-confirm__btn approve-confirm__btn--cancel"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="approve-confirm__btn approve-confirm__btn--confirm"
            disabled={!isConfirmed}
          >
            Confirm
          </button>
        </div>
      </form>
    </div>
  );
}
