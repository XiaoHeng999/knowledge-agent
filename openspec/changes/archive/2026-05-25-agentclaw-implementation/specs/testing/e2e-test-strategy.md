# E2E Test Strategy

> Version: 1.0 | Date: 2026-05-22

---

## Overview

End-to-end tests verify complete user workflows through the actual Electron application. They validate that all layers (Electron main process, Next.js renderer, IPC bridge, SQLite database, pi-mono SDK) work together in a real environment.

---

## Framework Selection

### Primary: Playwright for Electron

| Property | Choice | Rationale |
|----------|--------|-----------|
| Test framework | **Playwright** | First-class Electron support via `@playwright/test`, cross-platform |
| Electron integration | **`electron = require('playwright').electron`** | Direct Electron app launch and control |
| Assertion | Playwright built-in `expect` | Auto-retrying assertions for async UI |
| Mock server | **Playwright routes** | Intercept and mock network requests |

### Why Playwright over Spectron

- Spectron is deprecated (unmaintained since 2021)
- Playwright has active Electron support since v1.26+
- Built-in auto-retrying assertions reduce flakiness
- Parallel test execution with built-in test runner
- Better debugging tools (trace viewer, codegen)

### Electron + Playwright Setup

```typescript
// e2e/helpers/app-launcher.ts
import { _electron as electron } from 'playwright';
import { ElectronApplication, Page } from 'playwright';

export async function launchApp(options?: {
  env?: Record<string, string>;
}): Promise<{ app: ElectronApplication; window: Page }> {
  const app = await electron.launch({
    args: ['.'], // main process entry
    env: {
      ...process.env,
      NODE_ENV: 'test',
      // Use isolated data directory for each test run
      AGENTCLAW_TEST_DATA_DIR: `/tmp/agentclaw-e2e-${Date.now()}`,
      ...options?.env,
    },
  });

  const window = await app.firstWindow();
  await window.waitForLoadState('domcontentloaded');

  return { app, window };
}

export async function closeApp(app: ElectronApplication): Promise<void> {
  await app.close();
}
```

---

## Test Environment

### Isolation Strategy

| Concern | Strategy |
|---------|----------|
| Data directory | Unique temp directory per test run, cleaned up after |
| Database | Fresh SQLite database in temp directory |
| API calls | Mocked via Playwright route interception (no real API calls in CI) |
| pi-mono | Use mock provider that returns deterministic responses |
| File system | Temp directory, cleaned up after test |

### Mock Configuration

```typescript
// e2e/helpers/mock-api.ts
export async function setupApiMocks(window: Page): Promise<void> {
  // Mock all LLM API calls
  await window.route('**/v1/chat/completions', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'mock-response',
        choices: [{
          message: { content: 'This is a mocked AI response for testing.' },
          finish_reason: 'stop',
        }],
      }),
    });
  });

  // Mock model listing
  await window.route('**/v1/models', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: [
          { id: 'mock-model-v1', object: 'model' },
        ],
      }),
    });
  });
}
```

---

## Key User Flows to Cover

### Flow 1: First Launch → Onboarding

```
App starts → Welcome screen visible
  → Click "Get Started"
  → API Key setup page
    → Select "Ollama (Free)" option
    → Verify "Ollama not running" state shown
    → Or: Enter mock API key
    → Click "Validate"
    → Validation succeeds
  → Create first domain
    → Select "AI/ML" preset template
    → Domain created
  → Guided research
    → Click "Start First Research"
    → Mock research completes
    → Knowledge node appears
  → Onboarding complete → Dashboard visible
```

### Flow 2: Domain Management

```
Dashboard → Open sidebar → Click "New Domain"
  → Domain creation dialog
    → Enter name "Web Development"
    → Select color #10B981
    → Select icon "code"
    → No preset template (blank)
    → Click "Create"
  → Domain appears in sidebar
  → Domain directory structure created
  → Click domain → Empty state shown
  → Settings → Domains → Edit domain
    → Change description
    → Add research sources
    → Save
  → Delete domain → Confirm dialog → Deleted
```

### Flow 3: Expert Chat

