## ADDED Requirements

### Requirement: URL Import and Content Extraction
The system SHALL support importing content from URLs. The import pipeline SHALL: (1) fetch the URL content, (2) extract readable text using a readability parser (stripping navigation, ads, footers), (3) extract metadata (title, author, publish date, Open Graph tags), and (4) create an inbox item with the extracted content. Import SHALL handle HTTP errors, timeouts, and paywalled content gracefully.

#### Scenario: Importing a blog article
- **WHEN** the user pastes a URL `https://example.com/blog/transformer-explained` and clicks "Import"
- **THEN** the system fetches the page, extracts the article text, title "Transformer Architecture Explained", author, and publish date, and creates an inbox item ready for AI summary generation

#### Scenario: Importing from a paywalled or restricted URL
- **WHEN** the user imports a URL that returns a 403 Forbidden or requires authentication
- **THEN** the system displays an error: "Unable to access this URL (403 Forbidden). The content may be behind a paywall or require authentication." and offers to create a manual entry instead

### Requirement: PDF Import and Text Extraction
The system SHALL support importing PDF files via drag-and-drop, file picker, or pasted file path. The import pipeline SHALL extract text from PDFs (including multi-page documents), preserving heading structure where possible. Scanned PDFs (image-based) SHALL be flagged as requiring OCR, which is not supported natively.

#### Scenario: Importing a text-based PDF
- **WHEN** the user drops a 12-page research paper PDF onto the import area
- **THEN** the system extracts text from all pages, identifies the title from the first page, and creates an inbox item with the extracted text and metadata (page count, file size)

#### Scenario: Importing a scanned PDF
- **WHEN** the user imports a scanned PDF containing images of text
- **THEN** the system detects that no extractable text was found and displays: "This appears to be a scanned document. Text extraction is not available for image-based PDFs. You may enter a summary manually."

### Requirement: RSS Subscription Management
The system SHALL support subscribing to RSS and Atom feeds per domain. Feeds SHALL be polled at a configurable interval (default: 6 hours). New items from feeds SHALL be automatically imported into the domain's inbox. The system SHALL track which items have already been imported to avoid duplicates.

#### Scenario: Subscribing to an RSS feed
- **WHEN** the user adds an RSS feed URL `https://blog.example.com/feed.xml` to a domain's sources
- **THEN** the system validates the feed, fetches current items, imports them to the inbox, and schedules polling at the configured interval

#### Scenario: RSS poll finds new items
- **WHEN** the RSS poll runs and finds 3 new articles since the last poll
- **THEN** the 3 new articles are extracted, inbox items are created, and a notification shows "3 new items from [feed name]"

#### Scenario: RSS feed becomes unavailable
- **WHEN** an RSS feed returns errors on 3 consecutive poll attempts
- **THEN** the feed is marked as "unhealthy", polling frequency is reduced, and the user is notified with an option to remove or fix the feed URL

### Requirement: Import-to-Knowledge Pipeline
The import pipeline SHALL route all imported content through a standard flow: raw content extraction, metadata extraction, AI summary generation, inbox staging, user review, and knowledge node creation. Each step SHALL be trackable via the import's status field: `extracting`, `summarizing`, `in_review`, `accepted`, `rejected`.

#### Scenario: Tracking import pipeline status
- **WHEN** the user imports a URL
- **THEN** the import record transitions through statuses: `extracting` -> `summarizing` -> `in_review`; the user can see the current status in the inbox item's detail panel

### Requirement: Source Tracking and Provenance
Every imported item SHALL retain full provenance: original URL or file path, import timestamp, extraction method used, content hash (SHA-256), and the domain it was imported into. This provenance data SHALL be stored in the `imports` table and linked to the resulting knowledge node.

#### Scenario: Viewing import provenance
- **WHEN** the user views a knowledge node that was created from an import
- **THEN** the detail panel shows: "Source: https://example.com/article | Imported: 2026-05-22 14:30 | Method: URL extraction | Content hash: abc123..."
