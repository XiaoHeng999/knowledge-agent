# Phase 1.1–1.7 代码结构风险分析报告

> **分析范围**：`src/`、`server/`、`electron/` 三层全量代码
> **对照基准**：`tasks.md` Phase 1.1（项目初始化）至 1.7（文件系统抽象）
> **分析日期**：2026-05-23
> **前置报告**：`phase1.1-1.4-code-structure-risk.md`（已部分过时，本报告为完整替代）

---

## 一、当前代码结构总览

```
agentclaw/
├── electron/                          ← Electron 主进程（应用壳，4 文件）
│   ├── main.ts                        ← 应用生命周期 + 启动编排（47 行）
│   ├── preload.ts                     ← contextBridge 安全 API（129 行）
│   ├── window.ts                      ← BrowserWindow 工厂函数
│   └── tsconfig.json                  ← 主进程独立 TS 编译配置
│
├── server/                            ← 后端业务逻辑层（主进程内运行）
│   ├── ipc/
│   │   ├── handler.ts                 ← IPC 基础设施：IpcError / 超时 / 日志 / 注册（169 行）
│   │   └── register.ts               ← 全部 Handler 注册入口（138 行）
│   ├── db/
│   │   ├── schema.ts                  ← 16 张表行类型 + 状态/类型枚举
│   │   ├── connection.ts              ← SQLite 连接管理（单例、WAL 模式）
│   │   ├── index.ts                   ← DatabaseService 门面（77 行）
│   │   ├── vector.ts                  ← 向量搜索（SQLite-vec）+ FTS5 + RRF 混合排序
│   │   ├── migrations/
│   │   │   ├── types.ts              ← Migration 接口定义
│   │   │   ├── runner.ts             ← MigrationRunner（版本追踪 / 回滚 / 校验）
│   │   │   ├── 001_initial_schema.ts ← 初始 Schema（15 表 + FTS5 + 3 触发器）
│   │   │   └── index.ts              ← 迁移文件加载器
│   │   └── repositories/
│   │       ├── base.ts               ← 泛型 BaseRepository<T>（CRUD + 分页）
│   │       ├── domains.ts            ─┐
│   │       ├── knowledge-nodes.ts     │
│   │       ├── knowledge-edges.ts     │
│   │       ├── sources.ts             │ 9 个领域仓储
│   │       ├── timeline-entries.ts    │
│   │       ├── model-configs.ts       │
│   │       ├── api-keys.ts            │（含 AES-256-GCM 加密）
│   │       ├── inbox.ts               │
│   │       └── decision-records.ts   ─┘
│   ├── pi-mono/
│   │   ├── index.ts                   ← 模块导出桶
│   │   ├── core.ts                    ← PiMonoCore 单例（AuthStorage / ModelRegistry / SessionManager）
│   │   ├── providers.ts               ← 9 个 LLM 供应商 + 18 个模型定义
│   │   ├── tools/
│   │   │   ├── domain-research.ts     ← domain_research 工具（可插拔 Executor）
│   │   │   ├── knowledge-write.ts     ← knowledge_write 工具
│   │   │   └── timeline-analyze.ts    ← timeline_analyze 工具
│   │   └── extensions/
│   │       ├── knowledge-tools-extension.ts   ← 注册研究+写入工具
│   │       ├── research-agent-extension.ts    ← 注册分析工具+研究生命周期钩子
│   │       └── import-agent-extension.ts      ← 占位（Phase 4）
│   ├── services/
│   │   └── pi-mono-wrapper.ts         ← 6 接口抽象层（IModelManager / IAgentPool 等）
│   └── fs/
│       ├── index.ts                   ← 模块导出桶
│       ├── paths.ts                   ← 跨平台路径工具（Electron app.getPath）
│       ├── provider.ts                ← IFileSystemProvider 接口 + NodeFileSystemProvider
│       ├── markdown-parser.ts         ← YAML frontmatter 解析（gray-matter）
│       └── domain-dirs.ts             ← 域目录 CRUD（config.yaml / skills / tools 等）
│
├── src/                               ← 前端渲染层（Next.js）
│   ├── app/
│   │   ├── layout.tsx                 ← 根 HTML 布局
│   │   ├── globals.css                ← 完整暗色主题 CSS 变量 + 布局样式（680+ 行）
│   │   └── (main)/
│   │       ├── layout.tsx             ← 三栏布局组装（Titlebar + Sidebar + DetailPanel + Statusbar）
│   │       └── page.tsx               ← 首页占位
│   ├── components/
│   │   └── layout/
│   │       ├── layout-context.tsx     ← 布局状态 Context Provider
│   │       ├── titlebar.tsx           ← 无边框窗口标题栏（36px）
│   │       ├── sidebar.tsx            ← 领域导航侧边栏（240px / 48px 折叠）
│   │       ├── detail-panel.tsx       ← 可拖拽右侧面板（0-320px）
│   │       └── statusbar.tsx          ← 底部状态栏（28px）
│   ├── lib/
│   │   ├── ipc/
│   │   │   └── channels.ts           ← 🔑 IPC 唯一类型契约（11 域、~54 通道、494 行）
│   │   └── hooks/
│   │       └── use-ipc.ts            ← useIpcQuery / useIpcMutation React Hook
│   ├── stores/
│   │   ├── base.ts                    ← Zustand persist 混合存储适配器（IPC + localStorage）
│   │   ├── app-store.ts               ← 全局应用状态（视图 / 主题 / 侧边栏 / 命令面板）
│   │   └── domain-store.ts            ← 领域 CRUD 状态管理
│   └── types/
│       └── electron.d.ts              ← Window.api 全局类型声明
│
├── package.json                       ← 单包结构，electron@33 + next@15 + react@19
├── tsconfig.json                      ← 前端 TS 配置（ES2022 / strict / paths）
├── next.config.ts                     ← 静态导出 + Turbopack
└── electron-builder.yml               ← 三平台打包配置
```

