# PRD: Architecture Deepening — Security Gate, Service Factory, Type-Safe Routes

## Problem Statement

The AgentClaw server layer has three systemic architectural problems:

1. **Security gate orchestration is copy-pasted** — The assess→audit→approve flow is repeated 5 times across knowledge-handler and security-handler, with subtle variations that make bugs likely (fix one, miss the other four). Knowledge-handler has zero test coverage because the entanglement is too hard to mock.

2. **Global singleton coupling makes testing painful** — Every service imports `getDatabaseService()` and `getPiMonoWrapper()` as lazy globals. Every test file must `vi.mock()` these (research-scheduler.test.ts has 9 mock calls). The dependency graph is invisible — buried in import chains rather than declared in function signatures.

3. **IPC routes have no type safety** — routes.ts (680 lines) manually casts request types via `(req as SomeType).field` instead of leveraging the existing `IpcChannelMap` type definitions. Adding a new channel requires changes in 3 places with no compiler protection against drift.

## Solution

Three coordinated refactorings, ordered by risk and dependency:

1. **Deepen security-gate.ts** with `guardedWrite()` and `guardedDelete()` — collapsing 5 copy-pasted patterns into 2 functions behind a single seam.
2. **Convert 6 core services to factory functions** — each receives its dependencies explicitly through a `ServiceDeps` interface, eliminating global singletons and enabling tests without `vi.mock()`.
3. **Make ChannelRoute generic** — `params` extractors get automatic request typing from `IpcChannelMap`, eliminating manual `as` casts.

## User Stories

### Security Gate Orchestration

1. As a **developer**, I want the security assessment flow to live in one function, so that a policy change only requires editing one place.
2. As a **developer**, I want `knowledge-handler` to be testable, so that I can verify security behaviour without mocking the entire IPC stack.
3. As a **developer**, I want write handlers (createNode, updateNode, createEdge) to be thin dispatchers that call `guardedWrite`, so that the handler code is ~5 lines instead of ~30.
4. As a **developer**, I want delete handlers (deleteNode, deleteEdge) to always require audit approval, so that deletions are never auto-approved regardless of risk level.
5. As a **developer**, I want `ASSESS_WRITE` (standalone risk assessment) to remain independent of guardedWrite/guardedDelete, so that its behaviour doesn't change.
6. As a **developer**, I want `guardedWrite` to throw on blocked operations, so that handlers don't need to handle the blocked branch.
7. As a **developer**, I want `guardedWrite` to return `KnowledgeWriteResponse<T>` directly (the IPC response type), so that handlers can return the result with zero mapping.
8. As a **developer**, I want `guardedDelete` to return `KnowledgeWriteVoidResponse` directly, so that delete handlers can return the result with zero mapping.
9. As a **developer**, I want `makeAuditEntry` to move from knowledge-handler to security-gate, so that all security-related logic is co-located.

### Service Factory Pattern

10. As a **developer**, I want each service to declare its dependencies via a typed interface, so that the dependency graph is visible in function signatures.
11. As a **developer**, I want to instantiate services via factory functions (`createSkillEngine(deps)`), so that tests can pass mock dependencies without `vi.mock()`.
12. As a **developer**, I want `register.ts` to build a shared `ServiceDeps` context and call all factories, so that service construction is centralized.
13. As a **developer**, I want services that only need the database to declare `DbDeps`, so that they don't receive unnecessary dependencies.
14. As a **developer**, I want services that need both DB and PiMono to declare `FullDeps`, so that their dependency is explicit.
15. As a **developer**, I want handler registration functions to receive service instances as parameters, so that handlers don't import service modules directly.
16. As a **developer**, I want test files to create service instances via factory functions with mock deps, so that tests look like `const svc = createSkillEngine({ db: mockDb })` with zero `vi.mock()`.
17. As a **developer**, I want the 6 converted services to export both a factory function and a `ReturnType` type, so that other modules can type-check against the service interface.

### Type-Safe IPC Routes

18. As a **developer**, I want `ChannelRoute` to be generic over `ChannelName`, so that `params` extractors get automatic request typing.
19. As a **developer**, I want the `req` parameter in params extractors to be typed from `IpcChannelMap[C]["request"]`, so that typos and field name changes are caught at compile time.
20. As a **developer**, I want void-request channels to disallow `params`, so that the type system prevents nonsensical extractors.
21. As a **developer**, I want `wrap` and `transform` to remain untyped (they depend on service method return types not in IpcChannelMap), so that we don't over-engineer the solution.
22. As a **developer**, I want routes.ts to be mechanically converted — no logic changes, just type annotations — so that the refactor is low-risk.

## Implementation Decisions

