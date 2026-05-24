"use client";

import { useSecurityStore } from "@/stores/security-store";
import { DiffReviewCard } from "./diff-review-card";
import { useCallback } from "react";

export function DiffReviewStack() {
  const { pendingAudits, pendingCount, resolveAudit, bulkResolve, loading } =
    useSecurityStore();

  const lowRiskIds = pendingAudits
    .filter((a) => a.risk.level === "low")
    .map((a) => a.id);

  const handleApprove = useCallback(
    (id: string) => resolveAudit(id, "approve"),
    [resolveAudit],
  );

  const handleReject = useCallback(
    (id: string) => resolveAudit(id, "reject"),
    [resolveAudit],
  );

  const handleEditAndApply = useCallback(
    (id: string, content: string) =>
      resolveAudit(id, "edit_and_approve", content),
    [resolveAudit],
  );

  const handleApproveAllLow = useCallback(() => {
    if (lowRiskIds.length > 0) {
      bulkResolve(lowRiskIds, "approve_all");
    }
  }, [lowRiskIds, bulkResolve]);

  const handleRejectAll = useCallback(() => {
    const allIds = pendingAudits.map((a) => a.id);
    if (allIds.length > 0) {
      bulkResolve(allIds, "reject_all");
    }
  }, [pendingAudits, bulkResolve]);

  if (loading && pendingCount === 0) {
    return (
      <div className="diff-review-stack">
        <div className="diff-review-stack__header">
          <span className="diff-review-stack__title">Pending Reviews</span>
        </div>
        <div className="diff-review-stack__loading">Loading...</div>
      </div>
    );
  }

  if (pendingCount === 0) {
    return (
      <div className="diff-review-stack">
        <div className="diff-review-stack__header">
          <span className="diff-review-stack__title">Pending Reviews</span>
          <span className="diff-review-stack__count">0</span>
        </div>
        <div className="diff-review-stack__empty">
          All changes reviewed
        </div>
      </div>
    );
  }

  return (
    <div className="diff-review-stack">
      <div className="diff-review-stack__header">
        <span className="diff-review-stack__title">Pending Reviews</span>
        <span className="diff-review-stack__count">{pendingCount}</span>
      </div>

      <div className="diff-review-stack__cards">
        {pendingAudits.map((audit) => (
          <DiffReviewCard
            key={audit.id}
            audit={audit}
            onApprove={handleApprove}
            onReject={handleReject}
            onEditAndApply={handleEditAndApply}
          />
        ))}
      </div>

      {pendingCount > 1 && (
        <div className="diff-review-stack__bulk-actions">
          {lowRiskIds.length > 0 && (
            <button
              className="diff-review-stack__bulk-btn diff-review-stack__bulk-btn--approve"
              onClick={handleApproveAllLow}
            >
              Approve All Low-Risk ({lowRiskIds.length})
            </button>
          )}
          <button
            className="diff-review-stack__bulk-btn diff-review-stack__bulk-btn--reject"
            onClick={handleRejectAll}
          >
            Reject All
          </button>
        </div>
      )}
    </div>
  );
}
