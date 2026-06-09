import { describe, it, expect } from "vitest";
import { parseCommand, isCommandInput, extractPartialCommand } from "@/lib/commands/parser";

describe("parseCommand", () => {
  it("returns null for non-command input", () => {
    expect(parseCommand("hello world")).toBeNull();
    expect(parseCommand("")).toBeNull();
  });

  it("returns null for bare slash", () => {
    expect(parseCommand("/")).toBeNull();
    expect(parseCommand("  /")).toBeNull();
  });

  it("returns null for invalid command names", () => {
    expect(parseCommand("/123")).toBeNull();
    expect(parseCommand("/1abc")).toBeNull();
    expect(parseCommand("/foo_bar")).toBeNull();
    expect(parseCommand("/foo.bar")).toBeNull();
  });

  it("returns null for name exceeding 32 chars", () => {
    const long = "/a" + "b".repeat(31); // name = "abbb...b" = 32 chars, valid
    expect(parseCommand(long)).not.toBeNull();
    const tooLong = "/a" + "b".repeat(32); // name = 33 chars
    expect(parseCommand(tooLong)).toBeNull();
  });

  it("parses command without args", () => {
    expect(parseCommand("/help")).toEqual({ name: "help", args: "" });
  });

  it("parses command with args", () => {
    expect(parseCommand("/search knowledge graph")).toEqual({
      name: "search",
      args: "knowledge graph",
    });
  });

  it("lowercases the command name", () => {
    expect(parseCommand("/Help")).toEqual({ name: "help", args: "" });
    expect(parseCommand("/SEARCH term")).toEqual({ name: "search", args: "term" });
  });

  it("trims leading whitespace", () => {
    expect(parseCommand("  /help")).toEqual({ name: "help", args: "" });
  });

  it("trims trailing whitespace from args", () => {
    expect(parseCommand("/foo bar  ")).toEqual({ name: "foo", args: "bar" });
  });

  it("handles hyphenated command names", () => {
    expect(parseCommand("/my-command arg")).toEqual({
      name: "my-command",
      args: "arg",
    });
  });
});

describe("isCommandInput", () => {
  it("returns true for slash-prefixed input", () => {
    expect(isCommandInput("/help")).toBe(true);
    expect(isCommandInput("/")).toBe(true);
  });

  it("returns true with leading whitespace", () => {
    expect(isCommandInput("  /help")).toBe(true);
  });

  it("returns false for non-command input", () => {
    expect(isCommandInput("hello")).toBe(false);
    expect(isCommandInput("")).toBe(false);
    expect(isCommandInput("slash/")).toBe(false);
  });
});

describe("extractPartialCommand", () => {
  it("returns empty string for non-command input", () => {
    expect(extractPartialCommand("hello")).toBe("");
  });

  it("extracts name from command without args", () => {
    expect(extractPartialCommand("/help")).toBe("help");
  });

  it("extracts name from command with args", () => {
    expect(extractPartialCommand("/search knowledge")).toBe("search");
  });

  it("lowercases the extracted name", () => {
    expect(extractPartialCommand("/Help Me")).toBe("help");
  });

  it("returns partial for bare slash", () => {
    expect(extractPartialCommand("/")).toBe("");
  });
});
