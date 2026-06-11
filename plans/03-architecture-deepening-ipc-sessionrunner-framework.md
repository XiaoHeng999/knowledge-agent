# PRD: Architecture Deepening — IPC Layer, LLM SessionRunner, Framework Split

> Date: 2026-06-09
> Status: Draft
> Priority: High

---

## Problem Statement

AgentClaw 的服务端架构存在三类系统性"浅模块"问题，导致开发效率低、测试困难、重复代码多：

1. **IPC Handler 层大面积透传**：101 个 handler 注册中约 90 个仅做"解构 request → 调 service 一个方法 → 可选包装返回值"，没有增加任何逻辑。新增 IPC channel 需要创建新 handler 文件，实际只是样板代码。这些 handler 是浅模块——接口几乎和实现一样复杂，删除测试显示复杂度不会消失，只会集中到调用方。

2. **LLM Session 生命周期样板重复**：5 个服务（framework-engine、timeline-engine、skill-engine、conversation-service、research-scheduler）各自独立管理 pi-mono session 的 create → subscribe → prompt → collect → destroy 流程。同一段 15 行代码被复制粘贴 7 次。成本估算使用两套不一致的策略（`chars/4` 启发式 vs `research-cost-tracker`），无法在不修改 5 个文件的情况下统一修改。

3. **Framework Engine 上帝对象**：`framework-engine.ts` 有 838 行、12 个导出函数，混杂三个零概念重叠的关注点：框架分析执行、ADR 决策记录 CRUD、领域摘要生成。接口过宽（12 个函数），但每个调用方只使用其中 2-3 个。bug 修复和新增功能需要在 838 行中定位相关代码。

## Solution

通过三次渐进式重构，将浅模块深化、消除重复、拆分上帝对象：

1. **声明式 IPC Router**：用 `ChannelRoute[]` 映射表替换 90 个透传 handler，保留 10 个有真实编排逻辑的 handler。新增 IPC channel 变为一行 map 条目。

2. **SessionRunner 模块**：提取一个深度模块 `session-runner.ts`，封装完整的 LLM session 生命周期。提供注入式 `CostEstimator` 接口，统一成本估算策略。四个服务通过单一接口调用 LLM。

3. **Framework Engine 拆分**：将 838 行的 framework-engine 拆为三个聚焦模块——`framework-engine`（框架分析）、`decision-service`（ADR）、`domain-summary-service`（摘要/记忆）。

三个改进有正反馈依赖：SessionRunner 先做会让 Framework 拆分更干净（各自通过 `runPrompt()` 调 LLM，减少 session 样板）。

## User Stories

### SessionRunner 模块

1. As a developer, I want to add a new LLM-powered service, so that I don't have to copy-paste the session lifecycle boilerplate
2. As a developer, I want to call `runPrompt(domainId, modelId, prompt)` and get back content + cost, so that I can focus on business logic instead of session management
3. As a developer, I want to test my service without a real pi-mono instance, so that I can write fast, deterministic unit tests
4. As a developer, I want cost estimation to be consistent across all services, so that I don't have two different estimation strategies producing different numbers
5. As a developer, I want to swap cost estimation strategies via an injected adapter, so that research-scheduler can use the precise tracker while other services use the heuristic
6. As a developer, I want session cleanup bugs to be fixed in one place, so that I don't have to find and fix the same bug in 5 files
7. As a developer, I want the conversation-service streaming path to remain independent, so that the sync-only SessionRunner interface stays simple
8. As a code reviewer, I want to see LLM session handling in one module, so that I can review it thoroughly once instead of skimming 5 copies

### IPC Layer

9. As a developer, I want to add a new IPC channel by adding one line to a map, so that I don't have to create a new handler file with boilerplate
10. As a developer, I want the IPC router to auto-handle request destructuring and response wrapping, so that trivial handlers don't exist as separate files
11. As a developer, I want the 10 handlers with real orchestration logic (streaming bridge, security gate, skill registration) to remain as explicit modules, so that their complexity is visible and testable
12. As a developer, I want a `params` extraction function on each route, so that services don't need to change their signatures to accept a flat req object
13. As a developer, I want an optional `wrap` key on routes, so that the router can auto-wrap array results into `{ items }` style responses
14. As a code reviewer, I want to see all IPC channels listed in one declarative map, so that I can audit the full IPC surface at a glance
15. As a developer, I want to delete ~1500 lines of handler boilerplate, so that the codebase is smaller and easier to navigate

### Framework Engine Split

16. As a developer, I want ADR decision record logic in its own module, so that I can find and modify it without scrolling through framework analysis code
17. As a developer, I want domain summary generation in its own module, so that it can be reused from timeline and research, not just framework
18. As a developer, I want each module to have a narrow interface (4-5 functions), so that I can understand its contract at a glance
19. As a developer, I want to test ADR retrieval independently of framework execution, so that I can write focused unit tests
20. As a developer, I want the slug extraction helper to live in `domain-config.ts`, so that it's not duplicated across 3 files
21. As a developer, I want framework-engine to shrink from 838 to ~300 lines, so that it's easier to navigate and modify

