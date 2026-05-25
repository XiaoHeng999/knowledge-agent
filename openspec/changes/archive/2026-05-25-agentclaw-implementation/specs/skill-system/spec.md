## ADDED Requirements

### Requirement: SKILL.md Loading and Discovery
The system SHALL discover and load skills defined in `SKILL.md` files. Skills SHALL be located in: (1) built-in skills at `resources/skills/`, (2) domain-specific skills at `domains/{domain}/extensions/skills/`. Each `SKILL.md` SHALL define: name, description, trigger conditions, input schema, prompt template, and output format. Skills SHALL be loaded on application startup and when a domain is activated.

#### Scenario: Discovering built-in skills
- **WHEN** the application starts
- **THEN** the system scans `resources/skills/` for `SKILL.md` files and registers each discovered skill with name, description, and trigger conditions in the skill registry

#### Scenario: Discovering domain-specific skills
- **WHEN** the user activates a domain that has skills in its `extensions/skills/` directory
- **THEN** those domain skills are registered alongside built-in skills and appear in the skill selector for that domain's conversations

### Requirement: Built-in Skill Definitions
The system SHALL include 4 built-in skills: (1) `paper-summarizer` - summarizes academic papers into structured knowledge nodes, (2) `trend-analyzer` - identifies trends across domain knowledge, (3) `connection-finder` - discovers cross-domain connections between knowledge nodes, (4) `domain-expert` - provides expert Q&A using domain context. Each skill SHALL have a well-defined `SKILL.md` with prompt templates optimized for their use case.

#### Scenario: Using the paper-summarizer skill
- **WHEN** the user invokes the `paper-summarizer` skill with a PDF or URL
- **THEN** the skill extracts the paper content, applies the summarization prompt template, and produces a structured knowledge node with: abstract, key findings, methodology, limitations, and relevance to the active domain

#### Scenario: Using the connection-finder skill
- **WHEN** the user invokes the `connection-finder` skill
- **THEN** the skill analyzes knowledge nodes across all domains, identifies semantic connections, and returns a list of cross-domain relationships with similarity scores and suggested integration points

### Requirement: Skill Execution Engine
The skill execution engine SHALL: (1) validate inputs against the skill's schema, (2) load the skill's prompt template, (3) inject the domain context and user inputs, (4) execute via the pi-mono agent session, and (5) process the output according to the skill's output format. Execution SHALL be cancellable by the user.

#### Scenario: Executing a skill with valid inputs
- **WHEN** the user invokes `trend-analyzer` for the "AI Research" domain
- **THEN** the engine validates inputs, loads the trend analysis prompt, injects the domain's knowledge nodes, executes via pi-mono, and returns structured trend results

#### Scenario: Cancelling a running skill
- **WHEN** the user clicks "Cancel" while a skill is executing
- **THEN** the pi-mono agent session is interrupted, partial results are discarded, and the UI returns to the previous state

#### Scenario: Skill execution with invalid inputs
- **WHEN** the user invokes a skill with inputs that don't match the schema
- **THEN** the engine displays a validation error identifying the invalid fields and does NOT execute the skill

### Requirement: Skill Registration UI
The system SHALL provide a skill management UI accessible from settings showing: all registered skills (built-in and domain-specific), their status (enabled/disabled), execution history, and effectiveness metrics. Users SHALL be able to enable/disable individual skills and create custom skills via a guided template.

#### Scenario: Viewing all registered skills
- **WHEN** the user opens the skill management view
- **THEN** all built-in and domain-specific skills are listed with name, description, source (built-in/domain), status toggle, and last execution timestamp

#### Scenario: Disabling a skill
- **WHEN** the user toggles off a built-in skill
- **THEN** the skill is disabled globally, it no longer appears in the skill selector or slash commands, and a confirmation toast is shown

### Requirement: Skill Effectiveness Tracking
The system SHALL track skill execution metrics: invocation count, success rate, average execution time, average token cost, and user satisfaction (optional thumbs up/down). Metrics SHALL be aggregated weekly and displayed in the skill management UI.

#### Scenario: Viewing skill metrics
- **WHEN** the user clicks on a skill in the management view
- **THEN** detailed metrics are displayed: invoked 47 times, 92% success rate, average 8.3s execution time, $0.03 average cost, 78% thumbs-up rate
