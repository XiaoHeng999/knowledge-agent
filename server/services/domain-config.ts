/**
 * Domain config.yaml reader/writer — parses and serializes domain configuration
 * files with structured type definitions and validation.
 */
import type { DomainConfig } from "../../src/lib/ipc/channels";
import { getFileSystemProvider } from "../fs/provider";
import { resolveDomainPath, DOMAIN_SUBPATHS } from "../fs/paths";
import type { IFileSystemProvider } from "../fs/provider";

// ---------------------------------------------------------------------------
// Typed config structure (internal, richer than IPC DomainConfig)
// ---------------------------------------------------------------------------

export interface DomainConfigFile {
  name: string;
  description: string;
  color: string;
  icon: string;
  models: {
    expert: string | null;
    research: string | null;
    summary: string | null;
  };
  research: {
    schedule: string;
    maxDailyRuns: number;
    maxCostPerRunUsd: number;
    queryTemplates: string[];
  };
  sources: Array<{
    name: string;
    type: string;
    url: string;
    pollingIntervalHours: number;
    autoImport: boolean;
  }>;
  frameworks: Array<{
    type: string;
    enabled: boolean;
    schedule: string;
  }>;
  customFramework: CustomFrameworkConfig | null;
  tags: string[];
  skills: string[];
}

export interface CustomFrameworkConfig {
  name: string;
  description: string;
  dimensions: string[];
  scoringPrompt: string;
}

// ---------------------------------------------------------------------------
// Template definitions
// ---------------------------------------------------------------------------

export const DOMAIN_TEMPLATES: Record<string, { label: string; config: DomainConfigFile }> = {
  "ai-ml": {
    label: "AI & Machine Learning",
    config: {
      name: "AI & Machine Learning",
      description: "Artificial intelligence and machine learning research domain",
      color: "#7aa2f7",
      icon: "robot",
      models: { expert: null, research: null, summary: null },
      research: {
        schedule: "0 9 * * 1-5",
        maxDailyRuns: 2,
        maxCostPerRunUsd: 0.10,
        queryTemplates: [
          "What are the latest developments in {topic}?",
          "Summarize recent papers about {topic}",
          "Compare approaches to {topic}",
        ],
      },
      sources: [
        { name: "arXiv cs.AI", type: "rss", url: "https://rss.arxiv.org/rss/cs.AI", pollingIntervalHours: 24, autoImport: false },
        { name: "arXiv cs.LG", type: "rss", url: "https://rss.arxiv.org/rss/cs.LG", pollingIntervalHours: 24, autoImport: false },
        { name: "Hugging Face Blog", type: "rss", url: "https://huggingface.co/blog/feed.xml", pollingIntervalHours: 48, autoImport: false },
        { name: "Papers With Code", type: "rss", url: "https://paperswithcode.com/rss", pollingIntervalHours: 48, autoImport: false },
      ],
      frameworks: [
        { type: "trl", enabled: true, schedule: "0 10 1 * *" },
        { type: "hype_cycle", enabled: true, schedule: "0 10 1 * *" },
      ],
      tags: ["machine-learning", "deep-learning", "nlp", "computer-vision", "transformers", "llm", "generative-ai"],
      skills: ["paper-summarizer", "trend-analyzer", "connection-finder"],
    },
  },
  "web-dev": {
    label: "Web Development",
    config: {
      name: "Web Development",
      description: "Frontend and backend web development technologies",
      color: "#22c55e",
      icon: "code",
      models: { expert: null, research: null, summary: null },
      research: {
        schedule: "0 9 * * 1-5",
        maxDailyRuns: 2,
        maxCostPerRunUsd: 0.08,
        queryTemplates: [
          "What's new in {topic} this week?",
          "Best practices for {topic} in {year}",
          "Compare {topic} alternatives",
        ],
      },
      sources: [
        { name: "GitHub Trending (TypeScript)", type: "rss", url: "https://mshibanami.github.io/GitHubTrendingRSS/daily/typescript.xml", pollingIntervalHours: 24, autoImport: false },
        { name: "JavaScript Weekly", type: "rss", url: "https://javascriptweekly.com/rss", pollingIntervalHours: 168, autoImport: false },
        { name: "CSS-Tricks", type: "rss", url: "https://css-tricks.com/feed/", pollingIntervalHours: 48, autoImport: false },
        { name: "Dev.to (WebDEV)", type: "rss", url: "https://dev.to/feed/tag/webdev", pollingIntervalHours: 48, autoImport: false },
      ],
      frameworks: [{ type: "competitive_landscape", enabled: true, schedule: "0 10 1 * *" }],
      tags: ["javascript", "typescript", "react", "nextjs", "css", "web-performance", "accessibility"],
      skills: ["trend-analyzer", "connection-finder"],
    },
  },
  "product-design": {
    label: "Product & Design",
    config: {
      name: "Product & Design",
      description: "Product design, UX research, and design systems",
      color: "#f472b6",
      icon: "palette",
      models: { expert: null, research: null, summary: null },
      research: {
        schedule: "0 10 * * 1",
        maxDailyRuns: 1,
        maxCostPerRunUsd: 0.08,
        queryTemplates: [
          "Latest trends in {topic}",
          "Case studies about {topic}",
          "Design patterns for {topic}",
        ],
      },
      sources: [
        { name: "Smashing Magazine", type: "rss", url: "https://www.smashingmagazine.com/feed/", pollingIntervalHours: 48, autoImport: false },
        { name: "UX Collective", type: "rss", url: "https://uxdesign.cc/feed", pollingIntervalHours: 48, autoImport: false },
        { name: "Nielsen Norman Group", type: "rss", url: "https://www.nngroup.com/feed/rss/", pollingIntervalHours: 168, autoImport: false },
      ],
      frameworks: [{ type: "competitive_landscape", enabled: true, schedule: "0 10 1 * *" }],
      tags: ["ux-design", "ui-design", "design-systems", "user-research", "accessibility", "prototyping"],
      skills: ["trend-analyzer", "connection-finder"],
    },
  },
  "business-strategy": {
    label: "Business Strategy",
    config: {
      name: "Business Strategy",
      description: "Market research, competitive analysis, and business strategy",
      color: "#f9bd2b",
      icon: "chart",
      models: { expert: null, research: null, summary: null },
      research: {
        schedule: "0 9 * * 1",
        maxDailyRuns: 1,
        maxCostPerRunUsd: 0.10,
        queryTemplates: [
          "Market trends in {topic}",
          "Competitive landscape for {topic}",
          "Strategic implications of {topic}",
        ],
      },
      sources: [
        { name: "Harvard Business Review", type: "rss", url: "https://hbr.org/feed", pollingIntervalHours: 168, autoImport: false },
        { name: "TechCrunch", type: "rss", url: "https://techcrunch.com/feed/", pollingIntervalHours: 24, autoImport: false },
      ],
      frameworks: [
        { type: "competitive_landscape", enabled: true, schedule: "0 10 1 * *" },
        { type: "trl", enabled: true, schedule: "0 10 15 * *" },
      ],
      tags: ["strategy", "market-analysis", "competitive-intelligence", "product-management", "growth"],
      skills: ["trend-analyzer", "connection-finder", "domain-expert"],
    },
  },
  custom: {
    label: "Custom",
    config: {
      name: "",
      description: "",
      color: "#a9b1d6",
      icon: "folder",
      models: { expert: null, research: null, summary: null },
      research: {
        schedule: "",
        maxDailyRuns: 1,
        maxCostPerRunUsd: 0.10,
        queryTemplates: [],
      },
      sources: [],
      frameworks: [],
      tags: [],
      skills: [],
    },
  },
};

