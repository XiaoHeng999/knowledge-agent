## ADDED Requirements

### Requirement: Tree-Shaped Conversation UI
The expert chat SHALL display conversations as a tree structure where each user message MAY have multiple AI responses (branches). The user SHALL be able to branch from any point in the conversation by editing a previous message or requesting an alternative response. The tree SHALL be collapsible/expandable at each node.

#### Scenario: Branching a conversation
- **WHEN** the user clicks "Retry" on an AI response or edits a previous user message
- **THEN** a new branch is created from that point, the original branch is preserved, and a branch selector appears allowing the user to toggle between branches

#### Scenario: Collapsing and expanding conversation branches
- **WHEN** the user clicks the collapse toggle on a conversation node with children
- **THEN** all descendant nodes are hidden, replaced by a "... N hidden messages" indicator; clicking again expands the branch

### Requirement: Pi-Mono Agent Session Integration
Each conversation SHALL be backed by a pi-mono agent session with full tool access. The agent SHALL have access to the `domain_research`, `knowledge_write`, `timeline_analyze`, and `framework_execute` tools. Agent responses SHALL stream token-by-token to the UI with a typing indicator.

#### Scenario: Agent uses a tool during conversation
- **WHEN** the agent determines it needs to write a knowledge node during a conversation
- **THEN** the tool call is displayed in the chat UI as an expandable "Used tool: knowledge_write" card, the tool result is shown, and the agent's final response incorporates the tool's output

#### Scenario: Streaming agent response
- **WHEN** the agent begins generating a response
- **THEN** tokens are streamed to the UI in real-time with a blinking cursor; the response area auto-scrolls to follow the stream

### Requirement: Domain Context Auto-Loading
When a new conversation is started within a domain, the system SHALL automatically load the domain's recent knowledge nodes (last 20), active predictions, recent decisions, and domain configuration into the agent's context window. This context SHALL be included as a system prompt prefix.

#### Scenario: Starting a conversation with domain context
- **WHEN** the user creates a new chat in the "AI Research" domain
- **THEN** the agent receives a system prompt containing the domain's last 20 knowledge nodes, active predictions, and recent decisions, enabling contextually relevant responses

#### Scenario: Domain context exceeds token limit
- **WHEN** the loaded domain context exceeds 50% of the model's context window
- **THEN** the system prioritizes the most recent and highest-confidence knowledge nodes, truncates older entries, and logs a warning about context overflow

### Requirement: Slash Command Parsing
The chat input SHALL support 10 slash commands: `/daily`, `/deep-dive`, `/summarize`, `/timeline`, `/framework`, `/connect`, `/predict`, `/skill`, `/review`, `/import`. Each command SHALL trigger a pre-defined agent workflow with domain context pre-loaded. Commands SHALL be discoverable via a command palette triggered by typing `/`.

#### Scenario: Invoking the /summarize command
- **WHEN** the user types `/summarize` in the chat input
- **THEN** the agent generates a comprehensive summary of all knowledge nodes in the active domain, formatted as a structured document with sections for key findings, open questions, and recommended next steps

#### Scenario: Command palette discovery
- **WHEN** the user types `/` in the chat input
- **THEN** a dropdown appears listing all available commands with descriptions; the user can navigate with arrow keys and select with Enter

### Requirement: Conversation Persistence and Search
All conversations and messages SHALL be persisted in the database. The user SHALL be able to search across all conversations using full-text search. Search results SHALL highlight matching text and link to the specific message in context.

#### Scenario: Searching conversation history
- **WHEN** the user enters "transformer architecture" in the conversation search bar
- **THEN** all conversations containing that phrase are listed with highlighted matches, clicking a result scrolls to and highlights the matching message in the conversation tree
