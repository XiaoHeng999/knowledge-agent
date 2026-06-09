export const UPDATE_CHANNELS = {
  CHECK: "update:check",
  DOWNLOAD: "update:download",
  INSTALL: "update:install",
  GET_STATUS: "update:getStatus",
} as const;

export interface UpdateStatusResponse {
  checking: boolean;
  available: boolean;
  downloading: boolean;
  downloaded: boolean;
  version: string | null;
  error: string | null;
}

export interface UpdateCheckResponse {
  available: boolean;
  version: string | null;
}

export interface UpdateDownloadResponse {
  started: boolean;
}

export interface UpdateInstallResponse {
  started: boolean;
}
