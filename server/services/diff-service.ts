/**
 * DiffService — generates line-level diffs between old and new content.
 * Pure in-memory comparison (not git-based) used for the security review queue.
 */

export interface DiffResult {
  hunks: TextDiffHunk[];
  stats: { added: number; removed: number; unchanged: number };
}

export interface TextDiffHunk {
  oldStart: number;
  oldCount: number;
  newStart: number;
  newCount: number;
  lines: TextDiffLine[];
}

export interface TextDiffLine {
  type: "add" | "remove" | "context";
  content: string;
  oldLineNumber?: number;
  newLineNumber?: number;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function generateDiff(
  oldContent: string | null,
  newContent: string | null,
): DiffResult {
  const oldLines = oldContent != null ? oldContent.split("\n") : [];
  const newLines = newContent != null ? newContent.split("\n") : [];

  const lcs = computeLCS(oldLines, newLines);
  const lines = buildDiffLines(oldLines, newLines, lcs);

  const hunks = groupIntoHunks(lines);
  const stats = countStats(lines);

  return { hunks, stats };
}

export function generateUnifiedPreview(
  oldContent: string | null,
  newContent: string | null,
  maxLines: number = 10,
): string {
  const { hunks } = generateDiff(oldContent, newContent);

  let output = "";
  let lineCount = 0;

  for (const hunk of hunks) {
    if (lineCount >= maxLines) {
      output += `... (${hunk.lines.length} more lines)\n`;
      break;
    }
    for (const line of hunk.lines) {
      if (lineCount >= maxLines) {
        output += `... (truncated)\n`;
        return output;
      }
      const prefix =
        line.type === "add" ? "+" : line.type === "remove" ? "-" : " ";
      output += `${prefix}${line.content}\n`;
      lineCount++;
    }
  }

  return output;
}

// ---------------------------------------------------------------------------
// LCS (Longest Common Subsequence) diff algorithm
// ---------------------------------------------------------------------------

function computeLCS(a: string[], b: string[]): number[][] {
  const m = a.length;
  const n = b.length;

  // Space-optimized: only keep two rows
  let prev = new Uint32Array(n + 1);
  const dp: number[][] = [];

  for (let i = 0; i <= m; i++) {
    const curr = new Uint32Array(n + 1);
    const row: number[] = [];
    for (let j = 0; j <= n; j++) {
      if (i === 0 || j === 0) {
        curr[j] = 0;
      } else if (a[i - 1] === b[j - 1]) {
        curr[j] = prev[j - 1] + 1;
      } else {
        curr[j] = Math.max(prev[j], curr[j - 1]);
      }
      row.push(curr[j]);
    }
    dp.push(row);
    prev = curr;
  }

  return dp;
}

function buildDiffLines(
  oldLines: string[],
  newLines: string[],
  dp: number[][],
): TextDiffLine[] {
  const result: TextDiffLine[] = [];
  let i = oldLines.length;
  let j = newLines.length;

  // Backtrack through the DP table
  const ops: Array<{ type: "add" | "remove" | "context"; content: string }> = [];

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
      ops.push({ type: "context", content: oldLines[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      ops.push({ type: "add", content: newLines[j - 1] });
      j--;
    } else if (i > 0) {
      ops.push({ type: "remove", content: oldLines[i - 1] });
      i--;
    }
  }

  ops.reverse();

  // Assign line numbers
  let oldLine = 1;
  let newLine = 1;
  for (const op of ops) {
    const line: TextDiffLine = { type: op.type, content: op.content };
    if (op.type === "context") {
      line.oldLineNumber = oldLine++;
      line.newLineNumber = newLine++;
    } else if (op.type === "add") {
      line.newLineNumber = newLine++;
    } else {
      line.oldLineNumber = oldLine++;
    }
    result.push(line);
  }

  return result;
}

function groupIntoHunks(lines: TextDiffLine[]): TextDiffHunk[] {
  if (lines.length === 0) return [];

  const CONTEXT_PADDING = 3;
  const hunks: TextDiffHunk[] = [];

  // Find indices where changes occur
  const changeIndices: number[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].type !== "context") {
      changeIndices.push(i);
    }
  }

  if (changeIndices.length === 0) return [];

  // Group changes into hunks with context padding
  const groups: number[][] = [];
  let currentGroup = [changeIndices[0]];

  for (let i = 1; i < changeIndices.length; i++) {
    const prevIdx = changeIndices[i - 1];
    const currIdx = changeIndices[i];
    // Merge if gap between changes is less than 2 * CONTEXT_PADDING
    if (currIdx - prevIdx <= CONTEXT_PADDING * 2) {
      currentGroup.push(currIdx);
    } else {
      groups.push(currentGroup);
      currentGroup = [currIdx];
    }
  }
  groups.push(currentGroup);

  // Build hunks from groups
  for (const group of groups) {
    const firstChange = group[0];
    const lastChange = group[group.length - 1];

    const start = Math.max(0, firstChange - CONTEXT_PADDING);
    const end = Math.min(lines.length - 1, lastChange + CONTEXT_PADDING);

    const hunkLines = lines.slice(start, end + 1);

    // Calculate start lines by looking at context lines before this hunk
    let oldStart = 1;
    let newStart = 1;
    for (let i = 0; i < start; i++) {
      if (lines[i].type === "context" || lines[i].type === "remove") oldStart++;
      if (lines[i].type === "context" || lines[i].type === "add") newStart++;
    }

    const oldCount = hunkLines.filter(
      (l) => l.type === "context" || l.type === "remove",
    ).length;
    const newCount = hunkLines.filter(
      (l) => l.type === "context" || l.type === "add",
    ).length;

    hunks.push({
      oldStart,
      oldCount,
      newStart,
      newCount,
      lines: hunkLines,
    });
  }

  return hunks;
}

function countStats(
  lines: TextDiffLine[],
): { added: number; removed: number; unchanged: number } {
  let added = 0;
  let removed = 0;
  let unchanged = 0;

  for (const line of lines) {
    if (line.type === "add") added++;
    else if (line.type === "remove") removed++;
    else unchanged++;
  }

  return { added, removed, unchanged };
}
