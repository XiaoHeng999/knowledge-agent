import { describe, it, expect, vi, beforeEach } from "vitest";
import type { CommandDefinition, CommandResult } from "@/lib/commands/types";

// Module-scoped Map requires re-import for isolation
beforeEach(() => {
  vi.resetModules();
});

async function importRegistry() {
  const { registerCommand, getCommand, getAllCommands, findMatching, executeCommand } =
    await import("@/lib/commands/registry");
  return { registerCommand, getCommand, getAllCommands, findMatching, executeCommand };
}

function makeCmd(overrides: Partial<CommandDefinition> = {}): CommandDefinition {
  return {
    name: "test",
    label: "Test Command",
    description: "A test command",
    params: [],
    execute: vi.fn(async () => ({ type: "prompt" as const, content: "ok" })),
    ...overrides,
  };
}

const ctx = { domainId: "d1", conversationId: "c1", modelId: "m1" };

describe("registerCommand / getCommand", () => {
  it("registers and retrieves a command", async () => {
    const { registerCommand, getCommand } = await importRegistry();
    const cmd = makeCmd();
    registerCommand(cmd);
    expect(getCommand("test")).toBe(cmd);
  });

  it("returns undefined for unknown command", async () => {
    const { getCommand } = await importRegistry();
    expect(getCommand("nope")).toBeUndefined();
  });

  it("overwrites on re-register", async () => {
    const { registerCommand, getCommand } = await importRegistry();
    const v1 = makeCmd({ label: "v1" });
    const v2 = makeCmd({ label: "v2" });
    registerCommand(v1);
    registerCommand(v2);
    expect(getCommand("test")!.label).toBe("v2");
  });
});

describe("getAllCommands", () => {
  it("returns empty array when nothing registered", async () => {
    const { getAllCommands } = await importRegistry();
    expect(getAllCommands()).toEqual([]);
  });

  it("returns all registered commands", async () => {
    const { registerCommand, getAllCommands } = await importRegistry();
    registerCommand(makeCmd({ name: "a" }));
    registerCommand(makeCmd({ name: "b" }));
    expect(getAllCommands()).toHaveLength(2);
  });
});

describe("findMatching", () => {
  it("returns all when partial is empty", async () => {
    const { registerCommand, findMatching } = await importRegistry();
    registerCommand(makeCmd({ name: "help" }));
    registerCommand(makeCmd({ name: "search" }));
    expect(findMatching("")).toHaveLength(2);
  });

  it("matches by name prefix", async () => {
    const { registerCommand, findMatching } = await importRegistry();
    registerCommand(makeCmd({ name: "help" }));
    registerCommand(makeCmd({ name: "history" }));
    registerCommand(makeCmd({ name: "search" }));
    const matches = findMatching("hel");
    expect(matches).toHaveLength(1);
    expect(matches[0].name).toBe("help");
  });

  it("matches by label substring (case-insensitive)", async () => {
    const { registerCommand, findMatching } = await importRegistry();
    registerCommand(makeCmd({ name: "x", label: "Knowledge Search" }));
    const matches = findMatching("search");
    expect(matches).toHaveLength(1);
  });
});

describe("executeCommand", () => {
  it("returns error for unknown command", async () => {
    const { executeCommand } = await importRegistry();
    const result = await executeCommand({ name: "nope", args: "" }, ctx);
    expect(result.type).toBe("error");
  });

  it("returns error when required params missing", async () => {
    const { registerCommand, executeCommand } = await importRegistry();
    registerCommand(
      makeCmd({
        name: "search",
        params: [{ name: "query", description: "Search query", required: true }],
      }),
    );
    const result = await executeCommand({ name: "search", args: "" }, ctx);
    expect(result.type).toBe("error");
    expect((result as { message: string }).message).toContain("query");
  });

  it("delegates to execute when all required params present", async () => {
    const { registerCommand, executeCommand } = await importRegistry();
    const execute = vi.fn(async (): Promise<CommandResult> => ({ type: "prompt", content: "done" }));
    registerCommand(
      makeCmd({
        name: "search",
        params: [{ name: "query", description: "q", required: true }],
        execute,
      }),
    );
    const result = await executeCommand({ name: "search", args: "knowledge" }, ctx);
    expect(result).toEqual({ type: "prompt", content: "done" });
    expect(execute).toHaveBeenCalledWith("knowledge", ctx);
  });
});
