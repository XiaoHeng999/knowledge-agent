/**
 * Markdown file parser — reads Markdown files with YAML frontmatter.
 *
 * Uses `gray-matter` to parse `---`-delimited frontmatter blocks into a
 * typed data and content tuple.
 */

import matter from "gray-matter";
import type { IFileSystemProvider } from "./provider";
import { getFileSystemProvider } from "./provider";

// ---------------------------------------------------------------------------
// Parsed result
// ---------------------------------------------------------------------------

export interface ParsedMarkdown<T = Record<string, unknown>> {
  /** YAML frontmatter parsed into a plain object. */
  frontmatter: T;
  /** Raw Markdown body (everything below the closing `---`). */
  content: string;
  /** Full raw file content. */
  raw: string;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Parse a Markdown file from disk, extracting YAML frontmatter.
 */
export async function parseMarkdownFile<T = Record<string, unknown>>(
  filePath: string,
  fsProvider?: IFileSystemProvider,
): Promise<ParsedMarkdown<T>> {
  const fs = fsProvider ?? getFileSystemProvider();
  const raw = await fs.readFile(filePath);
  return parseMarkdownString<T>(raw);
}

/**
 * Parse a Markdown string, extracting YAML frontmatter.
 */
export function parseMarkdownString<T = Record<string, unknown>>(
  raw: string,
): ParsedMarkdown<T> {
  const { data, content } = matter(raw);
  return {
    frontmatter: data as T,
    content,
    raw,
  };
}

/**
 * Serialize frontmatter data + Markdown content back into a string.
 */
export function serializeMarkdown<T = Record<string, unknown>>(
  frontmatter: T,
  content: string,
): string {
  return matter.stringify(content, frontmatter as object);
}

/**
 * Write a Markdown file with YAML frontmatter to disk.
 */
export async function writeMarkdownFile<T = Record<string, unknown>>(
  filePath: string,
  frontmatter: T,
  content: string,
  fsProvider?: IFileSystemProvider,
): Promise<void> {
  const fs = fsProvider ?? getFileSystemProvider();
  const serialized = serializeMarkdown(frontmatter, content);
  await fs.writeFile(filePath, serialized);
}

/**
 * Update only the frontmatter of an existing Markdown file, preserving the body.
 * Returns null if the file does not exist.
 */
export async function updateFrontmatter<T = Record<string, unknown>>(
  filePath: string,
  updates: Partial<T>,
  fsProvider?: IFileSystemProvider,
): Promise<ParsedMarkdown<T> | null> {
  const fs = fsProvider ?? getFileSystemProvider();

  if (!(await fs.exists(filePath))) {
    return null;
  }

  const parsed = await parseMarkdownFile<T>(filePath, fs);
  const merged = { ...parsed.frontmatter, ...updates } as T;
  await writeMarkdownFile(filePath, merged, parsed.content, fs);

  return {
    frontmatter: merged,
    content: parsed.content,
    raw: serializeMarkdown(merged, parsed.content),
  };
}
