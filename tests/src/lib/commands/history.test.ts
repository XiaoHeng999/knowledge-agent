import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  addHistoryEntry,
  getRecentItems,
  clearHistory,
  initHistory,
  type HistoryStorage,
} from "@/lib/commands/history";

describe("cmd-palette history", () => {
  beforeEach(() => {
    clearHistory();
  });

  it("moves duplicate id to top instead of duplicating", () => {
    addHistoryEntry({ id: "x", label: "First", group: "navigation" });
    addHistoryEntry({ id: "y", label: "Other", group: "commands" });
    addHistoryEntry({ id: "x", label: "First Redux", group: "navigation" });
    const items = getRecentItems();
    expect(items).toHaveLength(2);
    expect(items[0].id).toBe("x");
    expect(items[0].label).toBe("First Redux");
    expect(items[1].id).toBe("y");
  });

  it("caps at 20 entries, dropping the oldest", () => {
    for (let i = 0; i < 25; i++) {
      addHistoryEntry({ id: `item-${i}`, label: `Item ${i}`, group: "commands" });
    }
    const items = getRecentItems();
    expect(items).toHaveLength(20);
    expect(items[0].id).toBe("item-24");
    expect(items[19].id).toBe("item-5");
    expect(items.find((e) => e.id === "item-0")).toBeUndefined();
  });

  it("loads entries from storage on init", async () => {
    const mockStorage: HistoryStorage = {
      load: vi.fn().mockResolvedValue(
        JSON.stringify([
          { id: "nav:chat", label: "Chat", group: "navigation" },
        ])
      ),
      save: vi.fn().mockResolvedValue(undefined),
    };
    await initHistory(mockStorage);
    const items = getRecentItems();
    expect(items).toHaveLength(1);
    expect(items[0].id).toBe("nav:chat");
  });

  it("persists entries via storage on add", async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    const mockStorage: HistoryStorage = {
      load: vi.fn().mockResolvedValue(null),
      save,
    };
    await initHistory(mockStorage);
    addHistoryEntry({ id: "a", label: "A", group: "commands" });
    expect(save).toHaveBeenCalledTimes(1);
    const saved = JSON.parse(save.mock.calls[0][0]);
    expect(saved).toEqual([{ id: "a", label: "A", group: "commands" }]);
  });

  it("persists empty array on clear", async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    const mockStorage: HistoryStorage = {
      load: vi.fn().mockResolvedValue(null),
      save,
    };
    await initHistory(mockStorage);
    addHistoryEntry({ id: "a", label: "A", group: "commands" });
    save.mockClear();
    clearHistory();
    expect(save).toHaveBeenCalledWith("[]");
  });

  it("clears all entries from memory", () => {
    addHistoryEntry({ id: "a", label: "A", group: "navigation" });
    addHistoryEntry({ id: "b", label: "B", group: "commands" });
    clearHistory();
    expect(getRecentItems()).toHaveLength(0);
  });

  it("respects limit parameter in getRecentItems", () => {
    for (let i = 0; i < 5; i++) {
      addHistoryEntry({ id: `item-${i}`, label: `Item ${i}`, group: "navigation" });
    }
    expect(getRecentItems(3)).toHaveLength(3);
    expect(getRecentItems(3)[0].id).toBe("item-4");
  });

  it("returns entries newest first", () => {
    addHistoryEntry({ id: "a", label: "A", group: "navigation" });
    addHistoryEntry({ id: "b", label: "B", group: "navigation" });
    addHistoryEntry({ id: "c", label: "C", group: "navigation" });
    const items = getRecentItems();
    expect(items.map((i) => i.id)).toEqual(["c", "b", "a"]);
  });

  it("stores and retrieves an entry", () => {
    addHistoryEntry({
      id: "nav:inbox",
      label: "Inbox",
      group: "navigation",
    });
    const items = getRecentItems();
    expect(items).toHaveLength(1);
    expect(items[0]).toEqual({
      id: "nav:inbox",
      label: "Inbox",
      group: "navigation",
    });
  });
});