**代码量统计**：

| 模块 | 文件数 | 核心代码行数（估算） |
|------|--------|---------------------|
| `electron/` | 4 | ~250 行 |
| `server/` | 25+ | ~3,500 行 |
| `src/` | 14 | ~1,500 行 |
| 总计 | ~43 | ~5,250 行 |

---

## 二、Phase 1.1–1.7 任务完成度对照

| Phase | 任务描述 | 完成度 | 关键差异说明 |
|-------|----------|--------|-------------|
| 1.1 | 项目初始化 | ✅ 100% | 单包结构（非 monorepo），功能等价 |
| 1.2 | IPC 通信层 | ✅ 100% | 11 域 ~54 通道全量注册，类型安全闭环 |
| 1.3 | 三栏布局 | ✅ 100% | React 组件 + CSS + 响应式均已实现 |
| 1.4 | 状态管理 | ✅ 100% | Zustand store + persist + IPC hooks |
| 1.5 | SQLite 数据库 | ✅ 100% | 15 表 + 迁移 + 9 仓储 + 向量搜索 + 加密 |
| 1.6 | pi-mono SDK 集成 | ✅ 100% | 9 供应商 + 3 自定义工具 + 6 接口抽象 |
| 1.7 | 文件系统抽象 | ✅ 100% | IFileSystemProvider + 路径工具 + Markdown 解析 + 域目录管理 |

**总体评价**：Phase 1 全部 7 个子阶段的任务均已交付，基础架构完整。所有 phase 均通过 `npm run typecheck` 和 `npm run lint` 检查。

---

## 三、架构解耦评估

### 3.1 三层职责分离 — 评分：良好 ✅

| 层 | 目录 | 职责 | 是否越界 |
|---|---|---|---|
| 应用壳层 | `electron/` | 生命周期、窗口管理、安全桥 | 未越界 |
| 业务逻辑层 | `server/` | 数据库、Agent、文件系统、IPC 处理 | 有轻微越界（详见 R10） |
| 渲染层 | `src/` | React UI、状态管理、IPC 调用 | 未越界 |

**唯一越界点**：`server/ipc/register.ts` 中 `registerWindowHandlers()` 直接 `import { BrowserWindow } from "electron"` 并操作窗口实例。这打破了"server 层不依赖 Electron UI API"的原则。虽然当前影响可控（仅 5 个窗口控制通道），但随着窗口交互复杂度增加（如托盘、通知、多窗口），此耦合会成为问题。

### 3.2 模块间依赖方向 — 评分：需改进 ⚠️

**理想的依赖方向**：
```
electron/ → server/ → shared/
src/      → shared/
```

**当前实际依赖方向**：
```
electron/  → server/              ✅ 正确
electron/  → src/lib/ipc/         ❌ 反向依赖（preload.ts）
server/    → src/lib/ipc/         ❌ 反向依赖（handler.ts / register.ts）
server/    → electron (paths.ts)  ❌ 反向依赖（app.getPath）
src/       → electron/preload     ❌ 反向依赖（electron.d.ts）
```

