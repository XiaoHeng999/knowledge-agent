## ADDED Requirements

### Requirement: Welcome Screen Flow
The application SHALL display a welcome screen on first launch that introduces AgentClaw's core concepts: domains, knowledge management, and AI-powered research. The welcome screen SHALL have 3 steps: (1) Welcome message with brief description, (2) API key setup, (3) first domain creation. Each step SHALL have a "Skip" option. The onboarding state SHALL be tracked in the `settings` table and SHALL NOT reappear on subsequent launches.

#### Scenario: First-time user sees welcome screen
- **WHEN** the application is launched for the first time (no settings database exists)
- **THEN** the welcome screen appears in a modal overlay covering the main application, with step indicators showing progress through the 3-step flow

#### Scenario: Returning user skips onboarding
- **WHEN** the application is launched and the `settings.onboarding_completed` flag is `true`
- **THEN** the main application interface loads directly without showing the welcome screen

### Requirement: API Key Setup with Free Trial and Local Options
Step 2 of onboarding SHALL present API key configuration. The system SHALL offer three paths: (1) "Use Free Trial" - connect to a shared proxy with limited daily credits, (2) "Configure Your Own Key" - enter an API key for any supported provider, (3) "Use Local Model (Ollama)" - connect to a locally running Ollama instance. Each option SHALL have clear instructions and a test/validation step.

#### Scenario: Selecting the free trial option
- **WHEN** the user clicks "Use Free Trial" during onboarding
- **THEN** the system connects to the shared proxy endpoint, validates connectivity, displays the daily credit limit (e.g., "50 messages/day"), and marks the API key setup as complete

#### Scenario: Configuring an Anthropic API key
- **WHEN** the user selects "Configure Your Own Key" and enters an Anthropic API key
- **THEN** the system validates the key by making a test API call, displays a green checkmark on success, and encrypts the key for storage

#### Scenario: Setting up Ollama locally
- **WHEN** the user selects "Use Local Model (Ollama)"
- **THEN** the system checks if Ollama is running on `localhost:11434`, displays connection status, lists available local models, and suggests pulling a model if none are available

### Requirement: First Domain Creation with Preset Templates
Step 3 of onboarding SHALL guide the user to create their first domain. The system SHALL offer 5 preset templates: (1) "Software Engineering" - tech-focused with GitHub/arXiv sources, (2) "AI & Machine Learning" - ML research with arXiv/papers, (3) "Product & Design" - design research with RSS sources, (4) "Business Strategy" - market research with news sources, (5) "Custom" - blank domain. Each template SHALL pre-populate the config.yaml with relevant sources and settings.

#### Scenario: Creating a domain from the "AI & Machine Learning" template
- **WHEN** the user selects the "AI & Machine Learning" template during onboarding
- **THEN** a new domain is created with name "AI & Machine Learning", config.yaml pre-populated with arXiv sources (cs.AI, cs.LG), default model set to the user's configured model, and research schedule set to weekly

#### Scenario: Creating a custom domain
- **WHEN** the user selects "Custom" template
- **THEN** a blank domain is created with default config.yaml values, and the user is prompted to enter a name and optional description before proceeding

### Requirement: Guided Research Tour
After completing the 3-step onboarding, the system SHALL offer a guided tour demonstrating the research workflow. The tour SHALL highlight: (1) the domain sidebar, (2) the "Research Now" button, (3) the inbox with AI-generated results, (4) the knowledge base view, and (5) the expert chat. Each step SHALL use a spotlight overlay with a descriptive tooltip and a "Next" button.

#### Scenario: Starting the guided tour
- **WHEN** the user completes onboarding and clicks "Take the Tour"
- **THEN** a spotlight overlay highlights the domain sidebar, a tooltip explains "Your domains live here. Each one is a separate research space.", and a "Next" button advances to the next step

#### Scenario: Skipping the tour
- **WHEN** the user clicks "Skip Tour" at any point during the guided tour
- **THEN** the tour ends, the overlay dismisses, and the user can access the full application
