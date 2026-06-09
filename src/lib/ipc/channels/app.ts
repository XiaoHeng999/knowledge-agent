export const APP_CHANNELS = {
  PING: "app:ping",
  GET_VERSION: "app:getVersion",
  GET_PLATFORM: "app:getPlatform",
} as const;

export interface AppPingResponse {
  message: string;
}
export interface AppVersionResponse {
  version: string;
}
export interface AppPlatformResponse {
  platform: string;
}
