import { describe, it, expect, beforeEach, vi } from "vitest";

vi.stubGlobal("localStorage", {
  getItem: vi.fn(() => null),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(() => null),
});

describe("persistedStorage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("delegates getItem to window.api.settings.get with prefixed key", async () => {
    const getSpy = vi.fn().mockResolvedValue('"test-value"');
    // @ts-expect-error -- test mock
    window.api = { settings: { get: getSpy, set: vi.fn() } };

    const { persistedStorage } = await import("@/stores/base");
    const result = await persistedStorage.getItem("test-key");

    expect(getSpy).toHaveBeenCalledWith({ key: "agentclaw:test-key" });
    expect(result).toBe("test-value");
  });

  it("falls back to localStorage when window.api fails", async () => {
    const getSpy = vi.fn().mockRejectedValue(new Error("no api"));
    // @ts-expect-error -- test mock
    window.api = { settings: { get: getSpy, set: vi.fn() } };

    const { persistedStorage } = await import("@/stores/base");
    await persistedStorage.getItem("key");

    expect(localStorage.getItem).toHaveBeenCalledWith("agentclaw:key");
  });

  it("delegates setItem to window.api.settings.set with prefixed key", async () => {
    const setSpy = vi.fn().mockResolvedValue(undefined);
    // @ts-expect-error -- test mock
    window.api = { settings: { get: vi.fn(), set: setSpy } };

    const { persistedStorage } = await import("@/stores/base");
    await persistedStorage.setItem("my-key", "my-value");

    expect(setSpy).toHaveBeenCalledWith({ key: "agentclaw:my-key", value: '"my-value"' });
  });

  it("prefixes all keys with agentclaw:", async () => {
    const getSpy = vi.fn().mockResolvedValue(null);
    // @ts-expect-error -- test mock
    window.api = { settings: { get: getSpy, set: vi.fn() } };

    const { persistedStorage } = await import("@/stores/base");
    await persistedStorage.getItem("somekey");

    expect(getSpy).toHaveBeenCalledWith({ key: "agentclaw:somekey" });
  });
});
