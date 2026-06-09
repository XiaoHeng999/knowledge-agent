export const SKILL_CHANNELS = {
  LIST: "skill:list",
  GET: "skill:get",
  TOGGLE: "skill:toggle",
  EXECUTE: "skill:execute",
  CANCEL: "skill:cancel",
  METRICS: "skill:metrics",
  RATE: "skill:rate",
  REGISTER_DOMAIN: "skill:registerDomain",
} as const;

export type SkillType = "builtin" | "custom" | "domain";

export interface SkillInputField {
  name: string;
  type: "text" | "url" | "file" | "select";
  label: string;
  required: boolean;
  options?: string[];
}

export interface SkillDefinition {
  name: string;
  description: string;
  triggerConditions: string[];
  inputSchema: SkillInputField[];
  outputFormat: string;
  promptTemplate: string;
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

export interface SkillListRequest {
  domainId?: string;
}

export interface SkillListResponse {
  items: SkillInfo[];
}

export interface SkillExecuteRequest {
  skillId: string;
  domainId: string;
  input: string;
  modelId?: string;
}

export interface SkillToggleRequest {
  id: string;
  enabled: boolean;
}

export interface SkillRateRequest {
  skillId: string;
  rating: number;
}

export interface SkillRegisterDomainRequest {
  domainId: string;
  domainSlug: string;
}
