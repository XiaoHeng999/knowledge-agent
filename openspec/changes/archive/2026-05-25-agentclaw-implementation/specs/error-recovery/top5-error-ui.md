# TOP 5 Error Scenario UI Wireframes

> Version: 1.0 | Date: 2026-05-22
> Covers: API failure mid-chat, model unavailable, import failure, database lock, graph render failure

---

## 1. API Failure Mid-Chat

### Error Code: `KNOWLEDGE.CHAT_API_FAILURE`

### Layout

```
┌──────────────────────────────────────────────────────┐
│  Titlebar: Domain Name > Expert Chat                  │
├────────┬──────────────────────────────┬──────────────┤
│        │                              │              │
│ Side-  │  User: "Explain transformer  │   Detail     │
│ bar    │         attention mechanism" │   Panel      │
│        │                              │              │
│        │  ┌──────────────────────────────────────┐   │
│        │  │ ⚠ Generation failed.                │   │
│        │  │   Your message has been saved.       │   │
│        │  │                                      │   │
│        │  │   [↻ Retry]                          │   │
│        │  └──────────────────────────────────────┘   │
│        │                              │              │
│        │  ┌──────────────────────────────────────┐   │
│        │  │  Type a message...          [Send ▶] │   │  ← Input ENABLED
│        │  └──────────────────────────────────────┘   │
└────────┴──────────────────────────────┴──────────────┘
```

### Visual Specification

| Element | Spec |
|---------|------|
| Error banner background | `bg-error-subtle` (red-50 equivalent, `#FEF2F2`) |
| Error banner border-left | 3px solid `accent-error` (`#EF4444`) |
| Error icon | `⚠` in `text-error` (`#DC2626`), 16px |
| Error text | 14px/Regular, `text-error` |
| Retry button | 13px/Medium, `accent-error` background, white text, 4px radius |
| Retry button hover | Darken 10%, cursor pointer |
| Draft message | User message bubble rendered normally, no response bubble |
| Input area | Fully enabled, no visual change |

### Behavior

1. User sends message → API call starts → spinner on "Send" button
2. API returns error (500/429/timeout) → spinner stops
3. Error banner appears below user message with slide-down animation (200ms ease-out)
4. User's message text preserved in the conversation
5. Auto-retry starts in background with exponential backoff
6. On auto-retry success: banner removed, response streams in
7. On manual "Retry" click: cancels auto-retry, sends immediately
8. After 10 retries: banner changes to "Unable to connect. Try switching models." with model switcher link

---

## 2. Model Unavailable

### Error Code: `MODEL.ALL_MODELS_UNAVAILABLE` / `MODEL.SWITCH_FAILURE`

### Layout — No Models Available

```
┌──────────────────────────────────────────────────────┐
│  Titlebar: Domain Name > Expert Chat                  │
├────────┬──────────────────────────────┬──────────────┤
│        │                              │              │
│ Side-  │  ┌──────────────────────────────────────┐   │
│ bar    │  │  🔴 No models available              │   │ ← Model switcher
│        │  └──────────────────────────────────────┘   │
│        │                              │              │
│        │  User: "Tell me about..."    │              │
│        │                              │              │
│        │  Assistant: (previous msg)   │              │
│        │                              │              │
│        │  ┌──────────────────────────────────────┐   │
│        │  │  🔒 Set up an API key to continue    │   │ ← Disabled input
│        │  │     chatting.                        │   │
│        │  │                                      │   │
│        │  │     [Go to Settings]                 │   │
│        │  └──────────────────────────────────────┘   │
└────────┴──────────────────────────────┴──────────────┘
│ Status: ● Offline | No models configured              │
└──────────────────────────────────────────────────────┘
```

### Layout — Single Model Unavailable (Switch Failure)

```
┌──────────────────────────────────┐
│ Toast (bottom-right, auto-stack) │
│                                  │
│  ┌────────────────────────────┐  │
│  │ ⚠ Failed to switch to     │  │
│  │   Claude Opus 4.           │  │
│  │   Staying on DeepSeek-V3.  │  │
│  │                            │  │
│  │                   [Dismiss]│  │
│  └────────────────────────────┘  │
└──────────────────────────────────┘
```

### Visual Specification

| Element | Spec |
|---------|------|
| Model switcher indicator | Red dot (6px) + "No models" text, `text-error` |
| Disabled input background | `bg-secondary` with 50% opacity overlay |
| Disabled input text | `text-tertiary`, italic |
| "Go to Settings" button | `accent-primary` outline variant, 13px/Medium |
| Status bar offline indicator | Red dot + "Offline" in status bar (28px) |
| Toast (single model) | Standard error toast, 5s duration |

