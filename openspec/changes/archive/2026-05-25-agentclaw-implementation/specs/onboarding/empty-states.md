# Empty State Scenarios (7 Views)

> Version: 1.0 | Date: 2026-05-22
> Task: P0.6.2 — Design 7 empty state scenarios
> Combined from: T6 + DT1 + DT5

---

## Overview

Each empty state follows a consistent pattern: warm illustration → empathetic headline → contextual description → primary action button. The "No API Key" state is a special blocking state (full-screen guidance card, not a regular empty state).

---

## Empty State Template

Every empty state consists of:

```
┌────────────────────────────────────────────┐
│                                            │
│              [Illustration]                │
│             (emoji or icon)                │
│                                            │
│          Headline (16px Bold)              │
│     Description text (14px Regular)        │
│          max 2 lines, warm tone            │
│                                            │
│         [Primary Action Button]            │
│                                            │
│     Secondary link (optional)              │
│                                            │
└────────────────────────────────────────────┘
```

**Tone guidelines**:
- Headline: warm, encouraging, conversational ("Your knowledge base is waiting to grow")
- Description: explains what will appear here and why it's valuable
- Action: direct, single verb ("Add your first source", "Start a conversation")
- Avoid: technical jargon, empty/void imagery, error-like presentation

---

## 1. Empty Inbox

```
┌────────────────────────────────────────────┐
│                                            │
│                  📥                        │
│                                            │
│          Your inbox is clear               │
│                                            │
│   New research findings and imported       │
│   content will appear here for review.     │
│                                            │
│        [Import your first source]          │
│                                            │
│     or try a quick note ↓                  │
│                                            │
└────────────────────────────────────────────┘
```

**Components**:
- Illustration: inbox icon with subtle checkmark
- Primary action: "Import your first source" → opens import dialog
- Secondary: "Quick note" → opens text input for rapid inbox entry
- Context: explains inbox purpose (review before adding to knowledge base)

**Trigger**: `inbox_items` count = 0 for current user

---

## 2. Empty Domain

```
┌────────────────────────────────────────────┐
│                                            │
│                 🟣                         │
│          (domain color dot)                │
│                                            │
│      This domain is a blank canvas         │
│                                            │
│   Start building your knowledge by         │
│   researching a topic or adding sources.   │
│                                            │
│        [Start first research]              │
│                                            │
│     or import existing content →           │
│                                            │
└────────────────────────────────────────────┘
```

