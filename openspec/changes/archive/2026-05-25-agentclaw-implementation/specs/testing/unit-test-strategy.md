# Unit Test Strategy

> Version: 1.0 | Date: 2026-05-22

---

## Framework Selection

### Primary: Vitest

| Property | Choice | Rationale |
|----------|--------|-----------|
| Test runner | **Vitest** | Native ESM, TypeScript, compatible with Vite/Next.js, fast watch mode |
| Assertion | **Vitest built-in (`expect`)** | Jest-compatible API, no extra dependency |
| Mocking | **`vi.mock()` + `vi.spyOn()`** | Built-in, no sinon needed |
| Coverage | **@vitest/coverage-v8** | V8 native coverage, fast |
| DOM testing | **@testing-library/react** | Standard React testing approach |
| Snapshot | Vitest built-in | For component and serialization tests |

### Why not Jest

- Vitest has native ESM support without config hacks
- Faster cold start and watch mode
- Better TypeScript integration out of the box
- Compatible with Vite (used by Next.js Turbopack)

---

## Coverage Targets

| Layer | Target | Rationale |
|-------|--------|-----------|
| **Server services** | 80% lines | Core business logic, high value |
| **IPC handlers** | 70% lines | Thin routing layer, tested via integration |
| **React components** | 60% lines | UI behavior better tested via E2E |
| **Utility functions** | 90% lines | Pure functions, easy to test, high reuse |
| **Store (Zustand)** | 80% lines | State logic is critical |
| **pi-mono wrapper** | 70% lines | Interface layer, heavy mocking needed |
| **Overall** | 75% lines | Project-wide target |

---

## Test File Organization

```
src/
├── components/
│   ├── ui/button.tsx
│   └── ui/__tests__/button.test.tsx       # Co-located
├── lib/
│   ├── ipc/channels.ts
│   └── ipc/__tests__/channels.test.ts
├── stores/
│   ├── app-store.ts
│   └── __tests__/app-store.test.ts
server/
├── services/
│   ├── model-manager.ts
│   └── __tests__/model-manager.test.ts
├── db/
│   ├── repositories/
│   │   ├── domains.ts
│   │   └── __tests__/domains.test.ts
│   └── vector.ts
│   └── __tests__/vector.test.ts
```

**Convention**: `__tests__/` directory co-located with source. File name: `{module}.test.ts(x)`.

---

## Mock Strategy

### Mock Categories

| Category | Mock Type | Tool | Example |
|----------|-----------|------|---------|
| Electron APIs | Full mock | `vi.mock('electron')` | `BrowserWindow`, `ipcMain`, `safeStorage` |
| pi-mono SDK | Interface mock | `vi.mock('@anthropic-ai/pi-mono')` | `AuthStorage`, `AgentSession` |
| better-sqlite3 | In-memory SQLite | Real DB with `:memory:` | Database operations |
| File system | Fake implementation | `vi.mock('fs')` or `memfs` | Path operations |
| Child process | Mock | `vi.mock('child_process')` | Git operations |
| Network (fetch) | Mock | `vi.fn()` or `msw` | API calls |

### Electron Mock Pattern

```typescript
// __mocks__/electron.ts
export const mockIpcMain = {
  handle: vi.fn(),
  removeHandler: vi.fn(),
};

export const mockBrowserWindow = {
  loadURL: vi.fn(),
  on: vi.fn(),
  close: vi.fn(),
  webContents: { send: vi.fn() },
};

vi.mock('electron', () => ({
  ipcMain: mockIpcMain,
  BrowserWindow: vi.fn(() => mockBrowserWindow),
  app: {
    getPath: vi.fn((name: string) => `/mock/${name}`),
    on: vi.fn(),
    quit: vi.fn(),
  },
  safeStorage: {
    encryptString: vi.fn((s: string) => Buffer.from(`enc:${s}`)),
    decryptString: vi.fn((buf: Buffer) => buf.toString().replace('enc:', '')),
    isEncryptionAvailable: vi.fn(() => true),
  },
}));
```

### pi-mono Mock Pattern

```typescript
// __mocks__/@anthropic-ai/pi-mono.ts
export const mockAuthStorage = {
  setKey: vi.fn(),
  getKey: vi.fn(),
  removeKey: vi.fn(),
  listKeys: vi.fn(() => []),
};

export const mockAgentSession = {
  sendMessage: vi.fn(() => ({ text: 'mock response', stream: false })),
  streamMessage: vi.fn(),
  destroy: vi.fn(),
};

vi.mock('@anthropic-ai/pi-mono', () => ({
  AuthStorage: vi.fn(() => mockAuthStorage),
  ModelRegistry: vi.fn(),
  AgentSession: vi.fn(() => mockAgentSession),
  SessionManager: vi.fn(),
}));
```

### Database Testing: Real In-Memory SQLite

