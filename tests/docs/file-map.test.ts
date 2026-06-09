import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(__dirname, "../..");
const FILE_MAP_PATH = path.join(ROOT, "docs/file-map.md");

interface TreeNode {
  type: "file" | "directory";
  relPath: string;
}

function parseTreeFromMarkdown(content: string): TreeNode[] {
  const nodes: TreeNode[] = [];
  const lines = content.split("\n");
  const dirStack: string[] = [];
  let inCodeBlock = false;

  for (const line of lines) {
    if (line.trimStart().startsWith("```")) {
      inCodeBlock = !inCodeBlock;
      continue;
    }
    if (!inCodeBlock) continue;

    // Match tree lines: [│ ]   [├└]── name [padding # comment]
    const treeMatch = line.match(/^[│\s]*[├└]──\s+(\S+)/);
    if (!treeMatch) continue;

    const raw = treeMatch[1];

    const prefix = line.substring(0, line.search(/[├└]/));
    // Each "│   " or "    " segment = 1 depth level
    const depth = Math.round(prefix.length / 4);

    const isDir = raw.endsWith("/");
    const name = isDir ? raw.slice(0, -1) : raw;

    // Update directory stack
    dirStack.length = depth;
    if (isDir) {
      dirStack[depth] = name;
    }

    const relPath = isDir
      ? [...dirStack.slice(0, depth), name].join("/")
      : [...dirStack.slice(0, depth), name].join("/");

    nodes.push({ type: isDir ? "directory" : "file", relPath });
  }

  return nodes;
}

describe("file-map.md validation", () => {
  const content = fs.readFileSync(FILE_MAP_PATH, "utf-8");

  describe("no ghost files", () => {
    it("every file path in file-map exists on disk", () => {
      const nodes = parseTreeFromMarkdown(content);
      const files = nodes.filter((n) => n.type === "file");

      const missing: string[] = [];
      for (const file of files) {
        const absPath = path.join(ROOT, file.relPath);
        if (!fs.existsSync(absPath)) {
          missing.push(file.relPath);
        }
      }

      expect(missing, `Ghost files (listed but don't exist): ${missing.join(", ")}`).toEqual([]);
    });
  });

  describe("no undocumented source files", () => {
    const dirsToCheck = ["electron", "server", "src", "tests"];
    const extensions = [".ts", ".tsx"];

    it("every source file in key directories appears in file-map", () => {
      const nodes = parseTreeFromMarkdown(content);
      const documented = new Set(nodes.filter((n) => n.type === "file").map((n) => n.relPath));

      const undocumented: string[] = [];

      for (const dir of dirsToCheck) {
        const absDir = path.join(ROOT, dir);
        if (!fs.existsSync(absDir)) continue;
        walkDir(absDir, (relPath) => {
          if (!extensions.some((ext) => relPath.endsWith(ext))) return;
          if (relPath.includes("node_modules") || relPath.includes(".next") || relPath.includes("dist")) return;
          if (relPath.includes(".test.") || relPath.includes("__tests__")) return;
          // Prefix with the top-level directory to match file-map paths
          const fullPath = `${dir}/${relPath}`;
          if (!documented.has(fullPath)) {
            undocumented.push(fullPath);
          }
        });
      }

      expect(undocumented, `Undocumented source files: ${undocumented.join(", ")}`).toEqual([]);
    });
  });

  describe("directory structure", () => {
    it("directories in file-map exist on disk", () => {
      const nodes = parseTreeFromMarkdown(content);
      const dirs = nodes.filter((n) => n.type === "directory");

      const missing: string[] = [];
      for (const dir of dirs) {
        const absPath = path.join(ROOT, dir.relPath);
        if (!fs.existsSync(absPath)) {
          missing.push(dir.relPath);
        }
      }

      expect(missing, `Ghost directories: ${missing.join(", ")}`).toEqual([]);
    });

    it("quick-reference paths point to real files", () => {
      const paths = extractQuickRefPaths(content);
      const missing: string[] = [];
      for (const p of paths) {
        const absPath = path.join(ROOT, p);
        if (!fs.existsSync(absPath)) {
          missing.push(p);
        }
      }
      expect(missing, `Broken quick-ref paths: ${missing.join(", ")}`).toEqual([]);
    });
  });
});

function extractQuickRefPaths(content: string): string[] {
  const paths: string[] = [];
  const lines = content.split("\n");
  let inTable = false;
  for (const line of lines) {
    if (line.includes("场景") && line.includes("文件")) { inTable = true; continue; }
    if (inTable && line.startsWith("|")) {
      const codeBlockMatch = line.matchAll(/`([^`]+)`/g);
      for (const m of codeBlockMatch) {
        const raw = m[1];
        // Skip template placeholders
        if (raw.includes("<")) continue;
        // Extract file paths (contain / and .ts/.tsx/.css)
        if (raw.includes("/") && /\.(ts|tsx|css)/.test(raw)) {
          // Take the first path segment (before → or spaces)
          const firstPath = raw.split(/[→\s]/)[0];
          if (firstPath && /\.(ts|tsx|css)/.test(firstPath)) {
            paths.push(firstPath);
          }
        }
      }
    }
    if (inTable && !line.startsWith("|")) break;
  }
  return paths;
}

function walkDir(dir: string, cb: (relPath: string) => void, base?: string) {
  const b = base ?? dir;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".") || entry.name === "node_modules" || entry.name === ".next" || entry.name === "dist") continue;
    const full = path.join(dir, entry.name);
    const rel = path.relative(b, full).replace(/\\/g, "/");
    if (entry.isDirectory()) {
      walkDir(full, cb, b);
    } else {
      cb(rel);
    }
  }
}
