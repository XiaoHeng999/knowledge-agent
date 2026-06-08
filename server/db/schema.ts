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

// ---------------------------------------------------------------------------
// Table column whitelists — used by BaseRepository for SQL injection prevention
// ---------------------------------------------------------------------------

type KeysOf<T> = keyof T & string;

export const TABLE_COLUMNS: Record<TableName, ReadonlySet<string>> = {
  domains: new Set<KeysOf<DomainRow>>([
    "id", "name", "description", "color", "icon", "config_path",
    "default_expert_model", "default_research_model", "default_summary_model",
    "research_schedule", "created_at", "updated_at",
  ]),
  knowledge_nodes: new Set<KeysOf<KnowledgeNodeRow>>([
    "id", "domain_id", "title", "content", "summary", "node_type", "status",
    "comprehension_score", "frontmatter", "source_ids", "created_at", "updated_at",
  ]),
  knowledge_edges: new Set<KeysOf<KnowledgeEdgeRow>>([
    "id", "source_node_id", "target_node_id", "edge_type", "weight",
    "description", "created_at", "updated_at",
  ]),
  conversations: new Set<KeysOf<ConversationRow>>([
    "id", "domain_id", "title", "model_id", "session_type", "status",
    "created_at", "updated_at",
  ]),
  messages: new Set<KeysOf<MessageRow>>([
    "id", "conversation_id", "parent_id", "role", "content", "model_id",
    "token_count", "cost_usd", "metadata", "branch_index", "created_at",
  ]),
  inbox_items: new Set<KeysOf<InboxItemRow>>([
    "id", "source_type", "source_url", "raw_content", "ai_summary",
    "suggested_domain_id", "suggested_tags", "status", "domain_id",
    "knowledge_node_id", "created_at", "updated_at",
  ]),
  imports: new Set<KeysOf<ImportRow>>([
    "id", "domain_id", "import_type", "source_url", "file_path", "status",
    "total_items", "processed_items", "failed_items", "error_message",
    "metadata", "created_at", "updated_at",
  ]),
  research_runs: new Set<KeysOf<ResearchRunRow>>([
    "id", "domain_id", "trigger_type", "model_id", "status", "query",
    "findings_summary", "knowledge_nodes_created", "cost_usd", "token_count",
    "error_message", "started_at", "completed_at", "created_at",
  ]),
  predictions: new Set<KeysOf<PredictionRow>>([
    "id", "domain_id", "content", "confidence", "predicted_date", "status",
    "actual_outcome", "source_node_ids", "reasoning", "verified_at",
    "created_at", "updated_at",
  ]),
  decisions: new Set<KeysOf<DecisionRow>>([
    "id", "domain_id", "title", "decision_number", "context", "decision_text",
    "rationale", "expected_outcome", "status", "superseded_by", "source_node_ids",
    "file_path", "created_at", "updated_at",
  ]),
  framework_results: new Set<KeysOf<FrameworkResultRow>>([
    "id", "domain_id", "framework_type", "title", "analysis_data",
    "source_node_ids", "knowledge_node_ids", "model_id", "cost_usd",
    "created_at", "updated_at",
  ]),
  skills: new Set<KeysOf<SkillRow>>([
    "id", "domain_id", "name", "description", "skill_type", "file_path",
    "config", "is_enabled", "execution_count", "success_count", "avg_user_rating",
    "created_at", "updated_at",
  ]),
  model_configs: new Set<KeysOf<ModelConfigRow>>([
    "id", "provider", "model_id", "display_name", "api_base_url", "is_local",
    "is_active", "cost_per_million_input", "cost_per_million_output",
    "max_context_tokens", "capabilities", "metadata", "created_at", "updated_at",
  ]),
  settings: new Set<KeysOf<SettingsRow>>(["key", "value", "updated_at"]),
  api_keys: new Set<KeysOf<ApiKeyRow>>([
    "id", "provider", "encrypted_key", "key_hint", "is_valid",
    "last_validated_at", "created_at", "updated_at",
  ]),
  schema_migrations: new Set<KeysOf<SchemaMigrationRow>>(["version", "description", "applied_at"]),
};