```typescript
// Test helpers use real SQLite in-memory for DB tests
import Database from 'better-sqlite3';

export function createTestDb(): Database.Database {
  const db = new Database(':memory:');
  db.pragma('journal_mode = WAL');
  // Run migrations
  runMigrations(db);
  return db;
}
```

**Rationale**: Mocking database queries provides false confidence. In-memory SQLite is fast (< 1ms per test) and catches real SQL errors.

---

## Key Unit Test Categories

### 1. Service Layer Tests

**Priority: HIGH** — Contains core business logic.

```typescript
// server/services/__tests__/model-manager.test.ts
describe('ModelManager', () => {
  describe('importApiKey', () => {
    it('should encrypt and store API key');
    it('should validate key by making test API call');
    it('should reject invalid key format');
    it('should handle encryption unavailability');
  });

  describe('listModels', () => {
    it('should return models from all configured providers');
    it('should filter by provider when specified');
    it('should mark unavailable models');
  });

  describe('switchModel', () => {
    it('should update active model in store');
    it('should reject switch if model unavailable');
    it('should persist selection to domain config');
  });
});
```

### 2. Repository Tests

**Priority: HIGH** — Data integrity.

```typescript
// server/db/repositories/__tests__/domains.test.ts
describe('DomainsRepository', () => {
  it('should create domain with all fields');
  it('should enforce unique slug constraint');
  it('should update domain fields');
  it('should delete domain and cascade to related tables');
  it('should list domains with knowledge node counts');
});
```

### 3. Store Tests

**Priority: MEDIUM** — State management.

```typescript
// src/stores/__tests__/app-store.test.ts
describe('AppStore', () => {
  it('should set current domain');
  it('should toggle panel state');
  it('should persist theme selection');
  it('should restore state from storage');
});
```

### 4. Component Tests

**Priority: MEDIUM** — Key interactive components only.

```typescript
// src/components/ui/__tests__/button.test.tsx
describe('Button', () => {
  it('should render with primary variant');
  it('should show loading spinner when loading=true');
  it('should be disabled when disabled=true');
  it('should call onClick when clicked');
  it('should not call onClick when loading');
});
```

**Skip testing**: Static/presentational components, layout-only components (tested in E2E).

### 5. Utility Tests

**Priority: HIGH** — Pure functions, easy to test.

```typescript
// src/lib/__tests__/commands/parser.test.ts
describe('CommandParser', () => {
  it('should parse /command format');
  it('should parse /command arg1 arg2');
  it('should parse /command "quoted arg"');
  it('should return null for non-command input');
  it('should handle empty input');
});
```

### 6. Error Handling Tests

**Priority: HIGH** — Verify error recovery.

```typescript
// server/services/__tests__/research-scheduler.test.ts
describe('ResearchScheduler', () => {
  describe('error handling', () => {
    it('should retry on API failure with exponential backoff');
    it('should mark run as permanently_failed after max retries');
    it('should save partial results on timeout');
    it('should disable scheduler on init failure');
  });
});
```

---

## Test Execution

### Commands

```bash
# Run all unit tests
vitest run

# Watch mode
vitest

# Run specific file
vitest run server/services/__tests__/model-manager.test.ts

# Coverage
vitest run --coverage

# UI mode
vitest --ui
```

### CI Integration

```yaml
# In CI pipeline
- name: Unit Tests
  run: vitest run --coverage --reporter=json --outputFile=test-results.json
- name: Upload Coverage
  uses: codecov/codecov-action@v3
  with:
    files: ./coverage/coverage-final.json
```

---

## Test Data Factories

```typescript
// test-helpers/factories.ts
import { faker } from '@faker-js/faker';

export function createDomain(overrides?: Partial<Domain>): Domain {
  return {
    id: faker.string.uuid(),
    name: faker.company.name(),
    slug: faker.lorem.slug(),
    description: faker.lorem.sentence(),
    color: faker.helpers.arrayElement(['#3B82F6', '#10B981', '#F59E0B', '#EF4444']),
    icon: faker.helpers.arrayElement(['brain', 'code', 'book', 'flask']),
    defaultModelId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export function createKnowledgeNode(overrides?: Partial<KnowledgeNode>): KnowledgeNode {
  return {
    id: faker.string.uuid(),
    domainId: faker.string.uuid(),
    title: faker.lorem.sentence(),
    content: faker.lorem.paragraphs(3),
    type: faker.helpers.arrayElement(['concept', 'fact', 'insight', 'procedure']),
    comprehensionLevel: faker.number.int({ min: 0, max: 5 }),
    sourceIds: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}
```

---

## Summary

| Aspect | Decision |
|--------|----------|
| Framework | Vitest + Testing Library |
| Coverage target | 75% overall, 80% services, 90% utils |
| DB testing | Real in-memory SQLite |
| Mock approach | Module-level `vi.mock()`, interface mocks for external deps |
| Test location | Co-located `__tests__/` directories |
| CI | Vitest JSON reporter + Codecov |
