export const VC_CHANNELS = {
  INIT: "vc:init",
  GET_STATUS: "vc:getStatus",
  GET_HISTORY: "vc:getHistory",
  GET_DIFF: "vc:getDiff",
  ROLLBACK: "vc:rollback",
} as const;

export interface CommitInfo {
  hash: string;
  shortHash: string;
  message: string;
  author: string;
  date: string;
}

export interface DiffLine {
  type: "add" | "remove" | "context";
  content: string;
  oldLineNumber?: number;
  newLineNumber?: number;
}

export interface DiffHunk {
  header: string;
  oldStart: number;
  oldCount: number;
  newStart: number;
  newCount: number;
  lines: DiffLine[];
}

export interface FileDiff {
  oldPath: string;
  newPath: string;
  hunks: DiffHunk[];
}

export interface VcGetHistoryRequest {
  filePath: string;
  limit?: number;
}

export interface VcGetHistoryResponse {
  commits: CommitInfo[];
}

export interface VcGetDiffRequest {
  fromHash: string;
  toHash: string;
  filePath?: string;
}

export interface VcGetDiffResponse {
  diffs: FileDiff[];
  hasChanges: boolean;
}

export interface VcRollbackRequest {
  filePath: string;
  targetHash: string;
}

export interface VcRollbackResponse {
  success: boolean;
  newCommitHash: string;
}

export interface VcStatusResponse {
  initialized: boolean;
  branch: string;
  uncommittedChanges: number;
}
