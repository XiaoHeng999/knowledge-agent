"use client";

import { useState, useEffect, useCallback } from "react";
import type { PendingAudit, DiffHunkResult } from "@/lib/ipc/channels";
import { EditAndApply } from "./edit-and-apply";
import { ApproveConfirm } from "./approve-confirm";

interface DiffReviewCardProps {
  audit: PendingAudit;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onEditAndApply: (id: string, content: string) => void;
}

const RISK_COLORS: Record<string, string> = {
  low: "var(--success)",
  medium: "var(--warning)",
  high: "var(--error)",
  blocked: "var(--text-tertiary)",
};

const OPERATION_LABELS: Record<string, { text: string; color: string }> = {
  create: { text: "Create", color: "var(--success)" },
  update: { text: "Update", color: "var(--warning)" },
  delete: { text: "Delete", color: "var(--error)" },
};

export function DiffReviewCard({
  audit,
  onApprove,
  onReject,
  onEditAndApply,
}: DiffReviewCardProps) {
  const [hunks, setHunks] = useState<DiffHunkResult[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);

  const op = audit.operation;
  const opLabel = OPERATION_LABELS[op.type] ?? {
    text: op.type,
    color: "var(--text-secondary)",
  };

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const result = await window.api.security.generateDiff({
          oldContent: op.type === "create" ? null : "",
          newContent: op.type === "delete" ? null : op.newContent ?? "",
        });
        if (!cancelled) {
          setHunks(result.hunks);
          setLoading(false);
        }
      } catch {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [op]);

  const handleApprove = useCallback(() => {
    if (audit.risk.level === "high") {
      setShowApproveConfirm(true);
    } else {
      onApprove(audit.id);
    }
  }, [audit.id, audit.risk.level, onApprove]);

  const handleApproveConfirmed = useCallback(() => {
    setShowApproveConfirm(false);
    onApprove(audit.id);
  }, [audit.id, onApprove]);

  const handleReject = useCallback(() => {
    onReject(audit.id);
  }, [audit.id, onReject]);

  const handleEditStart = useCallback(() => {
    setShowEdit(true);
  }, []);

  const handleEditApply = useCallback(
    (content: string) => {
      setShowEdit(false);
      onEditAndApply(audit.id, content);
    },
    [audit.id, onEditAndApply],
  );

  const handleEditCancel = useCallback(() => {
    setShowEdit(false);
  }, []);

  const fileName = op.targetPath.split("/").pop() ?? op.targetPath;

  if (showEdit) {
    return (
      <div className="diff-review-card">
        <EditAndApply
          initialContent={op.newContent ?? ""}
          onApply={handleEditApply}
          onCancel={handleEditCancel}
        />
      </div>
    );
  }

  if (showApproveConfirm) {
    return (
      <div className="diff-review-card">
        <ApproveConfirm
          fileName={fileName}
          onConfirm={handleApproveConfirmed}
          onCancel={() => setShowApproveConfirm(false)}
        />
      </div>
    );
  }

  return (
    <div className="diff-review-card">
      <div className="diff-review-card__header">
        <span
          className="diff-review-card__op-badge"
          style={{ backgroundColor: opLabel.color }}
        >
          {opLabel.text}
        </span>
        <span className="diff-review-card__filename">{fileName}</span>
        <span
          className="diff-review-card__risk-badge"
          style={{ color: RISK_COLORS[audit.risk.level] }}
        >
          {audit.risk.level.toUpperCase()}
        </span>
      </div>

      {audit.risk.reasons.length > 0 && (
        <div className="diff-review-card__reasons">
          {audit.risk.reasons.map((r, i) => (
            <span key={i} className="diff-review-card__reason">
              {r}
            </span>
          ))}
        </div>
      )}

      <div className="diff-review-card__diff">
        {loading ? (
          <div className="diff-review-card__loading">Loading diff...</div>
        ) : (
          <DiffPreview hunks={hunks} expanded={expanded} />
        )}
        {!loading && hasMoreLines(hunks) && (
          <button
            className="diff-review-card__expand"
            onClick={() => setExpanded((e) => !e)}
          >
            {expanded ? "Collapse" : "Show full diff"}
          </button>
        )}
      </div>

      <div className="diff-review-card__actions">
        {audit.risk.level === "high" ? (
          <>
            <button
              className="diff-review-card__btn diff-review-card__btn--approve-danger"
              onClick={handleApprove}
            >
              Approve
            </button>
            <button
              className="diff-review-card__btn diff-review-card__btn--reject"
              onClick={handleReject}
            >
              Reject
            </button>
          </>
        ) : audit.risk.level === "medium" ? (
          <>
            <button
              className="diff-review-card__btn diff-review-card__btn--approve"
              onClick={handleApprove}
            >
              Approve
            </button>
            <button
              className="diff-review-card__btn diff-review-card__btn--reject"
              onClick={handleReject}
            >
              Reject
            </button>
            <button
              className="diff-review-card__btn diff-review-card__btn--edit"
              onClick={handleEditStart}
            >
              Edit & Apply
            </button>
          </>
        ) : (
          <>
            <button
              className="diff-review-card__btn diff-review-card__btn--approve"
              onClick={handleApprove}
            >
              Approve
            </button>
            <button
              className="diff-review-card__btn diff-review-card__btn--reject"
              onClick={handleReject}
            >
              Reject
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function DiffPreview({
  hunks,
  expanded,
}: {
  hunks: DiffHunkResult[];
  expanded: boolean;
}) {
  if (hunks.length === 0) {
    return <div className="diff-review-card__no-diff">No changes</div>;
  }

  const displayHunks = expanded ? hunks : hunks.slice(0, 1);
  let lineCount = 0;
  const MAX_PREVIEW_LINES = 10;

  return (
    <div className="diff-review-card__diff-content">
      {displayHunks.map((hunk, hIdx) => (
        <div key={hIdx} className="diff-review-card__hunk">
          {hunk.lines.map((line, lIdx) => {
            if (!expanded && lineCount >= MAX_PREVIEW_LINES) return null;
            lineCount++;
            const lineClass =
              line.type === "add"
                ? "diff-review-card__line--add"
                : line.type === "remove"
                  ? "diff-review-card__line--remove"
                  : "diff-review-card__line--context";
            const prefix =
              line.type === "add" ? "+" : line.type === "remove" ? "-" : " ";
            return (
              <div key={lIdx} className={`diff-review-card__line ${lineClass}`}>
                <span className="diff-review-card__line-prefix">{prefix}</span>
                <span className="diff-review-card__line-text">
                  {line.content}
                </span>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function hasMoreLines(hunks: DiffHunkResult[]): boolean {
  let total = 0;
  for (const h of hunks) {
    total += h.lines.length;
  }
  return total > 10 || hunks.length > 1;
}
