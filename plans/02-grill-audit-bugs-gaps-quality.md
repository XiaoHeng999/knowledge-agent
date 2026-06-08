# 02 - Grill Audit: Bug 修复、功能遗漏与代码质量

## Problem Statement

在首轮代码质量修复（01-plan）之后，对整个代码库进行了第二轮深度追问审查（grill-with-docs），发现了 13 类新问题：2 个数据正确性 Bug（Settings 双重 JSON 编码、研究调度成本伪造）、4 个功能遗漏（命令面板搜索/历史为空、自定义框架仅占位、流式聊天无错误恢复、WebGL 图谱节点画成方块）、以及 7 个代码质量/维护性问题（`channels.ts` 1311 行未拆分、`any` 类型违反规范、测试覆盖率接近零、空 catch 吞错误等）。如果不修复，用户会看到：研究仪表盘成本数据是假的、命令面板搜索永远返回空、1000+ 节点图谱显示满屏方块、Settings 持久化数据损坏。

## Solution

按优先级分三批修复所有已确认问题。每项修复有明确的实施决策，来源于逐一追问对齐。所有功能补全和 Bug 修复均采用 TDD 开发流程（红-绿-重构）。

## User Stories

### P0 — 数据正确性 Bug

1. As a user, I want the app's persisted settings (theme, store state) to be stored and retrieved without double JSON encoding, so that Zustand stores can correctly rehydrate state after app restart.
2. As a user, I want the research dashboard to show real token usage and cost data from the LLM API, so that I can trust the cost tracking and budget enforcement.
3. As a user, I want the WebGL knowledge graph to render nodes as circles (not squares) when there are 1000+ nodes, so that the visual quality matches the D3 SVG version.

### P1 — 功能遗漏

4. As a user, I want to search knowledge nodes through the command palette, so that I can quickly find and navigate to any knowledge entry without leaving my current workflow.
5. As a user, I want to see recently executed commands and visited pages in the command palette, so that I can repeat common actions faster.
6. As a user, I want to use a custom analysis framework beyond the built-in ones (TRL, Competitive, HypeCycle), so that I can apply domain-specific analytical models.
7. As a user, I want streaming chat responses to handle mid-stream failures gracefully, so that I see a clear error message and can retry instead of a frozen partial message.
8. As a user, I want store hydration failures to show an error banner instead of silently presenting empty data, so that I know something went wrong and can take action.

### P2 — 代码质量与维护性

9. As a developer, I want `channels.ts` split by domain into separate files, so that the 1311-line monolith is maintainable and new IPC channels are easy to add.
10. As a developer, I want the Worker process handler map to use proper TypeScript interfaces instead of `any`, so that type safety is enforced throughout the codebase.
11. As a developer, I want D3 zoom operations extracted into a typed helper module, so that `force-graph.tsx` has zero `as any` casts.
12. As a developer, I want `timeline/page.tsx` sub-components extracted to `src/components/timeline/`, so that the page file stays under 700 lines and matches other modules' organization.
13. As a developer, I want server-side `console.log/error` calls to route through the project Logger service, so that all logs are structured, searchable, and cost-tracked in production.
14. As a developer, I want `docs/file-map.md` to accurately reflect the current codebase structure, so that AI-assisted development and new contributors can navigate the project correctly.
15. As a developer, I want documentation to reference SQLite-vec (not SQLite-vss), so that it matches the actual implementation.
16. As a developer, I want comprehensive test coverage for all services and stores following TDD methodology, so that regressions are caught before they reach users.
17. As a developer, I want CI to run `pnpm test` as part of the pipeline, so that test failures block merges.

## Implementation Decisions

### ID-01: Settings Repository — 创建独立仓库 + 修复双重编码

创建 `SettingsRepository` 类（不继承 `BaseRepository`，因为 settings 表用 `key` 做 PK 而非 `id`）。提供 `get(key)`, `set(key, value)`, `remove(key)` 方法。

编码策略：`set()` 方法对 `value` 做类型判断——如果已经是 `string` 则直接存入，否则 `JSON.stringify()` 后存入。`get()` 返回原始字符串，让调用方决定如何反序列化。这消除了 `register.ts` 中 `JSON.stringify(req.value)` 对已经是字符串的值再次编码的 Bug。

注册到 `DatabaseService`，`register.ts` 的 settings handler 改为调用 `db.settings.get/set`。