### Cross-cutting

22. As a developer, I want the implementation order to be SessionRunner → Framework Split → IPC Router, so that each step makes the next one cleaner
23. As a developer, I want all three changes to be low-risk refactorings, so that behavior is preserved and only module structure changes
24. As a developer, I want each change to be independently shippable, so that we can deliver incrementally without a long-lived branch

## Implementation Decisions

### SessionRunner Module

- **位置**: `server/services/session-runner.ts`，与 framework-engine、skill-engine 平级
- **Scope**: 同步 only。`runPrompt()` 返回 `{ content, estimatedTokens, estimatedCost }`。Conversation-service 保留独立的流式 session 逻辑。
- **生命周期**: SessionRunner 拥有完整的 pi-mono session 生命周期——create → subscribe → prompt → collect → destroy。调用方不接触 session 对象。
- **接口形状**:
  ```
  runPrompt(domainId: string, modelId: string, prompt: string) → Promise<{
    content: string;
    estimatedTokens: number;
    estimatedCost: number;
  }>
  ```
- **CostEstimator 接口**: 注入式 adapter，默认实现用 `chars/4` 启发式估算。Research-scheduler 传入 `research-cost-tracker` 作为替代 adapter。两个 adapter 证明 seam 真实。
  ```
  interface CostEstimator {
    estimateTokens(inputChars: number, outputChars: number): number;
    estimateCost(tokens: number, modelId: string): number;
  }
  ```
- **受影响的 4 个调用方**: framework-engine（2 处）、timeline-engine（2 处）、skill-engine（1 处）、research-scheduler（1 处）。各删除 ~30 行 session 样板代码。
- **不受影响**: conversation-service 保留自己的流式逻辑和 session 管理。embedding-service 不使用 LLM session。

### IPC Layer

- **声明式 ChannelRoute 映射**: 替换 90 个透传 handler。Route 条目结构：
  ```
  {
    channel: string;           // e.g. 'research:trigger'
    service: string;           // e.g. 'research'
    method: string;            // e.g. 'triggerResearch'
    params?: (req: any) => any[];  // optional param extraction
    wrap?: string;             // optional response key, e.g. 'items'
  }
  ```
- **参数提取**: 可选 `params` 函数。无声明时 router 传整个 `req` 对象给 service 方法。有声明时用展开调用 `service.method(...params(req))`。
- **自动包装**: 可选 `wrap` 键。router 自动把 service 返回值包装为 `{ [wrap]: result }`。无声明时直接返回 service 结果。
- **10 个保留的显式 handler**: 这些 handler 做真实的跨 service 编排，不能用声明式 map 替代：
  - `chat:sendMessage` — 流式桥（BrowserWindow 事件推送）
  - `knowledge:createNode/updateNode/deleteNode/createEdge/deleteEdge` — 安全门编排（风险评估 + 审核队列 + 自动批准逻辑）
  - `domain:create` — 创建后自动注册 domain skills
  - `domain:updateConfig` — 配置更新后重新注册 domain skills
  - `inbox:suggestDomains` — 跨数据源组合（读 inbox item + 构造内容 + 调 AI 建议）
  - `security:assessWrite` — 审核编排（自动批准 + 日志 + 队列）
  - Window handlers (5 个) — Electron BrowserWindow 操作，不是 service 调用
- **注册位置**: 声明式 routes 和显式 handlers 统一在 `server/ipc/register.ts` 注册。
- **删除的文件**: 当 handler 文件中所有方法都迁移到 map 后，该文件可删除。保留的 handler 文件（knowledge-handler、chat-handler、domain-handler、security-handler、inbox-handler）中仅保留有真实逻辑的方法。

### Framework Engine Split

- **拆分为 3 个模块**:
  - `framework-engine.ts` — 框架分析执行（listFrameworks、executeAnalysis、listResults、getResult）→ ~300 行（加上 SessionRunner 后减掉 session 样板）
  - `decision-service.ts` — ADR 决策记录（generateDecisionRecord、updateDecisionStatus、listDecisionRecords、getDecisionRecord、retrieveRelevantDecisions）→ ~250 行
  - `domain-summary-service.ts` — 领域摘要 + 三层记忆（generateDomainSummary、getMemoryStats）→ ~180 行
- **共享资源访问**: 三个模块各自通过 `getDatabaseService()` 和 `getPiMonoWrapper()` 单例获取依赖。不互相导入。
- **slug 提取辅助函数**: 当前 `extractSlugFromConfigPath()` 在 framework-engine 中定义，但 domain-manager 和 security-guard 用内联版本。统一收到 `server/services/domain-config.ts`。
- **IPC handler 更新**: `framework-handler.ts` 的 11 个方法分别路由到 3 个不同模块。handler 层不需要拆分——它只是一个 IPC 分发点。但 #1 做完后，framework-handler 中的透传方法会迁移到声明式 map。

