export const IMPORT_CHANNELS = {
  IMPORT_URL: "import:importUrl",
  IMPORT_FILE: "import:importFile",
  GET_STATUS: "import:getStatus",
  LIST: "import:list",
  RETRY: "import:retry",
  CANCEL: "import:cancel",
  POLL_RSS: "import:pollRss",
} as const;

export interface ImportUrlRequest {
  url: string;
  domainId?: string;
}
export interface ImportFileRequest {
  filePath: string;
  domainId?: string;
}
export interface ImportStatusResponse {
  id: string;
  status: "pending" | "processing" | "completed" | "partial" | "failed";
  progress: number;
}
export interface ImportListRequest {
  domainId?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}
export interface ImportListResponse {
  items: ImportStatusResponse[];
  total: number;
}
export interface ImportRetryRequest {
  id: string;
}
export interface ImportCancelRequest {
  id: string;
}
export interface ImportPollRssRequest {
  feedUrl: string;
  domainId: string;
}
export interface ImportPollRssResponse {
  newItems: number;
  errors: number;
}
