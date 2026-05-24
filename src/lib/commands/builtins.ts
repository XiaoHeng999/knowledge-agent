import type { CommandResult } from "./types";
import { registerCommand } from "./registry";

function systemPrompt(instruction: string): string {
  return `[System: You are now executing a structured analysis workflow. Follow the instructions precisely and format your response clearly.]\n\n${instruction}`;
}

// --- /daily ---
registerCommand({
  name: "daily",
  label: "Daily Briefing",
  description: "Generate a daily research briefing for the current domain",
  params: [],
  execute: async (): Promise<CommandResult> => ({
    type: "prompt",
    content: systemPrompt(
      "Generate a daily research briefing for this domain. Include:\n" +
      "1. **Key updates** — New knowledge nodes added in the last 24 hours\n" +
      "2. **Active predictions** — Status of any predictions being tracked\n" +
      "3. **Open questions** — Unresolved items that need attention\n" +
      "4. **Recommended actions** — What to research or review today\n\n" +
      "Format as a concise briefing document.",
    ),
  }),
});

// --- /deep-dive ---
registerCommand({
  name: "deep-dive",
  label: "Deep Dive",
  description: "Conduct deep research on a specific topic",
  params: [
    { name: "topic", description: "The topic to deep-dive into", required: true },
  ],
  execute: async (args): Promise<CommandResult> => {
    const topic = args.trim();
    if (!topic) {
      return { type: "error", message: "Please specify a topic. Usage: /deep-dive <topic>" };
    }
    return {
      type: "prompt",
      content: systemPrompt(
        `Conduct a deep-dive analysis on "${topic}" within this domain.\n\n` +
        "1. **Context** — What existing knowledge relates to this topic?\n" +
        "2. **Current state** — Summarize what is known\n" +
        "3. **Gap analysis** — What is NOT yet understood?\n" +
        "4. **Connections** — How does this relate to other knowledge nodes?\n" +
        "5. **Recommendations** — Specific next research steps\n\n" +
        "Be thorough and cite relevant knowledge nodes from the domain.",
      ),
    };
  },
});

// --- /summarize ---
registerCommand({
  name: "summarize",
  label: "Summarize Domain",
  description: "Summarize all knowledge in the current domain",
  params: [],
  execute: async (): Promise<CommandResult> => ({
    type: "prompt",
    content: systemPrompt(
      "Generate a comprehensive summary of all knowledge nodes in this domain.\n\n" +
      "**Structure:**\n" +
      "1. **Executive Summary** — 2-3 sentence overview\n" +
      "2. **Key Findings** — Most important knowledge items, grouped by theme\n" +
      "3. **Open Questions** — Unresolved items\n" +
      "4. **Recommended Next Steps** — Actionable research directions\n\n" +
      "Reference specific knowledge nodes where applicable.",
    ),
  }),
});

// --- /timeline ---
registerCommand({
  name: "timeline",
  label: "Timeline View",
  description: "Generate a chronological timeline of domain knowledge",
  params: [
    { name: "period", description: "Time period (e.g. 'last week', 'last month')", required: false },
  ],
  execute: async (args): Promise<CommandResult> => {
    const period = args.trim() || "all time";
    return {
      type: "prompt",
      content: systemPrompt(
        `Generate a chronological timeline of knowledge evolution in this domain over ${period}.\n\n` +
        "**Format:**\n" +
        "- List events chronologically (earliest to latest)\n" +
        "- Each entry: date, what was learned, significance\n" +
        "- Group related events under thematic headings\n" +
        "- Highlight turning points or breakthroughs\n\n" +
        "End with a brief narrative summary of how understanding has evolved.",
      ),
    };
  },
});

// --- /framework ---
registerCommand({
  name: "framework",
  label: "Framework Analysis",
  description: "Apply an analytical framework to the domain",
  params: [
    { name: "framework", description: "Framework name (trl, competitive, hype, swot, pestel)", required: false },
  ],
  execute: async (args): Promise<CommandResult> => {
    const fw = args.trim().toLowerCase();
    const frameworks: Record<string, string> = {
      trl: "Technology Readiness Level (TRL) assessment — evaluate each technology/milestone on the TRL 1-9 scale",
      competitive: "Competitive Landscape analysis — map key players, their positions, strengths, and threats",
      hype: "Hype Cycle analysis — position technologies on the Gartner Hype Cycle curve (innovation trigger → peak of inflated expectations → trough → slope → plateau)",
      swot: "SWOT Analysis — Strengths, Weaknesses, Opportunities, Threats",
      pestel: "PESTEL Analysis — Political, Economic, Social, Technological, Environmental, Legal factors",
    };

    const instruction = fw && frameworks[fw]
      ? `Apply the ${frameworks[fw]} to this domain's knowledge.`
      : "Apply a relevant analytical framework to this domain. Choose the most appropriate from: TRL, Competitive Landscape, Hype Cycle, SWOT, or PESTEL.";

    return {
      type: "prompt",
      content: systemPrompt(
        instruction + "\n\n" +
        "1. **Framework Selection** — State which framework(s) you are using and why\n" +
        "2. **Analysis** — Apply the framework systematically using domain knowledge\n" +
        "3. **Key Insights** — What does this analysis reveal?\n" +
        "4. **Implications** — What actions should follow from this analysis?\n\n" +
        "Reference specific knowledge nodes to support your analysis.",
      ),
    };
  },
});

