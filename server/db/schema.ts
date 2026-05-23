/**
 * Database schema — TypeScript types + raw SQL for all tables.
 * The actual table creation is handled by migrations (001_initial_schema.ts).
 * This module serves as the single source of truth for column names and types.
 */

// ---------------------------------------------------------------------------
// Domain types mapped to DB columns
// ---------------------------------------------------------------------------

export interface DomainRow {
  id: string;
  name: string;
  description: string | null;
  color: string;
  icon: string | null;
  config_path: string;
  default_expert_model: string | null;
  default_research_model: string | null;
  default_summary_model: string | null;
  research_schedule: string | null;
  created_at: string;
  updated_at: string;
}

export type KnowledgeNodeType =
  | "concept"
  | "technology"
  | "person"
  | "event"
  | "decision"
  | "resource"
  | "question";

export type KnowledgeNodeStatus = "active" | "archived" | "draft" | "deprecated";

export interface KnowledgeNodeRow {
  id: string;
  domain_id: string;
  title: string;
  content: string | null;
  summary: string | null;
  node_type: KnowledgeNodeType;
  status: KnowledgeNodeStatus;
  comprehension_score: number;
  frontmatter: string | null;
  source_ids: string | null;
  created_at: string;
  updated_at: string;
}

export type EdgeType =
  | "related"
  | "depends_on"
  | "derived_from"
  | "contradicts"
  | "supports"
  | "part_of"
  | "precedes";