### Behavior

1. **All models unavailable**:
   - Chat input disabled with overlay message
   - Model switcher shows red "No models" state
   - Status bar shows "Offline"
   - "Go to Settings" opens Settings > Models page
   - Background health check every 30s
   - When model recovers: toast "Model available: {name}", input re-enabled

2. **Single model unavailable**:
   - Toast notification (error type, 5s)
   - Model switcher reverts to previous working model
   - Chat continues uninterrupted

---

## 3. Import Failure

### Error Code: `IMPORT.URL_FETCH_FAILURE` / `IMPORT.PDF_PARSE_FAILURE`

### Layout — Import Dialog with Error

```
┌──────────────────────────────────────────────┐
│  Import Content                          [✕] │
├──────────────────────────────────────────────┤
│                                              │
│  URL: [https://example.com/article     ] [→] │
│                                              │
│  ┌──────────────────────────────────────────┐│
│  │ ⚠ Failed to fetch URL                   ││
│  │                                          ││
│  │ Server returned 404 Not Found.           ││
│  │                                          ││
│  │ Please check the URL and try again.      ││
│  │                                          ││
│  │ [↻ Retry]                                ││
│  └──────────────────────────────────────────┘│
│                                              │
│  Recent Imports:                             │
│  ┌──────────────────────────────────────────┐│
│  │ ✓ "Attention Is All You Need"  PDF  ✓   ││  ← Success
│  └──────────────────────────────────────────┘│
│  ┌──────────────────────────────────────────┐│
│  │ ⚠ "ML Trends 2026"            URL   ⚠  ││  ← Error badge
│  │   Network timeout                        ││
│  │                              [↻ Retry]   ││
│  └──────────────────────────────────────────┘│
│                                              │
└──────────────────────────────────────────────┘
```

### Visual Specification

| Element | Spec |
|---------|------|
| Error card background | `bg-error-subtle` |
| Error card border | 1px solid `border-error` (`#FCA5A5`) |
| Error icon | `⚠` in `text-error`, 14px |
| Error description | 13px/Regular, `text-secondary` |
| Error badge (list) | Small red badge with `⚠` icon, positioned right |
| Retry button | Ghost variant, `text-error` color, 13px/Medium |
| Success item | Green checkmark (`✓`), normal card style |
| Failed item | Error card style with failure reason |

### Behavior

1. User enters URL/PDF → clicks import
2. Progress spinner shown on import button
3. On failure:
   - Spinner replaced with error card
   - Failure reason displayed in plain language
   - URL input retains value for editing
4. "Retry" button: re-attempts with same input
5. For batch imports: successful items proceed, failed items show individually with retry buttons
6. Import history shows mixed success/failure states

---

## 4. Database Lock

### Error Code: `KNOWLEDGE.INBOX_CONFIRM_FAILURE` (DB variant)

### Layout — Non-blocking Modal Overlay

```
┌──────────────────────────────────────────────────────┐
│  Titlebar: Domain Name > Expert Chat                  │
├────────┬──────────────────────────────┬──────────────┤
│        │                              │              │
│ Side-  │  (background content dimmed) │   Detail     │
│ bar    │                              │   Panel      │
│        │  ┌──────────────────────────────────────┐   │
│        │  │                                      │   │
│        │  │     💾 Saving...                     │   │
│        │  │                                      │   │
│        │  │     The database is temporarily      │   │
│        │  │     busy. This usually resolves      │   │
│        │  │     in a few seconds.                │   │
│        │  │                                      │   │
│        │  │     ● ● ● (auto-retry indicator)     │   │
│        │  │                                      │   │
│        │  │     [Cancel]                         │   │
│        │  │                                      │   │
│        │  └──────────────────────────────────────┘   │
│        │                              │              │
└────────┴──────────────────────────────┴──────────────┘
```

### Visual Specification

| Element | Spec |
|---------|------|
| Overlay background | `bg-primary` at 40% opacity |
| Modal background | `bg-primary` (solid), 12px border-radius |
| Modal shadow | `shadow-lg` (0 8px 30px rgba(0,0,0,0.12)) |
| Modal max-width | 360px, centered in content area |
| Title icon | `💾` (floppy disk emoji) or `SpinnerIcon`, 24px |
| Title text | 16px/SemiBold, `text-primary` |
| Body text | 14px/Regular, `text-secondary` |
| Auto-retry indicator | 3 animated dots, pulsing, `text-tertiary` |
| Cancel button | Ghost variant, `text-secondary`, 14px/Regular |
| Auto-retry timer | Hidden from user (internal 2s interval) |