### Candidate 1: Security Gate Orchestration

- **Two named functions**: `guardedWrite<T>(operation, executeFn)` and `guardedDelete(operation)`. Not a single function with options.
- **`guardedWrite`**: Takes a `WriteOperation` and an `executeFn: () => Promise<T>`. Handles: blocked→throw, autoApprove→log+execute, else→pending audit. Returns `KnowledgeWriteResponse<T>`.
- **`guardedDelete`**: Takes a `WriteOperation` only (no executeFn — deletes always go to pending). Handles: blocked→throw, else→pending audit. Returns `KnowledgeWriteVoidResponse`.
- **Return types are IPC response types directly** — security-gate imports `KnowledgeWriteResponse`, `KnowledgeWriteVoidResponse` from the channels module. Pragmatic: the only callers are IPC handlers.
- **Blocked = throw** — handlers don't handle the blocked branch, the error propagates through `registerHandler`'s existing error normalization.
- **`makeAuditEntry` helper** moves from knowledge-handler.ts to security-gate.ts as a private function.
- **Operation construction stays in handlers** — `updateNode` and `deleteNode` need to look up the existing node first to get `domainId`. This lookup is handler-specific business logic, not security logic.
- **ASSESS_WRITE handler unchanged** — it's pattern C (standalone assessment, no execution), not pattern A or B.
- **security-handler.ts loses no functionality** — only knowledge-handler.ts is simplified.

### Candidate 2: Service Factory Pattern

- **Scope**: 6 services converted: skill-engine, framework-engine, timeline-engine, research-scheduler, conversation-service, model-manager.
- **Not converted** (remain as global-singleton modules): security-gate, knowledge-graph, domain-manager, domain-config, inbox-processor, import-pipeline, search-engine, version-control, diff-service, domain-summary-service, decision-service, and all other services.
- **Two deps interfaces**:
  - `DbDeps { db: DatabaseService }` — for skill-engine, framework-engine, timeline-engine
  - `FullDeps extends DbDeps { piMono: PiMonoWrapper }` — for research-scheduler, conversation-service, model-manager
- **Factory function pattern**: Each service exports `createXxxService(deps: XxxDeps)` returning an object with all public methods. Export type `XxxService = ReturnType<typeof createXxxService>`.
- **Internal structure**: Factory closures over `deps`. All former module-level `getDatabaseService()` calls become `deps.db.xxx`. All `getPiMonoWrapper()` calls become `deps.piMono.xxx`.
- **Cross-service imports**: Services that import from helper modules (session-runner, cost-estimator, research-cost-tracker, knowledge-graph, domain-config) continue to import them directly — these are not services being converted.
- **register.ts changes**: Builds `DbDeps`/`FullDeps` from `getDatabaseService()`/`getPiMonoWrapper()`, calls factory functions, registers results in service registry.
- **Handler registration changes**:
  - `registerDomainHandlers` receives `skillEngine` as a parameter (it calls `SkillEngine.registerDomainSkills`).
  - `registerChatHandlers` receives `conversationService` as a parameter (it calls `sendMessageStream`).
  - `registerInboxHandlers` unchanged (inbox-processor not converted).
  - `registerSecurityHandlers` unchanged (security-gate not converted).
  - `registerKnowledgeHandlers` unchanged (knowledge-graph and security-gate not converted).
- **Deprecation path**: Old module-level exports removed. No backward compatibility shims.

### Candidate 3: Type-Safe IPC Routes

- **Generic ChannelRoute**: `ChannelRoute<C extends ChannelName = ChannelName>` with `channel: C` and `params?: (req: ChannelRequest<C>) => unknown[]`.
- **Void-request handling**: Channels with `request: void` have `ChannelRequest<C> = void`. The `params` type becomes `(req: void) => unknown[]`. In practice, void-request routes don't provide `params` — they rely on the default `[req]` in dispatch.
- **`wrap` and `transform` remain `(result: unknown) => unknown`** — they can't be typed without service method signatures in IpcChannelMap.
- **router.ts changes**: `ChannelRoute` interface gains the generic parameter. `dispatch` and `registerRoutes` updated accordingly. No runtime logic changes.
- **routes.ts changes**: Every route definition gets typed — the `params` closures drop all `as` casts. Mechanical transformation, no logic changes.
- **Implementation order**: Candidate 3 is done last because Candidate 2 changes how services are structured, and Candidate 3 benefits from stable service interfaces.

## Testing Decisions

### General

- Tests verify **external behaviour through the module's public interface**, not implementation details.
- Existing test patterns in the codebase are followed: `describe`/`it` blocks, `beforeEach` for setup, `vi.fn()` for mocks.
- Test files live in `tests/server/services/` (per project convention).

