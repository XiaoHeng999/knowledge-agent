"use client";

import type { FileDiff, DiffLine } from "@/lib/ipc/channels";

interface DiffViewerProps {
  diffs: FileDiff[];
  hasChanges: boolean;
}

export function DiffViewer({ diffs, hasChanges }: DiffViewerProps) {
  if (!hasChanges || diffs.length === 0) {
    return (
      <div className="diff-viewer__empty">
        No changes between selected versions
      </div>
    );
  }

  return (
    <div className="diff-viewer">
      {diffs.map((diff, idx) => (
        <div key={idx} className="diff-viewer__file">
          <div className="diff-viewer__file-header">
            <span className="diff-viewer__file-path">{diff.newPath}</span>
            {diff.oldPath !== diff.newPath && (
              <span className="diff-viewer__file-rename">
                renamed from {diff.oldPath}
              </span>
            )}
          </div>
          {diff.hunks.map((hunk, hIdx) => (
            <div key={hIdx} className="diff-viewer__hunk">
              <div className="diff-viewer__hunk-header">{hunk.header}</div>
              <div className="diff-viewer__lines">
                {hunk.lines.map((line, lIdx) => (
                  <DiffLineRow key={lIdx} line={line} />
                ))}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function DiffLineRow({ line }: { line: DiffLine }) {
  const lineClass =
    line.type === "add"
      ? "diff-viewer__line--add"
      : line.type === "remove"
        ? "diff-viewer__line--remove"
        : "diff-viewer__line--context";

  const prefix =
    line.type === "add" ? "+" : line.type === "remove" ? "-" : " ";

  return (
    <div className={`diff-viewer__line ${lineClass}`}>
      <span className="diff-viewer__line-num">
        {line.oldLineNumber ?? ""}
      </span>
      <span className="diff-viewer__line-num">
        {line.newLineNumber ?? ""}
      </span>
      <span className="diff-viewer__line-prefix">{prefix}</span>
      <span className="diff-viewer__line-content">{line.content}</span>
    </div>
  );
}
