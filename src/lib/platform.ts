/**
 * Renderer-side platform detection utilities.
 *
 * The renderer cannot access `process.platform` directly — it must call the
 * IPC bridge. This module provides cached, typed helpers for platform-specific
 * behaviour (keyboard shortcuts, menus, tray icons).
 */

export type Platform = "darwin" | "win32" | "linux";

let cachedPlatform: Platform | null = null;

export async function getPlatform(): Promise<Platform> {
  if (cachedPlatform) return cachedPlatform;

  const api = (window as unknown as { api?: { app?: { getPlatform?: () => Promise<{ platform: string }> } } }).api;
  if (api?.app?.getPlatform) {
    const { platform } = await api.app.getPlatform();
    cachedPlatform = platform as Platform;
  } else {
    // Fallback for browser / dev mode without Electron
    cachedPlatform = "darwin";
  }

  return cachedPlatform;
}

/** Sync accessor — only valid after `getPlatform()` has been called once. */
export function getCachedPlatform(): Platform {
  return cachedPlatform ?? "darwin";
}

/** Is the current platform macOS? */
export function isMac(platform: Platform): boolean {
  return platform === "darwin";
}

/** Modifier key label for the current platform (Cmd on macOS, Ctrl elsewhere). */
export function modifierLabel(platform: Platform): "Cmd" | "Ctrl" {
  return platform === "darwin" ? "Cmd" : "Ctrl";
}

/** Keyboard modifier key for event matching (metaKey on macOS, ctrlKey elsewhere). */
export function modifierKey(platform: Platform): "metaKey" | "ctrlKey" {
  return platform === "darwin" ? "metaKey" : "ctrlKey";
}
