import { describe, it, expect, vi } from "vitest";

// Mock electron before any module that imports it
vi.mock("electron", () => ({
  app: { getPath: vi.fn(() => "/tmp/test-electron") },
}));

import { parseConfigYaml, serializeConfigYaml } from "@server/services/domain-config";
import { buildCustomFrameworkDefinition, listFrameworks, extractSlugFromConfigPath } from "@server/services/framework-engine";
import type { CustomFrameworkConfig } from "@server/services/domain-config";

describe("Custom framework config parsing", () => {
  it("parses frameworks.custom section with name, description, dimensions, scoringPrompt", () => {
    const yaml = `
name: Test Domain
description: A test domain
color: "#ff0000"
icon: flask
models:
  expert: null
  research: null
  summary: null
research:
  schedule: "0 9 * * *"
  max_daily_runs: 1
  max_cost_per_run_usd: 0.1
  query_templates: []
sources: []
frameworks:
  - type: trl
    enabled: true
    schedule: "0 9 * * *"
custom_framework:
  name: Innovation Viability
  description: Evaluate innovation projects on multiple axes
  dimensions:
    - Market Fit
    - Technical Feasibility
    - Team Readiness
  scoring_prompt: Score each dimension 1-10 and justify
tags: []
skills: []
`;
    const config = parseConfigYaml(yaml);

    expect(config.customFramework).toBeDefined();
    expect(config.customFramework!.name).toBe("Innovation Viability");
    expect(config.customFramework!.description).toBe("Evaluate innovation projects on multiple axes");
    expect(config.customFramework!.dimensions).toEqual([
      "Market Fit",
      "Technical Feasibility",
      "Team Readiness",
    ]);
    expect(config.customFramework!.scoringPrompt).toBe("Score each dimension 1-10 and justify");
  });

  it("returns null customFramework when section is absent", () => {
    const yaml = `
name: Test Domain
description: A test domain
color: "#ff0000"
icon: flask
models:
  expert: null
  research: null
  summary: null
research:
  schedule: "0 9 * * *"
  max_daily_runs: 1
  max_cost_per_run_usd: 0.1
  query_templates: []
sources: []
frameworks:
  - type: trl
    enabled: true
    schedule: "0 9 * * *"
tags: []
skills: []
`;
    const config = parseConfigYaml(yaml);
    expect(config.customFramework).toBeNull();
  });

  it("round-trips custom framework through serialize then parse", () => {
    const original = parseConfigYaml(`
name: Round Trip
description: test
color: "#00ff00"
icon: beaker
models:
  expert: null
  research: null
  summary: null
research:
  schedule: "0 0 * * *"
  max_daily_runs: 2
  max_cost_per_run_usd: 0.5
  query_templates:
    - "test query"
sources: []
frameworks: []
custom_framework:
  name: My Framework
  description: My custom analysis
  dimensions:
    - Speed
    - Quality
  scoring_prompt: Rate 1-5 each dimension
tags: []
skills: []
`);

    const serialized = serializeConfigYaml(original);
    const roundTripped = parseConfigYaml(serialized);

    expect(roundTripped.customFramework).toEqual(original.customFramework);
  });
});

describe("buildCustomFrameworkDefinition", () => {
  const config: CustomFrameworkConfig = {
    name: "Innovation Score",
    description: "Score innovation potential",
    dimensions: ["Market Fit", "Technical Feasibility", "Team Readiness"],
    scoringPrompt: "Score each dimension 1-10 and justify",
  };

  it("returns a FrameworkDefinition with correct type, name, description", () => {
    const def = buildCustomFrameworkDefinition(config);
    expect(def.type).toBe("custom");
    expect(def.name).toBe("Innovation Score");
    expect(def.description).toBe("Score innovation potential");
    expect(def.minNodes).toBeGreaterThanOrEqual(1);
  });

  it("promptTemplate injects dimensions and scoringPrompt", () => {
    const def = buildCustomFrameworkDefinition(config);
    const prompt = def.promptTemplate("My Domain", ["Node A (fact, 0.9)"], ["ADR-001: Test [accepted]"]);
    expect(prompt).toContain("Market Fit");
    expect(prompt).toContain("Technical Feasibility");
    expect(prompt).toContain("Team Readiness");
    expect(prompt).toContain("Score each dimension 1-10 and justify");
    expect(prompt).toContain("My Domain");
  });

  it("parseResult returns valid FrameworkParsedResult", () => {
    const def = buildCustomFrameworkDefinition(config);
    const result = def.parseResult("Some analysis output");
    expect(result).toHaveProperty("title");
    expect(result).toHaveProperty("summary");
    expect(result).toHaveProperty("details");
    expect(result).toHaveProperty("tags");
    expect(result.details).toBe("Some analysis output");
  });
});

describe("listFrameworks conditional custom", () => {
  it("excludes custom when no domainId provided (backward compat)", async () => {
    const frameworks = await listFrameworks();
    const types = frameworks.map((f) => f.type);
    expect(types).not.toContain("custom");
    expect(types).toContain("trl");
    expect(types).toContain("competitive_landscape");
  });
});

describe("extractSlugFromConfigPath", () => {
  it("extracts domain slug from a full config path", () => {
    expect(extractSlugFromConfigPath("/home/user/.config/AgentClaw/domains/my-domain/config.yaml"))
      .toBe("my-domain");
  });

  it("handles Windows-style paths", () => {
    expect(extractSlugFromConfigPath("C:\\Users\\user\\AppData\\Roaming\\AgentClaw\\domains\\my-domain\\config.yaml"))
      .toBe("my-domain");
  });

  it("handles relative paths", () => {
    expect(extractSlugFromConfigPath("domains/test-domain/config.yaml"))
      .toBe("test-domain");
  });
});
