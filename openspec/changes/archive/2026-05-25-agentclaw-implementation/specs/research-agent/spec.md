## ADDED Requirements

### Requirement: Research Schedule Configuration
Each domain SHALL support configurable research schedules via `config.yaml`. The schedule SHALL support cron expressions (e.g., `0 9 * * 1` for weekly Monday 9 AM). The system SHALL also support manual trigger ("Research Now") and on-demand scheduling (e.g., "Research in 2 hours"). The research scheduler SHALL persist schedules across application restarts.

#### Scenario: Configuring a weekly research schedule
- **WHEN** the user sets `research_schedule: "0 9 * * 1"` in the domain's config.yaml
- **THEN** the research agent is scheduled to run every Monday at 9 AM, and the next run time is displayed in the research dashboard

#### Scenario: Triggering immediate research
- **WHEN** the user clicks "Research Now" for a domain
- **THEN** a research run is queued immediately, bypassing the schedule, and the research dashboard shows the run as "In Progress"

### Requirement: Research Agent Execution
The research agent SHALL execute using a pi-mono agent session with the domain's configured cheap model. The agent SHALL: (1) formulate search queries from the domain's knowledge gaps, (2) fetch and extract content from configured sources, (3) summarize findings, and (4) generate draft knowledge nodes for user review. Each research run SHALL have a unique ID, start time, end time, and status.

#### Scenario: Successful research run
- **WHEN** the research agent executes for the "AI Research" domain
- **THEN** the agent formulates 3-5 search queries based on knowledge gaps, fetches and processes 10-20 sources, generates summaries, and creates 3-5 draft knowledge nodes in the inbox for review

#### Scenario: Research run with partial failure
- **WHEN** 3 out of 10 source fetches fail during a research run
- **THEN** the research run completes with status "Completed (partial)", the 7 successful results are processed, the 3 failures are logged with error details, and a notification informs the user of the partial completion

### Requirement: Domain Source Configuration
Each domain SHALL define research sources in its `config.yaml`. Source types SHALL include: `url` (single web page), `rss` (RSS feed URL), `arxiv` (arXiv category or search), `google_scholar` (search query), and `github` (repository or topic). Sources SHALL have configurable `weight` (priority) and `enabled` (on/off) flags.

#### Scenario: Configuring mixed research sources
- **WHEN** a domain configures sources: an RSS feed from a tech blog, an arXiv category, and a GitHub topic
- **THEN** the research agent queries all enabled sources proportionally to their weights, and results from each source are tagged with their origin

### Requirement: Research Dashboard
The system SHALL provide a research dashboard showing: scheduled runs with next execution time, recent run history with status and summary, cost tracking (token usage and estimated cost), and discovered knowledge nodes pending review. The dashboard SHALL be accessible from the domain's overview.

#### Scenario: Viewing the research dashboard
- **WHEN** the user opens the research dashboard for a domain
- **THEN** the dashboard displays: next scheduled run time, last 10 runs with status/completion time/item count, total cost for the last 30 days, and the count of pending inbox items from research

### Requirement: Cost Tracking and Budget
The system SHALL track token usage per research run and estimate cost based on the model's pricing. Users SHALL be able to set a monthly research budget per domain. When the budget is reached, research runs SHALL be paused and the user notified.

#### Scenario: Monthly budget exceeded
- **WHEN** the accumulated research cost for a domain exceeds the configured monthly budget of $10
- **THEN** all scheduled research runs are paused, a notification is sent, and the user must manually resume or increase the budget to continue
