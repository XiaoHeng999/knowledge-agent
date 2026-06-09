export const SETTINGS_CHANNELS = {
  GET: "settings:get",
  SET: "settings:set",
  GET_THEME: "settings:getTheme",
  SET_THEME: "settings:setTheme",
} as const;

export interface SettingsGetRequest {
  key: string;
}
export interface SettingsSetRequest {
  key: string;
  value: unknown;
}
