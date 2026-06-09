import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mock Electron APIs before importing preload
// ---------------------------------------------------------------------------

const listeners = new Map<string, Set<Function>>();

vi.mock("electron", () => ({
  contextBridge: {
    exposeInMainWorld: vi.fn((_name: string, api: unknown) => {
      capturedApi = api as typeof capturedApi;
    }),
  },
  ipcRenderer: {
    invoke: vi.fn(),
    on: vi.fn((channel: string, handler: Function) => {
      let set = listeners.get(channel);
      if (!set) {
        set = new Set();
        listeners.set(channel, set);
      }
      set.add(handler);
    }),
    removeListener: vi.fn((channel: string, handler: Function) => {
      listeners.get(channel)?.delete(handler);
    }),
  },
}));

// Capture the API object exposed via contextBridge
let capturedApi: {
  on: (channel: string, callback: (...args: unknown[]) => void) => () => void;
  removeListener: (channel: string, callback: (...args: unknown[]) => void) => void;
};

// Import after mocks are set up
beforeEach(async () => {
  listeners.clear();
  vi.clearAllMocks();
  await import("../../electron/preload");
});

function emitEvent(channel: string, ...args: unknown[]) {
  const handlers = listeners.get(channel);
  if (handlers) {
    for (const h of handlers) {
      h({}, ...args);
    }
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("preload IPC event listeners", () => {
  it("on() registers a listener that receives events", () => {
    const cb = vi.fn();
    capturedApi.on("test:channel", cb);

    emitEvent("test:channel", "payload");

    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb).toHaveBeenCalledWith("payload");
  });

  it("removeListener() actually removes the listener", () => {
    const cb = vi.fn();
    capturedApi.on("test:channel", cb);
    capturedApi.removeListener("test:channel", cb);

    emitEvent("test:channel", "payload");

    expect(cb).not.toHaveBeenCalled();
  });

  it("unsubscribe function returned by on() removes the listener", () => {
    const cb = vi.fn();
    const unsubscribe = capturedApi.on("test:channel", cb);
    unsubscribe();

    emitEvent("test:channel", "payload");

    expect(cb).not.toHaveBeenCalled();
  });

  it("removeListener does not affect other listeners on the same channel", () => {
    const cb1 = vi.fn();
    const cb2 = vi.fn();
    capturedApi.on("test:channel", cb1);
    capturedApi.on("test:channel", cb2);
    capturedApi.removeListener("test:channel", cb1);

    emitEvent("test:channel", "payload");

    expect(cb1).not.toHaveBeenCalled();
    expect(cb2).toHaveBeenCalledTimes(1);
  });

  it("unsubscribe cleanup also removes the mapping entry", () => {
    const cb = vi.fn();
    const unsubscribe = capturedApi.on("test:channel", cb);
    unsubscribe();

    // After unsubscribe, removeListener should be a no-op (mapping already cleaned)
    capturedApi.removeListener("test:channel", cb);

    // Re-add should work fine
    capturedApi.on("test:channel", cb);
    emitEvent("test:channel", "payload");
    expect(cb).toHaveBeenCalledTimes(1);
  });
});