```
Select domain → Click "Expert Chat" (or navigate to /domain/{id}/chat)
  → Empty chat state shown ("Start a conversation...")
  → Type message → Send
  → Mock AI response streams in
  → Response rendered with Markdown (headers, code blocks, lists)
  → Send another message → Response received
  → Model switcher → Select different model
    → Mock switch succeeds
  → Trigger API failure (mock 500 response)
    → Error banner appears
    → "Retry" button visible
  → Click "Retry" → Response received
```

### Flow 4: Knowledge Management

```
Navigate to domain → Knowledge list
  → Empty state shown ("No knowledge nodes yet")
  → Click "Add Knowledge"
    → Fill form: title, type, content
    → Save
  → Knowledge node card appears in list
  → Click card → Detail panel opens on right
  → Edit node → Update content → Save
  → Search knowledge → Type query → Results appear
  → Switch to graph view → Nodes rendered
  → Switch back to list view
```

### Flow 5: Import Pipeline

```
Navigate to Inbox or use Cmd+I
  → Click "Import"
  → Enter URL → Click import
    → Mock URL fetch → Mock AI summary
    → Item appears in inbox
  → Inbox item shows: source info + AI summary
  → Click "Confirm" → Select target domain
    → Knowledge node created
    → Item removed from inbox
  → Import PDF → Select file → Import
    → Mock PDF parse → Mock AI summary
    → Item appears in inbox
```

### Flow 6: Research Dashboard

```
Navigate to Research
  → Empty state ("No research runs yet")
  → Click "Run Research Now"
    → Mock research execution
    → Progress indicator shown
    → Research completes
    → New knowledge nodes created
  → Research history shown with: timestamp, status, cost
  → Schedule research: set cron expression
    → Schedule saved
  → Cost tracking visible in dashboard
```

### Flow 7: Settings & Theme

```
Navigate to Settings
  → Models page: API key table, model list
  → Domains page: domain configurations
  → Appearance: theme selector
    → Select "Cursor" theme
      → All UI updates immediately
    → Select "Notion" theme
      → All UI updates
    → Select "Linear" (default)
  → Navigate through app → Theme persists
```

### Flow 8: Version Control

```
AI writes to domain knowledge file
  → Auto-commit triggered
  → Version history updated
  → Open version history panel
    → See commit list
  → Click a commit → Diff shown (added/removed/modified lines)
  → Click "Rollback" → Confirm → File reverted
```

### Flow 9: Error Scenarios

```
# API failure mid-chat (already covered in Flow 3)

# All models unavailable
  → Revoke all API keys via settings
  → Return to chat
  → Chat input disabled
  → "Set up API key" message shown
  → Red indicator in model switcher

# Database lock
  → Trigger concurrent write operations
  → Non-blocking modal appears
  → Auto-retry resolves → Modal dismisses

# Graph render failure
  → Navigate to graph view with mock render error
  → Automatically switches to list view
  → Error banner shown with "Retry Graph" button
```

### Flow 10: Keyboard Navigation & Accessibility

```
# Tab navigation through main layout
  Tab → Sidebar first item focused
  Tab → Content area focused
  Tab → Detail panel focused (if open)

# Command palette (Cmd+K)
  Press Cmd+K → Palette opens
  Type "research" → Filtered results shown
  Arrow down → Next item selected
  Enter → Action executed, palette closes

# Escape behavior
  In dialog → Escape closes dialog
  In command palette → Escape closes palette
  In panel → Escape closes panel
```

---

## Test Structure

```
e2e/
├── helpers/
│   ├── app-launcher.ts       # App launch/close utilities
│   ├── mock-api.ts           # API mock setup
│   ├── assertions.ts         # Custom assertions
│   └── selectors.ts          # Reusable selectors
├── flows/
│   ├── onboarding.spec.ts    # Flow 1
│   ├── domain-management.spec.ts  # Flow 2
│   ├── expert-chat.spec.ts   # Flow 3
│   ├── knowledge.spec.ts     # Flow 4
│   ├── import-pipeline.spec.ts    # Flow 5
│   ├── research.spec.ts      # Flow 6
│   ├── settings-theme.spec.ts     # Flow 7
│   ├── version-control.spec.ts    # Flow 8
│   ├── error-scenarios.spec.ts    # Flow 9
│   └── accessibility.spec.ts      # Flow 10
├── playwright.config.ts
└── tsconfig.json
```

---

## Playwright Configuration

