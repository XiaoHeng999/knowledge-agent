/**
 * VersionControl service — git-based version tracking for domain data.
 * Uses the system git binary to manage commits, diffs, and rollbacks
 * in the application data directory.
 */

import { execFile } from "child_process";
import fs from "fs";
import path from "path";
import { getDataDir } from "../fs/paths";
import type {
  CommitInfo,
  FileDiff,
  DiffHunk,
  DiffLine,
  VcStatusResponse,
} from "../../src/lib/ipc/channels";

// ---------------------------------------------------------------------------
// Git helper
// ---------------------------------------------------------------------------

function git(args: string[], cwd?: string): Promise<string> {
  const workingDir = cwd ?? getDataDir();
  return new Promise((resolve, reject) => {
    execFile(
      "git",
      args,
      { cwd: workingDir, maxBuffer: 10 * 1024 * 1024, timeout: 15_000 },
      (error, stdout, stderr) => {
        if (error) {
          reject(new Error(`git ${args.join(" ")} failed: ${stderr || error.message}`));
          return;
        }
        resolve(stdout.trim());
      },
    );
  });
}

// ---------------------------------------------------------------------------
// Initialization
// ---------------------------------------------------------------------------

const GITIGNORE_CONTENT = `# Binary files
*.exe
*.dll
*.so
*.dylib
*.bin

# Embeddings cache
*.vec
*.index

# Temp files
temp/
*.tmp
*.bak

# Database (tracked via SQLite backup)
*.db
*.db-wal
*.db-shm

# Logs
logs/

# OS files
.DS_Store
Thumbs.db
`;

export async function initRepo(): Promise<VcStatusResponse> {
  const dataDir = getDataDir();
  const gitDir = path.join(dataDir, ".git");

  if (!fs.existsSync(gitDir)) {
    await fs.promises.writeFile(path.join(dataDir, ".gitignore"), GITIGNORE_CONTENT, "utf-8");

    await git(["init"]);
    await git(["config", "user.email", "agentclaw@local"]);
    await git(["config", "user.name", "AgentClaw"]);
    await git(["add", ".gitignore"]);
    await git(["commit", "-m", "Initial AgentClaw setup"]);
  }

  return getStatus();
}

// ---------------------------------------------------------------------------
// Auto-commit (pre-write hook)
// ---------------------------------------------------------------------------

export async function autoCommit(filePath: string, message: string): Promise<string> {
  const dataDir = getDataDir();
  const relativePath = path.relative(dataDir, filePath);

  await git(["add", "--", relativePath]);

  try {
    const output = await git(["commit", "-m", message]);
    const match = output.match(/\[[\w-]+ ([a-f0-9]+)\]/);
    return match ? match[1] : "";
  } catch {
    // No changes to commit — this is fine (e.g. identical content)
    return "";
  }
}

/** Pre-write auto-commit hook called before Agent write operations. */
export async function preWriteCommit(
  domainSlug: string,
  filePath: string,
  operation: string,
  description?: string,
): Promise<string> {
  const dataDir = getDataDir();
  const relativePath = path.relative(dataDir, filePath);
  const message = description ?? `${operation}: ${relativePath} in ${domainSlug}`;
  return autoCommit(filePath, message);
}

// ---------------------------------------------------------------------------
// History
// ---------------------------------------------------------------------------

export async function getHistory(
  filePath: string,
  limit: number = 50,
): Promise<CommitInfo[]> {
  const dataDir = getDataDir();
  const relativePath = path.relative(dataDir, filePath);

  const format = "%H|%h|%s|%an|%aI";
  const log = await git([
    "log", `--format=${format}`, `-n`, String(limit), "--", relativePath,
  ]);

  if (!log) return [];

  return log.split("\n").map((line) => {
    const [hash, shortHash, message, author, date] = line.split("|");
    return { hash, shortHash, message, author, date };
  });
}

// ---------------------------------------------------------------------------
// Diff
// ---------------------------------------------------------------------------

export async function getDiff(
  fromHash: string,
  toHash: string,
  filePath?: string,
): Promise<{ diffs: FileDiff[]; hasChanges: boolean }> {
  const args = ["diff", `${fromHash}..${toHash}`];
  if (filePath) {
    const dataDir = getDataDir();
    const relativePath = path.relative(dataDir, filePath);
    args.push("--", relativePath);
  }

  const rawDiff = await git(args);
  if (!rawDiff) return { diffs: [], hasChanges: false };

  return { diffs: parseUnifiedDiff(rawDiff), hasChanges: true };
}

