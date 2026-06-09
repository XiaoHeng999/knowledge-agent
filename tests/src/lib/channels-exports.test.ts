import { describe, it, expect } from "vitest";
import {
  // 19 domain channel constants
  APP_CHANNELS,
  DB_CHANNELS,
  MODEL_CHANNELS,
  DOMAIN_CHANNELS,
  KNOWLEDGE_CHANNELS,
  INBOX_CHANNELS,
  RESEARCH_CHANNELS,
  SETTINGS_CHANNELS,
  IMPORT_CHANNELS,
  FRAMEWORK_CHANNELS,
  WINDOW_CHANNELS,
  VC_CHANNELS,
  SEARCH_CHANNELS,
  SECURITY_CHANNELS,
  TIMELINE_CHANNELS,
  CHAT_CHANNELS,
  SKILL_CHANNELS,
  WORKER_CHANNELS,
  UPDATE_CHANNELS,
  // Utility types re-exported as values aren't testable at runtime,
  // but importing them proves the module boundary is intact.
} from "@/lib/ipc/channels";
import type {
  IpcChannelMap,
  ChannelName,
  ChannelRequest,
  ChannelResponse,
  KnowledgeNode,
  ModelInfo,
  DomainInfo,
  ConversationInfo,
  StreamChunk,
} from "@/lib/ipc/channels";

describe("channels module exports", () => {
  const allChannelConstants = {
    APP_CHANNELS,
    DB_CHANNELS,
    MODEL_CHANNELS,
    DOMAIN_CHANNELS,
    KNOWLEDGE_CHANNELS,
    INBOX_CHANNELS,
    RESEARCH_CHANNELS,
    SETTINGS_CHANNELS,
    IMPORT_CHANNELS,
    FRAMEWORK_CHANNELS,
    WINDOW_CHANNELS,
    VC_CHANNELS,
    SEARCH_CHANNELS,
    SECURITY_CHANNELS,
    TIMELINE_CHANNELS,
    CHAT_CHANNELS,
    SKILL_CHANNELS,
    WORKER_CHANNELS,
    UPDATE_CHANNELS,
  } as const;

  it("exports all 19 domain channel constants", () => {
    const names = Object.keys(allChannelConstants);
    expect(names).toHaveLength(19);
  });

  it("every channel value follows module:action naming convention", () => {
    for (const [groupName, channels] of Object.entries(allChannelConstants)) {
      for (const [key, value] of Object.entries(channels as Record<string, string>)) {
        expect(value).toMatch(
          /^[a-z-]+:[a-zA-Z]+$/,
          `${groupName}.${key} = "${value}" does not match module:action`
        );
      }
    }
  });

  it("channel name prefix matches its constant group", () => {
    const prefixMap: Record<string, string> = {
      APP_CHANNELS: "app",
      DB_CHANNELS: "db",
      MODEL_CHANNELS: "model",
      DOMAIN_CHANNELS: "domain",
      KNOWLEDGE_CHANNELS: "knowledge",
      INBOX_CHANNELS: "inbox",
      RESEARCH_CHANNELS: "research",
      SETTINGS_CHANNELS: "settings",
      IMPORT_CHANNELS: "import",
      FRAMEWORK_CHANNELS: "framework",
      WINDOW_CHANNELS: "window",
      VC_CHANNELS: "vc",
      SEARCH_CHANNELS: "search",
      SECURITY_CHANNELS: "security",
      TIMELINE_CHANNELS: "timeline",
      CHAT_CHANNELS: "chat",
      SKILL_CHANNELS: "skill",
      WORKER_CHANNELS: "worker",
      UPDATE_CHANNELS: "update",
    };

    for (const [groupName, expectedPrefix] of Object.entries(prefixMap)) {
      const channels = allChannelConstants[groupName as keyof typeof allChannelConstants];
      for (const value of Object.values(channels as Record<string, string>)) {
        expect(value.startsWith(expectedPrefix + ":")).toBe(true);
      }
    }
  });

  it("no duplicate channel names across all domains", () => {
    const allNames: string[] = [];
    for (const channels of Object.values(allChannelConstants)) {
      allNames.push(...Object.values(channels as Record<string, string>));
    }
    const unique = new Set(allNames);
    expect(unique.size).toBe(allNames.length);
  });

  // Compile-time type assertions — these will fail TS compilation if types break
  it("IpcChannelMap compiles (type-level check)", () => {
    // If this function compiles, the types are intact
    type _Check1 = IpcChannelMap[keyof IpcChannelMap];
    type _Check2 = ChannelName;
    type _Check3 = ChannelRequest<"knowledge:createNode">;
    type _Check4 = ChannelResponse<"knowledge:createNode">;
    expect(true).toBe(true);
  });
});
