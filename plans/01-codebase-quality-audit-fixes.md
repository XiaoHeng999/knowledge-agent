# 01 - Codebase Quality Audit & Fixes

## Problem Statement

AgentClaw 代码库在全量审查后发现了 25 类问题，涵盖运行时崩溃风险、未完成功能、模糊代码和逻辑矛盾。这些问题如果不在上线前修复，会导致：流式对话状态错乱、数据丢失（向量 upsert 非原子）、内存泄漏（事件监听器只增不减）、安全审核形同虚设、以及用户可见的功能空壳（命令面板半成品、虚拟滚动失效等）。

## Solution

按优先级分批修复所有已确认的问题。每项修复都有明确的修法决策，来源于逐一盘问对齐。修复分三批：P0（崩溃/数据损坏）、P1（功能空壳/逻辑矛盾）、P2（代码质量/命名）。

## User Stories

### P0 — 运行时崩溃与数据损坏

1. As a user, I want to abort a streaming response without the app leaking memory or showing duplicate messages, so that I can safely cancel long-running AI responses.
2. As a user, I want to send only one message at a time during streaming, so that the conversation state stays consistent and doesn't get corrupted by concurrent streams.
3. As a user, I want assistant messages to be correctly linked to the user message that triggered them, so that the conversation tree displays the correct parent-child relationships.
4. As a user, I want vector search data to be atomically updated, so that I never lose search capability due to a partial write failure.
5. As a user, I want the app to show a clear error and exit gracefully if the database can't initialize, so that I'm not stuck in a silently broken state.
6. As a user, I want knowledge write operations that are queued for security review to return a proper "pending audit" response, so that the UI can show the correct status instead of crashing on undefined fields.
7. As a user, I want all database queries to be safe from SQL injection, so that the app is secure even if a caller accidentally passes untrusted data.

### P1 — 功能空壳与逻辑矛盾

8. As a user, I want command palette navigation to use proper client-side routing, so that clicking a search result actually takes me to the right page.
9. As a user, I want the Import URL and Quick Record actions in the command palette to work when I click them, so that I can use the command palette as a real productivity tool.
10. As a user, I want parameterized commands in the command palette to actually execute with the collected parameters, so that the parameter input flow isn't a dead end.
11. As a user, I want Agent sessions to greet me with domain context when they start, so that I understand what knowledge domain the agent is operating in.
12. As a user, I want dangerous Agent tool calls to be intercepted and confirmed before execution, so that the agent can't accidentally destroy important data.
13. As a user, I want the conversation tree to use real virtual scrolling, so that large conversations don't cause performance issues by rendering thousands of DOM nodes.
14. As a user, I want the security audit system to actually distinguish between "approved" and "rejected" actions, so that the review workflow has real meaning.
15. As a user, I want edge creation/deletion to go through the same security review as node operations, so that the security gate can't be bypassed.
16. As a user, I want inbox/import status values to be consistent between backend and frontend, so that filtering by status actually works correctly.
17. As a user, I want a partially-successful import to show as "partial" not "completed", so that I know some items failed.
18. As a user, I want the onboarding skip and complete actions to be distinguishable, so that the app can re-prompt users who skipped but not those who completed.
19. As a user, I want search to return consistent results regardless of which search channel I use, so that I don't get confused by missing data.
20. As a user, I want the Worker memory monitor to automatically resume the queue after memory pressure clears, so that background tasks don't get permanently stuck.
21. As a user, I want full-text search queries to handle special characters gracefully, so that searching for terms with special syntax doesn't crash the search engine.

### P2 — 代码质量与命名

22. As a developer, I want the preload IPC layer to properly manage event listener references, so that listeners can be correctly removed without leaks.
23. As a developer, I want repository class names to match the database tables they operate on, so that I can understand the code without jumping to implementation details.
24. As a developer, I want shared utility functions to exist in a single place, so that bug fixes propagate to all consumers automatically.
25. As a developer, I want function names to match their actual behavior, so that "AI summary" functions that just truncate text aren't misleading.
26. As a developer, I want the current domain ID to live in a single store, so that I don't have to worry about state synchronization bugs.
27. As a developer, I want the use-ipc mutate function to propagate errors instead of silently returning null, so that callers can handle failures properly.
28. As a developer, I want unused Worker task type definitions to be removed, so that submitting an unimplemented task type produces a compile-time error instead of a confusing runtime error.
29. As a user on macOS, I want the app to properly clean up when the window is closed and re-opened from the dock, so that the app doesn't hold stale references.
30. As a user, I want skill metrics to show real data or be clearly marked as unavailable, so that I'm not confused by always-zero statistics.