// --- /connect ---
registerCommand({
  name: "connect",
  label: "Connect Ideas",
  description: "Find connections between knowledge nodes or concepts",
  params: [
    { name: "concepts", description: "Two or more concepts to connect (e.g. 'AI ethics regulation')", required: true },
  ],
  execute: async (args): Promise<CommandResult> => {
    const concepts = args.trim();
    if (!concepts) {
      return { type: "error", message: "Please specify concepts to connect. Usage: /connect <concept1> <concept2>" };
    }
    return {
      type: "prompt",
      content: systemPrompt(
        `Find and explain connections between the following concepts in this domain: "${concepts}"\n\n` +
        "1. **Direct connections** — Explicit relationships in existing knowledge\n" +
        "2. **Indirect connections** — Hidden or non-obvious relationships\n" +
        "3. **Gaps** — Where connections might exist but haven't been explored\n" +
        "4. **Emergent patterns** — What patterns emerge from viewing these concepts together?\n\n" +
        "Suggest new knowledge edges that could be created.",
      ),
    };
  },
});

// --- /predict ---
registerCommand({
  name: "predict",
  label: "Make Prediction",
  description: "Generate a prediction based on domain knowledge",
  params: [
    { name: "topic", description: "Topic to make a prediction about", required: true },
  ],
  execute: async (args): Promise<CommandResult> => {
    const topic = args.trim();
    if (!topic) {
      return { type: "error", message: "Please specify a topic. Usage: /predict <topic>" };
    }
    return {
      type: "prompt",
      content: systemPrompt(
        `Generate a structured prediction about "${topic}" based on this domain's knowledge.\n\n` +
        "**Format:**\n" +
        "1. **Prediction Statement** — Clear, falsifiable claim\n" +
        "2. **Confidence Level** — High / Medium / Low with justification\n" +
        "3. **Evidence For** — Knowledge nodes supporting this prediction\n" +
        "4. **Evidence Against** — Knowledge nodes that contradict or qualify\n" +
        "5. **Time Frame** — When will we know if this prediction is correct?\n" +
        "6. **Verification Criteria** — How to test this prediction\n\n" +
        "Be intellectually honest about uncertainty.",
      ),
    };
  },
});

// --- /skill ---
registerCommand({
  name: "skill",
  label: "Skill Extraction",
  description: "Extract actionable skills or practices from domain knowledge",
  params: [],
  execute: async (): Promise<CommandResult> => ({
    type: "prompt",
    content: systemPrompt(
      "Extract actionable skills and best practices from this domain's knowledge.\n\n" +
      "1. **Core Skills** — What capabilities are essential in this domain?\n" +
      "2. **Best Practices** — What patterns consistently lead to good outcomes?\n" +
      "3. **Common Pitfalls** — What mistakes should be avoided?\n" +
      "4. **Learning Path** — Suggest a progressive skill-building order\n\n" +
      "Ground each skill in specific knowledge from the domain.",
    ),
  }),
});

// --- /review ---
registerCommand({
  name: "review",
  label: "Knowledge Review",
  description: "Review and quality-check the domain's knowledge base",
  params: [],
  execute: async (): Promise<CommandResult> => ({
    type: "prompt",
    content: systemPrompt(
      "Conduct a thorough review of this domain's knowledge base.\n\n" +
      "1. **Coverage Assessment** — What areas are well-covered? What's missing?\n" +
      "2. **Quality Check** — Flag outdated, contradictory, or low-comprehension nodes\n" +
      "3. **Consistency Review** — Are there conflicting claims that need resolution?\n" +
      "4. **Completeness** — What knowledge gaps should be filled?\n" +
      "5. **Prioritization** — Rank recommended improvements by impact\n\n" +
      "Provide specific, actionable recommendations.",
    ),
  }),
});

// --- /import ---
registerCommand({
  name: "import",
  label: "Import Knowledge",
  description: "Import and process external knowledge into the domain",
  params: [
    { name: "source", description: "URL or file description to import", required: true },
  ],
  execute: async (args): Promise<CommandResult> => {
    const source = args.trim();
    if (!source) {
      return { type: "error", message: "Please specify a source. Usage: /import <url or description>" };
    }
    return {
      type: "prompt",
      content: systemPrompt(
        `Help me process and import the following knowledge source into this domain: "${source}"\n\n` +
        "1. **Source Analysis** — What type of content is this? What domain does it cover?\n" +
        "2. **Key Knowledge Items** — Extract distinct knowledge claims or facts\n" +
        "3. **Relationships** — How do these items connect to existing domain knowledge?\n" +
        "4. **Quality Assessment** — Rate the reliability and relevance\n" +
        "5. **Import Plan** — Suggest how to structure this as knowledge nodes\n\n" +
        "If the source is a URL, suggest using the import pipeline to fetch and process it.",
      ),
    };
  },
});