共有 4 处反向依赖，核心根因是 `channels.ts` 位于 `src/` 目录内。详见风险 R1。

### 3.3 server 内部模块耦合度 — 评分：中等 ⚠️

```
server/db/      ← 完全独立，无外部依赖
server/fs/      ← 依赖 electron（app.getPath），其余自洽
server/pi-mono/ ← 依赖 server/db/schema.ts（类型引用）
server/services/← 依赖 server/pi-mono/* + server/db/schema.ts
server/ipc/     ← 依赖 server/db/* + src/lib/ipc/channels.ts + electron
```

**问题**：`server/pi-mono-wrapper.ts` 直接引用了 `server/db/schema.ts` 的 `KnowledgeNodeType`，建立了 Agent 层与数据库层的类型耦合。如果数据库 schema 变更（如节点类型枚举增减），pi-mono wrapper 也必须同步修改。

### 3.4 可修改性评估

| 修改场景 | 需修改文件数 | 难度 | 评价 |
|----------|-------------|------|------|
| 新增一个 IPC 通道 | 3（channels.ts + preload.ts + register.ts） | 中等 | 三处手动同步 |
| 修改数据库 schema | 3+（schema.ts + migration + repository） | 中等 | 有系统化流程 |
| 新增一个 LLM 供应商 | 1（providers.ts） | 低 | 扩展点设计良好 |
| 新增一个 Agent 工具 | 3（tool + extension + wrapper） | 中等 | 有清晰的注册机制 |
| 替换 pi-mono SDK | 1-2（wrapper 实现） | 低 | 6 接口抽象层提供了缓冲 |
| 替换文件系统实现 | 1（setFileSystemProvider） | 低 | 接口可替换 |
| 修改 CSS 设计系统 | 1（globals.css） | 低 | 集中管理 |

---

## 四、风险分析

### 风险 R1：`channels.ts` 位置导致跨层反向依赖

**严重度**：🔴 高
**影响范围**：全项目三层架构
**状态**：⚠️ 未修复（Phase 1.1-1.4 报告已提出，仍存在）

`src/lib/ipc/channels.ts` 被三层同时引用：
```
server/ipc/handler.ts  → import from "../../src/lib/ipc/channels"
server/ipc/register.ts → import from "../../src/lib/ipc/channels"
electron/preload.ts    → import from "../src/lib/ipc/channels"
```

后端（`server/`）和主进程（`electron/`）反向依赖了前端目录（`src/`）。

**具体风险**：
1. `electron/tsconfig.json` 通过 `exclude: ["../src"]` + `include: ["../src/lib/ipc/**/*.ts"]` 的覆盖关系精确允许一个子目录，配置脆弱
2. 后端开发者看到 `import from "../../src/..."` 会困惑——为什么 server 代码引用前端源码
3. 前端 tsconfig（`noEmit: true`）和后端 tsconfig 同时编译同一个文件，存在配置漂移风险

**建议修复**：
```
shared/
  ipc/
    channels.ts              ← 从 src/lib/ipc/ 移出
electron/tsconfig.json       ← include 添加 "../shared/**/*.ts"
tsconfig.json                ← paths 添加 "@shared/*" → "./shared/*"
```

---

### 风险 R2：`register.ts` 将成为开发和维护瓶颈

**严重度**：🟡 中高
**影响范围**：Phase 2-4 所有后端业务开发
**状态**：⚠️ 未修复（Phase 1.1-1.4 报告已提出，仍存在）

当前 `register.ts` 已包含 10 个域的注册逻辑（138 行），其中 7 个域为空 stub。随着 Phase 2-4 推进：
- 每个域的 Handler 从空 stub 变为数十到数百行的真实业务代码
- 10 个域的实现代码将导致单文件膨胀至 1000+ 行
- 多人并行开发不同域时产生 Git 合并冲突

**建议修复**：按域拆分为独立 Handler 文件：
```
server/ipc/
  handler.ts          ← 保留不变
  register.ts         ← 精简为纯编排
  handlers/
    app-handler.ts
    db-handler.ts
    model-handler.ts
    ...
```

---

### 风险 R3：类型定义在 IPC 层和 Service 层之间存在重复和不一致

**严重度**：🔴 高
**影响范围**：Phase 2-4 所有涉及 IPC 通道实现的任务
**状态**：🆕 新发现

项目中存在两套独立的数据类型定义：