## Implementation Decisions

### ID-01: preload.ts — 用 Map 管理事件监听器闭包映射

在 preload.ts 中引入一个 `Map<string, WeakMap<Function, Function>>` 数据结构，键为 `channel:callback` 组合，值为 `on()` 时创建的 `subscription` 闭包。`removeListener(channel, callback)` 从 Map 中查找真正的 subscription 引用，再调 `ipcRenderer.removeListener`。

- 涉及模块: `electron/preload.ts`
- 修改接口: `window.api.on()`, `window.api.removeListener()`

### ID-02: chat-store — 加 streaming 守卫 + abort 清理 + 记录 userMsgId

1. `sendMessage` 入口加 `if (get().streaming) return;` 守卫，防止并发发送。
2. `abortStream()` 里在清状态之前调 `window.api.removeListener(channel, handler)`，用 ID-01 修好的 removeListener 真正移除监听器。
3. chat-store 状态新增 `streamingUserMsgId: string | null` 字段。在 `'start'` 事件时记录当前 user 消息 ID，`'done'` 事件时直接用 `streamingUserMsgId` 作为 assistant 消息的 parentId，不再用 `find()` 搜索。
4. handler 中的 streaming content 更新改为函数式写法 `set(s => ({ streamingContent: s.streamingContent + chunk.content }))`，避免闭包捕获旧 state。

- 涉及模块: `src/stores/chat-store.ts`
- 新增状态字段: `streamingUserMsgId`
- 修改方法: `sendMessage`, `abortStream`, stream handler

### ID-03: vector.ts — upsert 包 transaction

将 `upsert` 方法中的 `DELETE + INSERT` 包裹在 `db.transaction()` 中，确保原子性。

- 涉及模块: `server/db/vector.ts`
- 修改方法: `VectorStore.upsert()`

### ID-04: main.ts — initializeDatabase 加 try/catch + 失败退出

在 `app.whenReady()` 中用 try/catch 包裹 `initializeDatabase()`。catch 中调 `dialog.showErrorBox("Database Error", err.message)` 后 `app.quit()`。

- 涉及模块: `electron/main.ts`

### ID-05: knowledge-handler — 定义 PendingAuditResponse 联合类型

在 `src/lib/ipc/channels.ts` 中为涉及安全审核的写操作（createNode, updateNode, deleteNode）定义联合响应类型：

```ts
type KnowledgeWriteResponse<T> =
  | { result: T; pendingAudit: false }
  | { result: null; pendingAudit: true; auditId: string; risk: RiskAssessment };
```

knowledge-handler.ts 中根据安全审核结果返回对应的联合类型分支，去掉 `as unknown as` 强转。前端根据 `pendingAudit` 字段判断走正常流程还是"等待审核"流程。

- 涉及模块: `src/lib/ipc/channels.ts`, `server/ipc/handlers/knowledge-handler.ts`, 前端消费端
- 新增类型: `KnowledgeWriteResponse<T>`

### ID-06: base.ts — 加列名白名单校验

在 `Repository<T>` 基类的构造函数中，从 `schema.ts` 的 `TABLE_COLUMNS` 常量读取该表的合法列名集合。`create()` 和 `update()` 中用 `Object.keys(data)` 前，过滤掉不在白名单中的 key。`list()` 的 `orderBy` 参数校验是否在白名单中，`orderDir` 校验只允许 `ASC` / `DESC`。

- 涉及模块: `server/db/repositories/base.ts`, `server/db/schema.ts`
- 修改方法: `create()`, `update()`, `list()`
- 新增依赖: schema.ts 需导出 TABLE_COLUMNS 映射

### ID-07: 命令面板 — 修关键路径，知识和 recent 标 TODO

1. 导航改用 Next.js `useRouter().push()` 替代 `window.location.hash`。
2. `handleAction` 补上 `import` 和 `quick-record` 的 handler 分支。
3. `handleParamSubmit` 实际执行命令并传递参数。
4. 知识搜索和 recentItems 添加 `// TODO:` 注释标注后续实现。

- 涉及模块: `src/components/cmd-palette/cmd-palette.tsx`
- 修改函数: 导航 action, handleAction, handleParamSubmit

### ID-08: Agent 扩展 — 用 pi-mono 原生钩子实现

利用 pi-mono SDK 的扩展机制：

