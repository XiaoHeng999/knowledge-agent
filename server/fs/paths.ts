/**
 * Cross-platform path utilities for AgentClaw.
 *
 * Uses Electron's `app.getPath()` to resolve platform-correct base directories:
 *   macOS  → ~/Library/Application Support/AgentClaw
 *   Windows → %APPDATA%/AgentClaw
 *   Linux  → ~/.config/AgentClaw
 */

import path from "path";
import { app } from "electron";

// ---------------------------------------------------------------------------
// Lazy path resolution — Electron `app` is only available after `ready`.
// ---------------------------------------------------------------------------

let _dataDir: string | null = null;

function ensureDataDir(): string {
  if (!_dataDir) {
    _dataDir = app.getPath("userData");
  }
  return _dataDir;
}

/** Reset cached paths (useful in tests). */
export function resetPathCache(): void {
  _dataDir = null;
}

// ---------------------------------------------------------------------------
// Public path helpers
// ---------------------------------------------------------------------------

/** Root data directory (userData). */
export function getDataDir(): string {
  return ensureDataDir();
}

/** Log directory. */
export function getLogDir(): string {
  return path.join(ensureDataDir(), "logs");
}

/** Temp directory. */
export function getTempDir(): string {
  return path.join(ensureDataDir(), "temp");
}

/** Base directory for all domain data. */
export function getDomainsDir(): string {
  return path.join(ensureDataDir(), "domains");
}

/** Directory for a specific domain. */
export function getDomainDir(domainSlug: string): string {
  return path.join(getDomainsDir(), domainSlug);
}

/** Sub-paths within a domain directory. */
export const DOMAIN_SUBPATHS = {
  CONFIG: "config.yaml",
  SKILLS: "skills",
  TOOLS: "tools",
  PROMPTS: "prompts",
  DATA: "data",
  KNOWLEDGE: "data/knowledge",
  INBOX: "data/inbox",
} as const;

export type DomainSubpath = (typeof DOMAIN_SUBPATHS)[keyof typeof DOMAIN_SUBPATHS];

/** Resolve a sub-path within a domain directory. */
export function resolveDomainPath(domainSlug: string, subpath: DomainSubpath | string): string {
  return path.join(getDomainDir(domainSlug), subpath);
}

/** Full path to the SQLite database file. */
export function getDatabasePath(): string {
  return path.join(ensureDataDir(), "agentclaw.db");
}