- 涉及模块: 新增 `server/db/repositories/settings.ts`，修改 `server/db/index.ts`，修改 `server/ipc/register.ts`
- 新增类: `SettingsRepository`
- 新增属性: `DatabaseService.settings`

### ID-02: 研究调度成本追踪 — turn_end 提取真实 token 数据

在 `research-agent-extension.ts` 的 `turn_end` hook 中，从 pi-mono SDK 的 `event` 对象提取真实的 `inputTokens` 和 `outputTokens`。通过 `session-context.ts` 的 sessionId → domainId 映射找到对应 research run，更新其 `token_count` 和 `cost_usd` 字段。

删除 `research-scheduler.ts` 中的"字符数除以 4"估算逻辑。成本计算改为：从 model pricing 配置读取 `costPerMillionInput/Output`，乘以真实 token 数。

`maxCostPerRunUsd` 预算检查改为在研究完成后校验（而非预先估算），超出时标记 run 为 `over_budget` 但不删除结果。

- 涉及模块: `server/pi-mono/extensions/research-agent-extension.ts`, `server/services/research-scheduler.ts`, `server/pi-mono/extensions/session-context.ts`
- 修改 hook: `turn_end`
- 修改函数: `executeResearchRun` 中的成本计算段

### ID-03: WebGL 圆形渲染 — 三角形扇替代方块

将 `webgl-graph.tsx` 的节点绘制从两个三角形（矩形/菱形）改为三角形扇（TRIANGLE_FAN）绘制近似圆。每个节点用 16-24 个三角形片段构成圆形轮廓。选中节点的高亮环同样改为圆形。

同步验证点击检测（`handleCanvasClick`）的圆形距离判断仍然与渲染匹配。

- 涉及模块: `src/components/graph/webgl-graph.tsx`
- 修改: 节点顶点生成逻辑（第 278-311 行区域）

### ID-04: 命令面板 — 知识搜索 + 最近记录

**知识搜索**：在 `cmd-palette.tsx` 的 `handleQuery` 中调用 `window.api.search.search({ query, limit: 5 })`，将结果映射为 `PaletteItem`（type: `knowledge`），点击后导航到 `/domain?id=<nodeId>`。

**最近记录**：新建 `src/lib/commands/history.ts`，维护一个最近执行命令/访问页面的列表（上限 20），持久化到 Settings（通过 `settings:set` 以 `agentclaw:cmd-history` 为 key）。`cmd-palette.tsx` 打开时从 history 加载 recentItems。

- 涉及模块: `src/components/cmd-palette/cmd-palette.tsx`, 新增 `src/lib/commands/history.ts`
- 新增 IPC 调用: `search:search`
- 新增 Settings key: `agentclaw:cmd-history`

### ID-05: 自定义框架 — 用户定义分析框架

在 `framework-engine.ts` 中实现 `custom` 框架的完整逻辑：

1. 从域配置文件 `config.yaml` 的 `frameworks.custom` 节读取用户自定义框架定义（包含 `name`, `description`, `dimensions[]`, `scoringPrompt`）。
2. 执行时将自定义框架的维度和评分 prompt 注入到 LLM 请求中。
3. 结果解析遵循与内置框架相同的 `FrameworkResult` 结构。
4. 如果 `config.yaml` 中没有定义自定义框架，UI 不显示 Custom 选项。

- 涉及模块: `server/services/framework-engine.ts`, `server/services/domain-config.ts`
- 修改函数: `executeFramework` 的 custom 分支

### ID-06: 流式聊天错误恢复

在 `chat-store.ts` 的流式监听器中处理 `error` 事件：

1. 监听 IPC stream 的 `error` 事件类型。
2. 收到错误时：将当前 partial content 保存为一条标记了 `status: 'incomplete'` 的 assistant 消息（内容带 `⚠️ Response interrupted` 前缀）。
3. 清理 streaming 状态，显示 error-banner 提示。
4. 在该消息下方提供"Retry"按钮，点击后重新发送原始 user 消息（复用 `sendMessage` 逻辑）。

前端 `message-list.tsx` 对 `status: 'incomplete'` 的消息显示重试按钮。

- 涉及模块: `src/stores/chat-store.ts`, `src/components/chat/message-list.tsx`
- 新增消息状态: `status: 'incomplete'`
- 新增 IPC event type: stream `error`

### ID-07: 空 catch 块修复

对以下文件中的空 catch 块添加 `console.warn` 输出和 error-banner 触发：

