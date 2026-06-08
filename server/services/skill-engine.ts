/**
 * SkillEngine — SKILL.md parsing, registration, execution, and tracking.
 *
 * Skills are discovered from two sources:
 *   1. Built-in: resources/skills/<name>/SKILL.md
 *   2. Domain:   domains/<slug>/skills/<name>/SKILL.md
 */
import path from "path";
import { getDatabaseService } from "../db/index";
import type { SkillRow, SkillType } from "../db/schema";
import { getPiMonoWrapper } from "../pi-mono/instance";
import { resolveModelId } from "../lib/model-resolver";
import { parseMarkdownFile } from "../fs/markdown-parser";
import { getFileSystemProvider, type IFileSystemProvider } from "../fs/provider";
import { getDataDir, getDomainDir, DOMAIN_SUBPATHS } from "../fs/paths";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SkillDefinition {
  name: string;
  description: string;
  triggerConditions: string[];
  inputSchema: SkillInputField[];
  outputFormat: string;
  promptTemplate: string;
}

export interface SkillInputField {
  name: string;
  type: "text" | "url" | "file" | "select";
  label: string;
  required: boolean;
  options?: string[];
}

export interface SkillExecution {
  id: string;
  skillId: string;
  domainId: string;
  status: "running" | "completed" | "failed" | "cancelled";
  input: string;
  output: string | null;
  errorMessage: string | null;
  startedAt: string;
  completedAt: string | null;
  costUsd: number;
}

export interface SkillMetrics {
  skillId: string;
  invocationCount: number;
  successCount: number;
  successRate: number;
  avgExecutionTimeMs: number | null;
  avgCostUsd: number | null;
  avgUserRating: number | null;
}

export interface SkillInfo {
  id: string;
  name: string;
  description: string | null;
  skillType: SkillType;
  source: "builtin" | "domain";
  isEnabled: boolean;
  executionCount: number;
  successRate: number;
  domainId: string | null;
  filePath: string | null;
  definition: SkillDefinition | null;
}

// ---------------------------------------------------------------------------
// Execution sandbox state
// ---------------------------------------------------------------------------

const activeExecutions = new Map<string, { cancelled: boolean }>();

const SKILL_EXECUTION_TIMEOUT_MS = 120_000; // 2 minutes

// ---------------------------------------------------------------------------
// SKILL.md parsing
// ---------------------------------------------------------------------------

interface SkillMdFrontmatter {
  name?: string;
  description?: string;
  triggers?: string[];
  outputFormat?: string;
}

function parseSkillMd(raw: { frontmatter: SkillMdFrontmatter; content: string }): SkillDefinition {
  const { frontmatter, content } = raw;

  const name = frontmatter.name ?? "unnamed-skill";
  const description = frontmatter.description ?? "";
  const triggerConditions = frontmatter.triggers ?? [];
  const outputFormat = frontmatter.outputFormat ?? "text";

  // Parse input schema from content (## Input Schema section)
  const inputSchema = parseInputSchema(content);

  // Prompt template is the content after "## Prompt" or the full body
  const promptTemplate = extractPromptTemplate(content);

  return { name, description, triggerConditions, inputSchema, outputFormat, promptTemplate };
}