// ---------------------------------------------------------------------------
// Rollback
// ---------------------------------------------------------------------------

export async function rollbackFile(
  filePath: string,
  targetHash: string,
): Promise<{ success: boolean; newCommitHash: string }> {
  const dataDir = getDataDir();
  const relativePath = path.relative(dataDir, filePath);

  // Pre-rollback commit (preserve current state)
  await git(["add", "--", relativePath]);
  try {
    await git(["commit", "-m", `pre-rollback: ${relativePath}`]);
  } catch {
    // No uncommitted changes to save
  }

  // Restore file to target version
  await git(["checkout", targetHash, "--", relativePath]);

  // Post-rollback commit
  await git(["add", "--", relativePath]);
  const shortHash = targetHash.substring(0, 8);
  const output = await git(["commit", "-m", `Rollback ${relativePath} to ${shortHash}`]);

  const match = output.match(/\[[\w-]+ ([a-f0-9]+)\]/);
  return { success: true, newCommitHash: match ? match[1] : "" };
}

// ---------------------------------------------------------------------------
// Status
// ---------------------------------------------------------------------------

export async function getStatus(): Promise<VcStatusResponse> {
  const dataDir = getDataDir();
  const gitDir = path.join(dataDir, ".git");

  if (!fs.existsSync(gitDir)) {
    return { initialized: false, branch: "", uncommittedChanges: 0 };
  }

  let branch = "main";
  try {
    branch = await git(["rev-parse", "--abbrev-ref", "HEAD"]);
  } catch {
    // Empty repo — HEAD not yet created
  }

  let uncommittedChanges = 0;
  try {
    const status = await git(["status", "--porcelain"]);
    uncommittedChanges = status ? status.split("\n").length : 0;
  } catch {
    // Ignore
  }

  return { initialized: true, branch, uncommittedChanges };
}

// ---------------------------------------------------------------------------
// Unified diff parser
// ---------------------------------------------------------------------------

function parseUnifiedDiff(rawDiff: string): FileDiff[] {
  const diffs: FileDiff[] = [];
  const lines = rawDiff.split("\n");
  let currentDiff: FileDiff | null = null;
  let currentHunk: DiffHunk | null = null;
  let oldLine = 0;
  let newLine = 0;

  for (const line of lines) {
    // New file diff header
    const diffMatch = line.match(/^diff --git a\/(.*) b\/(.*)$/);
    if (diffMatch) {
      if (currentHunk && currentDiff) currentDiff.hunks.push(currentHunk);
      currentDiff = { oldPath: diffMatch[1], newPath: diffMatch[2], hunks: [] };
      currentHunk = null;
      diffs.push(currentDiff);
      continue;
    }

    // Hunk header: @@ -oldStart,oldCount +newStart,newCount @@
    const hunkMatch = line.match(/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@(.*)$/);
    if (hunkMatch && currentDiff) {
      if (currentHunk) currentDiff.hunks.push(currentHunk);
      oldLine = parseInt(hunkMatch[1], 10);
      newLine = parseInt(hunkMatch[3], 10);
      currentHunk = {
        header: hunkMatch[0],
        oldStart: oldLine,
        oldCount: parseInt(hunkMatch[2] ?? "1", 10),
        newStart: newLine,
        newCount: parseInt(hunkMatch[4] ?? "1", 10),
        lines: [],
      };
      continue;
    }

    if (!currentHunk) continue;

    if (line.startsWith("+")) {
      currentHunk.lines.push({
        type: "add",
        content: line.substring(1),
        newLineNumber: newLine++,
      });
    } else if (line.startsWith("-")) {
      currentHunk.lines.push({
        type: "remove",
        content: line.substring(1),
        oldLineNumber: oldLine++,
      });
    } else if (line.startsWith(" ")) {
      currentHunk.lines.push({
        type: "context",
        content: line.substring(1),
        oldLineNumber: oldLine++,
        newLineNumber: newLine++,
      });
    }
  }

  if (currentHunk && currentDiff) currentDiff.hunks.push(currentHunk);

  return diffs;
}