- `src/stores/security-store.ts`
- `src/stores/model-store.ts`
- `src/stores/research-store.ts`
- `src/stores/skill-store.ts`（2 处）
- `src/app/(main)/page.tsx`
- `src/app/(main)/inbox/page.tsx`
- `src/components/ui/launch-loader.tsx`

统一模式：catch 中 `console.warn('[StoreName] Failed to load:', err)` + 通过 app-store 的 error state 触发 error-banner。

- 涉及模块: 上述 8 个文件
- 依赖: app-store 需暴露 `setGlobalError` 方法

### ID-08: channels.ts 按域拆分

将 `src/lib/ipc/channels.ts` 拆分为 `src/lib/ipc/channels/` 目录：

```
channels/
  index.ts          — 统一导出 + IpcChannelMap
  app.ts            — APP_CHANNELS + 类型
  db.ts             — DB_CHANNELS + 类型
  model.ts          — MODEL_CHANNELS + 类型
  domain.ts         — DOMAIN_CHANNELS + 类型
  knowledge.ts      — KNOWLEDGE_CHANNELS + 类型
  chat.ts           — CHAT_CHANNELS + 类型
  search.ts         — SEARCH_CHANNELS + 类型
  inbox.ts          — INBOX_CHANNELS + 类型
  research.ts       — RESEARCH_CHANNELS + 类型
  settings.ts       — SETTINGS_CHANNELS + 类型
  import.ts         — IMPORT_CHANNELS + 类型
  framework.ts      — FRAMEWORK_CHANNELS + 类型
  timeline.ts       — TIMELINE_CHANNELS + 类型
  skill.ts          — SKILL_CHANNELS + 类型
  worker.ts         — WORKER_CHANNELS + 类型
  window.ts         — WINDOW_CHANNELS + 类型
  vc.ts             — VC_CHANNELS + 类型
  security.ts       — SECURITY_CHANNELS + 类型
  update.ts         — UPDATE_CHANNELS + 类型
  shared.ts         — 跨域共享类型（如 KnowledgeNode, ModelInfo 等）
```

`index.ts` 从所有子模块 re-export，并组装 `IpcChannelMap` 联合类型。所有消费者只需改 import path（从 `channels` 到 `channels/index`，TypeScript 自动解析）。

- 涉及模块: `src/lib/ipc/channels.ts` → 拆分为 21 个文件
- 影响范围: 所有 import `channels.ts` 的文件（import path 不变，零破坏性）

### ID-09: Worker handler map — 消除 `any`

在 `server/worker/worker-process.ts` 中定义：

```ts
interface WorkerHandlerContext {
  logger: { info: (msg: string) => void; error: (msg: string) => void };
}
type WorkerHandler<T = unknown> = (payload: T, ctx: WorkerHandlerContext) => Promise<unknown>;
```

handler map 改为 `Record<string, WorkerHandler>`。各 task handler 函数的参数签名从 `(payload: any, ctx: any)` 改为具体的 payload 类型 + `WorkerHandlerContext`。

- 涉及模块: `server/worker/worker-process.ts`, `server/worker/tasks/*.ts`
- 新增类型: `WorkerHandler`, `WorkerHandlerContext`

### ID-10: D3 zoom helpers — 消除 force-graph 的 7 处 `as any`

新建 `src/components/graph/d3-zoom-helpers.ts`，封装：

1. `attachZoomBehavior(selection, container, callbacks)` — 绑定 zoom 到 SVG selection
2. `zoomIn(selection, scale)` / `zoomOut(selection, scale)` — 缩放控制
3. `zoomReset(selection)` — 重置到初始视图

内部通过 D3 泛型正确处理 `Selection<SVGSVGElement, unknown, null, undefined>` 类型，对外暴露无 `any` 的简洁接口。

- 涉及模块: 新增 `src/components/graph/d3-zoom-helpers.ts`，修改 `src/components/graph/force-graph.tsx`
- 删除: 7 处 `eslint-disable` 注释 + `as any` 强转

### ID-11: timeline/page.tsx 子组件抽取

将 `src/app/(main)/timeline/page.tsx` 中的内联子组件抽取到 `src/components/timeline/` 目录：

- `timeline-event-list.tsx` — 事件列表 + 筛选
- `timeline-prediction-panel.tsx` — 预测卡片 + 准确率
- `timeline-trend-analysis.tsx` — 趋势分析图表
- `timeline-filters.tsx` — 时间范围 + 类型筛选器

page.tsx 只保留数据获取和布局编排，目标缩减到 200 行以内。

