# Onboarding Flow Wireframes

> Version: 1.0 | Date: 2026-05-22
> Task: P0.6.1 — Design onboarding flow wireframes
> Combined from: T6 + DT1 + DT5

---

## Overview

The onboarding flow is a 4-step modal overlay displayed on first launch. It guides users through: Welcome → API Key Setup → Create First Domain → Guided Research Tour. Each step has "Skip" and "Next" options. Onboarding state is tracked in `settings.onboarding_completed` and does not reappear on subsequent launches.

---

## Flow Diagram

```
App Launch
    │
    ├── settings.onboarding_completed === true?
    │   ├── YES → Main Application (dashboard)
    │   └── NO → Step 1: Welcome Screen
    │               │
    │               ├── "Get Started" → Step 2: API Key Setup
    │               │                      │
    │               │                      ├── "Use Free Trial" → validate → Step 3
    │               │                      ├── "Configure Key" → validate → Step 3
    │               │                      ├── "Use Ollama" → detect → Step 3
    │               │                      └── "Skip" → Step 3 (limited mode)
    │               │
    │               │               Step 3: Create First Domain
    │               │                      │
    │               │                      ├── Select template → create domain → Step 4
    │               │                      └── "Skip" → Step 4
    │               │
    │               │               Step 4: Guided Research Tour
    │               │                      │
    │               │                      ├── "Take the Tour" → 5-spotlight tour → Main App
    │               │                      └── "Skip Tour" → Main App
    │               │
    │               └── "Skip All" → Main App (minimal mode)
    │
    └── Onboarding completes → settings.onboarding_completed = true
```

---

## Step 1: Welcome Screen

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│                    ◉ ○ ○ ○                                   │  ← Step indicator
│                                                              │
│              ┌──────────────────────────────┐                │
│              │                              │                │
│              │        🐙 AgentClaw           │                │
│              │                              │                │
│              │   Comprehension over         │                │
│              │   Retrieval                  │                │
│              │                              │                │
│              │   Your AI-powered research   │                │
│              │   companion that doesn't     │                │
│              │   just store knowledge —     │                │
│              │   it understands it.          │                │
│              │                              │                │
│              │   ┌────────────────────┐     │                │
│              │   │                    │     │                │
│              │   │  • Auto-research   │     │                │
│              │   │  • Expert dialogue │     │                │
│              │   │  • Knowledge graph │     │                │
│              │   │  • Timeline &      │     │                │
│              │   │    predictions     │     │
│              │   │                    │     │                │
│              │   └────────────────────┘     │                │
│              │                              │                │
│              │  [ ────── Get Started ───── ]│                │
│              │                              │                │
│              └──────────────────────────────┘                │
│                                                              │
│                        Skip                                  │
└──────────────────────────────────────────────────────────────┘
```

**Layout**:
- Full-screen modal overlay with semi-transparent dark background
- Centered card: 480px wide, auto height
- Step indicator: 4 dots at top (filled = current step)
- Application name with tagline
- 4 feature highlights in a 2x2 grid
- Primary CTA: "Get Started" button (full width)
- Skip link at bottom (muted text)

**Typography**:
- App name: 32px, Bold, `var(--accent)` color
- Tagline: 18px, Semibold
- Feature list: 14px, Regular
- CTA: 16px, Semibold, on accent background

---

## Step 2: API Key Setup

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│                    ○ ◉ ○ ○                                   │
│                                                              │
│              ┌──────────────────────────────┐                │
│              │   Connect Your AI Model      │                │
│              │                              │                │
│              │   Choose how to power your   │                │
│              │   research assistant.         │                │
│              │                              │                │
│              │  ┌──────────────────────┐    │                │
│              │  │ 🔑 Configure API Key │    │                │
│              │  │ Enter your own key    │    │                │
│              │  │ from any provider     │    │                │
│              │  └──────────────────────┘    │                │
│              │                              │                │
│              │  ┌──────────────────────┐    │                │
│              │  │ 🆓 Free Trial        │    │                │
│              │  │ 50 messages/day via   │    │                │
│              │  │ shared proxy          │    │                │
│              │  └──────────────────────┘    │                │
│              │                              │                │
│              │  ┌──────────────────────┐    │                │
│              │  │ 🤖 Local (Ollama)    │    │                │
│              │  │ Run models locally,   │    │                │
│              │  │ no API key needed     │    │                │
│              │  └──────────────────────┘    │                │
│              │                              │                │
│              │  [Back]          [Skip →]    │                │
│              │                              │                │
│              └──────────────────────────────┘                │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**Sub-view: Configure API Key (expanded)**

```
              ┌──────────────────────────────┐
              │   Configure API Key          │
              │                              │
              │   Provider:                  │
              │   [Anthropic ▼]              │
              │                              │
              │   API Key:                   │
              │   [sk-ant-••••••••••••]      │
              │                              │
              │   [Test Connection]          │
              │   ✓ Connected successfully   │
              │                              │
              │  [Back]    [Continue →]      │
              └──────────────────────────────┘
```

**Sub-view: Ollama Setup**

```
              ┌──────────────────────────────┐
              │   Local Model (Ollama)       │
              │                              │
              │   Status:                    │
              │   ✓ Ollama detected on       │
              │     localhost:11434           │
              │                              │
              │   Available Models:           │
              │   • llama3:8b (4.7 GB)       │
              │   • mistral:7b (4.1 GB)      │
              │                              │
              │   Recommended:               │
              │   [Install llama3:8b]         │
              │                              │
              │  [Back]    [Continue →]      │
              └──────────────────────────────┘
