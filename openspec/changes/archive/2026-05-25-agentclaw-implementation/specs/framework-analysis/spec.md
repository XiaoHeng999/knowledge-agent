## ADDED Requirements

### Requirement: Analysis Framework Engine
The system SHALL provide an extensible framework engine with built-in frameworks: Technology Readiness Level (TRL), Competitive Landscape Analysis, Gartner Hype Cycle Positioning, SWOT Analysis, and Porter's Five Forces. Each framework SHALL define: input schema (required knowledge node types), analysis prompt template, and output schema (structured results). Frameworks SHALL be executable against a domain's knowledge base.

#### Scenario: Running a TRL analysis on a domain
- **WHEN** the user selects "Technology Readiness Level" framework for the "Quantum Computing" domain
- **THEN** the engine collects relevant knowledge nodes, feeds them into the TRL analysis prompt, and produces a structured result with a TRL score (1-9), evidence citations, and gaps identified

#### Scenario: Running a framework with insufficient data
- **WHEN** the user attempts a Competitive Landscape Analysis on a domain with fewer than 5 knowledge nodes
- **THEN** the system displays a warning: "Insufficient data for reliable analysis. At least 5 knowledge nodes recommended. Proceed anyway?" with options to cancel or continue

### Requirement: Framework Judgment to Knowledge Node
The output of a framework analysis SHALL be automatically converted into a structured knowledge node. The knowledge node SHALL contain: the framework name, the analysis results in Markdown, a `framework_result` tag, and a confidence score derived from the input data quality. The user SHALL be able to review and edit this node before it is committed.

#### Scenario: Auto-generating a knowledge node from framework results
- **WHEN** a TRL analysis completes with a score of 6
- **THEN** a draft knowledge node is created with title "TRL Analysis: [Domain Name] - Level 6", the full analysis as Markdown body, and tags ["framework", "trl-analysis"]; the user reviews and clicks "Save to Knowledge Base"

#### Scenario: Editing framework-generated knowledge node
- **WHEN** the user modifies the auto-generated analysis before saving
- **THEN** the edited version is saved, a git commit records the change, and the original analysis is preserved in the version history

### Requirement: Decision Record (ADR) Generation
The system SHALL generate Architecture Decision Records (ADRs) when the user or agent identifies a significant decision point during framework analysis. Each ADR SHALL follow the Michael Nygard format: Context, Decision, Status, Consequences. ADRs SHALL be stored in the `decisions` database table and as Markdown files in the domain's `knowledge/` directory.

#### Scenario: Creating an ADR from framework analysis
- **WHEN** a Competitive Landscape Analysis reveals a strategic choice between two technology stacks
- **THEN** the system proposes an ADR with Context (analysis findings), Decision (pending), Status (Proposed), and Consequences (trade-offs); the user fills in the decision and accepts

#### Scenario: Viewing domain decision history
- **WHEN** the user navigates to the decisions view for a domain
- **THEN** all ADRs are listed in reverse chronological order, each showing title, status (Proposed/Accepted/Deprecated), and date; clicking an ADR opens the full record

### Requirement: Domain Summary Generation
The system SHALL generate a comprehensive domain summary on demand or on a configurable schedule. The summary SHALL synthesize all knowledge nodes, framework results, predictions, and decisions into a structured document with sections: Executive Summary, Key Findings, Active Predictions, Decision Log, and Recommended Actions.

#### Scenario: Generating a domain summary on demand
- **WHEN** the user clicks "Generate Summary" for a domain
- **THEN** the system uses the configured model to synthesize all domain data into a structured summary document, which is displayed in the right panel and can be exported as Markdown

#### Scenario: Scheduled summary generation
- **WHEN** the domain's config.yaml specifies `summary_schedule: "weekly"`
- **THEN** the research agent generates a weekly summary and stores it as a knowledge node tagged "auto-summary"

### Requirement: Three-Layer Memory Architecture
The system SHALL implement a three-layer memory model: Hot (current session context, last 24 hours, in-memory), Warm (recent knowledge, last 30 days, database), and Cold (historical knowledge, older than 30 days, database with lazy loading). The memory layer SHALL determine what context is loaded into the agent for conversations and research.

#### Scenario: Loading context for a new conversation
- **WHEN** the user starts a new conversation in a domain
- **THEN** Hot layer (session cache) is loaded immediately, Warm layer (last 30 days) is loaded into the agent context, and Cold layer is available on-demand via search but not pre-loaded