**IPC 层类型**（`src/lib/ipc/channels.ts`）：
```typescript
interface ModelInfo {
  id: string; name: string; provider: string; costPerMillion: number;
}
interface KnowledgeNode {
  id: string; domainId: string; title: string; type: string;
  content: string; comprehensionLevel: number; sources: string[];
}
```

**Service 层类型**（`server/services/pi-mono-wrapper.ts`）：
```typescript
interface ModelInfo {
  id: string; name: string; provider: string; reasoning: boolean;
  costPerMillionInput: number; costPerMillionOutput: number;
  contextWindow: number; maxTokens: number; available: boolean;
}
interface KnowledgeNodeData {
  id: string; domainId: string; title: string; content: string | null;
  summary: string | null; nodeType: KnowledgeNodeType; status: string;
  comprehensionScore: number; tags: string[];
}
```

**不一致清单**：

| 类型 | IPC 版本 | Service 版本 | 差异 |
|------|----------|-------------|------|
| `ModelInfo` | `costPerMillion` (单值) | `costPerMillionInput` + `costPerMillionOutput` (分离) | 字段名和粒度不同 |
| `ModelInfo` | 4 字段 | 9 字段 | Service 多出 reasoning/contextWindow/maxTokens/available |
| Knowledge Node | `type: string`, `comprehensionLevel` | `nodeType: KnowledgeNodeType`, `comprehensionScore` | 字段名不同 |
| Knowledge Node | `sources: string[]` | `summary: string \| null`, `status: string`, `tags: string[]` | 字段集合不同 |

**具体风险**：
1. **映射层缺失**：当 Phase 2 实现 model/domain/knowledge 的 IPC Handler 时，需要在 Service 类型 → IPC 类型之间做手动转换（字段重命名、结构映射），极易出错
2. **单一事实来源缺失**：两套类型谁是"权威"？修改业务逻辑时该改哪边？没有明确规范
3. **遗漏字段**：IPC 层的 `ModelInfo` 只有 4 个字段，Service 层有 9 个。前端拿到的数据可能不包含 `contextWindow`、`available` 等关键信息

**建议修复**：
- 以 Service 层类型为权威源
- IPC 层的 `channels.ts` 导入或重新导出 Service 层类型
- 在 IPC Handler 中实现类型转换函数（Service → IPC），集中管理映射逻辑
- 或考虑在 `shared/` 目录中定义统一的领域类型

---

### 风险 R4：数据库层类型（snake_case）与 IPC 类型（camelCase）之间存在隐式映射鸿沟

**严重度**：🔴 高
**影响范围**：所有需要从数据库读取数据并通过 IPC 返回给前端的场景
**状态**：🆕 新发现

**数据库层**（`server/db/schema.ts`）使用 snake_case 列名：
```typescript
interface KnowledgeNodeRow {
  id: string;
  domain_id: string;
  comprehension_level: number;
  created_at: string;
  updated_at: string;
}
```

**IPC 层**（`src/lib/ipc/channels.ts`）使用 camelCase：
```typescript
interface KnowledgeNode {
  domainId: string;
  comprehensionLevel: number;
  createdAt: string;
  updatedAt: string;
}
```

**当前状态**：`BaseRepository<T>` 直接返回数据库原始行（snake_case），没有任何转换层。

**具体风险**：
1. 当 Phase 2 实现 `knowledge:listNodes` Handler 时，从 `KnowledgeNodesRepository.list()` 拿到的是 `{ domain_id, comprehension_level }` 格式，但 IPC 契约要求返回 `{ domainId, comprehensionLevel }` 格式
2. 每个 Handler 都需要手动编写字段映射，10 个域 × 平均 5 个方法 = 50+ 处映射代码
3. 遗漏某个字段的转换不会触发编译错误（TypeScript 中 `any` 隐式传递），只在运行时发现前端收到 `undefined`

**建议修复**：
- 在 `server/db/` 中添加一个通用的 `transformRow()` 工具函数（snake_case → camelCase）
- 或让 `BaseRepository<T>` 的泛型参数包含 `TRow`（数据库行）和 `TModel`（业务模型）两个类型，在基类中完成转换
- 或在 `shared/` 中定义 camelCase 的领域类型，Repository 层负责映射

---

### 风险 R5：IPC Stub Handler 静默空实现，前端调用会失败

**严重度**：🟡 中高
**影响范围**：前端开发联调
**状态**：🆕 新发现