1. **session_start 钩子**：在三个扩展（knowledge-tools, research, import）的 `session_start` 中注入领域欢迎消息。通过 `event.systemPrompt` 追加领域上下文描述，或使用 `ctx.setHeader()` 设置欢迎标题。
2. **tool_call 钩子**：在三个扩展中注册 `tool_call` 监听器，对高风险操作（knowledge-write 的删除、domain-research 的大范围修改等）进行拦截。拦截方式参照 SDK 的 `permission-gate.ts` 示例：返回 `{ block: true, reason: "..." }` 或弹出确认。

SDK 支持的完整事件链路：
- `session_start` → `before_agent_start` → (`tool_call` → `tool_result`) 循环 → `turn_end` → `agent_end`

- 涉及模块:
  - `server/pi-mono/extensions/knowledge-tools-extension.ts`
  - `server/pi-mono/extensions/research-agent-extension.ts`
  - `server/pi-mono/extensions/import-agent-extension.ts`

### ID-09: Worker — 删掉未实现的任务类型定义

从 `server/worker/types.ts` 中移除 `RSS_FEED_FETCH` 和 `DOMAIN_SUMMARY_GEN` 相关的 `WorkerTaskType` 枚举值、Payload 接口、Result 接口和默认超时配置。同步从 `worker-process.ts` 的类型引入中清理。

- 涉及模块: `server/worker/types.ts`, `server/worker/worker-process.ts`

### ID-10: conversation-tree — 修复虚拟滚动

将树结构扁平化为有序列表（深度优先遍历），用 `startIndex`/`endIndex` 真正切片渲染。上下各加 spacer div 填充不可见区域。保留折叠状态支持。

- 涉及模块: `src/components/chat/conversation-tree.tsx`
- 修改: `useVirtualScroll` hook 和渲染逻辑

### ID-11: security-gate — 实现 action 区分 + auditTrail 上限

1. `resolveAudit()` 根据 `action` 参数（approve/reject/edit）记录不同结果到 `auditTrail` 条目中。
2. `bulkResolve()` 根据 `action`（approve_all/reject_all）批量标记。
3. `auditTrail` 数组加 `MAX_AUDIT_TRAIL_SIZE = 1000` 上限，超出时移除最旧的条目。

- 涉及模块: `server/services/security-gate.ts`
- 修改方法: `resolveAudit()`, `bulkResolve()`, `logAuditEntry()`

### ID-12: AI 摘要函数改名

将 `inbox-processor.ts` 的 `generateSummary` 和 `import-pipeline.ts` 的 `generateImportSummary` 重命名为 `generateExcerpt`，函数文档注释改为 "截取内容前 N 行作为摘要预览"。去掉所有 "AI summary" 的误导性描述。

- 涉及模块: `server/services/inbox-processor.ts`, `server/services/import-pipeline.ts`

### ID-13: currentDomainId 单一来源

从 `domain-store.ts` 中删除 `currentDomainId` 和 `setCurrentDomainId`。所有组件统一通过 `useAppStore()` 读写 `currentDomainId`。`domain-store` 的 `fetchDomains` 完成后如果 `currentDomainId` 为空，通过 `useAppStore.getState().setCurrentDomain(domains[0].id)` 设置默认值。

- 涉及模块: `src/stores/domain-store.ts`, `src/stores/app-store.ts`, 所有消费 domain-store.currentDomainId 的组件

### ID-14: 仓库重命名

| 旧名 | 新名 | 对应表 |
|------|------|--------|
| `SourcesRepository` | `InboxItemRepository` | `inbox_items` |
| `TimelineEntriesRepository` | `PredictionRepository` | `predictions` |

同步更新 `server/db/index.ts` 中的属性名、所有 import 和引用。

- 涉及模块: `server/db/repositories/sources.ts`, `server/db/repositories/timeline-entries.ts`, `server/db/index.ts`, 所有引用方

### ID-15: RSS 去重逻辑修复

`import-pipeline.ts` 的 `pollRssFeed` 中，从 `existingImports` 提取已导入 URL 时，改为解析 `r.metadata` JSON 后取 `url` 字段，或直接比较 `r.source_url` 列与 `item.link`。

- 涉及模块: `server/services/import-pipeline.ts`
- 修改函数: `pollRssFeed()`

### ID-16: resolveModelId 抽成共享模块

在 `server/lib/` 下新建 `model-resolver.ts`，导出 `resolveModelId(domainId, role)` 函数。`framework-engine.ts`、`timeline-engine.ts`、`skill-engine.ts` 中的本地副本删除，改为 import。

