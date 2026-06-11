import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock electron (needed for logger at import time)
vi.mock("electron", () => ({
  app: { getPath: vi.fn(() => "/tmp/test-electron") },
}));

// External collaborators — still mocked, only DB mock is eliminated
const mockRunPrompt = vi.fn();
vi.mock("@server/services/session-runner", () => ({
  createSessionRunner: () => ({ runPrompt: mockRunPrompt }),
}));
vi.mock("@server/lib/model-resolver", () => ({
  resolveModelId: vi.fn().mockResolvedValue("model-1"),
}));
vi.mock("@server/fs/provider", () => ({
  getFileSystemProvider: vi.fn(),
}));
vi.mock("@server/fs/paths", () => ({
  getDataDir: vi.fn(),
  getDomainDir: vi.fn(),
  DOMAIN_SUBPATHS: { SKILLS: "skills" },
}));
vi.mock("@server/fs/markdown-parser", () => ({
  parseMarkdownFile: vi.fn(),
}));
vi.mock("@server/services/logger", () => ({
  createLogger: () => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn() }),
}));

// NO vi.mock("@server/db/index") — DB is injected via factory

import { createSkillEngine } from "@server/services/skill-engine";
import type { SkillRow } from "@server/db/schema";

// ---------------------------------------------------------------------------
// Mock DB factory
// ---------------------------------------------------------------------------