export const TEMPLATE_LIST = Object.entries(DOMAIN_TEMPLATES).map(([key, val]) => ({
  id: key,
  label: val.label,
  config: val.config,
}));

// ---------------------------------------------------------------------------
// Config read / write
// ---------------------------------------------------------------------------

export async function readConfig(
  domainSlug: string,
  fsProvider?: IFileSystemProvider,
): Promise<DomainConfigFile | null> {
  const fs = fsProvider ?? getFileSystemProvider();
  const configPath = resolveDomainPath(domainSlug, DOMAIN_SUBPATHS.CONFIG);

  if (!(await fs.exists(configPath))) {
    return null;
  }

  const raw = await fs.readFile(configPath);
  return parseConfigYaml(raw);
}

export async function writeConfig(
  domainSlug: string,
  config: DomainConfigFile,
  fsProvider?: IFileSystemProvider,
): Promise<void> {
  const fs = fsProvider ?? getFileSystemProvider();
  const configPath = resolveDomainPath(domainSlug, DOMAIN_SUBPATHS.CONFIG);
  const yaml = serializeConfigYaml(config);
  await fs.writeFile(configPath, yaml);
}

// ---------------------------------------------------------------------------
// Convert to IPC-safe DomainConfig (for renderer)
// ---------------------------------------------------------------------------

export function toIpcDomainConfig(config: DomainConfigFile): DomainConfig {
  return {
    models: {
      ...(config.models.expert && { expert: config.models.expert }),
      ...(config.models.research && { research: config.models.research }),
      ...(config.models.summary && { summary: config.models.summary }),
    },
    sources: config.sources.map((s) => s.name),
    frameworks: config.frameworks.map((f) => f.type),
    skills: config.skills,
    tags: config.tags,
  };
}