7 个 Handler 注册函数体为空（`registerModelHandlers`、`registerDomainHandlers`、`registerKnowledgeHandlers`、`registerInboxHandlers`、`registerResearchHandlers`、`registerSettingsHandlers`、`registerImportHandlers`）。

`ipcMain.handle()` 未注册的通道会导致 `ipcRenderer.invoke()` 返回的 Promise 永远不 resolve（Electron 行为）或抛出未处理异常。

**具体风险**：
1. `domain-store.ts` 的 `fetchDomains()` 调用 `window.api.domain.list()` → IPC 通道 `domain:list` → 无 Handler → Promise 悬挂或报错
2. 前端开发者无法区分"功能未实现"和"代码有 Bug"
3. 状态管理中的 `error` 字段始终被设置，掩盖了真实的问题

**建议修复**：
- 所有 stub Handler 至少返回占位数据或明确的错误：
```typescript
registerHandler(DOMAIN_CHANNELS.LIST, async () => {
  return { domains: [] }; // 占位返回
});
```
- 或注册一个通用的 "not implemented" Handler

---

### 风险 R6：`app-store` 和 `domain-store` 状态重复

**严重度**：🟡 中低
**影响范围**：状态一致性
**状态**：🆕 新发现

两个 Store 都持有 `currentDomainId`：
- `app-store.ts`：`currentDomainId: string | null`（通过 Zustand persist 持久化）
- `domain-store.ts`：`currentDomainId: string | null`（内存态，不持久化）

**具体风险**：
1. 用户在侧边栏切换领域 → `domain-store.setCurrentDomain()` 更新了 domain-store 的 `currentDomainId`，但 app-store 的 `currentDomainId` 未同步
2. 页面刷新后，app-store 从持久化恢复 `currentDomainId`，但 domain-store 的 `currentDomainId` 为 null
3. 两个 Store 都有 `setCurrentDomain` 方法，消费者不知道该调用哪个

**建议修复**：
- 将 `currentDomainId` 的唯一持有权归到 `domain-store`（它管理领域相关状态）
- 从 `app-store` 中移除 `currentDomainId`
- 如果需要持久化 `currentDomainId`，在 domain-store 中使用 persist middleware

---

### 风险 R7：`preload.ts` 的 `invoke()` 未拦截 IPC Error 返回

**严重度**：🟡 中
**影响范围**：前端错误处理
**状态**：⚠️ 未修复（Phase 1.1-1.4 报告 R8 已提出）

`handler.ts` 中错误通过 `return err.toJSON()` 返回（非 throw），返回值形状为 `{ __ipcError: true, code, message, details }`。但前端 `invoke()` 的返回类型声明为 `Promise<ChannelResponse<C>>`。

**具体风险**：
1. 前端 `const result = await window.api.domain.list()` 时，TypeScript 认为 result 类型是 `DomainListResponse`，但实际可能是 `{ __ipcError: true, code: "INTERNAL_ERROR", message: "..." }`
2. 前端解构 `result.domains` 会得到 `undefined`，TypeScript 不会警告

**建议修复**：
在 `preload.ts` 的 `invoke()` 中添加返回值检查：
```typescript
function invoke<C extends ChannelName>(...): Promise<ChannelResponse<C>> {
  return ipcRenderer.invoke(channel, ...args).then((result) => {
    if (result && typeof result === 'object' && '__ipcError' in result) {
      throw new Error(`[IPC Error] ${result.code}: ${result.message}`);
    }
    return result as ChannelResponse<C>;
  });
}
```

---

### 风险 R8：`server/fs/paths.ts` 直接依赖 Electron，破坏测试隔离

**严重度**：🟡 中
**影响范围**：文件系统模块的单元测试
**状态**：🆕 新发现

`paths.ts` 直接 `import { app } from "electron"` 来获取 `app.getPath("userData")`。这使得：
- `server/fs/` 模块无法在没有 Electron 环境的情况下进行单元测试
- 与同目录下的 `provider.ts`（设计了 `IFileSystemProvider` 接口用于测试替换）的设计理念不一致

**建议修复**：
```typescript
// paths.ts
export interface PathProvider {
  getDataDir(): string;
}

// 默认实现使用 Electron
export class ElectronPathProvider implements PathProvider {
  getDataDir() { return app.getPath("userData"); }
}

// 测试实现
export class TestPathProvider implements PathProvider {
  constructor(private baseDir: string) {}
  getDataDir() { return this.baseDir; }
}
```

---