**Components**:
- Illustration: domain color dot (matching the domain's configured color)
- Primary action: "Start first research" → triggers research agent for this domain
- Secondary: "Import content" → opens import dialog scoped to this domain
- Context: references the domain name and suggests first actions

**Trigger**: Selected domain has 0 knowledge_nodes

---

## 3. Empty Timeline

```
┌────────────────────────────────────────────┐
│                                            │
│                 📅                         │
│                                            │
│        No events on the timeline           │
│                                            │
│   As your knowledge base grows, key        │
│   events and predictions will appear here. │
│                                            │
│       [Run research to discover events]    │
│                                            │
│     Timeline updates automatically →       │
│                                            │
└────────────────────────────────────────────┘
```

**Components**:
- Illustration: timeline icon with empty dots
- Primary action: "Run research" → triggers research for the domain
- Secondary: explains automatic timeline population from research results
- Context: timeline entries come from research findings and imported content

**Trigger**: `timeline_entries` count = 0 for selected domain

---

## 4. Empty Research Dashboard

```
┌────────────────────────────────────────────┐
│                                            │
│                 🔬                         │
│                                            │
│       No research runs yet                 │
│                                            │
│   Set up automated research or trigger     │
│   a manual run to start discovering.       │
│                                            │
│        [Schedule first research]           │
│                                            │
│     or run one now →                       │
│                                            │
└────────────────────────────────────────────┘
```

**Components**:
- Illustration: microscope/research icon
- Primary action: "Schedule first research" → opens schedule config
- Secondary: "Run one now" → immediate research trigger
- Context: explains that research can be scheduled or manual

**Trigger**: `research_runs` count = 0 for selected domain

---

## 5. Empty Expert Chat

```
┌────────────────────────────────────────────┐
│                                            │
│                 💬                         │
│                                            │
│    Ask anything about this domain          │
│                                            │
│   Your AI expert is ready to discuss       │
│   topics, answer questions, and help       │
│   you explore deeper.                      │
│                                            │
│    (input field auto-focused at bottom)    │
│                                            │
│   Suggested starters:                      │
│   • "What are the key concepts in [domain]?"│
│   • "Summarize recent developments"        │
│   • "What should I learn next?"            │
│                                            │
└────────────────────────────────────────────┘
```

**Components**:
- Illustration: chat bubble icon
- No explicit button — input field is auto-focused
- 3 suggested starter prompts (clickable, auto-fill input)
- Context: invites interaction rather than presenting as "empty"

**Trigger**: `conversations` count = 0 for selected domain (or no messages in current conversation)

---

## 6. No API Key (Blocking State — Full-Screen Guidance)

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│  ┌──────────────────────────────────────────────────────┐    │
│  │                                                      │    │
│  │                    ⚠️                                 │    │
│  │                                                      │    │
│  │          AI features require an API key              │    │
│  │                                                      │    │
│  │   To use expert chat, automated research, and        │    │
│  │   other AI features, connect a model provider.       │    │
│  │                                                      │    │
│  │   ┌──────────────────────────────────────────┐      │    │
│  │   │  🔑 Enter API Key                        │      │    │
│  │   │  Use your own key from any provider       │      │    │
│  │   └──────────────────────────────────────────┘      │    │
│  │                                                      │    │
│  │   ┌──────────────────────────────────────────┐      │    │
│  │   │  🆓 Free Trial                           │      │    │
│  │   │  50 messages/day via shared proxy         │      │    │
│  │   └──────────────────────────────────────────┘      │    │
│  │                                                      │    │
│  │   ┌──────────────────────────────────────────┐      │    │
│  │   │  🤖 Local (Ollama)                       │      │    │
│  │   │  Run models locally, no key needed        │      │    │
│  │   └──────────────────────────────────────────┘      │    │
│  │                                                      │    │
│  │   You can still browse and manage existing          │    │
│  │   knowledge without an API key.                     │    │
│  │                                                      │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**Key differences from regular empty states**:
1. **Full-screen overlay** — covers entire main content area, not a small card
2. **Blocking** — prevents access to AI features (chat, research, analysis)
3. **3 solution paths** — API key, free trial, or Ollama
4. **Non-blocking note** — explains browsing is still available
5. **Not dismissible** — no "Skip" option; user must either connect or browse in limited mode

**Behavior**:
- Shown when user tries to access an AI feature but `api_keys` table is empty AND no Ollama connection
- Does NOT block access to: knowledge browsing, settings, domain management, import (queued)
- After connecting, the overlay dismisses and the requested feature opens

**Trigger**: User navigates to AI feature (chat, research, analysis) with no valid API key configured

---

## 7. Empty Knowledge List

```
┌────────────────────────────────────────────┐
│                                            │
│                 📚                         │
│                                            │
│      No knowledge nodes yet                │
│                                            │
│   Knowledge nodes are created              │
│   automatically from research and          │
│   imports, or you can create one manually. │
│                                            │
│        [Create knowledge node]             │
│                                            │
│   or switch to Graph view →               │
│                                            │
└────────────────────────────────────────────┘
```

**Components**:
- Illustration: book/library icon
- Primary action: "Create knowledge node" → opens creation form
- Secondary: "Switch to Graph view" → toggles to graph (which will also show empty state)
- Context: explains the two ways nodes are created (auto + manual)

**Trigger**: `knowledge_nodes` count = 0 for selected domain

---

## Empty State Component Spec

```typescript
interface EmptyStateConfig {
  /** Illustration (emoji string or icon name) */
  illustration: string;
  /** Headline text */
  headline: string;
  /** Description text (max 2 lines) */
  description: string;
  /** Primary action */
  primaryAction: {
    label: string;
    onClick: () => void;
  };
  /** Optional secondary action */
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
}
```

**Component**: `<EmptyState config={EmptyStateConfig} />`
**Location**: `src/components/ui/empty-state.tsx`

---

## Validation

- [x] 7 empty states defined with wireframes
- [x] Each has headline, description, and primary action
- [x] "No API Key" is full-screen blocking state (not a regular empty state)
- [x] All states use warm, encouraging language
- [x] Consistent component interface for implementation
- [x] Trigger conditions defined for each state