// ---------------------------------------------------------------------------
// Minimal YAML parser/serializer (domain config is simple enough)
// ---------------------------------------------------------------------------

export function parseConfigYaml(raw: string): DomainConfigFile {
  const parsed = parseSimpleYaml(raw);

  return {
    name: String(parsed.name ?? ""),
    description: String(parsed.description ?? ""),
    color: String(parsed.color ?? "#a9b1d6"),
    icon: String(parsed.icon ?? "folder"),
    models: {
      expert: asNullableString(parsed, "models.expert"),
      research: asNullableString(parsed, "models.research"),
      summary: asNullableString(parsed, "models.summary"),
    },
    research: {
      schedule: String(((parsed.research as Record<string, unknown>)?.schedule) ?? ""),
      maxDailyRuns: Number(((parsed.research as Record<string, unknown>)?.max_daily_runs) ?? 1),
      maxCostPerRunUsd: Number(((parsed.research as Record<string, unknown>)?.max_cost_per_run_usd) ?? 0.10),
      queryTemplates: asStringArray((parsed.research as Record<string, unknown>)?.query_templates),
    },
    sources: asSourceArray(parsed.sources),
    frameworks: asFrameworkArray(parsed.frameworks),
    customFramework: asCustomFramework(parsed.custom_framework),
    tags: asStringArray(parsed.tags),
    skills: asStringArray(parsed.skills),
  };
}

function parseSimpleYaml(raw: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const lines = raw.split("\n");
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trimEnd();
    if (!trimmed || trimmed.startsWith("#")) { i++; continue; }

    const colonIdx = trimmed.indexOf(":");
    if (colonIdx === -1) { i++; continue; }

    const key = trimmed.slice(0, colonIdx).trim();
    const value = trimmed.slice(colonIdx + 1).trim();
    const indent = line.length - line.trimStart().length;

    if (!value) {
      // Peek ahead for nested content
      const nested = collectNested(lines, i + 1, indent + 2);
      if (nested.length > 0 && nested[0].line.trimStart().startsWith("- ")) {
        // Array
        result[key] = parseArrayEntries(nested.map((n) => n.line));
        i = nested[nested.length - 1].index + 1;
      } else if (nested.length > 0) {
        // Object
        result[key] = parseSimpleYaml(nested.map((n) => n.line).join("\n"));
        i = nested[nested.length - 1].index + 1;
      } else {
        result[key] = null;
        i++;
      }
    } else {
      result[key] = parseScalar(value);
      i++;
    }
  }

  return result;
}

function collectNested(lines: string[], startIdx: number, minIndent: number): Array<{ line: string; index: number }> {
  const result: Array<{ line: string; index: number }> = [];
  for (let j = startIdx; j < lines.length; j++) {
    const l = lines[j];
    if (l.trim() === "" || l.trim().startsWith("#")) continue;
    const ind = l.length - l.trimStart().length;
    if (ind < minIndent) break;
    result.push({ line: l, index: j });
  }
  return result;
}

function parseArrayEntries(lines: string[]): unknown[] {
  const result: unknown[] = [];
  for (const line of lines) {
    const trimmed = line.trimStart();
    if (trimmed.startsWith("- ")) {
      const val = trimmed.slice(2).trim();
      // Check if it's a multi-line object entry (e.g. "- name: foo")
      if (val.includes(":") && !val.startsWith('"') && !val.startsWith("'")) {
        result.push(parseSimpleYaml(val));
      } else {
        result.push(parseScalar(val));
      }
    }
  }
  return result;
}

function parseScalar(val: string): unknown {
  if (val === "null" || val === "~") return null;
  if (val === "true") return true;
  if (val === "false") return false;
  if (/^-?\d+(\.\d+)?$/.test(val)) return Number(val);
  // Strip quotes
  if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
    return val.slice(1, -1);
  }
  return val;
}

// ---------------------------------------------------------------------------
// YAML serializer
// ---------------------------------------------------------------------------