- 涉及模块: 新增 `server/lib/model-resolver.ts`，修改 `server/services/framework-engine.ts`, `server/services/timeline-engine.ts`, `server/services/skill-engine.ts`

### ID-17: use-ipc mutate 不再吞错误

`mutate` 函数移除 `.catch(() => null as unknown as TResult)`，让错误自然传播。调用方可以选择用 `mutateAsync` + try/catch 或 `.catch()` 处理。返回类型变为真实的 `Promise<TResult>`。

- 涉及模块: `src/lib/hooks/use-ipc.ts`

### ID-18: Edge 操作加安全审核

在 `knowledge-handler.ts` 的 `CREATE_EDGE` 和 `DELETE_EDGE` handler 中，调用 `assessWriteRisk()` 进行风险评估，与 Node 操作保持一致。

- 涉及模块: `server/ipc/handlers/knowledge-handler.ts`

### ID-19: 统一用 DB 状态，删掉映射层

删除 `inbox-processor.ts` 的 `rowToItem` 中的 status 映射逻辑（`accepted→processed`, `processing→pending`）。删除 `import-pipeline.ts` 的 `rowToStatus` 中的 `partial→completed` 映射。前端直接处理 DB 层的原始状态值。

- 涉及模块: `server/services/inbox-processor.ts`, `server/services/import-pipeline.ts`, 前端状态筛选组件

### ID-20: onboarding skip/complete 区分

`onboarding-store.ts` 状态新增 `skipped: boolean` 字段。
- `skip()`: `{ skipped: true, completed: false, isOpen: false }`
- `complete()`: `{ completed: true, skipped: false, isOpen: false }`

- 涉及模块: `src/stores/onboarding-store.ts`

### ID-21: 统一搜索通道

删除 `knowledge-handler.ts` 中的 `KNOWLEDGE_CHANNELS.SEARCH` handler。前端统一调用 `search:search` 通道。从 `channels.ts` 中移除 `KnowledgeSearchRequest`/`KnowledgeSearchResponse` 类型。

- 涉及模块: `server/ipc/handlers/knowledge-handler.ts`, `src/lib/ipc/channels.ts`, 前端知识搜索组件

### ID-22: Worker 内存监视器自动 resume

在 `worker-process.ts` 的内存监控循环中，增加降回逻辑：当 `heapUsedMB < MEMORY_LIMIT_MB * 0.7` 时自动调 `queue.resume()`。

- 涉及模块: `server/worker/worker-process.ts`

### ID-23: macOS activate 补 closed 监听

`electron/main.ts` 的 `app.on("activate")` handler 中，`createWindow()` 返回后补上 `mainWindow.on("closed", () => { mainWindow = null; })`。

- 涉及模块: `electron/main.ts`

### ID-24: FTS5 查询加防护

`vector.ts` 的 `fullTextSearch` 方法中：
1. 加 `sanitizeFtsQuery` 函数，转义 FTS5 特殊字符（`"`, `*`, `AND`, `OR`, `NOT`）。
2. 整个查询包 try/catch，catch 时返回空结果而不是抛出 SQLite 错误。

- 涉及模块: `server/db/vector.ts`

### ID-25: Skill metrics 处理

`skill-engine.ts` 的 `getSkillMetrics` 中，将硬编码为 0 的 `avgExecutionTimeMs` 和 `avgCostUsd` 改为从执行历史记录中计算。如果历史数据不足则返回 `null`（类型改为 `number | null`），前端展示为 "N/A"。

- 涉及模块: `server/services/skill-engine.ts`

## Testing Decisions

### 测试策略

优先在已有测试缝隙（seam）上测试，不新增不必要的测试基础设施。

### 测试缝隙

1. **IPC handler 层** — 这是最高的可用测试缝隙。通过 mock `window.api` 测试 store 的状态流转（不测 DB），或通过 mock service 层测试 handler 的路由和返回值。
2. **Service 层** — 对 `security-gate.ts`、`vector.ts`、`import-pipeline.ts` 等纯逻辑模块做单元测试，mock DB 层。
3. **React 组件层** — 对 `conversation-tree.tsx` 的虚拟滚动、`cmd-palette.tsx` 的交互做 smoke test。

### 具体测试项

