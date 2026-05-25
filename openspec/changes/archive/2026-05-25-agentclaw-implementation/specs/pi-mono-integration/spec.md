## ADDED Requirements

### Requirement: SDK Initialization with AuthStorage
The pi-mono SDK SHALL be initialized on application startup in the main process. The `AuthStorage` module SHALL be configured to persist API keys using Electron's `safeStorage` encryption. The SDK init MUST complete before any model-dependent features become available.

#### Scenario: Application startup with stored credentials
- **WHEN** the application starts and encrypted API keys exist in the local store
- **THEN** AuthStorage decrypts the keys, the pi-mono SDK initializes with valid credentials, and all model-dependent UI elements are enabled

#### Scenario: Application startup without stored credentials
- **WHEN** the application starts and no API keys are stored
- **THEN** the pi-mono SDK initializes in a degraded mode; model-dependent features show a prompt to configure API keys via the onboarding flow

### Requirement: Provider Registration
The system SHALL register exactly 9 LLM providers with the pi-mono `ModelRegistry`: Anthropic, OpenAI, DeepSeek, Google, Groq, Ollama, OpenRouter, xAI, and Mistral. Each provider registration MUST include its default base URL, available models list, and authentication method. Providers without a configured API key SHALL be registered but marked as unavailable.

#### Scenario: Registering Anthropic provider
- **WHEN** the user has configured an Anthropic API key
- **THEN** the Anthropic provider is registered with the ModelRegistry, its models (Claude Opus, Sonnet, Haiku) are listed as available, and the provider status shows "connected"

#### Scenario: Provider without API key
- **WHEN** the Ollama provider is registered but no Ollama server is reachable
- **THEN** the provider status shows "unavailable" with a hint to start the local Ollama server; the provider's models are greyed out in the model selector

### Requirement: Custom Tool Definitions
The system SHALL register 4 custom tools with the pi-mono agent: `domain_research`, `knowledge_write`, `timeline_analyze`, and `framework_execute`. Each tool SHALL have a typed JSON schema for its parameters and SHALL invoke the corresponding internal module via the IPC bridge.

#### Scenario: Agent invokes the knowledge_write tool
- **WHEN** the pi-mono agent calls `knowledge_write` with parameters `{ domainId, title, content, tags }`
- **THEN** a new knowledge node is created in the specified domain, the node is embedded and indexed, and the tool returns `{ success: true, nodeId }` to the agent

#### Scenario: Agent invokes the domain_research tool
- **WHEN** the pi-mono agent calls `domain_research` with parameters `{ domainId, query, depth }`
- **THEN** the research module executes a search query, summarizes the results, and returns structured findings to the agent for further reasoning

### Requirement: Extension Loading
The pi-mono SDK SHALL support loading domain-specific extensions at runtime. Each domain MAY define an `extensions/` directory containing tool definitions and prompt templates that are registered with the agent when that domain is active.

#### Scenario: Activating a domain with custom extensions
- **WHEN** the user switches to a domain that has custom extensions in its `extensions/` directory
- **THEN** the domain's tools and prompt templates are registered with the active agent session; when the user switches away, those extensions are unregistered

### Requirement: Session Creation and Management
Each expert chat conversation SHALL create a dedicated pi-mono agent session. Sessions SHALL persist across application restarts by serializing the conversation history to the `conversations` and `messages` database tables. A session SHALL be resumable within 2 seconds.

#### Scenario: Creating a new chat session
- **WHEN** the user starts a new expert chat in a domain
- **THEN** a new pi-mono agent session is created with the domain's context (knowledge nodes, recent decisions, active framework) pre-loaded, and the session ID is stored in the database

#### Scenario: Resuming an existing session
- **WHEN** the user reopens a previously active conversation
- **THEN** the session is restored from the database with full message history, and the agent context is reconstructed from the serialized state