export function serializeConfigYaml(config: DomainConfigFile): string {
  const lines: string[] = [];
  lines.push(`name: ${quoteYaml(config.name)}`);
  lines.push(`description: ${quoteYaml(config.description)}`);
  lines.push(`color: ${quoteYaml(config.color)}`);
  lines.push(`icon: ${quoteYaml(config.icon)}`);
  lines.push("");
  lines.push("models:");
  lines.push(`  expert: ${nullableYaml(config.models.expert)}`);
  lines.push(`  research: ${nullableYaml(config.models.research)}`);
  lines.push(`  summary: ${nullableYaml(config.models.summary)}`);
  lines.push("");
  lines.push("research:");
  lines.push(`  schedule: ${quoteYaml(config.research.schedule)}`);
  lines.push(`  max_daily_runs: ${config.research.maxDailyRuns}`);
  lines.push(`  max_cost_per_run_usd: ${config.research.maxCostPerRunUsd}`);
  lines.push("  query_templates:");
  for (const t of config.research.queryTemplates) {
    lines.push(`    - ${quoteYaml(t)}`);
  }
  if (config.research.queryTemplates.length === 0) lines.push("    []");
  lines.push("");
  lines.push("sources:");
  for (const s of config.sources) {
    lines.push(`  - name: ${quoteYaml(s.name)}`);
    lines.push(`    type: ${quoteYaml(s.type)}`);
    lines.push(`    url: ${quoteYaml(s.url)}`);
    lines.push(`    polling_interval_hours: ${s.pollingIntervalHours}`);
    lines.push(`    auto_import: ${s.autoImport}`);
  }
  if (config.sources.length === 0) lines.push("  []");
  lines.push("");
  lines.push("frameworks:");
  for (const f of config.frameworks) {
    lines.push(`  - type: ${quoteYaml(f.type)}`);
    lines.push(`    enabled: ${f.enabled}`);
    lines.push(`    schedule: ${quoteYaml(f.schedule)}`);
  }
  if (config.frameworks.length === 0) lines.push("  []");
  lines.push("");
  if (config.customFramework) {
    lines.push("custom_framework:");
    lines.push(`  name: ${quoteYaml(config.customFramework.name)}`);
    lines.push(`  description: ${quoteYaml(config.customFramework.description)}`);
    lines.push("  dimensions:");
    for (const d of config.customFramework.dimensions) {
      lines.push(`    - ${quoteYaml(d)}`);
    }
    if (config.customFramework.dimensions.length === 0) lines.push("    []");
    lines.push(`  scoring_prompt: ${quoteYaml(config.customFramework.scoringPrompt)}`);
    lines.push("");
  }
  lines.push("tags:");
  for (const t of config.tags) {
    lines.push(`  - ${quoteYaml(t)}`);
  }
  if (config.tags.length === 0) lines.push("  []");
  lines.push("");
  lines.push("skills:");
  for (const s of config.skills) {
    lines.push(`  - ${quoteYaml(s)}`);
  }
  if (config.skills.length === 0) lines.push("  []");
  lines.push("");
  return lines.join("\n");
}

function quoteYaml(val: string): string {
  if (!val) return '""';
  if (/[:#{}[\],&*?|>!%@`]/.test(val) || val.includes(" ")) return `"${val}"`;
  return val;
}

function nullableYaml(val: string | null): string {
  return val ?? "null";
}

// ---------------------------------------------------------------------------
// Type helpers
// ---------------------------------------------------------------------------

function asNullableString(obj: Record<string, unknown>, path: string): string | null {
  const parts = path.split(".");
  let current: unknown = obj;
  for (const p of parts) {
    if (current == null || typeof current !== "object") return null;
    current = (current as Record<string, unknown>)[p];
  }
  if (current == null || current === "null") return null;
  return String(current);
}

function asStringArray(val: unknown): string[] {
  if (!Array.isArray(val)) return [];
  return val.map((v) => {
    if (typeof v === "string") return v;
    return String(v);
  });
}

function asSourceArray(val: unknown): DomainConfigFile["sources"] {
  if (!Array.isArray(val)) return [];
  return val.map((v) => {
    if (typeof v === "object" && v !== null) {
      const obj = v as Record<string, unknown>;
      return {
        name: String(obj.name ?? ""),
        type: String(obj.type ?? "rss"),
        url: String(obj.url ?? ""),
        pollingIntervalHours: Number(obj.polling_interval_hours ?? obj.pollingIntervalHours ?? 24),
        autoImport: Boolean(obj.auto_import ?? obj.autoImport ?? false),
      };
    }
    return { name: String(v), type: "rss", url: "", pollingIntervalHours: 24, autoImport: false };
  });
}

function asFrameworkArray(val: unknown): DomainConfigFile["frameworks"] {
  if (!Array.isArray(val)) return [];
  return val.map((v) => {
    if (typeof v === "object" && v !== null) {
      const obj = v as Record<string, unknown>;
      return {
        type: String(obj.type ?? ""),
        enabled: Boolean(obj.enabled ?? true),
        schedule: String(obj.schedule ?? ""),
      };
    }
    return { type: String(v), enabled: true, schedule: "" };
  });
}

function asCustomFramework(val: unknown): CustomFrameworkConfig | null {
  if (!val || typeof val !== "object") return null;
  const obj = val as Record<string, unknown>;
  return {
    name: String(obj.name ?? ""),
    description: String(obj.description ?? ""),
    dimensions: asStringArray(obj.dimensions),
    scoringPrompt: String(obj.scoring_prompt ?? obj.scoringPrompt ?? ""),
  };
}
