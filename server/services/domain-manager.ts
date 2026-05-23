/**
 * DomainManager service — orchestrates domain CRUD, directory creation,
 * config parsing, and model binding.
 */
import { getDatabaseService } from "../db/index";
import type { DomainRow } from "../db/schema";
import type { DomainInfo, DomainConfig } from "../../src/lib/ipc/channels";
import { ensureDomainDir, initDomainConfig, removeDomainDir } from "../fs/domain-dirs";
import {
  DOMAIN_TEMPLATES,
  readConfig,
  writeConfig,
  toIpcDomainConfig,
  type DomainConfigFile,
} from "./domain-config";

// ---------------------------------------------------------------------------
// Slug generation
// ---------------------------------------------------------------------------

function nameToSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    || "domain";
}

function uniqueSlug(name: string, existingSlugs: Set<string>): string {
  let slug = nameToSlug(name);
  if (!existingSlugs.has(slug)) return slug;
  let i = 1;
  while (existingSlugs.has(`${slug}-${i}`)) i++;
  return `${slug}-${i}`;
}

// ---------------------------------------------------------------------------
// Row → DomainInfo mapping
// ---------------------------------------------------------------------------

function rowToInfo(row: DomainRow, knowledgeCount: number): DomainInfo {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? "",
    color: row.color,
    icon: row.icon ?? "folder",
    knowledgeCount,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ---------------------------------------------------------------------------
// Create domain
// ---------------------------------------------------------------------------

export async function createDomain(req: {
  name: string;
  description: string;
  color: string;
  icon: string;
  template?: string;
}): Promise<DomainInfo> {
  const db = getDatabaseService();

  // Check name uniqueness
  const existing = db.domains.findByName(req.name);
  if (existing) {
    throw new Error(`Domain with name "${req.name}" already exists`);
  }

  // Generate unique slug for directory
  const allDomains = db.domains.listAll();
  const existingSlugs = new Set(
    allDomains.map((d) => d.config_path?.split("/").filter(Boolean).pop() ?? ""),
  );
  const slug = uniqueSlug(req.name, existingSlugs);

  // Resolve template config
  let templateConfig: DomainConfigFile | null = null;
  if (req.template && DOMAIN_TEMPLATES[req.template]) {
    templateConfig = {
      ...DOMAIN_TEMPLATES[req.template].config,
      name: req.name,
      description: req.description,
      color: req.color,
      icon: req.icon,
    };
  }

  // Create domain directory structure
  await ensureDomainDir(slug);

  // Write config.yaml from template or defaults
  const configData: DomainConfigFile = templateConfig ?? {
    name: req.name,
    description: req.description,
    color: req.color,
    icon: req.icon,
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
  };
  await initDomainConfig(slug, configData as unknown as Record<string, unknown>);

  // Insert into DB
  const row = db.domains.create({
    name: req.name,
    description: req.description || null,
    color: req.color,
    icon: req.icon,
    config_path: `domains/${slug}`,
    default_expert_model: configData.models.expert,
    default_research_model: configData.models.research,
    default_summary_model: configData.models.summary,
    research_schedule: configData.research.schedule || null,
  } as unknown as Partial<DomainRow> & Record<string, unknown>);

  return rowToInfo(row, 0);
}

// ---------------------------------------------------------------------------
// List domains
// ---------------------------------------------------------------------------

export function listDomains(): DomainInfo[] {
  const db = getDatabaseService();
  const rows = db.domains.listAll();

  return rows.map((row) => {
    const count = db.db
      .prepare("SELECT COUNT(*) as cnt FROM knowledge_nodes WHERE domain_id = ?")
      .get(row.id) as { cnt: number };
    return rowToInfo(row, count.cnt);
  });
}

// ---------------------------------------------------------------------------
// Get single domain
// ---------------------------------------------------------------------------

export function getDomain(id: string): DomainInfo {
  const db = getDatabaseService();
  const row = db.domains.findById(id);
  if (!row) throw new Error(`Domain not found: ${id}`);

  const count = db.db
    .prepare("SELECT COUNT(*) as cnt FROM knowledge_nodes WHERE domain_id = ?")
    .get(id) as { cnt: number };

  return rowToInfo(row, count.cnt);
}

// ---------------------------------------------------------------------------
// Update domain
// ---------------------------------------------------------------------------

export async function updateDomain(req: {
  id: string;
  name?: string;
  description?: string;
  color?: string;
  icon?: string;
}): Promise<DomainInfo> {
  const db = getDatabaseService();
  const existing = db.domains.findById(req.id);
  if (!existing) throw new Error(`Domain not found: ${req.id}`);

  // Check name uniqueness if changing name
  if (req.name && req.name !== existing.name) {
    const dup = db.domains.findByName(req.name);
    if (dup && dup.id !== req.id) {
      throw new Error(`Domain with name "${req.name}" already exists`);
    }
  }

  const updateData: Record<string, unknown> = {};
  if (req.name !== undefined) updateData.name = req.name;
  if (req.description !== undefined) updateData.description = req.description || null;
  if (req.color !== undefined) updateData.color = req.color;
  if (req.icon !== undefined) updateData.icon = req.icon;

  const updated = db.domains.update(req.id, updateData);

  // Sync config.yaml name/color if they changed
  const slug = existing.config_path?.split("/").filter(Boolean).pop() ?? "";
  if (slug && (req.name || req.color || req.icon)) {
    try {
      const config = await readConfig(slug);
      if (config) {
        if (req.name) config.name = req.name;
        if (req.description !== undefined) config.description = req.description;
        if (req.color) config.color = req.color;
        if (req.icon) config.icon = req.icon;
        await writeConfig(slug, config);
      }
    } catch {
      // Config sync is best-effort, don't fail the update
    }
  }

  return getDomain(req.id);
}

// ---------------------------------------------------------------------------
// Delete domain (soft-delete via DB delete + directory retention)
// ---------------------------------------------------------------------------

export async function deleteDomain(id: string): Promise<void> {
  const db = getDatabaseService();
  const existing = db.domains.findById(id);
  if (!existing) throw new Error(`Domain not found: ${id}`);

  // Delete from DB (rows retained for 30-day recovery in future)
  db.domains.delete(id);

  // Note: we intentionally do NOT delete the domain directory on disk
  // so that data is recoverable for 30 days (per spec).
  // Directory cleanup is handled by a separate maintenance task.
}

// ---------------------------------------------------------------------------
// Get/update domain config (from config.yaml)
// ---------------------------------------------------------------------------

export async function getDomainConfig(id: string): Promise<DomainConfig> {
  const db = getDatabaseService();
  const row = db.domains.findById(id);
  if (!row) throw new Error(`Domain not found: ${id}`);

  const slug = row.config_path?.split("/").filter(Boolean).pop() ?? "";
  if (!slug) {
    return { models: {}, sources: [], frameworks: [], skills: [], tags: [] };
  }

  const config = await readConfig(slug);
  if (!config) {
    return { models: {}, sources: [], frameworks: [], skills: [], tags: [] };
  }

  return toIpcDomainConfig(config);
}

export async function updateDomainConfig(
  id: string,
  partial: Partial<DomainConfig>,
): Promise<DomainConfig> {
  const db = getDatabaseService();
  const row = db.domains.findById(id);
  if (!row) throw new Error(`Domain not found: ${id}`);

  const slug = row.config_path?.split("/").filter(Boolean).pop() ?? "";
  if (!slug) throw new Error("Domain has no valid config path");

  let config = await readConfig(slug);
  if (!config) {
    config = {
      name: row.name,
      description: row.description ?? "",
      color: row.color,
      icon: row.icon ?? "folder",
      models: { expert: null, research: null, summary: null },
      research: { schedule: "", maxDailyRuns: 1, maxCostPerRunUsd: 0.10, queryTemplates: [] },
      sources: [],
      frameworks: [],
      tags: [],
      skills: [],
    };
  }

  // Merge partial updates
  if (partial.models) {
    if (partial.models.expert !== undefined) config.models.expert = partial.models.expert || null;
    if (partial.models.research !== undefined) config.models.research = partial.models.research || null;
    if (partial.models.summary !== undefined) config.models.summary = partial.models.summary || null;
  }
  if (partial.tags) config.tags = partial.tags;
  if (partial.skills) config.skills = partial.skills;

  await writeConfig(slug, config);

  // Sync model defaults to DB
  if (partial.models) {
    db.domains.update(id, {
      default_expert_model: config.models.expert,
      default_research_model: config.models.research,
      default_summary_model: config.models.summary,
    } as unknown as Partial<DomainRow> & Record<string, unknown>);
  }

  return toIpcDomainConfig(config);
}