- 涉及模块: 拆分 `src/app/(main)/timeline/page.tsx` → 新增 4 个组件
- 新增目录: `src/components/timeline/`

### ID-12: Server console → Logger 迁移

两阶段处理：

**阶段 1 — Logger 就绪前**（`electron/main.ts` 初始化、`server/db/` 初始化）：保留 `console.log/error`，不加改动。在这些文件的顶部加注释 `// Note: Logger not yet available during early init`。

**阶段 2 — Logger 就绪后**（IPC handlers、services、worker-bridge 等）：将 `console.log/error/warn` 替换为 Logger 实例方法调用。Logger 构造函数增加 `module: string` 参数，每个模块用自己的 logger 实例。

涉及 35 处替换，分布在 9 个文件中。

- 涉及模块: `server/ipc/handler.ts`, `server/services/research-scheduler.ts`, `server/worker/worker-bridge.ts`, `server/db/migrations/runner.ts`, `server/services/skill-engine.ts`, `server/services/knowledge-graph.ts`, `server/ipc/handlers/chat-handler.ts`, 及其他
- 依赖: `server/services/logger.ts` 需支持 `module` 参数

### ID-13: file-map.md 重写

基于实际代码库结构完整重写 `docs/file-map.md`。主要修正：

- 删除不存在的文件：`server/db/repositories/sources.ts`, `server/db/repositories/timeline-entries.ts`
- 补充遗漏文件：`inbox-items.ts`, `predictions.ts`, `002_skill_executions.ts`, `model-resolver.ts`, `session-context.ts`, 10 个 UI 组件, `global-error.tsx` 等
- 修正目录归属：`paths.ts`, `provider.ts`, `domain-dirs.ts`, `markdown-parser.ts` 从 `server/lib/` 改为 `server/fs/`
- 删除幽灵目录：`src/components/research/`
- 反映 ID-08 的 channels 拆分

- 涉及模块: `docs/file-map.md`

### ID-14: 文档 SQLite-vss → SQLite-vec 更新

在 `docs/projection_design_planning/agent-claw-v2.md` 中将所有 `SQLite-vss` / `sqlite-vss` 替换为 `SQLite-vec` / `sqlite-vec`。

- 涉及模块: `docs/projection_design_planning/agent-claw-v2.md`

### ID-15: 测试覆盖率补齐 + CI 集成

**CI 修复**：在 `.github/workflows/build.yml` 的 `lint-and-typecheck` job 中添加 `pnpm run test` 步骤（在 lint 和 typecheck 之后）。

**测试补齐**（按优先级，全部 TDD 流程）：

| 优先级 | 模块 | 测试类型 |
|--------|------|----------|
| P0 | `server/db/repositories/settings.ts` (ID-01) | 单元测试：get/set/remove + JSON 编码正确性 |
| P0 | `server/pi-mono/extensions/research-agent-extension.ts` (ID-02) | 单元测试：turn_end 成本提取 |
| P0 | `server/services/security-gate.ts` | 单元测试：风险评估 + 审核流程 |
| P0 | `server/db/migrations/` | 集成测试：migration up/down |
| P1 | `src/lib/commands/parser.ts` | 单元测试：命令解析 |
| P1 | `src/lib/commands/registry.ts` | 单元测试：注册、查找、执行 |
| P1 | `src/stores/*.ts`（14 个 store） | 单元测试：状态流转 |
| P1 | `server/services/search-engine.ts` | 单元测试：混合搜索 + RRF |
| P1 | `server/services/knowledge-graph.ts` | 单元测试：节点/边 CRUD |
| P1 | `server/services/conversation-service.ts` | 单元测试：会话管理 |
| P2 | `src/components/cmd-palette/cmd-palette.tsx` | 组件测试：搜索 + 导航 |
| P2 | `src/components/chat/conversation-tree.tsx` | 组件测试：虚拟滚动 |
| P2 | `src/components/graph/webgl-graph.tsx` | 组件测试：渲染 + 交互 |

- 涉及模块: `.github/workflows/build.yml`, 新增约 15+ 测试文件
- 测试基础设施: 已有 `vitest`, `@testing-library/react`, `jsdom`

## Testing Decisions

### 测试策略

所有 ID-01 至 ID-14 的修复均遵循 TDD 流程：先写失败测试 → 实现 → 重构。测试只验证外部行为，不测内部实现细节。

### 测试缝隙