### Behavior

1. User action triggers DB write (e.g., confirm inbox item, save knowledge node)
2. Write fails with `SQLITE_BUSY` → modal appears immediately
3. Background auto-retry every 2 seconds, up to 30 seconds (15 attempts)
4. Animated dots show "still trying" state
5. On success: modal dismisses silently, success toast shown
6. On 30s timeout: modal changes to "Unable to save. Please try again." with [Retry] and [Cancel]
7. "Cancel": dismisses modal, operation not saved, user can retry manually
8. Modal is non-blocking: user can still read content in background (dimmed)

---

## 5. Graph Render Failure

### Error Code: `GRAPH.RENDER_FAILURE`

### Layout — Automatic List View Fallback

```
┌──────────────────────────────────────────────────────┐
│  Titlebar: Domain Name > Knowledge                    │
├────────┬──────────────────────────────┬──────────────┤
│        │ [List] [Graph]               │              │
│ Side-  │                              │   Detail     │
│ bar    │  ┌──────────────────────────────────────┐   │
│        │  │ ⚠ Graph rendering failed.            │   │ ← Error banner
│        │  │   Switched to list view.             │   │
│        │  │                                      │   │
│        │  │   [↻ Retry Graph]  [Report Issue]    │   │
│        │  └──────────────────────────────────────┘   │
│        │                              │              │
│        │  ┌──────────────────────────────────────┐   │
│        │  │ Knowledge Item 1         [type] [●●●] │   │
│        │  │ Brief description...      3 sources  │   │
│        │  └──────────────────────────────────────┘   │
│        │  ┌──────────────────────────────────────┐   │
│        │  │ Knowledge Item 2         [type] [●●●○]│   │
│        │  │ Brief description...      5 sources  │   │
│        │  └──────────────────────────────────────┘   │
│        │                              │              │
└────────┴──────────────────────────────┴──────────────┘
```

### Visual Specification

| Element | Spec |
|---------|------|
| Error banner background | `bg-warning-subtle` (amber-50 equivalent) |
| Error banner border | 1px solid `border-warning` (`#FCD34D`) |
| Error icon | `⚠` in `text-warning` (`#D97706`), 14px |
| Error text | 14px/Regular, `text-primary` |
| "Retry Graph" button | Primary button, compact size (28px height) |
| "Report Issue" button | Ghost button, compact size |
| View toggle | "Graph" tab visually disabled/muted |
| List view | Standard knowledge list — fully functional replacement |

### Behavior

1. User switches to Graph view or graph auto-loads
2. D3.js/WebGL rendering throws error (caught by component error boundary)
3. Graph component unmounts gracefully
4. View automatically switches to list view
5. Error banner appears at top of content area with slide-down animation (150ms)
6. "Graph" tab in segmented control shows disabled state
7. "Retry Graph":
   - Removes error banner
   - Attempts graph render with fresh D3 instance
   - If succeeds: switches to graph view
   - If fails: banner reappears
8. "Report Issue":
   - Opens GitHub issue template with: error message, browser info, node count, graph config
9. List view is a **complete replacement** — all data accessible, not degraded

---

## Cross-Cutting: Error Banner Component Spec

All error banners share a common structure:

```
┌──────────────────────────────────────────────────┐
│ [icon] [Message text]                            │
│        [Description text (optional)]             │
│        [Action button(s)]                        │
└──────────────────────────────────────────────────┘
```

| Variant | Background | Border | Icon Color | Text Color |
|---------|-----------|--------|------------|------------|
| Error | `bg-error-subtle` | `border-error` | `text-error` | `text-error` |
| Warning | `bg-warning-subtle` | `border-warning` | `text-warning` | `text-warning` |
| Info | `bg-info-subtle` | `border-info` | `text-info` | `text-info` |

| Property | Value |
|----------|-------|
| Padding | 12px 16px |
| Border radius | 8px |
| Border left | 3px solid (variant color) |
| Max width | Container width |
| Animation | slide-down 200ms ease-out |
| Icon size | 16px |
| Message font | 14px/Medium |
| Description font | 13px/Regular, `text-secondary` |
| Button spacing | 8px gap between buttons |
