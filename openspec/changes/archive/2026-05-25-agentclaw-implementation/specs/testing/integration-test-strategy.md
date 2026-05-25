# Integration Test Strategy

> Version: 1.0 | Date: 2026-05-22

---

## Overview

Integration tests verify that multiple modules work together correctly. They sit between unit tests (isolated modules) and E2E tests (full user flows). Focus on three integration layers: service layer, IPC bridge, and database.

---

## Framework & Tools

| Tool | Purpose |
|------|---------|
| **Vitest** | Test runner (same as unit tests) |
| **better-sqlite3** (`:memory:`) | Real database for DB integration tests |
| **Electron mock** | Simulated Main process for IPC tests |
| **testcontainers** (optional) | For future external service mocking |

---

## Test Layers

### Layer 1: Service Layer Integration

Tests that multiple services collaborate correctly through their defined interfaces.

**Scope**: Service → Repository → Database (in-memory)

**What to test**:
- Service A calls Service B correctly
- Transaction boundaries work
- Event emission and handling
- Error propagation between services

**What NOT to test**: Individual service logic (covered by unit tests).

#### Test Matrix

| Integration | Services Involved | Key Scenarios |
|-------------|-------------------|---------------|
| Research → Knowledge | ResearchScheduler + KnowledgeGraph | Research output creates knowledge nodes |
| Import → Inbox → Knowledge | ImportPipeline + InboxProcessor + KnowledgeGraph | URL import → AI summary → inbox → confirm → knowledge node |
| Domain → Config → FileSystem | DomainManager + DomainConfig + DomainDirs | Create domain → config.yaml created → directory structure correct |
| Model → pi-mono → Auth | ModelManager + pi-mono wrapper + AuthStorage | Import API key → validate → encrypt → retrieve |
| Version → FileSystem | VersionControl + FileSystemProvider | Auto-commit on write → diff generation |
| Knowledge → Vector → Search | KnowledgeGraph + VectorIndex + SearchEngine | Create node → index embedding → search returns result |
| Framework → Knowledge | FrameworkEngine + KnowledgeGraph + VersionControl | Run analysis → create nodes → create decision record |

#### Example: Research → Knowledge Integration

```typescript
describe('Research → Knowledge integration', () => {
  let db: Database;
  let knowledgeGraph: KnowledgeGraph;
  let researchScheduler: ResearchScheduler;
  let mockAgentSession: MockedAgentSession;

  beforeEach(() => {
    db = createTestDb();
    knowledgeGraph = new KnowledgeGraph(db);
    mockAgentSession = createMockAgentSession();
    researchScheduler = new ResearchScheduler(
      knowledgeGraph,
      mockAgentSession.factory
    );
  });

  afterEach(() => {
    db.close();
  });

  it('should create knowledge nodes from research output', async () => {
    // Arrange
    const domain = await createTestDomain(db, { name: 'AI/ML' });
    mockAgentSession.setResponse(
      'Research found: 1) Transformers use self-attention. 2) RAG combines retrieval with generation.'
    );

    // Act
    const result = await researchScheduler.executeRun(domain.id);

    // Assert
    const nodes = await knowledgeGraph.listByDomain(domain.id);
    expect(nodes).toHaveLength(2);
    expect(nodes[0].title).toContain('Transformers');
    expect(nodes[1].title).toContain('RAG');
  });

  it('should save partial results on timeout', async () => {
    mockAgentSession.setTimeoutAfter(5000);
    const domain = await createTestDomain(db);

    const result = await researchScheduler.executeRun(domain.id);

    expect(result.status).toBe('timed_out');
    const nodes = await knowledgeGraph.listByDomain(domain.id);
    // Partial output saved
    expect(nodes.length).toBeGreaterThanOrEqual(0);
  });
});
```

---

### Layer 2: IPC Integration

Tests that the full IPC round-trip works: Renderer preload → Main handler → Service → Response.

**Scope**: Preload bridge → IPC handler → Service → DB → Response

**Key challenge**: Simulating the Electron IPC layer without a real Electron process.

#### IPC Test Harness

