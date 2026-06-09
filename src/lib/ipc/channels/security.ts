export const SECURITY_CHANNELS = {
  ASSESS_WRITE: "security:assessWrite",
  GET_PENDING: "security:getPendingAudits",
  RESOLVE_AUDIT: "security:resolveAudit",
  BULK_RESOLVE: "security:bulkResolve",
  GET_AUDIT_LOG: "security:getAuditLog",
  GENERATE_DIFF: "security:generateDiff",
} as const;

export type RiskLevel = "low" | "medium" | "high" | "blocked";

export interface WriteOperation {
  type: "create" | "update" | "delete";
  targetPath: string;
  domainId: string;
  newContent?: string;
  bulkCount?: number;
}

export interface RiskAssessment {
  level: RiskLevel;
  reasons: string[];
  autoApprove: boolean;
  requireExplicit: boolean;
}

export interface SecurityAssessWriteRequest {
  operation: WriteOperation;
}

export interface SecurityAssessWriteResponse {
  risk: RiskAssessment;
}

export interface PendingAudit {
  id: string;
  operation: WriteOperation;
  risk: RiskAssessment;
  createdAt: string;
}

export interface SecurityGetPendingResponse {
  audits: PendingAudit[];
  count: number;
}

export interface SecurityResolveAuditRequest {
  auditId: string;
  action: "approve" | "reject" | "edit_and_approve";
  editedContent?: string;
}

export interface SecurityBulkResolveRequest {
  auditIds: string[];
  action: "approve_all" | "reject_all";
}

export interface AuditTrailEntry {
  id: string;
  timestamp: string;
  operation: WriteOperation;
  riskLevel: RiskLevel;
  decision: "auto_approved" | "user_approved" | "user_rejected" | "blocked";
  reviewer?: string;
  commitHash?: string;
}

export interface SecurityGetAuditLogRequest {
  limit?: number;
  offset?: number;
}

export interface SecurityGetAuditLogResponse {
  entries: AuditTrailEntry[];
  total: number;
}

export interface DiffGenerateRequest {
  oldContent: string | null;
  newContent: string | null;
}

export interface DiffLineResult {
  type: "add" | "remove" | "context";
  content: string;
  oldLineNumber?: number;
  newLineNumber?: number;
}

export interface DiffHunkResult {
  oldStart: number;
  oldCount: number;
  newStart: number;
  newCount: number;
  lines: DiffLineResult[];
}

export interface DiffGenerateResponse {
  hunks: DiffHunkResult[];
  stats: { added: number; removed: number; unchanged: number };
}