1. **Repository 层** — 对 `SettingsRepository` 测试 CRUD 和 JSON 编码正确性，mock `better-sqlite3`。
2. **Extension hook 层** — 对 `turn_end` hook 测试成本提取逻辑，mock pi-mono SDK event 对象。
3. **Service 层** — 对 `security-gate`, `search-engine`, `knowledge-graph` 测试核心业务逻辑，mock DB 层。
4. **Store 层** — 对 Zustand stores 测试状态流转，mock `window.api`。
5. **Component 层** — 对 UI 组件测试交互行为（搜索、点击、渲染），使用 `@testing-library/react`。

### 具体测试项

| 修复项 | 测试方法 | 验证标准 |
|--------|----------|----------|
| ID-01 Settings JSON 编码 | 单元测试：存 string 和 object，读回来值一致 | 无双重编码 |
| ID-02 成本追踪 | 单元测试：turn_end 收到 token 数据后 research run 更新 | cost_usd 和 token_count 为真实值 |
| ID-03 WebGL 圆形 | 快照测试：验证顶点生成函数产生 TRIANGLE_FAN 顶点 | 顶点数 = segments * 3 |
| ID-04 命令面板搜索 | 组件测试：输入查询 → 验证 search API 被调用且结果渲染 | 搜索结果可见 |
| ID-04 命令面板历史 | 单元测试：执行命令后历史记录被更新和持久化 | recentItems 非空 |
| ID-06 流式错误 | Store 测试：模拟 stream error → 验证消息标记 incomplete + 重试可用 | incomplete 消息有重试按钮 |
| ID-07 空 catch | Store 测试：模拟 IPC 失败 → 验证 warn 输出 + error-banner 触发 | 不静默吞错误 |
| ID-08 channels 拆分 | 编译测试：拆分后所有消费者正常 import | TypeScript 编译通过 |
| ID-09 Worker any | 类型测试：handler map 无 any | TypeScript strict 通过 |

## Out of Scope

以下问题在本次修复中**不处理**：

- **知识图谱导出/导入格式（T9）**：已安排到后续计划，不在本次范围。
- **Git 工作区清理**： grill 结束后单独整理提交，不属于代码修复。
- **skill_executions 内联在 SkillsRepo**：当前规模可接受，不单独拆分 Repository。
- **per-domain 模型配置**：已确认完整实现，无需修改。
- **framework-engine.ts 771 行拆分**：自定义框架实现（ID-05）完成后，视行数再决定是否进一步拆分。
- **conversation-service.ts 流式中断**：与 ID-06（流式错误恢复）相关但范围不同，ID-06 只处理错误显示和重试，不涉及断点续传。

## Further Notes

### 修复顺序建议

推荐按以下顺序实施，因为存在依赖关系：

**第一批（基础设施 + Bug 修复）**：
1. ID-01 Settings Repository（消除数据损坏风险）
2. ID-15 CI 测试步骤（为后续 TDD 提供安全网）
3. ID-09 Worker `any` 消除（类型安全基础）

**第二批（核心功能修复）**：
4. ID-02 研究成本追踪（真实数据）
5. ID-03 WebGL 圆形渲染
6. ID-06 流式聊天错误恢复
7. ID-07 空 catch 块修复

**第三批（功能补全）**：
8. ID-04 命令面板搜索 + 历史
9. ID-05 自定义框架

**第四批（代码质量）**：
10. ID-08 channels.ts 拆分
11. ID-10 D3 zoom helpers
12. ID-11 timeline 拆分
13. ID-12 console → Logger
14. ID-13 file-map 重写
15. ID-14 文档更新
16. ID-15 测试补齐（持续进行）

### TDD 流程要求

每个修复项的执行流程：
1. 先写测试（RED）— 测试失败证明测试有效
2. 最小实现（GREEN）— 让测试通过的最少代码
3. 重构（REFACTOR）— 在测试保护下优化代码
4. 提交 — 测试和实现一起提交

### 风险提示

- ID-08（channels 拆分）影响所有 IPC 消费者的 import，但 TypeScript module resolution 会自动解析 `channels/index.ts`，实际破坏性为零。需验证 esbuild 和 Turbopack 的 resolve 配置兼容。
- ID-02（成本追踪）依赖 pi-mono SDK `turn_end` event 的具体字段结构。需先验证 SDK 文档或运行时打印 event 对象确认可用字段。
- ID-03（WebGL 圆形）TRIANGLE_FAN 顶点数增加会影响 1000+ 节点场景的性能。建议用 16 段（而非 32 段）折中。
