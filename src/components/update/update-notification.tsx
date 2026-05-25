"use client";

import { useState, useEffect, useCallback } from "react";

interface UpdateState {
  checking: boolean;
  available: boolean;
  downloading: boolean;
  downloaded: boolean;
  version: string | null;
  error: string | null;
  downloadProgress: number;
}

const initialState: UpdateState = {
  checking: false,
  available: false,
  downloading: false,
  downloaded: false,
  version: null,
  error: null,
  downloadProgress: 0,
};

export function UpdateNotification() {
  const [state, setState] = useState<UpdateState>(initialState);
  const [dismissed, setDismissed] = useState(false);
  const [isLinux, setIsLinux] = useState(false);

  useEffect(() => {
    const api = (window as unknown as { api?: { app?: { getPlatform?: () => Promise<{ platform: string }> } } }).api;
    api?.app?.getPlatform?.().then(({ platform }) => {
      setIsLinux(platform === "linux");
    });
  }, []);

  useEffect(() => {
    const api = (window as unknown as {
      api?: {
        on?: (channel: string, cb: (...args: unknown[]) => void) => () => void;
        update?: { getStatus?: () => Promise<UpdateState> };
      };
    }).api;

    // Subscribe to push events from main process
    const unsubs: Array<() => void> = [];

    if (api?.on) {
      unsubs.push(
        api.on("update:status", (status: unknown) => {
          const s = status as UpdateState;
          setState((prev) => ({ ...prev, ...s }));
        }),
      );

      unsubs.push(
        api.on("update:download-progress", (data: unknown) => {
          const d = data as { percent: number };
          setState((prev) => ({ ...prev, downloadProgress: d.percent }));
        }),
      );

      unsubs.push(
        api.on("update:linux-available", (data: unknown) => {
          const d = data as { version: string };
          setState((prev) => ({
            ...prev,
            available: true,
            version: d.version,
          }));
        }),
      );
    }

    // Fetch initial status
    api?.update?.getStatus?.().then((status) => {
      setState((prev) => ({ ...prev, ...status }));
    });

    return () => {
      unsubs.forEach((u) => u());
    };
  }, []);

  const handleDownload = useCallback(async () => {
    const api = (window as unknown as { api?: { update?: { download?: () => Promise<unknown> } } }).api;
    await api?.update?.download?.();
  }, []);

  const handleInstall = useCallback(async () => {
    const api = (window as unknown as { api?: { update?: { install?: () => Promise<unknown> } } }).api;
    await api?.update?.install?.();
  }, []);

  // Nothing to show
  if (dismissed || (!state.available && !state.downloading && !state.downloaded)) {
    return null;
  }

  // Linux — manual download prompt
  if (isLinux && state.available && !state.downloading) {
    return (
      <div className="update-notification">
        <div className="update-notification__content">
          <span className="update-notification__text">
            Update available: v{state.version}. Download from GitHub.
          </span>
          <a
            href={`https://github.com/agentclaw/agentclaw/releases/tag/v${state.version}`}
            target="_blank"
            rel="noopener noreferrer"
            className="update-notification__btn update-notification__btn--primary"
          >
            Download
          </a>
          <button
            className="update-notification__btn update-notification__btn--ghost"
            onClick={() => setDismissed(true)}
          >
            Later
          </button>
        </div>
      </div>
    );
  }

  // macOS / Windows — downloading
  if (state.downloading) {
    return (
      <div className="update-notification">
        <div className="update-notification__content">
          <span className="update-notification__text">
            Downloading v{state.version}... {Math.round(state.downloadProgress)}%
          </span>
          <div className="update-notification__progress">
            <div
              className="update-notification__progress-bar"
              style={{ width: `${state.downloadProgress}%` }}
            />
          </div>
        </div>
      </div>
    );
  }

  // macOS / Windows — download ready
  if (state.downloaded) {
    return (
      <div className="update-notification">
        <div className="update-notification__content">
          <span className="update-notification__text">
            Update ready: v{state.version}. Restart to install.
          </span>
          <button
            className="update-notification__btn update-notification__btn--primary"
            onClick={handleInstall}
          >
            Restart
          </button>
          <button
            className="update-notification__btn update-notification__btn--ghost"
            onClick={() => setDismissed(true)}
          >
            Later
          </button>
        </div>
      </div>
    );
  }

  // macOS / Windows — prompt to download
  if (state.available && state.version) {
    return (
      <div className="update-notification">
        <div className="update-notification__content">
          <span className="update-notification__text">
            Update available: v{state.version}. Download and install?
          </span>
          <button
            className="update-notification__btn update-notification__btn--primary"
            onClick={handleDownload}
          >
            Update
          </button>
          <button
            className="update-notification__btn update-notification__btn--ghost"
            onClick={() => setDismissed(true)}
          >
            Later
          </button>
        </div>
      </div>
    );
  }

  return null;
}
