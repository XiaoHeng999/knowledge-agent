import type { FrameworkType } from "../db/schema";
import type { CustomFrameworkConfig } from "./domain-config";
import type { FrameworkDefinition } from "./framework-engine";

// ---------------------------------------------------------------------------
// Built-in framework definitions
// ---------------------------------------------------------------------------

export const BUILT_IN_FRAMEWORKS: FrameworkDefinition[] = [
  {
    type: "trl",
    name: "Technology Readiness Level",
    description: "Assess technology maturity on a 1-9 scale based on available evidence.",
    minNodes: 3,
    promptTemplate: (domain, summaries, decisions) => {
      const parts: string[] = [];
      parts.push(`You are a technology analyst evaluating the readiness level of technologies in the "${domain}" domain.`);
      parts.push("");
      parts.push("## Available Knowledge");
      for (const s of summaries) {
        parts.push(`- ${s}`);
      }
      if (decisions.length > 0) {
        parts.push("");
        parts.push("## Previous Decisions");
        for (const d of decisions) {
          parts.push(`- ${d}`);
        }
      }
      parts.push("");
      parts.push("Analyze the technology readiness level for this domain. For each key technology:");
      parts.push("1. Assign a TRL score (1-9) where 1=basic research, 9=full deployment");
      parts.push("2. Provide evidence citations from the knowledge base");
      parts.push("3. Identify gaps preventing advancement to the next level");
      parts.push("4. Recommend actions to bridge those gaps");
      parts.push("");
      parts.push("Format your response as:");
      parts.push("## Overall TRL Assessment");
      parts.push("Average TRL: X.X");
      parts.push("");
      parts.push("## Technology Breakdown");
      parts.push("For each technology: name, TRL score, evidence, gaps");
      parts.push("");
      parts.push("## Key Gaps & Recommendations");
      parts.push("Prioritized list of actions to advance readiness.");

      return parts.join("\n");
    },
    parseResult: (raw) => {
      const trlMatch = raw.match(/Average TRL:\s*([\d.]+)/i);
      const score = trlMatch ? parseFloat(trlMatch[1]) : undefined;
      const titleMatch = raw.match(/##\s*Overall TRL Assessment/i);
      const summaryEnd = titleMatch ? titleMatch.index : raw.indexOf("##");
      const summary = summaryEnd && summaryEnd > 0
        ? raw.slice(0, summaryEnd).trim().slice(0, 300)
        : raw.slice(0, 300).trim();

      return {
        title: `TRL Analysis — Level ${score ?? "?"}`,
        summary,
        score,
        details: raw,
        tags: ["framework", "trl-analysis"],
      };
    },
  },
  {
    type: "competitive_landscape",
    name: "Competitive Landscape Analysis",
    description: "Map competitors, market positions, and strategic implications.",
    minNodes: 5,
    promptTemplate: (domain, summaries, decisions) => {
      const parts: string[] = [];
      parts.push(`You are a strategic analyst mapping the competitive landscape for the "${domain}" domain.`);
      parts.push("");
      parts.push("## Available Knowledge");
      for (const s of summaries) {
        parts.push(`- ${s}`);
      }
      if (decisions.length > 0) {
        parts.push("");
        parts.push("## Previous Strategic Decisions");
        for (const d of decisions) {
          parts.push(`- ${d}`);
        }
      }
      parts.push("");
      parts.push("Analyze the competitive landscape:");
      parts.push("1. Identify key players/technologies/approaches and their market positions");
      parts.push("2. Assess strengths and weaknesses of each");
      parts.push("3. Map competitive dynamics (cooperation, disruption, consolidation)");
      parts.push("4. Identify strategic opportunities and threats");
      parts.push("5. Recommend positioning strategy");
      parts.push("");
      parts.push("Format your response as:");
      parts.push("## Market Overview");
      parts.push("## Key Players & Positions");
      parts.push("## Competitive Dynamics");
      parts.push("## Opportunities & Threats");
      parts.push("## Strategic Recommendations");

      return parts.join("\n");
    },
    parseResult: (raw) => ({
      title: "Competitive Landscape Analysis",
      summary: raw.slice(0, 300).trim(),
      details: raw,
      tags: ["framework", "competitive-landscape"],
    }),
  },
  {
    type: "hype_cycle",
    name: "Gartner Hype Cycle Positioning",
    description: "Position technologies on the hype cycle curve based on maturity and adoption signals.",
    minNodes: 4,
    promptTemplate: (domain, summaries, decisions) => {
      const parts: string[] = [];
      parts.push(`You are a technology analyst positioning technologies in the "${domain}" domain on a Gartner-style hype cycle.`);
      parts.push("");
      parts.push("## Available Knowledge");
      for (const s of summaries) {
        parts.push(`- ${s}`);
      }
      if (decisions.length > 0) {
        parts.push("");
        parts.push("## Context Decisions");
        for (const d of decisions) {
          parts.push(`- ${d}`);
        }
      }
      parts.push("");
      parts.push("For each technology in this domain:");
      parts.push("1. Position it on the hype cycle: Innovation Trigger, Peak of Inflated Expectations, Trough of Disillusionment, Slope of Enlightenment, Plateau of Productivity");
      parts.push("2. Estimate time to mainstream adoption (2-5 years, 5-10 years, 10+ years, or already mainstream)");
      parts.push("3. Assess the current sentiment vs. actual capability");
      parts.push("4. Identify signals that would indicate movement to the next phase");
      parts.push("");
      parts.push("Format your response as:");
      parts.push("## Hype Cycle Map");
      parts.push("## Technology Positions");
      parts.push("## Key Signals & Predictions");

      return parts.join("\n");
    },
    parseResult: (raw) => ({
      title: "Hype Cycle Positioning",
      summary: raw.slice(0, 300).trim(),
      details: raw,
      tags: ["framework", "hype-cycle"],
    }),
  },
];

// ---------------------------------------------------------------------------
// Custom framework builder
// ---------------------------------------------------------------------------

export function buildCustomFrameworkDefinition(cfg: CustomFrameworkConfig): FrameworkDefinition {
  return {
    type: "custom",
    name: cfg.name,
    description: cfg.description,
    minNodes: 1,
    promptTemplate: (domainName, nodeSummaries, decisionSummaries) => {
      const parts: string[] = [];
      parts.push(`You are analyzing the "${domainName}" domain using the "${cfg.name}" framework.`);
      parts.push("");
      parts.push(`## Framework: ${cfg.name}`);
      parts.push(cfg.description);
      parts.push("");
      parts.push("## Dimensions");
      for (const dim of cfg.dimensions) {
        parts.push(`- ${dim}`);
      }
      parts.push("");
      if (nodeSummaries.length > 0) {
        parts.push("## Knowledge Nodes");
        for (const s of nodeSummaries) {
          parts.push(`- ${s}`);
        }
        parts.push("");
      }
      if (decisionSummaries.length > 0) {
        parts.push("## Previous Decisions");
        for (const d of decisionSummaries) {
          parts.push(`- ${d}`);
        }
        parts.push("");
      }
      parts.push("## Scoring Instructions");
      parts.push(cfg.scoringPrompt);
      return parts.join("\n");
    },
    parseResult: (raw) => ({
      title: cfg.name,
      summary: raw.slice(0, 300).trim(),
      details: raw,
      tags: ["framework", "custom-analysis"],
    }),
  };
}
