export const WINDOW_CHANNELS = {
  MINIMIZE: "window:minimize",
  MAXIMIZE: "window:maximize",
  CLOSE: "window:close",
  IS_MAXIMIZED: "window:isMaximized",
  TOGGLE_MAXIMIZE: "window:toggleMaximize",
} as const;

export interface WindowSimpleResponse { success: boolean }
export interface WindowIsMaximizedResponse { maximized: boolean }