```

**Layout**:
- 3 option cards in a vertical stack, each clickable
- Selected card expands to show configuration details
- Test Connection button with loading spinner and result indicator
- Back button returns to option selection
- Skip allows proceeding without API key (limited mode)

---

## Step 3: Create First Domain

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│                    ○ ○ ◉ ○                                   │
│                                                              │
│              ┌──────────────────────────────┐                │
│              │   Create Your First Domain   │                │
│              │                              │                │
│              │   Domains organize your      │                │
│              │   research into focused      │                │
│              │   knowledge areas.            │                │
│              │                              │                │
│              │  ┌──────┐ ┌──────┐ ┌──────┐ │                │
│              │  │ AI/  │ │ Web  │ │General│ │                │
│              │  │  ML  │ │ Dev  │ │Research│ │               │
│              │  │      │ │      │ │      │ │                │
│              │  │arXiv │ │GitHub│ │RSS + │ │                │
│              │  │papers│ │repos │ │notes │ │                │
│              │  │      │ │      │ │      │ │                │
│              │  └──────┘ └──────┘ └──────┘ │                │
│              │                              │                │
│              │  ┌──────┐ ┌──────┐           │                │
│              │  │Prod &│ │Custom│           │                │
│              │  │Design│ │      │           │                │
│              │  │      │ │      │           │                │
│              │  └──────┘ └──────┘           │                │
│              │                              │                │
│              │  Domain Name (optional):     │                │
│              │  [AI & Machine Learning    ] │                │
│              │                              │                │
│              │  [Back]    [Create Domain →] │                │
│              │                              │                │
│              └──────────────────────────────┘                │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**Layout**:
- 5 template cards in a 3+2 grid layout
- Selected card shows highlight border in accent color
- Template pre-fills domain name (editable)
- Each card shows: icon, template name, brief description, source types
- "Custom" template shows blank name input

---

## Step 4: Guided Research Tour

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│                    ○ ○ ○ ◉                                   │
│                                                              │
│              ┌──────────────────────────────┐                │
│              │   You're All Set!            │                │
│              │                              │                │
│              │   🎉 Your first domain is    │                │
│              │   ready.                     │                │
│              │                              │                │
│              │   Would you like a quick     │                │
│              │   tour of the interface?     │                │
│              │                              │                │
│              │   The tour covers:           │                │
│              │   • Domain sidebar           │                │
│              │   • Research triggers        │                │
│              │   • Inbox & knowledge base   │                │
│              │   • Expert chat              │                │
│              │   • Command palette (⌘K)     │                │
│              │                              │                │
│              │  [Skip Tour]  [Take Tour →]  │                │
│              │                              │                │
│              └──────────────────────────────┘                │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**Tour Spotlight Overlay** (after clicking "Take Tour"):

```
┌──────────────────────────────────────────────────────────────┐
│  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │
│  ░░░░░░░░┌──────────┐░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │
│  ░░░░░░░░│ 🔍 Search │░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │
│  ░░░░░░░░│──────────│░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │
│  ░░░░░░░░│ 📥 Inbox │░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │
│  ░░░░░░░░│ ─────────│░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │
│  ░░░░░░░░│ 🟣 AI/ML │←─────────── Your domains live here.  │
│  ░░░░░░░░│   Knowledge│          Each one is a separate     │
│  ░░░░░░░░│   Timeline │          research space.             │
│  ░░░░░░░░│   Research │                                   │
│  ░░░░░░░░│   Expert   │          [Next →]  [Skip Tour]     │
│  ░░░░░░░░│ ─────────│░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │
│  ░░░░░░░░│ ⚙ Settings│░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │
│  ░░░░░░░░└──────────┘░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │
│  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │
└──────────────────────────────────────────────────────────────┘
```

**Tour Steps** (5 spotlights):

| Step | Target | Tooltip Text |
|------|--------|-------------|
| 1 | Domain sidebar | "Your domains live here. Each one is a separate research space." |
| 2 | "Research Now" button | "Trigger research on-demand or set up automatic schedules." |
| 3 | Inbox icon | "New findings land here. Review AI summaries before adding to your knowledge base." |
| 4 | Knowledge tab | "Your organized knowledge. Switch between list and graph views." |
| 5 | Chat input / ⌘K | "Ask questions to your domain expert. Press ⌘K for the command palette." |

**Tour Mechanics**:
- Dark overlay covers entire app (rgba(0,0,0,0.75))
- Target element gets a "spotlight" cutout (bright border, no overlay)
- Tooltip appears adjacent to the spotlight (positioned to avoid clipping)
- "Next" advances, "Skip Tour" dismisses entirely
- After step 5, overlay dismisses and user is in main app
- Tour state tracked in `settings.tour_completed`

---

## State Transitions

| From | To | Trigger |
|------|----|---------|
| App launch | Step 1 | `settings.onboarding_completed` is falsy |
| Step 1 | Step 2 | "Get Started" click |
| Step 1 | Main App | "Skip" click |
| Step 2 | Step 3 | API key validated or "Skip" |
| Step 2 | Step 2 (sub) | Select API config option |
| Step 3 | Step 4 | Domain created or "Skip" |
| Step 4 | Main App | "Skip Tour" |
| Step 4 | Tour | "Take Tour" |
| Tour step N | Tour step N+1 | "Next" |
| Tour step 5 | Main App | Auto-dismiss |

---

## Responsive Behavior

- Onboarding modal is always centered and fixed width (480px)
- If viewport < 520px wide, modal scales to 90vw
- Tour spotlights adapt to actual element positions (no fixed coordinates)

---

## Validation

- [x] 4-step flow has detailed wireframe for each step
- [x] Step indicators show progress clearly
- [x] Each step has "Skip" option
- [x] API Key setup supports 3 paths (key, free trial, Ollama)
- [x] Domain creation offers 5 template options
- [x] Guided tour covers 5 key interface areas
- [x] Flow terminates at main application
- [x] State persisted in settings table