### 风险 R9：Pi-mono Wrapper 与 IPC Handler 的连接路径不明确

**严重度**：🟡 中高
**影响范围**：Phase 2-4 Agent 功能的集成
**状态**：🆕 新发现

当前架构中存在一个"断桥"：

```
前端 → IPC → register.ts (stub) → ???
                              ↑ 连接点未定义
PiMonoWrapper (IModelManager/IAgentPool/etc.)
DatabaseService (9 Repository)
```

`PiMonoWrapper` 实现了 `IModelManager` 和 `IAgentPool`，但：
1. 没有在 `electron/main.ts` 中初始化
2. `register.ts` 的 stub Handler 不知道应该调用 `PiMonoWrapper` 的哪个方法
3. `IModelManager.listProviders()` 返回的类型与 IPC `ModelListProvidersResponse` 的类型不一致（R3 的具体体现）

**具体风险**：
1. Phase 2 实现 model/domain Handler 时，开发者需要同时理解 IPC 类型系统、Service 接口系统、数据库 schema，三套类型的映射关系需要自行摸索
2. 没有"从哪里开始接线"的指引文档

**建议修复**：
- 在 `electron/main.ts` 中初始化 `PiMonoCore` 和 `PiMonoWrapper`，暴露给 Handler 注册系统
- 创建一个 `server/services/service-container.ts` 作为服务定位器，管理所有服务实例
- 在 Handler 中通过服务容器获取服务实例

---

### 风险 R10：自定义 Agent 工具的 Executor 尚未连接到实际数据库

**严重度**：🟡 中
**影响范围**：Phase 3-4 Agent 功能
**状态**：🆕 新发现

三个自定义工具使用了可插拔 Executor 模式：
- `domain_research` → `setDomainResearchExecutor()`
- `knowledge_write` → `setKnowledgeWriteExecutor()`
- `timeline_analyze` → `setTimelineAnalyzeExecutor()`

但所有 Executor 均未设置。当 pi-mono Agent 调用这些工具时，会抛出"Executor not set"错误。

这个设计本身是好的（解耦工具定义和执行逻辑），但需要在 Agent Session 创建前完成 Executor 注入，否则运行时出错。

**建议**：Phase 2 实现 service-container 时一并注入 Executor。

---

### 风险 R11：`unregisterAll()` 硬编码全部 54 个通道名

**严重度**：🟢 低
**影响范围**：测试和关闭时的清理
**状态**：⚠️ 未修复（Phase 1.1-1.4 报告 R5 已提出）

`handler.ts:116-169` 手动列出 54 个 `ipcMain.removeHandler(...)` 调用。

**建议修复**：从 `IpcChannelMap` 的 keyof 动态遍历。

---

### 风险 R12：`BaseRepository` 的 `tableName` 直接拼接到 SQL 字符串

**严重度**：🟢 低
**影响范围**：SQL 注入风险（当前可控）
**状态**：🆕 新发现

`BaseRepository` 的 `create()`、`findById()`、`update()`、`delete()`、`list()` 方法都将 `this.tableName` 直接拼接到 SQL 字符串中。虽然 `tableName` 是在构造函数中硬编码设置的（非用户输入），风险较低，但 `list()` 的 `where` 参数也是直接拼接的。

```typescript
// base.ts:69
const whereClause = where ? `WHERE ${where}` : "";
```

**建议**：添加 JSDoc 注释说明 `where` 参数必须由内部代码提供（非用户输入），或改用条件构建器模式。

---

### 风险 R13：API Key 加密密钥硬编码为默认值

**严重度**：🟡 中
**影响范围**：生产环境安全性
**状态**：🆕 新发现

`server/db/repositories/api-keys.ts` 使用 AES-256-GCM 加密 API Key，但加密密钥回退到一个硬编码的默认值：
```typescript
const ENCRYPTION_KEY = process.env.AGENTCLAW_ENCRYPTION_KEY || "agentclaw-default-encryption-key-change-in-production";
```

**具体风险**：
1. 如果用户未设置 `AGENTCLAW_ENCRYPTION_KEY` 环境变量，所有 API Key 使用相同密钥加密，任何拿到源码的人都可以解密
2. 打包后的应用不会检查此环境变量是否设置
3. 密钥变更后已有的加密数据无法解密（无密钥轮换机制）

**建议修复**：
- 应用首次启动时生成随机密钥，存储在 OS Keychain（通过 Electron `safeStorage` API）
- 如果未设置自定义密钥，在控制台输出明确警告
- 添加密钥轮换文档