export interface KnowledgeEdgeRow {
  id: string;
  source_node_id: string;
  target_node_id: string;
  edge_type: EdgeType;
  weight: number;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export type SessionType = "expert" | "research" | "import";
export type ConversationStatus = "active" | "archived";

export interface ConversationRow {
  id: string;
  domain_id: string;
  title: string | null;
  model_id: string | null;
  session_type: SessionType;
  status: ConversationStatus;
  created_at: string;
  updated_at: string;
}

export type MessageRole = "user" | "assistant" | "system";

export interface MessageRow {
  id: string;
  conversation_id: string;
  parent_id: string | null;
  role: MessageRole;
  content: string;
  model_id: string | null;
  token_count: number | null;
  cost_usd: number | null;
  metadata: string | null;
  branch_index: number;
  created_at: string;
}

export type InboxSourceType = "url" | "pdf" | "note" | "rss" | "import";
export type InboxItemStatus = "pending" | "accepted" | "rejected" | "processing";

export interface InboxItemRow {
  id: string;
  source_type: InboxSourceType;
  source_url: string | null;
  raw_content: string | null;
  ai_summary: string | null;
  suggested_domain_id: string | null;
  suggested_tags: string | null;
  status: InboxItemStatus;
  domain_id: string | null;
  knowledge_node_id: string | null;
  created_at: string;
  updated_at: string;
}

export type ImportType = "url" | "pdf" | "rss" | "batch";
export type ImportStatus = "pending" | "processing" | "completed" | "failed" | "partial";

export interface ImportRow {
  id: string;
  domain_id: string | null;
  import_type: ImportType;
  source_url: string | null;
  file_path: string | null;
  status: ImportStatus;
  total_items: number;
  processed_items: number;
  failed_items: number;
  error_message: string | null;
  metadata: string | null;
  created_at: string;
  updated_at: string;
}

export type ResearchTriggerType = "scheduled" | "manual" | "slash_command";
export type ResearchRunStatus = "running" | "completed" | "failed" | "cancelled";

export interface ResearchRunRow {
  id: string;
  domain_id: string;
  trigger_type: ResearchTriggerType;
  model_id: string | null;
  status: ResearchRunStatus;
  query: string | null;
  findings_summary: string | null;
  knowledge_nodes_created: number;
  cost_usd: number;
  token_count: number;
  error_message: string | null;
  started_at: string;
  completed_at: string | null;
  created_at: string;
}

export type PredictionStatus = "pending" | "confirmed" | "refuted" | "expired";

export interface PredictionRow {
  id: string;
  domain_id: string;
  content: string;
  confidence: number;
  predicted_date: string | null;
  status: PredictionStatus;
  actual_outcome: string | null;
  source_node_ids: string | null;
  reasoning: string | null;
  verified_at: string | null;
  created_at: string;
  updated_at: string;
}

export type DecisionStatus = "proposed" | "accepted" | "deprecated" | "superseded";

export interface DecisionRow {
  id: string;
  domain_id: string;
  title: string;
  decision_number: number;
  context: string;
  decision_text: string;
  rationale: string | null;
  expected_outcome: string | null;
  status: DecisionStatus;
  superseded_by: string | null;
  source_node_ids: string | null;
  file_path: string | null;
  created_at: string;
  updated_at: string;
}

export type FrameworkType = "trl" | "competitive_landscape" | "hype_cycle" | "custom";

export interface FrameworkResultRow {
  id: string;
  domain_id: string;
  framework_type: FrameworkType;
  title: string;
  analysis_data: string;
  source_node_ids: string | null;
  knowledge_node_ids: string | null;
  model_id: string | null;
  cost_usd: number;
  created_at: string;
  updated_at: string;
}

export type SkillType = "builtin" | "custom" | "domain";

export interface SkillRow {
  id: string;
  domain_id: string | null;
  name: string;
  description: string | null;
  skill_type: SkillType;
  file_path: string | null;
  config: string | null;
  is_enabled: number;
  execution_count: number;
  success_count: number;
  avg_user_rating: number | null;
  created_at: string;
  updated_at: string;
}

export type ModelProvider =
  | "anthropic"
  | "openai"
  | "deepseek"
  | "google"
  | "groq"
  | "ollama"
  | "openrouter"
  | "xai"
  | "mistral";

export interface ModelConfigRow {
  id: string;
  provider: ModelProvider;
  model_id: string;
  display_name: string;
  api_base_url: string | null;
  is_local: number;
  is_active: number;
  cost_per_million_input: number | null;
  cost_per_million_output: number | null;
  max_context_tokens: number | null;
  capabilities: string | null;
  metadata: string | null;
  created_at: string;
  updated_at: string;
}

export interface SettingsRow {
  key: string;
  value: string;
  updated_at: string;
}

export interface ApiKeyRow {
  id: string;
  provider: string;
  encrypted_key: string;
  key_hint: string | null;
  is_valid: number | null;
  last_validated_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SchemaMigrationRow {
  version: number;
  description: string;
  applied_at: string;
}

// ---------------------------------------------------------------------------
// Union of all table row types for the generic repository
// ---------------------------------------------------------------------------

export type TableRow =
  | DomainRow
  | KnowledgeNodeRow
  | KnowledgeEdgeRow
  | ConversationRow
  | MessageRow
  | InboxItemRow
  | ImportRow
  | ResearchRunRow
  | PredictionRow
  | DecisionRow
  | FrameworkResultRow
  | SkillRow
  | ModelConfigRow
  | SettingsRow
  | ApiKeyRow;

// ---------------------------------------------------------------------------
// Table name constants
// ---------------------------------------------------------------------------

export const TABLE_NAMES = {
  DOMAINS: "domains",
  KNOWLEDGE_NODES: "knowledge_nodes",
  KNOWLEDGE_EDGES: "knowledge_edges",
  CONVERSATIONS: "conversations",
  MESSAGES: "messages",
  INBOX_ITEMS: "inbox_items",
  IMPORTS: "imports",
  RESEARCH_RUNS: "research_runs",
  PREDICTIONS: "predictions",
  DECISIONS: "decisions",
  FRAMEWORK_RESULTS: "framework_results",
  SKILLS: "skills",
  MODEL_CONFIGS: "model_configs",
  SETTINGS: "settings",
  API_KEYS: "api_keys",
  SCHEMA_MIGRATIONS: "schema_migrations",
} as const;

export type TableName = (typeof TABLE_NAMES)[keyof typeof TABLE_NAMES];
