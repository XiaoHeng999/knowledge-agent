"use client";

import { useSecurityStore } from "@/stores/security-store";
import { useLayout } from "@/components/layout/layout-context";
import { DiffReviewStack } from "./diff-review-stack";

export function PendingBadge() {
  const pendingCount = useSecurityStore((s) => s.pendingCount);
  const { openPanel, panelContentType, closePanel } = useLayout();

  if (pendingCount === 0) return null;

  const isReviewOpen = panelContentType === "diff-review";

  const handleClick = () => {
    if (isReviewOpen) {
      closePanel();
    } else {
      openPanel("diff-review", 420, <DiffReviewStack />);
    }
  };

  return (
    <button
      className="pending-badge"
      onClick={handleClick}
      title={`${pendingCount} pending review${pendingCount > 1 ? "s" : ""}`}
      aria-label={`${pendingCount} pending reviews. Click to open review panel.`}
    >
      <svg
        className="pending-badge__icon"
        width="14"
        height="14"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <path d="M8 1.5a3.5 3.5 0 0 0-3.5 3.5v2.5l-1.5 2h10l-1.5-2V5A3.5 3.5 0 0 0 8 1.5z" />
        <path d="M6 13a2 2 0 0 0 4 0" />
      </svg>
      <span className="pending-badge__text">
        {pendingCount} pending
      </span>
    </button>
  );
}