```typescript
// test-helpers/ipc-harness.ts
import { vi } from 'vitest';

interface IpcChannel {
  channel: string;
  handler: (...args: unknown[]) => Promise<unknown>;
}

export class IpcTestHarness {
  private channels = new Map<string, IpcChannel>();

  registerHandler(channel: string, handler: (...args: unknown[]) => Promise<unknown>) {
    this.channels.set(channel, { channel, handler });
  }

  async invoke(channel: string, ...args: unknown[]): Promise<unknown> {
    const registered = this.channels.get(channel);
    if (!registered) {
      throw new Error(`No handler registered for channel: ${channel}`);
    }
    return registered.handler(...args);
  }

  // Simulates the renderer-side preload bridge
  createRendererApi() {
    const api: Record<string, (...args: unknown[]) => Promise<unknown>> = {};
    for (const [channel] of this.channels) {
      const [module, action] = channel.split(':');
      if (!api[module]) api[module] = {} as Record<string, (...args: unknown[]) => Promise<unknown>>;
      (api[module] as Record<string, (...args: unknown[]) => Promise<unknown>>)[action] =
        (...args: unknown[]) => this.invoke(channel, ...args);
    }
    return api;
  }
}
```

#### IPC Test Matrix

| Channel | Handler | Service | Key Scenarios |
|---------|---------|---------|---------------|
| `models:import-key` | ModelHandler | ModelManager | Import key → validate → encrypt → confirm |
| `models:list` | ModelHandler | ModelManager | List all models with availability |
| `models:switch` | ModelHandler | ModelManager | Switch active model |
| `domains:create` | DomainHandler | DomainManager | Create domain → create dirs → write config |
| `domains:list` | DomainHandler | DomainManager | List domains with stats |
| `domains:delete` | DomainHandler | DomainManager | Delete domain → cleanup dirs |
| `knowledge:create` | KnowledgeHandler | KnowledgeGraph | Create node → index embedding |
| `knowledge:search` | SearchHandler | SearchEngine | Hybrid search (vector + BM25) |
| `inbox:add` | InboxHandler | InboxProcessor | Add item → generate summary |
| `inbox:confirm` | InboxHandler | InboxProcessor | Confirm → create knowledge node → remove from inbox |
| `research:run` | ResearchHandler | ResearchScheduler | Execute research run |
| `research:schedule` | ResearchHandler | ResearchScheduler | Schedule cron-based research |
| `import:url` | ImportHandler | ImportPipeline | Import URL → fetch → parse → AI summary |
| `import:pdf` | ImportHandler | ImportPipeline | Import PDF → extract → AI summary |
| `version:history` | VersionHandler | VersionControl | List commit history |
| `version:rollback` | VersionHandler | VersionControl | Rollback to specific commit |
| `settings:get` | SettingsHandler | — | Get app settings |
| `settings:update` | SettingsHandler | — | Update app settings |

#### Example: IPC Round-Trip Test

```typescript
describe('IPC: domains:create', () => {
  let harness: IpcTestHarness;
  let db: Database;

  beforeEach(() => {
    db = createTestDb();
    const domainManager = new DomainManager(db);
    const domainDirs = new DomainDirs('/mock/userData');
    const handler = new DomainHandler(domainManager, domainDirs);

    harness = new IpcTestHarness();
    harness.registerHandler('domains:create', handler.handleCreate);
  });

  it('should create domain via IPC round-trip', async () => {
    const api = harness.createRendererApi();

    const result = await api.domains.create({
      name: 'AI/ML Research',
      description: 'Artificial Intelligence and Machine Learning',
      color: '#3B82F6',
      icon: 'brain',
    });

    expect(result.id).toBeDefined();
    expect(result.name).toBe('AI/ML Research');
    expect(result.slug).toBe('ai-ml-research');

    // Verify in DB
    const row = db.prepare('SELECT * FROM domains WHERE id = ?').get(result.id);
    expect(row).toBeDefined();
    expect(row.name).toBe('AI/ML Research');
  });
});
```

---

### Layer 3: Database Integration

Tests that the full database stack works: Schema → Migrations → Repositories → Queries.

**Scope**: Migration runner → Schema creation → Repository CRUD → Complex queries

#### Database Test Matrix

| Area | Tests |
|------|-------|
| **Migrations** | Fresh DB → all tables created; Migration from v1 → v2; Rollback v2 → v1 |
| **CRUD** | Create/Read/Update/Delete for each of 14 tables |
| **Constraints** | Foreign keys, unique constraints, NOT NULL, CHECK constraints |
| **Transactions** | Rollback on error, nested transactions (savepoints) |
| **WAL mode** | Concurrent reads during write |
| **Vector search** | Insert embeddings → search → verify ranking |
| **FTS5** | Full-text search with BM25 ranking |
| **Performance** | Query plans for common queries, index usage verification |

#### Migration Integration Tests