function parseInputSchema(content: string): SkillInputField[] {
  const fields: SkillInputField[] = [];
  const sectionMatch = content.match(/##\s*Input\s+Schema[\s\S]*?(?=##\s|$)/i);
  if (!sectionMatch) return fields;

  const section = sectionMatch[0];
  const fieldRegex = /-\s*name:\s*(\S+)[\s\S]*?type:\s*(\S+)[\s\S]*?label:\s*"([^"]+)"[\s\S]*?required:\s*(true|false)(?:[\s\S]*?options:\s*\[([^\]]*)\])?/gi;
  let match: RegExpExecArray | null;

  while ((match = fieldRegex.exec(section)) !== null) {
    fields.push({
      name: match[1],
      type: match[2] as SkillInputField["type"],
      label: match[3],
      required: match[4] === "true",
      options: match[5] ? match[5].split(",").map((s) => s.trim().replace(/"/g, "")) : undefined,
    });
  }

  return fields;
}

function extractPromptTemplate(content: string): string {
  const promptMatch = content.match(/##\s*Prompt\s*\n([\s\S]*)$/i);
  if (promptMatch) return promptMatch[1].trim();
  return content.trim();
}

// ---------------------------------------------------------------------------
// Row → IPC type mapping
// ---------------------------------------------------------------------------

function rowToSkillInfo(row: SkillRow, definition: SkillDefinition | null): SkillInfo {
  const successRate = row.execution_count > 0
    ? Math.round((row.success_count / row.execution_count) * 100) / 100
    : 0;

  return {
    id: row.id,
    name: row.name,
    description: row.description,
    skillType: row.skill_type,
    source: row.skill_type === "domain" ? "domain" : "builtin",
    isEnabled: row.is_enabled === 1,
    executionCount: row.execution_count,
    successRate,
    domainId: row.domain_id,
    filePath: row.file_path,
    definition,
  };
}

// ---------------------------------------------------------------------------
// Skill discovery & registration
// ---------------------------------------------------------------------------

async function discoverAndRegisterSkills(
  skillsDir: string,
  skillType: SkillType,
  domainId: string | null,
  fsProvider: IFileSystemProvider,
): Promise<number> {
  const db = getDatabaseService();
  let registered = 0;

  const dirExists = await fsProvider.exists(skillsDir);
  if (!dirExists) return 0;

  const entries = await fsProvider.readdir(skillsDir);

  for (const entry of entries) {
    const skillDir = path.join(skillsDir, entry);
    const stat = await fsProvider.stat(skillDir);
    if (!stat.isDirectory) continue;

    const skillMdPath = path.join(skillDir, "SKILL.md");
    const mdExists = await fsProvider.exists(skillMdPath);
    if (!mdExists) continue;

    try {
      const parsed = await parseMarkdownFile<SkillMdFrontmatter>(skillMdPath, fsProvider);
      const definition = parseSkillMd(parsed);

      db.skills.upsertByFilePath(skillMdPath, {
        name: definition.name,
        description: definition.description,
        skill_type: skillType,
        domain_id: domainId,
        file_path: skillMdPath,
        config: JSON.stringify(definition),
        is_enabled: 1,
      });

      registered++;
    } catch (err) {
      console.error(`[SkillEngine] Failed to parse ${skillMdPath}:`, err);
    }
  }

  return registered;
}

export async function registerBuiltinSkills(): Promise<number> {
  const fsProvider = getFileSystemProvider();
  const builtinDir = path.join(getDataDir(), "resources", "skills");
  return discoverAndRegisterSkills(builtinDir, "builtin", null, fsProvider);
}

export async function registerDomainSkills(domainId: string, domainSlug: string): Promise<number> {
  const fsProvider = getFileSystemProvider();
  const skillsDir = path.join(getDomainDir(domainSlug), DOMAIN_SUBPATHS.SKILLS);
  return discoverAndRegisterSkills(skillsDir, "domain", domainId, fsProvider);
}

// ---------------------------------------------------------------------------
// Public API: List skills
// ---------------------------------------------------------------------------

export function listSkills(domainId?: string): SkillInfo[] {
  const db = getDatabaseService();

  const builtins = db.skills.findBuiltins();
  const domainSkills = domainId ? db.skills.findByDomain(domainId) : [];

  const all = [...builtins, ...domainSkills];

  return all.map((row) => {
    let definition: SkillDefinition | null = null;
    if (row.config) {
      try {
        definition = JSON.parse(row.config);
      } catch { /* ignore */ }
    }
    return rowToSkillInfo(row, definition);
  });
}

export function listEnabledSkills(domainId?: string): SkillInfo[] {
  const db = getDatabaseService();
  const rows = db.skills.findEnabled(domainId);
  return rows.map((row) => {
    let definition: SkillDefinition | null = null;
    if (row.config) {
      try {
        definition = JSON.parse(row.config);
      } catch { /* ignore */ }
    }
    return rowToSkillInfo(row, definition);
  });
}

// ---------------------------------------------------------------------------
// Public API: Get single skill
// ---------------------------------------------------------------------------

export function getSkill(id: string): SkillInfo {
  const db = getDatabaseService();
  const row = db.skills.findById(id);
  if (!row) throw new Error(`Skill not found: ${id}`);

  let definition: SkillDefinition | null = null;
  if (row.config) {
    try {
      definition = JSON.parse(row.config);
    } catch { /* ignore */ }
  }
  return rowToSkillInfo(row, definition);
}

// ---------------------------------------------------------------------------
// Public API: Toggle skill enabled/disabled
// ---------------------------------------------------------------------------

export function toggleSkill(id: string, enabled: boolean): void {
  const db = getDatabaseService();
  const success = db.skills.setEnabled(id, enabled);
  if (!success) throw new Error(`Skill not found: ${id}`);
}

// ---------------------------------------------------------------------------
// Public API: Skill execution
// ---------------------------------------------------------------------------

export async function executeSkill(
  skillId: string,
  domainId: string,
  input: string,
  modelId?: string,
): Promise<SkillExecution> {
  const db = getDatabaseService();
  const wrapper = getPiMonoWrapper();

  const skillRow = db.skills.findById(skillId);
  if (!skillRow) throw new Error(`Skill not found: ${skillId}`);
  if (!skillRow.is_enabled) throw new Error(`Skill is disabled: ${skillRow.name}`);

  let definition: SkillDefinition | null = null;
  if (skillRow.config) {
    try { definition = JSON.parse(skillRow.config); } catch { /* ignore */ }
  }

  // Build prompt from template
  const prompt = buildSkillPrompt(definition, input, domainId);

  const executionId = `exec_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const executionState = { cancelled: false };
  activeExecutions.set(executionId, executionState);

  const startedAt = new Date().toISOString();
  let output = "";
  let costUsd = 0;
  let errorMessage: string | null = null;
  let status: SkillExecution["status"] = "running";

  try {
    const resolvedModelId = await resolveModelId(domainId, modelId);
    const sessionResult = await wrapper.createExpertSession(domainId, resolvedModelId);
    const sessionId = sessionResult.sessionId;

    // Set up timeout
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        executionState.cancelled = true;
        reject(new Error("Skill execution timed out"));
      }, SKILL_EXECUTION_TIMEOUT_MS);
    });

    const unsubscribe = sessionResult.session.subscribe((event) => {
      if (executionState.cancelled) return;
      if (event.type === "message_update") {
        const assistantEvent = event.assistantMessageEvent;
        if (assistantEvent && "textDelta" in assistantEvent) {
          output += (assistantEvent as { textDelta: string }).textDelta;
        }
      }
    });

    try {
      await Promise.race([
        sessionResult.session.prompt(prompt),
        timeoutPromise,
      ]);
    } finally {
      unsubscribe();
      wrapper.destroySession(sessionId);
    }

    if (executionState.cancelled) {
      status = "cancelled";
    } else {
      status = "completed";

      // Estimate cost
      const models = await wrapper.listAvailableModels();
      const model = models.find((m) => m.id === resolvedModelId);
      if (model) {
        const inputTokens = Math.ceil(prompt.length / 4);
        const outputTokens = Math.ceil(output.length / 4);
        costUsd =
          (inputTokens / 1_000_000) * model.costPerMillionInput +
          (outputTokens / 1_000_000) * model.costPerMillionOutput;
      }

      db.skills.incrementExecution(skillId, true);
    }
  } catch (err) {
    status = "failed";
    errorMessage = err instanceof Error ? err.message : String(err);
    db.skills.incrementExecution(skillId, false);
  } finally {
    activeExecutions.delete(executionId);
  }

  const completedAt = new Date().toISOString();

  db.skills.insertExecution({
    id: executionId,
    skill_id: skillId,
    domain_id: domainId,
    status,
    started_at: startedAt,
    completed_at: completedAt,
    cost_usd: costUsd,
    error_message: errorMessage,
  });

  return {
    id: executionId,
    skillId,
    domainId,
    status,
    input,
    output: status === "completed" ? output : null,
    errorMessage,
    startedAt,
    completedAt,
    costUsd,
  };
}

// ---------------------------------------------------------------------------
// Public API: Cancel running skill execution
// ---------------------------------------------------------------------------

export function cancelExecution(executionId: string): boolean {
  const state = activeExecutions.get(executionId);
  if (!state) return false;
  state.cancelled = true;
  return true;
}

// ---------------------------------------------------------------------------
// Public API: Skill effectiveness metrics
// ---------------------------------------------------------------------------

export function getSkillMetrics(skillId: string): SkillMetrics {
  const db = getDatabaseService();
  const row = db.skills.findById(skillId);
  if (!row) throw new Error(`Skill not found: ${skillId}`);

  return {
    skillId: row.id,
    invocationCount: row.execution_count,
    successCount: row.success_count,
    successRate: row.execution_count > 0
      ? Math.round((row.success_count / row.execution_count) * 100) / 100
      : 0,
    avgExecutionTimeMs: db.skills.getAvgExecutionTimeMs(skillId),
    avgCostUsd: db.skills.getAvgCostUsd(skillId),
    avgUserRating: row.avg_user_rating,
  };
}

// ---------------------------------------------------------------------------
// Public API: Rate a skill execution
// ---------------------------------------------------------------------------

export function rateSkill(skillId: string, rating: number): void {
  const db = getDatabaseService();
  if (rating < 1 || rating > 5) throw new Error("Rating must be between 1 and 5");
  db.skills.updateRating(skillId, rating);
}

// ---------------------------------------------------------------------------
// Prompt building
// ---------------------------------------------------------------------------

function buildSkillPrompt(
  definition: SkillDefinition | null,
  userInput: string,
  domainId: string,
): string {
  const parts: string[] = [];

  if (definition) {
    parts.push(`You are executing the "${definition.name}" skill.`);
    parts.push(`Description: ${definition.description}`);
    if (definition.outputFormat) {
      parts.push(`Expected output format: ${definition.outputFormat}`);
    }
    parts.push("");
    parts.push("## Skill Instructions");
    parts.push(definition.promptTemplate);
    parts.push("");
  } else {
    parts.push("Execute the following skill task.");
    parts.push("");
  }

  parts.push("## Domain Context");
  parts.push(`Domain ID: ${domainId}`);
  parts.push("");

  parts.push("## User Input");
  parts.push(userInput);

  return parts.join("\n");
}

// ---------------------------------------------------------------------------
// Initializer — called on app startup
// ---------------------------------------------------------------------------

export async function initializeSkillEngine(): Promise<void> {
  const builtinCount = await registerBuiltinSkills();
  if (builtinCount > 0) {
    console.log(`[SkillEngine] Registered ${builtinCount} built-in skills`);
  }
}