---

### 风险 R14：缺少测试基础设施

**严重度**：🔴 高
**影响范围**：代码质量保障、重构安全度
**状态**：🆕 新发现

项目中没有测试文件、没有测试框架配置（无 jest/vitest）、`package.json` 中没有 test 脚本。

**具体影响**：
1. `IFileSystemProvider` 接口的设计初衷是测试时可替换，但没有测试来使用这个能力
2. 数据库迁移系统支持回滚，但无法自动验证回滚的正确性
3. BaseRepository 的泛型 CRUD 无法验证 SQL 生成是否正确
4. 重构（如 R1 移动 channels.ts、R4 添加映射层）无法自动验证是否引入回归

**建议**：
- 引入 Vitest（与 Next.js 生态兼容性好）
- 优先为以下模块编写测试：
  - `server/db/repositories/base.ts`（泛型 CRUD）
  - `server/db/migrations/runner.ts`（迁移系统）
  - `server/fs/provider.ts`（文件系统抽象）
  - `server/ipc/handler.ts`（IPC 基础设施）

---

### 风险 R15：无事件总线实现

**严重度**：🟡 中高
**影响范围**：Phase 2-4 的 Agent 协作和主→渲染进程推送
**状态**：🆕 新发现

设计文档（`agent-claw-v2.md`）定义了 `AgentClawEvents` 类型化事件总线用于模块间通信，但：
1. server 端无事件总线实现
2. `preload.ts` 的 `on`/`removeListener` 使用 `string` 类型通道名（无类型约束）
3. 当前没有从主进程向渲染进程推送事件的任何实际使用

**具体风险**：
- Phase 3 的 Agent 对话流（流式输出）需要通过事件推送将 AI 响应增量发送到前端
- Phase 4 的研究任务进度更新需要实时推送
- Phase 2 的模型状态变更通知也需要推送

**建议**：Phase 2 开始前实现一个最小化的类型安全事件总线。

---

### 风险 R16：CSS 集中在 `globals.css` 中，缺少按组件拆分策略

**严重度**：🟢 低
**影响范围**：Phase 2.6（UI 组件库）的样式管理
**状态**：🆕 新发现

`globals.css` 已达 680+ 行，包含：
- CSS 变量定义（主题 token）
- 布局类（.app-layout, .titlebar, .sidebar, .detail-panel, .statusbar）
- 响应式断点（@media 900px / 1200px）
- 通用工具类

Phase 2.6 需要 28 个组件，如果全部追加到 globals.css，文件将膨胀至 2000+ 行。

**建议**：Phase 2 开始前制定 CSS 架构策略（CSS Modules / Tailwind / 独立 CSS 文件）。

---

## 五、安全合规检查

| 检查项 | 状态 | 位置 |
|--------|------|------|
| `nodeIntegration: false` | ✅ | `electron/window.ts` |
| `contextIsolation: true` | ✅ | `electron/window.ts` |
| `sandbox: true` | ✅ | `electron/window.ts` |
| 使用 contextBridge 暴露 API | ✅ | `electron/preload.ts:128` |
| 渲染进程无 Node.js API 直接访问 | ✅ | 通过 window.api 代理 |
| 单实例锁 | ✅ | `electron/main.ts:8` |
| 外部链接在系统浏览器打开 | ✅ | `electron/window.ts` |
| IPC 通道命名 `module:action` | ✅ | 全部 ~54 通道遵循 |
| API Key 加密存储 | ⚠️ | AES-256-GCM 但密钥硬编码（R13） |
| SQL 参数化查询 | ✅ | BaseRepository 使用 prepared statements |
| 渲染进程禁止 `any` 类型 | ✅ | tsconfig strict + 项目规范 |

---

## 六、设计亮点

以下设计决策值得在后续开发中保持：

1. **IPC 全链路类型安全**：`channels.ts` 的 `IpcChannelMap` 模式确保 preload、handler、前端三端的请求/响应类型始终一致
2. **Repository 模式**：`BaseRepository<T>` 泛型基类统一了 CRUD 操作，减少了重复代码
3. **6 接口抽象层**：`pi-mono-wrapper.ts` 的 `IModelManager/IAgentPool/IKnowledgeDB/ISkillEngine/IImportPipe/ISearchEngine` 将 AgentClaw 业务逻辑与 pi-mono SDK 解耦，SDK 变更只影响 Wrapper 实现
4. **可插拔 Executor 模式**：自定义工具（domain_research 等）通过 `setXxxExecutor()` 注入实际逻辑，工具定义与业务执行分离
5. **IFileSystemProvider 接口**：文件系统操作的抽象层，支持测试时替换为内存实现
6. **版本化迁移系统**：MigrationRunner 支持 up/down/validate/batch，为 schema 演化提供了系统化方案

