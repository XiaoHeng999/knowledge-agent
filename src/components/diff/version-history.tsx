"use client";

import { useState, useEffect, useCallback } from "react";
import type { CommitInfo, FileDiff } from "@/lib/ipc/channels";
import { DiffViewer } from "./diff-viewer";

interface VersionHistoryProps {
  filePath: string;
  onClose: () => void;
}

type ViewState =
  | { kind: "loading" }
  | { kind: "list" }
  | { kind: "diff"; from: CommitInfo; to: CommitInfo; diffs: FileDiff[]; hasChanges: boolean }
  | { kind: "confirm-rollback"; target: CommitInfo }
  | { kind: "rolling-back" }
  | { kind: "error"; message: string };

export function VersionHistory({ filePath, onClose }: VersionHistoryProps) {
  const [commits, setCommits] = useState<CommitInfo[]>([]);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [view, setView] = useState<ViewState>({ kind: "loading" });

  // Load commit history
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const result = await window.api.vc.getHistory({ filePath, limit: 50 });
        if (!cancelled) {
          setCommits(result.commits);
          setView({ kind: "list" });
        }
      } catch (err) {
        if (!cancelled) {
          setView({
            kind: "error",
            message: err instanceof Error ? err.message : "Failed to load history",
          });
        }
      }
    })();
    return () => { cancelled = true; };
  }, [filePath]);

  // View diff between two commits
  const handleViewDiff = useCallback(
    async (commit: CommitInfo) => {
      if (selectedIdx === null) {
        setSelectedIdx(commits.findIndex((c) => c.hash === commit.hash));
        return;
      }

      const from = commits[selectedIdx];
      const to = commit;
      setView({ kind: "loading" });

      try {
        const result = await window.api.vc.getDiff({
          fromHash: from.hash,
          toHash: to.hash,
          filePath,
        });
        setView({ kind: "diff", from, to, diffs: result.diffs, hasChanges: result.hasChanges });
      } catch (err) {
        setView({
          kind: "error",
          message: err instanceof Error ? err.message : "Failed to load diff",
        });
      }
      setSelectedIdx(null);
    },
    [selectedIdx, commits, filePath],
  );

  // Rollback
  const handleRollback = useCallback(
    async (target: CommitInfo) => {
      setView({ kind: "rolling-back" });
      try {
        await window.api.vc.rollback({ filePath, targetHash: target.hash });
        // Reload history after rollback
        const result = await window.api.vc.getHistory({ filePath, limit: 50 });
        setCommits(result.commits);
        setView({ kind: "list" });
      } catch (err) {
        setView({
          kind: "error",
          message: err instanceof Error ? err.message : "Rollback failed",
        });
      }
    },
    [filePath],
  );

  const fileName = filePath.split("/").pop() ?? filePath;

  return (
    <div className="version-history">
      {/* Header */}
      <div className="version-history__header">
        <h3 className="version-history__title">Version History</h3>
        <span className="version-history__file-name">{fileName}</span>
        <button
          className="version-history__close"
          onClick={onClose}
          aria-label="Close version history"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
            <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z" />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="version-history__content">
        {view.kind === "loading" && (
          <div className="version-history__loading">Loading...</div>
        )}

        {view.kind === "error" && (
          <div className="version-history__error">{view.message}</div>
        )}

        {view.kind === "list" && (
          <div className="version-history__list">
            {selectedIdx !== null && (
              <div className="version-history__hint">
                First commit selected. Click another to compare.
                <button
                  className="version-history__hint-cancel"
                  onClick={() => setSelectedIdx(null)}
                >
                  Cancel
                </button>
              </div>
            )}
            {commits.map((commit, idx) => (
              <button
                key={commit.hash}
                className={[
                  "version-history__commit",
                  idx === selectedIdx ? "version-history__commit--selected" : "",
                ].join(" ")}
                onClick={() => handleViewDiff(commit)}
              >
                <div className="version-history__commit-hash">
                  {commit.shortHash}
                </div>
                <div className="version-history__commit-msg">
                  {commit.message}
                </div>
                <div className="version-history__commit-meta">
                  {commit.author} &middot; {formatDate(commit.date)}
                </div>
                <button
                  className="version-history__rollback-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    setView({ kind: "confirm-rollback", target: commit });
                  }}
                  aria-label={`Rollback to ${commit.shortHash}`}
                >
                  Restore
                </button>
              </button>
            ))}
            {commits.length === 0 && (
              <div className="version-history__empty">
                No version history for this file.
              </div>
            )}
          </div>
        )}

        {view.kind === "diff" && (
          <div className="version-history__diff">
            <div className="version-history__diff-header">
              <button
                className="version-history__back-btn"
                onClick={() => {
                  setView({ kind: "list" });
                  setSelectedIdx(null);
                }}
              >
                Back to list
              </button>
              <span className="version-history__diff-range">
                {view.from.shortHash}...{view.to.shortHash}
              </span>
              <button
                className="version-history__rollback-btn"
                onClick={() =>
                  setView({ kind: "confirm-rollback", target: view.to })
                }
              >
                Restore this version
              </button>
            </div>
            <DiffViewer diffs={view.diffs} hasChanges={view.hasChanges} />
          </div>
        )}

        {view.kind === "confirm-rollback" && (
          <div className="version-history__confirm">
            <div className="version-history__confirm-text">
              Restore <strong>{fileName}</strong> to version{" "}
              <strong>{view.target.shortHash}</strong>?
            </div>
            <div className="version-history__confirm-msg">
              {view.target.message}
            </div>
            <div className="version-history__confirm-actions">
              <button
                className="version-history__btn version-history__btn--secondary"
                onClick={() => setView({ kind: "list" })}
              >
                Cancel
              </button>
              <button
                className="version-history__btn version-history__btn--danger"
                onClick={() => handleRollback(view.target)}
              >
                Restore this version
              </button>
            </div>
          </div>
        )}

        {view.kind === "rolling-back" && (
          <div className="version-history__loading">Restoring version...</div>
        )}
      </div>
    </div>
  );
}

function formatDate(isoDate: string): string {
  try {
    const d = new Date(isoDate);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60_000);
    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString();
  } catch {
    return isoDate;
  }
}