```typescript
// e2e/playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './flows',
  testMatch: '*.spec.ts',
  timeout: 60000, // 60s per test
  expect: { timeout: 10000 },
  fullyParallel: false, // Electron tests run sequentially (single app instance)
  retries: 1, // Retry once for flaky UI tests
  reporter: [
    ['list'],
    ['html', { open: 'never' }],
  ],
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
  },
});
```

---

## Custom Assertions

```typescript
// e2e/helpers/assertions.ts
import { expect, Page } from '@playwright/test';

export async function expectToast(window: Page, options: {
  type?: 'success' | 'error' | 'warning' | 'info';
  message: string;
}): Promise<void> {
  const toast = window.locator('[data-testid="toast"]');
  await expect(toast).toBeVisible();
  if (options.type) {
    await expect(toast).toHaveAttribute('data-toast-type', options.type);
  }
  await expect(toast).toContainText(options.message);
}

export async function expectEmptyState(window: Page, message: string): Promise<void> {
  const emptyState = window.locator('[data-testid="empty-state"]');
  await expect(emptyState).toBeVisible();
  await expect(emptyState).toContainText(message);
}

export async function expectDialogVisible(window: Page, title: string): Promise<void> {
  const dialog = window.locator('[role="dialog"]');
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText(title);
}

export async function expectSidebarItem(window: Page, name: string): Promise<void> {
  const sidebar = window.locator('[data-testid="sidebar"]');
  await expect(sidebar.locator(`text="${name}"`)).toBeVisible();
}
```

---

## Data Test IDs

All interactive components should use `data-testid` attributes for stable selectors:

| Component | data-testid |
|-----------|-------------|
| Sidebar | `[data-testid="sidebar"]` |
| Sidebar domain item | `[data-testid="domain-item-{slug}"]` |
| Main content area | `[data-testid="main-content"]` |
| Detail panel | `[data-testid="detail-panel"]` |
| Title bar | `[data-testid="titlebar"]` |
| Status bar | `[data-testid="statusbar"]` |
| Chat input | `[data-testid="chat-input"]` |
| Chat send button | `[data-testid="chat-send"]` |
| Message list | `[data-testid="message-list"]` |
| Message (user) | `[data-testid="message-user-{index}"]` |
| Message (assistant) | `[data-testid="message-assistant-{index}"]` |
| Model switcher | `[data-testid="model-switcher"]` |
| Command palette | `[data-testid="cmd-palette"]` |
| Toast container | `[data-testid="toast-container"]` |
| Toast | `[data-testid="toast"]` |
| Dialog overlay | `[role="dialog"]` |
| Empty state | `[data-testid="empty-state"]` |
| Knowledge card | `[data-testid="knowledge-card-{id}"]` |
| Graph view | `[data-testid="graph-view"]` |
| List view | `[data-testid="list-view"]` |
| Search bar | `[data-testid="search-bar"]` |
| Settings nav | `[data-testid="settings-nav"]` |

---

## CI Integration

```yaml
# GitHub Actions E2E job
e2e-tests:
  runs-on: ${{ matrix.os }}
  strategy:
    matrix:
      os: [ubuntu-latest, macos-latest, windows-latest]
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with:
        node-version: 20
    - run: npm ci
    - run: npm run build
    - name: E2E Tests
      run: npx playwright test --config e2e/playwright.config.ts
    - uses: actions/upload-artifact@v4
      if: failure()
      with:
        name: e2e-traces-${{ matrix.os }}
        path: e2e/test-results/
```

---

## Execution & Debugging

### Local Commands

```bash
# Run all E2E tests
npx playwright test --config e2e/playwright.config.ts

# Run single flow
npx playwright test --config e2e/playwright.config.ts e2e/flows/expert-chat.spec.ts

# Run with headed mode (see the app)
npx playwright test --config e2e/playwright.config.ts --headed

# Debug mode (step through)
npx playwright test --config e2e/playwright.config.ts --debug

# Generate trace for debugging
npx playwright test --config e2e/playwright.config.ts --trace on
```

---

## Summary

| Aspect | Decision |
|--------|----------|
| Framework | Playwright with Electron support |
| Isolation | Temp data dir per run, mocked APIs |
| Coverage | 10 key user flows |
| Estimated tests | ~50-60 test cases across 10 flows |
| CI | 3-platform matrix, sequential execution |
| Debug | Traces, screenshots on failure, headed mode |
