/**
 * Domain directory manager — creates and validates the on-disk directory
 * structure for a knowledge domain.
 *
 * Standard structure:
 *   domains/<slug>/
 *     config.yaml
 *     skills/
 *     tools/
 *     prompts/
 *     data/
 *       knowledge/
 *       inbox/
 */

import type { IFileSystemProvider } from "./provider";
import { getFileSystemProvider } from "./provider";
import {
  getDomainDir,
  DOMAIN_SUBPATHS,
  resolveDomainPath,
  type DomainSubpath,
} from "./paths";

// ---------------------------------------------------------------------------
// Directory structure definition
// ---------------------------------------------------------------------------

/** Ordered list of sub-directories that must exist for every domain. */
const DOMAIN_DIRECTORIES: DomainSubpath[] = [
  DOMAIN_SUBPATHS.SKILLS,
  DOMAIN_SUBPATHS.TOOLS,
  DOMAIN_SUBPATHS.PROMPTS,
  DOMAIN_SUBPATHS.KNOWLEDGE,
  DOMAIN_SUBPATHS.INBOX,
];

// ---------------------------------------------------------------------------
// Validation result
// ---------------------------------------------------------------------------

export interface DomainDirValidation {
  valid: boolean;
  exists: boolean;
  missingDirs: string[];
  hasConfig: boolean;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Create the full directory structure for a domain.
 * Safe to call multiple times — skips existing directories.
 */
export async function ensureDomainDir(
  domainSlug: string,
  fsProvider?: IFileSystemProvider,
): Promise<void> {
  const fs = fsProvider ?? getFileSystemProvider();

  for (const dir of DOMAIN_DIRECTORIES) {
    await fs.mkdirp(resolveDomainPath(domainSlug, dir));
  }
}

/**
 * Validate the directory structure of an existing domain.
 */
export async function validateDomainDir(
  domainSlug: string,
  fsProvider?: IFileSystemProvider,
): Promise<DomainDirValidation> {
  const fs = fsProvider ?? getFileSystemProvider();
  const domainPath = getDomainDir(domainSlug);

  const domainExists = await fs.exists(domainPath);
  if (!domainExists) {
    return { valid: false, exists: false, missingDirs: [...DOMAIN_DIRECTORIES], hasConfig: false };
  }

  const missingDirs: string[] = [];
  for (const dir of DOMAIN_DIRECTORIES) {
    const fullPath = resolveDomainPath(domainSlug, dir);
    if (!(await fs.exists(fullPath))) {
      missingDirs.push(dir);
    }
  }

  const configPath = resolveDomainPath(domainSlug, DOMAIN_SUBPATHS.CONFIG);
  const hasConfig = await fs.exists(configPath);

  return {
    valid: missingDirs.length === 0 && hasConfig,
    exists: true,
    missingDirs,
    hasConfig,
  };
}

/**
 * Write an initial config.yaml for a domain.
 * Does NOT overwrite an existing config.
 */
export async function initDomainConfig(
  domainSlug: string,
  config: Record<string, unknown>,
  fsProvider?: IFileSystemProvider,
): Promise<void> {
  const fs = fsProvider ?? getFileSystemProvider();
  const configPath = resolveDomainPath(domainSlug, DOMAIN_SUBPATHS.CONFIG);

  if (await fs.exists(configPath)) {
    return;
  }

  const yaml = serializeConfigYaml(config);
  await fs.writeFile(configPath, yaml);
}

/**
 * Read and parse a domain config.yaml into a simple key-value object.
 * Returns null if the file does not exist.
 */
export async function readDomainConfig(
  domainSlug: string,
  fsProvider?: IFileSystemProvider,
): Promise<Record<string, unknown> | null> {
  const fs = fsProvider ?? getFileSystemProvider();
  const configPath = resolveDomainPath(domainSlug, DOMAIN_SUBPATHS.CONFIG);

  if (!(await fs.exists(configPath))) {
    return null;
  }

  const raw = await fs.readFile(configPath);
  return parseConfigYaml(raw);
}

/**
 * Delete the entire domain directory tree.
 */
export async function removeDomainDir(
  domainSlug: string,
  fsProvider?: IFileSystemProvider,
): Promise<void> {
  const fs = fsProvider ?? getFileSystemProvider();
  const domainPath = getDomainDir(domainSlug);

  if (!(await fs.exists(domainPath))) {
    return;
  }

  await deleteRecursive(domainPath, fs);
}

// ---------------------------------------------------------------------------
// Minimal YAML helpers (avoids pulling in a full YAML library for simple configs)
// ---------------------------------------------------------------------------

function serializeConfigYaml(config: Record<string, unknown>): string {
  const lines: string[] = [];
  for (const [key, value] of Object.entries(config)) {
    if (Array.isArray(value)) {
      lines.push(`${key}:`);
      for (const item of value) {
        lines.push(`  - ${String(item)}`);
      }
    } else if (typeof value === "object" && value !== null) {
      lines.push(`${key}:`);
      for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
        lines.push(`  ${k}: ${String(v)}`);
      }
    } else {
      lines.push(`${key}: ${String(value)}`);
    }
  }
  return lines.join("\n") + "\n";
}

function parseConfigYaml(raw: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  let currentKey = "";
  let currentArray: string[] | null = null;

  for (const line of raw.split("\n")) {
    const trimmed = line.trimEnd();
    if (!trimmed || trimmed.startsWith("#")) continue;

    // Array item: "  - value"
    if (trimmed.startsWith("  - ") && currentArray !== null) {
      currentArray.push(trimmed.slice(4).trim());
      continue;
    }

    // Flush previous key
    if (currentKey) {
      result[currentKey] = currentArray ?? result[currentKey];
      currentKey = "";
      currentArray = null;
    }

    const colonIdx = trimmed.indexOf(":");
    if (colonIdx === -1) continue;

    const key = trimmed.slice(0, colonIdx).trim();
    const value = trimmed.slice(colonIdx + 1).trim();

    if (!value) {
      // Key with indented content (array or nested object)
      currentKey = key;
      currentArray = [];
      result[key] = currentArray;
    } else {
      result[key] = value;
    }
  }

  // Flush last key
  if (currentKey) {
    result[currentKey] = currentArray ?? result[currentKey];
  }

  return result;
}

async function deleteRecursive(dirPath: string, fs: IFileSystemProvider): Promise<void> {
  const entries = await fs.readdir(dirPath);
  for (const entry of entries) {
    const fullPath = `${dirPath}/${entry}`;
    const stat = await fs.stat(fullPath);
    if (stat.isDirectory) {
      await deleteRecursive(fullPath, fs);
    } else {
      await fs.deleteFile(fullPath);
    }
  }
  // Remove the now-empty directory via Node fs (provider only handles files).
  const nodeFs = await import("fs/promises");
  await nodeFs.rmdir(dirPath);
}