```typescript
describe('Database migration integration', () => {
  it('should create all 14 tables from empty database', () => {
    const db = new Database(':memory:');
    const runner = new MigrationRunner(db);

    runner.runAll();

    const tables = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
    ).all();

    expect(tables.map(t => t.name)).toContainEqual(
      expect.arrayContaining([
        'domains', 'knowledge_nodes', 'knowledge_edges',
        'sources', 'timeline_entries', 'model_configs',
        'api_keys', 'inbox', 'decision_records',
        '_migrations',
      ])
    );
  });

  it('should run idempotently — calling twice is safe', () => {
    const db = new Database(':memory:');
    const runner = new MigrationRunner(db);

    runner.runAll();
    runner.runAll(); // Should not throw

    const migrations = db.prepare('SELECT COUNT(*) as count FROM _migrations').get();
    expect(migrations.count).toBe(TOTAL_MIGRATION_COUNT);
  });

  it('should rollback last migration', () => {
    const db = new Database(':memory:');
    const runner = new MigrationRunner(db);

    runner.runAll();
    runner.rollback();

    // Last table should be dropped
    const tables = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table'"
    ).all();
    expect(tables.find(t => t.name === 'dropped_table')).toBeUndefined();
  });
});
```

#### Vector Search Integration

```typescript
describe('Vector search integration', () => {
  let db: Database;
  let vectorIndex: VectorIndex;

  beforeEach(() => {
    db = createTestDb();
    vectorIndex = new VectorIndex(db);
  });

  it('should search and rank by cosine similarity', async () => {
    // Insert nodes with embeddings
    await vectorIndex.insert('node-1', [0.1, 0.2, 0.3]);
    await vectorIndex.insert('node-2', [0.4, 0.5, 0.6]);
    await vectorIndex.insert('node-3', [0.9, 0.8, 0.7]);

    // Search with query vector close to node-3
    const results = await vectorIndex.search([0.85, 0.82, 0.71], { limit: 2 });

    expect(results[0].id).toBe('node-3');
    expect(results).toHaveLength(2);
  });
});
```

---

## Test Execution Strategy

### Commands

```bash
# Integration tests only
vitest run --config vitest.integration.config.ts

# Specific integration layer
vitest run --testPathPattern='integration/ipc'
vitest run --testPathPattern='integration/database'
```

### CI Configuration

```yaml
# Separate job from unit tests
integration-tests:
  runs-on: ubuntu-latest
  steps:
    - name: Integration Tests
      run: vitest run --config vitest.integration.config.ts --reporter=verbose
```

### Timeout

Integration tests may take longer than unit tests:

```typescript
// vitest.integration.config.ts
export default defineConfig({
  test: {
    testTimeout: 10000, // 10s per test (vs 5s default)
    hookTimeout: 15000,
  },
});
```

---

## Test Data Management

### Fixtures

```typescript
// test-helpers/fixtures.ts
export const FIXTURES = {
  samplePdfPath: 'test-fixtures/sample.pdf',
  sampleHtmlPath: 'test-fixtures/sample.html',
  sampleMarkdownPath: 'test-fixtures/knowledge-node.md',
  sampleConfigYaml: 'test-fixtures/domain-config.yaml',
  sampleSkillMd: 'test-fixtures/skill-paper-summarizer.md',
};
```

### Database Seeders

```typescript
// test-helpers/seeders.ts
export async function seedDomainWithNodes(db: Database, options?: {
  nodeCount?: number;
  edgeCount?: number;
}): Promise<{ domain: Domain; nodes: KnowledgeNode[] }> {
  const domain = insertTestDomain(db);
  const nodes = Array.from({ length: options?.nodeCount ?? 5 }, () =>
    insertTestKnowledgeNode(db, { domainId: domain.id })
  );
  // Create random edges between nodes
  if (options?.edgeCount) {
    for (let i = 0; i < options.edgeCount; i++) {
      const from = nodes[Math.floor(Math.random() * nodes.length)];
      const to = nodes[Math.floor(Math.random() * nodes.length)];
      insertTestEdge(db, { fromId: from.id, toId: to.id });
    }
  }
  return { domain, nodes };
}
```

---

## Summary

| Layer | Scope | Count (est.) | Priority |
|-------|-------|-------------|----------|
| Service integration | Service → Repository → DB | ~25 tests | HIGH |
| IPC integration | Preload → Handler → Service | ~20 tests | HIGH |
| Database integration | Migration → CRUD → Vector → FTS | ~30 tests | HIGH |
| **Total** | | **~75 tests** | |
