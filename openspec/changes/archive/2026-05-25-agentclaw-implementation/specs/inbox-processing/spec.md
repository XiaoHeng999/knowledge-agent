## ADDED Requirements

### Requirement: Inbox Listing and Management
The system SHALL display an inbox view showing all unprocessed items imported from URLs, PDFs, RSS feeds, and manual entries. Each inbox item SHALL display: source type icon, title (or extracted headline), source URL or filename, import timestamp, and a preview snippet. Items SHALL be sortable by date and filterable by source type.

#### Scenario: Viewing the inbox
- **WHEN** the user navigates to the inbox view
- **THEN** all unprocessed items are displayed in a list, sorted by import date descending, with source type icons (URL, PDF, RSS), title, and a 200-character preview snippet

#### Scenario: Filtering inbox by source type
- **WHEN** the user selects "PDF" from the source type filter
- **THEN** only PDF-sourced inbox items are displayed, and the item count updates to reflect the filtered total

### Requirement: AI Summary Generation
When an inbox item is selected, the system SHALL automatically generate an AI summary using the configured cheap model. The summary SHALL extract: key claims, entities mentioned, relevance score (0-1), and suggested domain assignments. Summary generation SHALL complete within 10 seconds and stream to the UI.

#### Scenario: Generating a summary for a URL import
- **WHEN** the user selects an inbox item imported from a URL
- **THEN** the system extracts the article text, sends it to the configured cheap model with a summarization prompt, and streams the summary to the detail panel showing key claims, entities, and a relevance score

#### Scenario: Summary generation fails
- **WHEN** the AI model fails to generate a summary (e.g., rate limit, network error)
- **THEN** a retry button is displayed with the error message, the raw content remains viewable, and the user can proceed with manual classification without a summary

### Requirement: User Confirmation Before Storing
The system SHALL require explicit user confirmation before storing an inbox item into a domain. The confirmation UI SHALL show the generated summary, the suggested domain, and the suggested tags. The user SHALL be able to: (1) accept as-is, (2) change the target domain, (3) edit tags, (4) edit the summary, or (5) reject the item.

#### Scenario: Accepting an inbox item with suggested values
- **WHEN** the user reviews an inbox item and clicks "Accept"
- **THEN** a new knowledge node is created in the suggested domain with the AI-generated summary, the item is removed from the inbox, and a confirmation toast appears

#### Scenario: Redirecting an inbox item to a different domain
- **WHEN** the user changes the target domain from "AI Research" to "Web Development" and clicks "Accept"
- **THEN** the knowledge node is created in the "Web Development" domain with the summary and tags, and the item is removed from the inbox

#### Scenario: Rejecting an inbox item
- **WHEN** the user clicks "Reject" on an inbox item
- **THEN** the item is marked as rejected, removed from the inbox view, and the rejection is logged for future reference

### Requirement: Domain Assignment Intelligence
The system SHALL suggest domain assignments based on content similarity to existing knowledge nodes in each domain. The suggestion algorithm SHALL use vector similarity between the inbox item's embedding and the centroid of each domain's knowledge embeddings. The top 3 domain suggestions SHALL be displayed with confidence percentages.

#### Scenario: Suggesting domains for an inbox item
- **WHEN** the AI generates a summary for an inbox item about "React Server Components"
- **THEN** the system computes similarity to each domain's knowledge centroid and displays the top 3 suggestions (e.g., "Web Development (87%)", "AI Research (23%)", "DevOps (12%)")