---

## 七、风险优先级排序

| 优先级 | 风险编号 | 描述 | 建议执行时机 |
|--------|---------|------|-------------|
| **P0** | R1 | channels.ts 位置导致反向依赖 | Phase 2 开始前 |
| **P0** | R3 | IPC 类型与 Service 类型重复不一致 | Phase 2 开始前 |
| **P0** | R4 | DB snake_case 与 IPC camelCase 映射鸿沟 | Phase 2 开始前（与 R3 一并解决） |
| **P1** | R2 | register.ts 单文件瓶颈 | Phase 2 第一个 Handler 实现时 |
| **P1** | R9 | PiMonoWrapper 与 IPC Handler 连接路径不明确 | Phase 2 开始前 |
| **P1** | R14 | 缺少测试基础设施 | Phase 2 开始前引入 |
| **P2** | R5 | Stub Handler 静默空实现 | Phase 2 Handler 实现时自然解决 |
| **P2** | R6 | app-store 与 domain-store 状态重复 | 下次涉及 store 修改时一并处理 |
| **P2** | R7 | invoke() 未拦截 IPC Error | Phase 2 开始前 |
| **P2** | R15 | 无事件总线实现 | Phase 3 开始前 |
| **P2** | R8 | paths.ts 直接依赖 Electron | Phase 2 测试编写时 |
| **P2** | R13 | API Key 加密密钥硬编码 | Phase 2 模型管理功能上线前 |
| **P3** | R10 | Executor 未连接数据库 | Phase 3 Agent 功能实现时 |
| **P3** | R11 | unregisterAll 硬编码 | Phase 2 完成后优化 |
| **P3** | R16 | globals.css 膨胀风险 | Phase 2.6 组件库开发前 |
| **P3** | R12 | BaseRepository SQL 拼接 | 添加 JSDoc 文档即可 |

---

## 八、总结与建议

### 8.1 整体评价

Phase 1（1.1-1.7）的架构设计**总体质量较高**，在以下方面做得很好：
- IPC 类型安全的三端契约
- Repository 模式的数据访问层
- pi-mono SDK 的 6 接口抽象
- 文件系统的可测试接口设计

但存在 **3 个 P0 级结构性问题** 需要在 Phase 2 启动前解决：

1. **R1（channels.ts 归属）**：共享类型契约应独立于任何业务层
2. **R3 + R4（类型体系不一致）**：IPC 层、Service 层、DB 层三套类型之间的映射关系需要系统化解决

如果不解决这 3 个问题，Phase 2 的 IPC Handler 实现将面临：
- 每个 Handler 都需要手写类型转换代码
- 三套类型之间的映射错误只能在运行时发现
- 新增字段时需要同步修改 3 个地方的类型定义

### 8.2 建议执行路线

```
Phase 2 前置任务（~2 天）：
  1. R1：将 channels.ts 移至 shared/ 目录
  2. R3+R4：在 shared/ 中定义统一的领域类型，IPC 和 Service 层共享
  3. R2：将 register.ts 拆分为独立 Handler 文件
  4. R9：创建 service-container.ts，统一服务初始化和获取
  5. R7：在 preload invoke() 中添加错误拦截
  6. R14：引入 Vitest 并为核心模块编写基础测试
```

### 8.3 架构健康度评分

| 维度 | 评分 | 说明 |
|------|------|------|
| 职责分离 | 8/10 | 三层职责清晰，仅 window handler 有轻微越界 |
| 类型安全 | 7/10 | IPC 链路类型安全优秀，但跨层类型不一致 |
| 可测试性 | 5/10 | 接口设计良好（IFileSystemProvider），但无测试基础设施 |
| 可扩展性 | 8/10 | Repository / Tool / Extension / Provider 均有清晰的扩展点 |
| 安全合规 | 8/10 | Electron 安全配置完善，API Key 加密需改进 |
| 代码一致 | 7/10 | 命名规范统一，但 camelCase/snake_case 转换缺失 |
| **综合** | **7.2/10** | 基础架构扎实，类型体系统一化是最紧迫的改进点 |
