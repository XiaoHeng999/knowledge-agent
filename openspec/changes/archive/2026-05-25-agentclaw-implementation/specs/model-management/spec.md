## ADDED Requirements

### Requirement: API Key Import and Encrypted Storage
The system SHALL allow users to import API keys for each provider. Keys MUST be encrypted using Electron's `safeStorage` API before being persisted to disk. Keys SHALL NEVER be stored in plaintext. The key management UI SHALL mask all keys except the last 4 characters.

#### Scenario: Importing an Anthropic API key
- **WHEN** the user pastes an Anthropic API key and clicks "Save"
- **THEN** the key is encrypted via `safeStorage.encryptString()`, stored in the `model_configs` table, and the UI displays `sk-ant-...****` with a "verified" badge after a test API call succeeds

#### Scenario: Key validation failure
- **WHEN** the user imports an API key that is invalid or expired
- **THEN** the system displays an error message indicating the key could not be verified, the key is NOT persisted, and the user is prompted to re-enter

### Requirement: Model List and Status Display
The system SHALL display all available models from all registered providers in a unified model list. Each model entry SHALL show: provider name, model name, context window size, status (available/unavailable/unknown), and the last used timestamp. The list SHALL be filterable by provider and searchable by model name.

#### Scenario: Viewing all available models
- **WHEN** the user opens the model management view
- **THEN** all models from all 9 providers are listed with their status, context window, and a green/yellow/red indicator for available/degraded/unavailable

#### Scenario: Filtering models by provider
- **WHEN** the user selects "Anthropic" from the provider filter dropdown
- **THEN** only Anthropic models are displayed (Claude Opus, Sonnet, Haiku) with their respective statuses

### Requirement: Runtime Model Switching
The user SHALL be able to switch the active model at any time during a conversation. The switch MUST take effect on the next message without losing conversation history. The system SHALL display the currently active model in the chat input area.

#### Scenario: Switching models mid-conversation
- **WHEN** the user clicks the model indicator and selects a different model (e.g., from Claude Sonnet to GPT-4o)
- **THEN** the next user message is sent to the newly selected model, the conversation continues seamlessly, and the model indicator updates to reflect the new selection

### Requirement: Domain Default Model Configuration
Each domain SHALL support configuring a default model for its expert chat and research operations. When a domain has a default model configured, new conversations in that domain SHALL use it automatically unless the user overrides it.

#### Scenario: Setting a domain default model
- **WHEN** the user configures "DeepSeek Chat" as the default model for the "AI Research" domain
- **THEN** all new conversations created in that domain automatically use DeepSeek Chat, and the chat input shows "DeepSeek Chat" as the active model

#### Scenario: Domain default model unavailable
- **WHEN** the user opens a conversation in a domain whose default model is currently unavailable
- **THEN** the system falls back to the global default model and displays a notification: "Default model unavailable, using [fallback model]"
