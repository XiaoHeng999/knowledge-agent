## ADDED Requirements

### Requirement: Domain Timeline Component
Each domain SHALL have a timeline view displaying events, milestones, and predictions on a chronological axis. The timeline SHALL support zoom levels (month, quarter, year) and SHALL render entries as cards positioned along a horizontal or vertical axis. Each entry SHALL display: date, title, type badge (event/prediction/milestone), and a brief description.

#### Scenario: Viewing a domain timeline
- **WHEN** the user navigates to the timeline view for a domain
- **THEN** all timeline entries (events, predictions, milestones) are displayed chronologically, each as a card with date, title, type badge, and description; the timeline defaults to the "quarter" zoom level showing the last 3 months

#### Scenario: Zooming the timeline to year view
- **WHEN** the user selects the "Year" zoom level
- **THEN** the timeline compresses to show 12 months of entries, entries are grouped by month, and the scroll/navigation adjusts accordingly

### Requirement: Trend Analysis Generation
The system SHALL generate trend analyses by examining patterns across knowledge nodes within a domain. A trend analysis SHALL identify: emerging topics, declining topics, sentiment shifts, and velocity of knowledge accumulation. Trend analyses SHALL be triggered manually or on a configurable schedule.

#### Scenario: Generating a trend analysis
- **WHEN** the user clicks "Analyze Trends" for a domain with 30+ knowledge nodes
- **THEN** the system uses the configured model to analyze knowledge patterns and generates a trend report identifying: top 5 emerging topics, top 3 declining topics, and knowledge velocity metrics (nodes added per week)

#### Scenario: Trend analysis with insufficient data
- **WHEN** the user requests a trend analysis for a domain with fewer than 10 knowledge nodes
- **THEN** the system displays: "Insufficient data for trend analysis. At least 10 knowledge nodes required (current: 7)." and the action is disabled

### Requirement: Prediction Creation and Management
The system SHALL support creating predictions about future developments within a domain. Each prediction SHALL have: a statement (text), a target date, a confidence score (0-100%), a basis (linked knowledge nodes and analyses), a status (active/confirmed/missed/expired), and a creation date. Predictions SHALL be displayed on the timeline with visual distinction from events.

#### Scenario: Creating a prediction
- **WHEN** the user creates a prediction: "GPT-5 will be released by Q3 2026" with 70% confidence
- **THEN** the prediction is stored in the `predictions` table, appears on the timeline as a dashed-border card with a confidence badge "70%", and has status "active"

#### Scenario: Agent-suggested prediction
- **WHEN** the trend analysis identifies a strong signal and the agent proposes a prediction
- **THEN** the prediction appears as a draft with "Suggested by AI" badge, linked to the supporting knowledge nodes, and the user can accept, modify, or reject it

### Requirement: Prediction Accuracy Tracking
When a prediction's target date passes or the user manually resolves it, the system SHALL track the outcome. Accuracy metrics SHALL be computed per domain and overall: percentage confirmed, percentage missed, average confidence of confirmed vs. missed predictions, and a calibration score.

#### Scenario: Resolving a confirmed prediction
- **WHEN** the user marks a prediction "GPT-5 will be released by Q3 2026" as "Confirmed"
- **THEN** the prediction status changes to "confirmed", the resolution date is recorded, and the domain's accuracy metrics update to include this result

#### Scenario: Viewing prediction accuracy dashboard
- **WHEN** the user navigates to the prediction accuracy view for a domain
- **THEN** the dashboard shows: total predictions (N), confirmed (N, %), missed (N, %), average confidence of confirmed predictions, average confidence of missed predictions, and a calibration curve
