export const DB_CHANNELS = {
  INITIALIZE: "db:initialize",
  MIGRATE: "db:migrate",
  GET_VERSION: "db:getVersion",
  BACKUP: "db:backup",
} as const;

export interface DbInitializeRequest {
  dbPath?: string;
}
export interface DbInitializeResponse {
  success: boolean;
  version: number;
}
export interface DbMigrateResponse {
  success: boolean;
  fromVersion: number;
  toVersion: number;
}
export interface DbGetVersionResponse {
  version: number;
}
export interface DbBackupRequest {
  targetPath: string;
}
export interface DbBackupResponse {
  success: boolean;
  path: string;
}