### 实施顺序和依赖

- **Phase 1: SessionRunner**（独立，无前置依赖）
- **Phase 2: Framework Split**（Phase 1 完成后更干净——三个拆分模块都用 `runPrompt()` 而非各自的 session 样板）
- **Phase 3: IPC Router**（独立但工作量大，Phase 2 完成后 framework-handler 的路由目标模块已确定）

## Testing Decisions

### 测试原则

- **测试接口，不测试实现**：通过模块的外部 seam 验证行为，不检查内部状态或调用顺序。
- **优先使用现有 seam**：Module 的导出函数就是测试 surface。不引入仅在测试中使用的内部方法导出。
- **Stub 外部依赖**：pi-mono wrapper、database service 在测试中用 deterministic stub 替代。

### SessionRunner 测试

- **Seam**: `runPrompt()` 函数接口 + `CostEstimator` 接口
- **测试策略**:
  - 用 stub `PiMonoWrapper`（返回固定 session 对象）验证 create → subscribe → prompt → collect → destroy 流程
  - 用 stub `CostEstimator` 验证成本估算被正确调用和返回
  - 验证 session 清理在成功和失败路径下都执行（destroy 总被调用）
- **先例**: `research-cost-tracker.test.ts` 使用了类似的 accumulator 验证模式

### IPC Router 测试

- **Seam**: 声明式 `ChannelRoute[]` 映射 + router 函数
- **测试策略**:
  - 验证 map 中每个 route 的 channel 格式符合 `module:action` 约定
  - 验证 `params` 提取函数对典型 request 的正确解构
  - 验证 `wrap` 键正确包装数组/对象结果
  - 验证无 `params` 时传完整 req
  - 验证无 `wrap` 时直接返回 service 结果
- **先例**: `tests/src/lib/channels-exports.test.ts` 已验证 channel 导出完整性

### Framework Split 测试

- **Seam**: 各模块的导出函数接口
- **测试策略**:
  - `decision-service`: 用 stub database 验证 CRUD 操作（create、list、update、retrieve）。验证 `nextDecisionNumber` 的单调递增约束。
  - `domain-summary-service`: 用 stub SessionRunner + stub database 验证摘要生成流程。
  - `framework-engine`: 用 stub SessionRunner 验证框架执行流程（prompt 构造、结果存储）。
- **先例**: `tests/server/services/logger.test.ts` 验证了类似的独立 service 模块

### 不测试的内容

- 各 handler 文件的行为（#1 完成后这些要么消失，要么变成 map 条目）
- pi-mono SDK 本身的行为（外部依赖，不是我们的代码）
- 已有的 repository 层（不改变）

## Out of Scope

- **Conversation-service 流式路径重构**：保留现状，不纳入 SessionRunner scope
- **Extension lifecycle 重复消除**（Candidate #4）：有价值但独立，不在此 PRD 范围
- **Inbox repository 合并**（Candidate #5）：小改动，独立进行
- **Schema.ts 拆分**：422 行的单体 schema 文件，耦合风险存在但拆分收益不足以在此 PRD 中处理
- **Store 层重构**（混合 selector vs 全量解构、`window.api` vs store 数据获取）：前端问题，独立于后端架构深化
- **Worker 层改动**：Worker 任务已经是自包含的纯函数，无需重构
- **`model-manager.ts` 浅模块评估**：它为加密 API key 持久化赚到了存在价值，暂不动

## Further Notes

### 响应包装策略的取舍

当前 channel types 定义了包装后的响应形状（如 `{ items: SkillInfo[] }`），而 service 方法返回原始数组。Handler 层是唯一做这个映射的地方。声明式 map 通过 `wrap` 键保留了这个包装——service 继续返回原始类型，router 负责 shape 适配。这个决定保持了 service 层的纯粹性，代价是 map 需要知道 response key 名称。

### SessionRunner 与 EmbeddingService 的模式一致性

`embedding-service.ts` 已经是项目中最健康的模块——使用 strategy pattern（`EmbeddingProvider` 接口）+ `setEmbeddingProvider()` 运行时注入。SessionRunner 的 `CostEstimator` 注入遵循相同模式。这种一致性让两个模块的设计模式对未来的 service 有示范作用。

### Framework Split 后的 IPC Handler

拆分后 `framework-handler.ts` 的 11 个方法分别路由到 3 个模块。在 Phase 3（IPC Router）完成前，handler 文件不变——只是调用目标从 `framework-engine` 的一部分函数改为三个模块的函数。Phase 3 完成后，framework-handler 中的透传方法（大部分）会迁移到声明式 map，handler 文件可能进一步缩减甚至消失。