### Candidate 1: Security Gate

- **What to test**: `guardedWrite` and `guardedDelete` through their public interface.
- **Test seams**: Call `guardedWrite`/`guardedDelete` directly with a `WriteOperation` and mock `executeFn` (for guardedWrite). No need to mock IPC, handlers, or services.
- **Test cases**:
  - guardedWrite: blocked operation → throws
  - guardedWrite: autoApprove → logs audit, calls executeFn, returns result
  - guardedWrite: medium/high risk → creates pending audit, does NOT call executeFn, returns pending result
  - guardedDelete: blocked → throws
  - guardedDelete: any non-blocked risk → creates pending audit, returns pending result (never auto-approves)
- **Prior art**: `cost-estimator.test.ts` — zero mocks, tests factory functions directly. This is the pattern to follow.

### Candidate 2: Service Factories

- **What to test**: Each of the 6 factory-created services through their public interface.
- **Test seam change**: Instead of `vi.mock("@server/db/index")`, tests create `const svc = createXxxService({ db: mockDb })` and call `svc.someMethod()`.
- **Mock reduction**: Expected to go from ~9 `vi.mock()` calls per test to ~0-2 (only for cross-service collaborators like session-runner that aren't being converted).
- **Prior art**: `cost-estimator.test.ts` and `session-runner.test.ts` — both use factory pattern with zero mocks.
- **Test files to update**:
  - `tests/server/services/skill-engine.test.ts` — rewrite to factory pattern
  - `tests/server/services/timeline-engine.test.ts` — rewrite to factory pattern
  - `tests/server/services/research-scheduler.test.ts` — rewrite to factory pattern
  - `tests/server/services/conversation-service.test.ts` — rewrite to factory pattern
  - `tests/server/services/framework-engine-session.test.ts` — update if affected
- **Test files that DON'T change** (services not being converted):
  - `tests/server/services/decision-service.test.ts`
  - `tests/server/services/domain-summary-service.test.ts`
  - `tests/server/services/security-gate.test.ts`
  - All other test files for unconverted services

### Candidate 3: Type-Safe Routes

- **What to test**: Compile-time correctness (TypeScript compiler catches mismatches). No new runtime tests needed.
- **Existing tests**: `tests/server/ipc/router.test.ts` and `tests/server/ipc/routes.test.ts` — verify these still pass after the type changes.
- **Verification**: Run `pnpm tsc --noEmit` to confirm all routes type-check correctly.

## Out of Scope

- **Other services not in the 6** — security-gate, knowledge-graph, domain-manager, inbox-processor, import-pipeline, search-engine, version-control, diff-service, domain-summary-service, decision-service, etc. These remain as global-singleton modules. They can be converted incrementally in future PRs following the same factory pattern.
- **Full type safety on `wrap`/`transform`** — would require service method return types in IpcChannelMap, which is a deeper change.
- **Full type safety on `params` return values** — would require service method parameter types in IpcChannelMap.
- **Handler-specific tests** — No new test files for knowledge-handler, domain-handler, chat-handler, security-handler, or inbox-handler (though Candidate 1 makes them testable, writing those tests is a separate task).
- **UI/frontend changes** — These are server-side refactors with no user-facing impact.
- **Behavioural changes** — All three refactorings preserve existing runtime behaviour. No new features, no changed semantics.

## Further Notes

### Implementation Order

1. **Candidate 1 (Security Gate)** — smallest, self-contained, zero cross-file risk. Validates the deepening pattern.
2. **Candidate 3 (Type-Safe Routes)** — type-level only, no runtime changes, medium scope.
3. **Candidate 2 (Service Factory)** — largest scope, done last so patterns from 1 and 3 are established.

### Risk Assessment

| Candidate | Files Changed | Risk | Mitigation |
|---|---|---|---|
| 1 — Security Gate | 3 (security-gate, knowledge-handler, security-handler) | Low | Tests for guardedWrite/guardedDelete before handler refactor |
| 2 — Service Factory | ~20 (6 services, 6+ tests, register.ts, 2 handlers, routes.ts) | Medium | Convert one service at a time, run tests after each |
| 3 — Type-Safe Routes | 3 (router.ts, routes.ts, channels/index.ts) | Low | `tsc --noEmit` validates correctness, no runtime changes |

### Dependency Graph

- Candidate 1 and 3 are independent of each other.
- Candidate 2 is independent but touches the most files — doing it last means the codebase is stabilized from 1 and 3.
- `security-gate.ts` is modified in Candidate 1 (add guardedWrite/guardedDelete) but NOT converted to factory in Candidate 2 — it stays as a global-singleton module.