function createMockDb() {
  return {
    skills: {
      findById: vi.fn(),
      findBuiltins: vi.fn<(rows: SkillRow[]) => SkillRow[]>(() => []),
      findByDomain: vi.fn<(rows: SkillRow[]) => SkillRow[]>(() => []),
      findEnabled: vi.fn<(rows: SkillRow[]) => SkillRow[]>(() => []),
      upsertByFilePath: vi.fn(),
      setEnabled: vi.fn<(success: boolean) => boolean>(() => true),
      incrementExecution: vi.fn(),
      insertExecution: vi.fn(),
      getAvgExecutionTimeMs: vi.fn<() => number | null>(() => null),
      getAvgCostUsd: vi.fn<() => number | null>(() => null),
      updateRating: vi.fn(),
    },
  } as unknown as import("@server/db/index").DatabaseService;
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeSkillRow(overrides: Partial<SkillRow> = {}): SkillRow {
  return {
    id: "skill-1",
    domain_id: null,
    name: "Domain Analysis",
    description: "Analyze a domain",
    skill_type: "builtin",
    file_path: null,
    config: JSON.stringify({
      name: "Domain Analysis",
      description: "Analyze a domain",
      triggerConditions: [],
      inputSchema: [],
      outputFormat: "text",
      promptTemplate: "Analyze the domain thoroughly.",
    }),
    is_enabled: 1,
    execution_count: 5,
    success_count: 4,
    avg_user_rating: 4.2,
    created_at: "2025-01-01T00:00:00.000Z",
    updated_at: "2025-01-01T00:00:00.000Z",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("createSkillEngine (factory)", () => {
  let mockDb: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = createMockDb();
  });

  // -------------------------------------------------------------------------
  // Tracer bullet: listSkills uses injected db
  // -------------------------------------------------------------------------

  describe("listSkills", () => {
    it("returns builtin skills from deps.db", () => {
      mockDb.skills.findBuiltins.mockReturnValue([makeSkillRow()]);

      const engine = createSkillEngine({ db: mockDb });
      const skills = engine.listSkills();

      expect(mockDb.skills.findBuiltins).toHaveBeenCalledOnce();
      expect(skills).toHaveLength(1);
      expect(skills[0].id).toBe("skill-1");
      expect(skills[0].name).toBe("Domain Analysis");
    });

    it("merges domain skills when domainId is provided", () => {
      mockDb.skills.findBuiltins.mockReturnValue([makeSkillRow()]);
      mockDb.skills.findByDomain.mockReturnValue([makeSkillRow({ id: "skill-2", skill_type: "domain", domain_id: "dom-1" })]);

      const engine = createSkillEngine({ db: mockDb });
      const skills = engine.listSkills("dom-1");

      expect(skills).toHaveLength(2);
      expect(mockDb.skills.findByDomain).toHaveBeenCalledWith("dom-1");
    });
  });

  // -------------------------------------------------------------------------
  // getSkill
  // -------------------------------------------------------------------------

  describe("getSkill", () => {
    it("returns a single skill by id", () => {
      mockDb.skills.findById.mockReturnValue(makeSkillRow());

      const engine = createSkillEngine({ db: mockDb });
      const skill = engine.getSkill("skill-1");

      expect(skill.id).toBe("skill-1");
      expect(mockDb.skills.findById).toHaveBeenCalledWith("skill-1");
    });

    it("throws when skill not found", () => {
      mockDb.skills.findById.mockReturnValue(undefined);

      const engine = createSkillEngine({ db: mockDb });
      expect(() => engine.getSkill("missing")).toThrow("Skill not found: missing");
    });
  });

  // -------------------------------------------------------------------------
  // toggleSkill
  // -------------------------------------------------------------------------

  describe("toggleSkill", () => {
    it("enables a skill via deps.db", () => {
      mockDb.skills.setEnabled.mockReturnValue(true);

      const engine = createSkillEngine({ db: mockDb });
      engine.toggleSkill("skill-1", true);

      expect(mockDb.skills.setEnabled).toHaveBeenCalledWith("skill-1", true);
    });

    it("throws when skill not found", () => {
      mockDb.skills.setEnabled.mockReturnValue(false);

      const engine = createSkillEngine({ db: mockDb });
      expect(() => engine.toggleSkill("missing", true)).toThrow("Skill not found: missing");
    });
  });

  // -------------------------------------------------------------------------
  // executeSkill
  // -------------------------------------------------------------------------

  describe("executeSkill", () => {
    it("returns completed SkillExecution with cost from SessionRunner", async () => {
      mockDb.skills.findById.mockReturnValue(makeSkillRow());
      mockRunPrompt.mockResolvedValue({
        content: "Analysis complete.",
        estimatedTokens: 120,
        estimatedCost: 0.002,
      });

      const engine = createSkillEngine({ db: mockDb });
      const result = await engine.executeSkill("skill-1", "dom-1", "Analyze this");

      expect(result.skillId).toBe("skill-1");
      expect(result.domainId).toBe("dom-1");
      expect(result.status).toBe("completed");
      expect(result.output).toBe("Analysis complete.");
      expect(result.costUsd).toBe(0.002);
    });

    it("delegates LLM call to SessionRunner.runPrompt", async () => {
      mockDb.skills.findById.mockReturnValue(makeSkillRow());
      mockRunPrompt.mockResolvedValue({ content: "ok", estimatedCost: 0 });

      const engine = createSkillEngine({ db: mockDb });
      await engine.executeSkill("skill-1", "dom-1", "Analyze this");

      expect(mockRunPrompt).toHaveBeenCalledOnce();
      const [domainId, modelId, prompt] = mockRunPrompt.mock.calls[0];
      expect(domainId).toBe("dom-1");
      expect(modelId).toBe("model-1");
      expect(prompt).toContain("Analyze this");
    });

    it("increments execution count on success", async () => {
      mockDb.skills.findById.mockReturnValue(makeSkillRow());
      mockRunPrompt.mockResolvedValue({ content: "ok", estimatedCost: 0 });

      const engine = createSkillEngine({ db: mockDb });
      await engine.executeSkill("skill-1", "dom-1", "input");

      expect(mockDb.skills.incrementExecution).toHaveBeenCalledWith("skill-1", true);
    });

    it("records failed execution when runner throws", async () => {
      mockDb.skills.findById.mockReturnValue(makeSkillRow());
      mockRunPrompt.mockRejectedValue(new Error("LLM error"));

      const engine = createSkillEngine({ db: mockDb });
      const result = await engine.executeSkill("skill-1", "dom-1", "input");

      expect(result.status).toBe("failed");
      expect(result.errorMessage).toBe("LLM error");
      expect(mockDb.skills.incrementExecution).toHaveBeenCalledWith("skill-1", false);
    });

    it("inserts execution record into db", async () => {
      mockDb.skills.findById.mockReturnValue(makeSkillRow());
      mockRunPrompt.mockResolvedValue({ content: "ok", estimatedCost: 0.001 });

      const engine = createSkillEngine({ db: mockDb });
      await engine.executeSkill("skill-1", "dom-1", "input");

      expect(mockDb.skills.insertExecution).toHaveBeenCalledOnce();
      const record = mockDb.skills.insertExecution.mock.calls[0][0];
      expect(record.skill_id).toBe("skill-1");
      expect(record.status).toBe("completed");
    });

    it("throws when skill is disabled", async () => {
      mockDb.skills.findById.mockReturnValue(makeSkillRow({ is_enabled: 0 }));

      const engine = createSkillEngine({ db: mockDb });
      await expect(engine.executeSkill("skill-1", "dom-1", "input"))
        .rejects.toThrow("Skill is disabled");
    });
  });

  // -------------------------------------------------------------------------
  // cancelExecution
  // -------------------------------------------------------------------------

  describe("cancelExecution", () => {
    it("returns false for unknown execution", () => {
      const engine = createSkillEngine({ db: mockDb });
      expect(engine.cancelExecution("unknown")).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // getSkillMetrics
  // -------------------------------------------------------------------------

  describe("getSkillMetrics", () => {
    it("returns computed metrics from db row", () => {
      mockDb.skills.findById.mockReturnValue(makeSkillRow({ execution_count: 10, success_count: 8 }));
      mockDb.skills.getAvgExecutionTimeMs.mockReturnValue(2500);
      mockDb.skills.getAvgCostUsd.mockReturnValue(0.005);

      const engine = createSkillEngine({ db: mockDb });
      const metrics = engine.getSkillMetrics("skill-1");

      expect(metrics.invocationCount).toBe(10);
      expect(metrics.successCount).toBe(8);
      expect(metrics.successRate).toBe(0.8);
      expect(metrics.avgExecutionTimeMs).toBe(2500);
      expect(metrics.avgCostUsd).toBe(0.005);
    });

    it("throws when skill not found", () => {
      mockDb.skills.findById.mockReturnValue(undefined);

      const engine = createSkillEngine({ db: mockDb });
      expect(() => engine.getSkillMetrics("missing")).toThrow("Skill not found: missing");
    });
  });

  // -------------------------------------------------------------------------
  // rateSkill
  // -------------------------------------------------------------------------

  describe("rateSkill", () => {
    it("delegates rating update to db", () => {
      const engine = createSkillEngine({ db: mockDb });
      engine.rateSkill("skill-1", 4);

      expect(mockDb.skills.updateRating).toHaveBeenCalledWith("skill-1", 4);
    });

    it("rejects rating outside 1-5 range", () => {
      const engine = createSkillEngine({ db: mockDb });
      expect(() => engine.rateSkill("skill-1", 0)).toThrow("Rating must be between 1 and 5");
      expect(() => engine.rateSkill("skill-1", 6)).toThrow("Rating must be between 1 and 5");
    });
  });

  // -------------------------------------------------------------------------
  // listEnabledSkills
  // -------------------------------------------------------------------------

  describe("listEnabledSkills", () => {
    it("returns only enabled skills via deps.db", () => {
      mockDb.skills.findEnabled.mockReturnValue([makeSkillRow()]);

      const engine = createSkillEngine({ db: mockDb });
      const skills = engine.listEnabledSkills();

      expect(mockDb.skills.findEnabled).toHaveBeenCalledOnce();
      expect(skills).toHaveLength(1);
    });
  });
});