| 修复项 | 测试方法 | 验证标准 |
|--------|----------|----------|
| ID-01 removeListener Map | 单元测试：注册后移除，验证 Map 清空 | 移除后同 channel 事件不再触发 |
| ID-02 chat-store streaming 守卫 | 单元测试：streaming=true 时调 sendMessage，验证返回且不发送 | 不产生新 stream |
| ID-02 chat-store abort 清理 | 单元测试：abort 后验证 handler 被移除 | removeListener 被调用 |
| ID-02 chat-store parentId | 单元测试：多条对话后验证 assistant 的 parentId 指向正确的 user 消息 | parentId === streamingUserMsgId |
| ID-03 vector upsert 事务 | 单元测试：mock INSERT 抛异常，验证旧数据仍在 | DELETE + INSERT 在同一事务中 |
| ID-05 PendingAudit 类型 | 类型测试：验证 handler 返回值符合联合类型 | TypeScript 编译通过且运行时分支正确 |
| ID-06 列名白名单 | 单元测试：传入非法列名，验证被过滤 | 只保留白名单内的列 |
| ID-10 虚拟滚动 | 组件测试：渲染 1000 节点树，验证 DOM 节点数 < 50 | 只有可见范围内的节点在 DOM 中 |
| ID-11 security-gate action | 单元测试：approve/reject 后验证 auditTrail 记录不同 | auditTrail 条目包含正确的 action |
| ID-15 RSS 去重 | 单元测试：导入同一 feed 两次，验证第二次不产生重复 | 第二次 imports.length === 0 |
| ID-19 状态映射 | 单元测试：验证 DB status 直接透传到前端 | 无中间转换层 |
| ID-24 FTS5 防护 | 单元测试：传入含特殊字符的查询，验证不抛异常 | 返回空数组而非报错 |

## Out of Scope

以下问题在本次修复中**不处理**，标记为后续优化：

- **D3 力导向图重建问题**：force-graph.tsx 在 selectedNodeId 变化时重建 simulation 导致"爆炸"。这是一个独立的 UX 优化，影响面大，需要单独设计。
- **searchNodes 返回固定 score 1.0**：knowledge-graph.ts 的搜索评分需要配合向量搜索一起设计，不在本次范围内。
- **worker-bridge shutdown 的冗余 setTimeout**：死代码，不影响功能，可在下次改 worker 时清理。
- **conversation-service.ts 的 session 泄漏**（unsubscribe 抛异常时 destroySession 不执行）：需要 try/finally 包裹，但属于边缘场景。
- **skill-engine timeout 不真正取消 LLM 调用**：需要 pi-mono SDK 支持AbortSignal 传递，是 SDK 层面的限制。
- **logger.ts 的 spread 覆盖问题**：需要 LogEntry 类型改为 branded type，影响面较广。
- **domain-store 没有 persist**：是设计选择而非 bug。
- **graph-view.tsx 的 onEdit 空操作**：属于编辑功能缺失，不是本次质量修复的范围。
- **knowledge-detail.tsx 连接节点显示 ID 而非标题**：需要额外的数据查询，属于功能增强。

## Further Notes

### 修复顺序建议

推荐按以下顺序实施，因为存在依赖关系：

**第一批（基础设施层）**：
1. ID-06 base.ts 白名单（所有 repo 操作依赖）
2. ID-01 preload removeListener（chat-store 修复依赖）
3. ID-03 vector.ts 事务
4. ID-04 main.ts try/catch
5. ID-24 FTS5 防护

**第二批（核心功能层）**：
6. ID-02 chat-store 三个修复
7. ID-05 PendingAudit 类型
8. ID-11 security-gate action
9. ID-18 Edge 安全审核
10. ID-19 状态映射统一

**第三批（功能补全层）**：
11. ID-07 命令面板关键路径
12. ID-08 Agent 扩展钩子
13. ID-10 虚拟滚动
14. ID-22 Worker 内存 resume

**第四批（代码质量层）**：
15. ID-09 删未实现 Worker 类型
16. ID-12 摘要函数改名
17. ID-13 currentDomainId 统一
18. ID-14 仓库重命名
19. ID-15 RSS 去重
20. ID-16 resolveModelId 抽取
21. ID-17 mutate 不吞错误
22. ID-20 onboarding skip/complete
23. ID-21 统一搜索通道
24. ID-23 macOS activate
25. ID-25 Skill metrics

### 风险提示

- ID-14（仓库重命名）改动面大，需全局搜索替换，建议用 IDE 的 Rename Symbol 功能。
- ID-13（currentDomainId 统一）需逐个检查消费方，确保没有组件仍在从 domain-store 读取。
- ID-19（状态映射统一）涉及前端筛选组件的适配，需同步修改。
