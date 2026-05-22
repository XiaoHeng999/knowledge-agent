# Forge 项目深度分析报告

> **项目地址**: https://github.com/feicaiclub/forge
> **项目定位**: 本地 AI Agent 桌面工作站（Local AI. Remote Control.）
> **核心技术**: Claude Agent SDK + Electron + Next.js 15 + SQLite
> **分析日期**: 2026-05-21

---

## 目录

- [一、项目总览](#一项目总览)
- [二、前端架构](#二前端架构)
- [三、后端架构](#三后端架构)
- [四、UI/UX 设计](#四uiux-设计)
- [五、Agent 核心设计](#五agent-核心设计)
  - [5.1 Agent Loop 设计](#51-agent-loop-设计)
  - [5.2 Memory 记忆系统设计](#52-memory-记忆系统设计)
  - [5.3 Tools 工具系统设计](#53-tools-工具系统设计)
  - [5.4 MCP 设计](#54-mcp-设计)
- [六、IM 桥接系统](#六im-桥接系统)
- [七、定时任务引擎](#七定时任务引擎)
- [八、Marketplace 模板市场](#八marketplace-模板市场)
- [九、数据存储架构](#九数据存储架构)
- [十、整体架构总结](#十整体架构总结)

---

## 一、项目总览

### 1.1 项目本质

Forge 是对 **Claude Agent SDK**（即 Claude Code CLI 的核心引擎）的 **桌面产品化封装**。它不自己实现 Agent Loop、工具执行等核心能力，而是直接使用 Anthropic 官方的 `@anthropic-ai/claude-agent-sdk` 包，在其之上叠加桌面体验、IM 桥接、记忆系统、定时任务、模板市场等企业级功能。

### 1.2 技术栈

| 层级 | 技术选型 | 说明 |
|------|----------|------|
| 桌面框架 | Electron | 原生桌面体验，跨平台 |
| 前端框架 | Next.js 15 (Turbopack) | App Router，API Routes + SSR |
| UI 层 | React + Tailwind CSS | 组件化，响应式 |
| 数据库 | SQLite (better-sqlite3, WAL 模式) | 嵌入式，零配置，WAL 支持并发读 |
| AI 引擎 | Claude Agent SDK (`@anthropic-ai/claude-agent-sdk`) | Agent Loop + 工具执行 + 会话管理 |
| 包管理 | pnpm | Monorepo 友好 |

### 1.3 目录结构

```
forge/
├── electron/              # Electron 主进程 + preload 脚本
│   ├── main.ts            # 窗口管理、IPC
│   └── preload.ts         # 安全的渲染进程桥接
├── src/
│   ├── app/               # Next.js App Router
│   │   ├── api/           #   API 路由
│   │   │   ├── chat/      #     核心对话 API
│   │   │   │   ├── route.ts          # 主聊天接口
│   │   │   │   └── permission/route.ts  # 权限决策接口
│   │   │   ├── sessions/  #     会话管理
│   │   │   ├── projects/  #     项目管理
│   │   │   ├── models/    #     模型列表
│   │   │   ├── files/     #     文件浏览
│   │   │   └── cron/      #     定时任务
│   │   ├── layout.tsx     #   全局布局
│   │   └── page.tsx       #   主页面
│   ├── components/        # React 组件
│   │   ├── chat/          #   聊天界面组件
│   │   ├── sidebar/       #   侧边栏
│   │   ├── editor/        #   内置编辑器
│   │   ├── files/         #   文件浏览器
│   │   └── marketplace/   #   模板市场组件
│   ├── hooks/             # 自定义 React Hooks
│   │   ├── use-chat.ts    #   核心聊天 Hook（SSE 消费）
│   │   ├── use-sessions.ts#   会话管理
│   │   └── use-files.ts   #   文件监控
│   └── lib/               # 核心业务逻辑（非 UI）
│       ├── sdk/           #   Claude Agent SDK 集成
│       │   ├── client.ts  #     SDK 包装器（核心入口）
│       │   ├── message-mapper.ts  # SDK 消息 → SSE 事件翻译
│       │   ├── permission-bridge.ts  # 权限异步桥接
│       │   ├── system-prompt.ts  # 五层系统提示词组装
│       │   ├── agents-loader.ts  # Agent 定义加载
│       │   └── mcp-loader.ts     # MCP 服务器加载
│       ├── im/            #   IM 桥接
│       │   ├── adapters/  #     平台适配器
│       │   │   ├── feishu.ts    # 飞书（WebSocket）
│       │   │   ├── telegram.ts  # Telegram（长轮询）
│       │   │   └── discord.ts   # Discord（Gateway WS）
│       │   ├── bridge-manager.ts  # 桥接管理器
│       │   └── delivery.ts       # 消息投递
│       ├── cron/          #   定时任务引擎
│       └── db/            #   数据库层（Drizzle ORM）
├── templates/             # /init 配置文件模板
└── electron-builder.json  # 打包配置
```

---

## 二、前端架构

### 2.1 框架选型

前端采用 **Next.js 15 + Turbopack**，运行在 Electron 内嵌的独立 HTTP 服务器上（`127.0.0.1:随机端口`）。这不是传统的 SPA，而是 Next.js 的 **standalone 模式**，Electron 主进程 fork 一个 Next.js 服务器，BrowserWindow 加载该服务器的 URL。

### 2.2 核心组件

| 组件 | 职责 |
|------|------|
| **ChatPanel** | 聊天主界面，消息气泡、代码块、工具调用卡片、内联图片 |
| **Sidebar** | 会话列表、项目切换、Marketplace 入口、IM 状态 |
| **FileTree** | 项目文件浏览器，实时热监控 |
| **CodeEditor** | 内置 Markdown 编辑器，用于编辑 .claude/ 配置文件 |
| **PermissionModal** | 权限审批弹窗（工具调用前） |
| **TaskScheduler** | 可视化定时任务管理器 |
| **MarketplacePanel** | 模板市场浏览、创建、使用 |
| **AgentPanel** | 子 Agent 输出面板（折叠展开） |

### 2.3 核心 Hook — `use-chat.ts`

这是前端最关键的 Hook，负责：

```
SSE 事件流 → 增量累积 → requestAnimationFrame 批量刷新 → React State 更新 → UI 渲染
```

**流式渲染策略**：

```
                    ┌─────────────────────┐
                    │  SSE 事件到达         │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │  累积到 pending buffer │
                    │  (text_delta,        │
                    │   thinking_delta,    │
                    │   tool JSON delta)   │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │  requestAnimationFrame│  ← 浏览器渲染帧对齐
                    │  批量刷到 React state │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │  60fps 流畅渲染       │
                    └─────────────────────┘
```

**事件处理**：

| SSE 事件 | 前端行为 |
|----------|----------|
| `text_delta` | 追加到当前消息的文本缓冲区 |
| `thinking_delta` | 追加到思考过程展示区（可折叠） |
| `tool_use` | 创建工具调用卡片（显示工具名 + 参数） |
| `tool_result` | 更新工具卡片状态（成功/失败 + 输出） |
| `tool_progress` | 更新工具执行进度条 |
| `agent_content` | 路由到子 Agent 面板（按 parent_tool_use_id 分组） |
| `permission_request` | 弹出权限审批 Modal |
| `done` | 标记会话完成，刷新文件树 |
| `error` | 显示错误提示 |

### 2.4 双语支持

UI 支持 **中文 + 英文**，通过 Next.js 的 i18n 机制实现，所有组件文本可切换。

---

## 三、后端架构

### 3.1 运行时模型

```
┌──────────────────────────────────────────────┐
│  Electron Main Process                        │
│  ┌──────────────────────────────────────────┐ │
│  │  Next.js Standalone Server               │ │
│  │  127.0.0.1:RANDOM_PORT                   │ │
│  │                                          │ │
│  │  ┌────────────┐  ┌────────────────────┐  │ │
│  │  │ API Routes │  │ SSR Pages          │  │ │
│  │  │ /api/chat  │  │ (Electron 加载)     │  │ │
│  │  │ /api/sess  │  │                    │  │ │
│  │  │ /api/cron  │  │                    │  │ │
│  │  └────────────┘  └────────────────────┘  │ │
│  └──────────────────────────────────────────┘ │
│                    ↕                           │
│  ┌────────────┐  ┌────────────┐               │
│  │ SQLite DB  │  │ Claude SDK │               │
│  │ (WAL mode) │  │ (子进程)    │               │
│  └────────────┘  └────────────┘               │
└──────────────────────────────────────────────┘
```

### 3.2 API 路由设计

| 路由 | 方法 | 职责 |
|------|------|------|
| `/api/chat` | POST | 核心对话接口，返回 SSE 流 |
| `/api/chat/permission` | POST | 权限决策接口 |
| `/api/sessions` | GET/POST | 会话列表、创建、删除 |
| `/api/sessions/[id]` | GET/PATCH | 单个会话详情、重命名 |
| `/api/projects` | GET/POST | 项目列表、创建 |
| `/api/files` | GET | 项目文件树 |
| `/api/files/content` | GET | 文件内容读取 |
| `/api/models` | GET | 可用模型列表 |
| `/api/cron` | GET/POST/DELETE | 定时任务 CRUD |
| `/api/marketplace` | GET/POST | 模板市场 CRUD |

### 3.3 SSE 流式传输机制

后端使用 `TransformStream` 绕过 Next.js 的默认响应缓冲：

```typescript
const { readable, writable } = new TransformStream();
const writer = writable.getWriter();
const encoder = new TextEncoder();

const emit = async (type: string, data: any) => {
  await writer.write(encoder.encode(`data: ${JSON.stringify({ type, data })}\n\n`));
};

return new Response(readable, {
  headers: { 'Content-Type': 'text/event-stream' }
});
```

每个 `emit()` 调用立即写入一个完整的 SSE chunk（`data: ...\n\n`），TransformStream 不缓冲，保证实时性。

### 3.4 数据库层

使用 **Drizzle ORM** + **better-sqlite3**，WAL 模式支持高并发读取：

```
~/.forge/forge.db
├── sessions 表    — 会话元数据（id, title, projectId, sdkSessionId, createdAt）
├── messages 表    — 消息记录（id, sessionId, role, content[JSON], tokens, createdAt）
├── projects 表    — 项目配置（id, name, path, model, permissionMode）
├── cron_jobs 表   — 定时任务（id, name, frequency, action, lastRun, nextRun）
└── settings 表    — 应用设置（key-value）
```

### 3.5 多模型支持

Forge 不仅支持 Claude，还通过 API Key 映射支持多个第三方模型：

| 模型 | Provider | 接入方式 |
|------|----------|----------|
| Claude Opus 4.6 | Anthropic | 原生 SDK |
| Claude Sonnet 4.6 | Anthropic | 原生 SDK |
| Claude Haiku 4.5 | Anthropic | 原生 SDK |
| MiniMax M2.7 | MiniMax | API Key 映射 |
| GLM-5 Turbo | 智谱 | API Key 映射 |
| Kimi K2 Thinking | Moonshot | API Key 映射 |
| Qwen 3.5 Flash | 阿里 | API Key 映射 |
| 自定义端点 | 任意 | base_url + API Key |

非 Claude 模型通过 `buildModelIdentityPrompt()` 注入身份守卫，防止模型自称是 Claude。

---

## 四、UI/UX 设计

### 4.1 整体布局

```
┌─────────────────────────────────────────────────────────┐
│  ┌──────────┐  ┌─────────────────────────────────────┐  │
│  │          │  │                                     │  │
│  │ Sidebar  │  │         Chat Panel                  │  │
│  │          │  │                                     │  │
│  │ ·会话列表 │  │  ┌───────────────────────────────┐  │  │
│  │ ·项目切换 │  │  │  Assistant Message            │  │  │
│  │ ·文件树   │  │  │  ┌─ Thinking (可折叠) ──────┐ │  │  │
│  │ ·IM 状态  │  │  │  │  推理过程...              │ │  │  │
│  │ ·任务     │  │  │  └──────────────────────────┘ │  │  │
│  │ ·市场     │  │  │  回答文本...                   │  │  │
│  │          │  │  │  ┌─ Tool Call Card ───────────┐ │  │  │
│  │          │  │  │  │  🔧 bash: npm test         │ │  │  │
│  │          │  │  │  │  ✅ 输出...                 │ │  │  │
│  │          │  │  │  └────────────────────────────┘ │  │  │
│  │          │  │  │  ┌─ Sub-Agent (折叠) ─────────┐ │  │  │
│  │          │  │  │  │  Agent: code-reviewer       │ │  │  │
│  │          │  │  │  │  输出...                    │ │  │  │
│  │          │  │  │  └────────────────────────────┘ │  │  │
│  │          │  │  └───────────────────────────────┘  │  │
│  │          │  │                                     │  │
│  │          │  │  ┌───────────────────────────────┐  │  │
│  │          │  │  │  Input + Attachments          │  │  │
│  │          │  │  └───────────────────────────────┘  │  │
│  └──────────┘  └─────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### 4.2 交互设计亮点

**工具调用可视化**：每个工具调用以卡片形式展示，包含：
- 工具类型图标（bash/file/edit/grep...）
- 实时参数流式展示
- 执行进度条
- 输出结果（可折叠）
- 状态标识（执行中 / 成功 / 失败）

**思考过程展示**：Extended Thinking 的推理过程以可折叠区块显示，默认折叠，用户可展开查看推理细节。

**子 Agent 面板**：子 Agent 的输出按 `parent_tool_use_id` 分组，折叠在主对话流中，点击展开查看子 Agent 的完整工作过程。

**权限审批弹窗**：
- 显示工具名、参数详情
- 三个选项：允许一次 / 本次会话允许 / 拒绝
- 倒计时提示（120 秒超时）

**文件浏览器**：
- 实时热监控（外部修改即时刷新）
- 点击文件可在内置编辑器中打开
- `.claude/` 目录特殊标识（Agent 配置目录）

### 4.3 /init 引导式访谈

首次打开项目时，输入 `/init` 触发 6 个问题的引导流程：

| 步骤 | 问题 | 生成的文件 |
|------|------|-----------|
| Q1 | 项目做什么？需要什么帮助？ | CLAUDE.md |
| Q2 | 中文还是英文？ | CLAUDE.md（语言偏好） |
| Q3 | 你是谁？你的角色和背景？ | USER.md |
| Q4 | 你喜欢什么风格？专业/随意/简洁？ | SOUL.md + IDENTITY.md |
| Q5 | 有什么硬性规则？绝对不能做的事？ | CLAUDE.md（约束） |
| Q6 | 需要定期检查什么？GitHub issues？CI？ | HEARTBEAT.md |

每个问题都可跳过，Agent 会填充合理默认值。

### 4.4 Slash 命令系统

输入 `/` 弹出命令菜单，支持：

| 命令 | 功能 | 命令 | 功能 |
|------|------|------|------|
| `/init` | 工作区引导设置 | `/cost` | 查看本次 token 消耗 |
| `/model` | 切换模型 | `/diff` | 查看 git diff |
| `/clear` | 清空当前会话 | `/export` | 导出会话为 Markdown |
| `/compact` | 压缩会话历史 | `/memory` | 打开 MEMORY.md 编辑 |
| `/stop` | 停止执行 | `/save-as-template` | 保存为 Marketplace 模板 |
| `/workspace` | 切换项目 | `/rename` | 重命名会话 |

---

## 五、Agent 核心设计

### 5.1 Agent Loop 设计

#### 5.1.1 核心理解

**Forge 没有自己实现 Agent Loop。** 它使用的是 Anthropic 官方的 `@anthropic-ai/claude-agent-sdk`，这个 SDK 就是 Claude Code CLI 的核心引擎，内部已经包含了完整的 Agent Loop。

```
┌───────────────────────────────────────────────────────┐
│  三层架构                                              │
│                                                       │
│  Layer 3: Claude Agent SDK (Forge 使用的)              │
│  ┌─────────────────────────────────────────────────┐  │
│  │ ✅ Agent Loop（内部自动循环）                      │  │
│  │ ✅ 工具集（bash/file/grep/glob/edit/write...）    │  │
│  │ ✅ 工具执行器（真的调 bash、真的读写文件）          │  │
│  │ ✅ 会话管理（持久化、恢复）                        │  │
│  │ ✅ 流式输出（yield 每一步状态）                    │  │
│  │ ✅ 权限回调（canUseTool）                         │  │
│  │ ✅ 子代理支持                                     │  │
│  └─────────────────────────────────────────────────┘  │
│                        ↕                               │
│  Layer 2: Anthropic API (底层 HTTP 接口)               │
│  ┌─────────────────────────────────────────────────┐  │
│  │ messages.create() — 一问一答                      │  │
│  │ 无循环，无工具执行，无持久化                        │  │
│  └─────────────────────────────────────────────────┘  │
│                        ↕                               │
│  Layer 1: Anthropic 服务器                              │
│  └─────────────────────────────────────────────────┘  │
```

#### 5.1.2 SDK 内部的 Agent Loop 逻辑

```
┌──────────────────────────────────────────────────┐
│           SDK 内部 Agent Loop                     │
│                                                   │
│  ┌─────────┐    ┌──────────┐    ┌──────────┐    │
│  │ 发送消息  │───→│ 收到响应  │───→│ 有工具调用?│    │
│  └─────────┘    └──────────┘    └─────┬────┘    │
│                       ↑                 │         │
│                       │ Yes             │ No      │
│                  ┌────▼────┐       ┌────▼────┐   │
│                  │ 执行工具  │       │ 返回结果  │   │
│                  │ (带权限检查)│      │ (done)  │   │
│                  └────┬────┘       └─────────┘   │
│                       │                           │
│                  ┌────▼────┐                      │
│                  │工具结果作为│                      │
│                  │下一轮消息 │                      │
│                  └─────────┘                      │
│                       │                           │
│                       └──────→ 回到"发送消息"       │
└──────────────────────────────────────────────────┘
```

#### 5.1.3 Forge 的消费方式

Forge 通过 `for await` 异步迭代器被动消费 SDK 的输出：

```typescript
// src/app/api/chat/route.ts — drainQuery()

const q = createForgeQuery(opts);  // 创建 SDK 查询实例

for await (const msg of q) {              // SDK 自动循环，每步 yield 一个消息
  const events = mapper.mapMessage(msg);   // 翻译成 SSE 事件
  for (const event of events) {
    await emit(event.type, event.data);    // 推送到前端
  }
}
// 循环结束 = Agent 完成任务
```

#### 5.1.4 SDK 包装器 — `createForgeQuery()`

`src/lib/sdk/client.ts` 中的 `createForgeQuery()` 是 Forge 对 SDK 的核心包装，它做了六件事：

**① 二进制发现** — `findClaudeExecutable()`
```
搜索路径：/usr/local/bin/claude → fnm/nvm/volta 目录 → which claude
```
SDK 依赖系统安装的 Claude Code CLI 二进制。

**② 环境构建** — `buildSdkEnv()`
- 合并 `process.env`，扩展 PATH
- 根据 provider 类型注入对应 API Key
- 清理 `CLAUDECODE` 环境变量（避免冲突）

**③ 系统提示词组装** — `buildSystemPrompt()`（五层叠加）
```
Layer 1: FORGE_BASE_SYSTEM_PROMPT    — 基础行为指令
Layer 2: 环境信息                     — OS, shell, cwd, date
Layer 3: 工作区人格                   — SOUL.md + IDENTITY.md + USER.md
Layer 4: 记忆上下文                   — MEMORY.md 前 200 行
Layer 5: 项目规则                     — .claude/rules/*.md
```

**④ 模型身份守卫** — 非 Claude 模型时注入指令防止模型自称 Claude。

**⑤ 权限桥接** — 把 SDK 的 `canUseTool` 回调通过 SSE 桥接到前端 UI。

**⑥ 会话策略**
```
首条消息：persistSession: true + sessionId  → 创建新会话
后续消息：resume: true                       → 恢复已有会话
恢复失败：从 SQLite 加载最近 20 条 → 拼入 prompt → 新建会话
```

#### 5.1.5 消息翻译 — `MessageMapper`

`src/lib/sdk/message-mapper.ts` 是一个有状态的翻译器，维护：
- 当前工具 ID/名称、累积的 input JSON
- 思考块状态和累积文本
- 出错的工具调用 ID（去重）
- 按 `parent_tool_use_id` 分组的子 Agent 流状态
- Token 使用量统计

翻译规则：

| SDK 消息类型 | → SSE 事件 | 说明 |
|---|---|---|
| `stream_event` → `content_block_start` (tool_use) | `tool_use` | 工具调用开始 |
| `stream_event` → `content_block_delta` (text_delta) | `text_delta` | 增量文本 |
| `stream_event` → `content_block_delta` (thinking_delta) | `thinking_delta` | 推理过程 |
| `stream_event` → `content_block_delta` (input_json_delta) | （内部累积） | 工具参数流式接收 |
| `stream_event` → `content_block_stop` | （定稿） | 内容块结束 |
| `assistant` | （定稿） | 完整助手消息 |
| `tool_use_summary` | `tool_result` | 工具执行结果 |
| `tool_progress` | `tool_progress` | 工具执行进度 |
| `result` | `done` | 流结束，含 token 统计 |
| `system` | — | 系统初始化，提取 sdkSessionId |

**子 Agent 路由**：带 `parent_tool_use_id` 的消息被路由到 `agent_content` SSE 事件，每个子 Agent 独立状态。

#### 5.1.6 权限桥接 — `PermissionBridge`

```
┌──────────────────────────────────────────────────────┐
│  权限桥接流程                                          │
│                                                       │
│  SDK 调用 canUseTool(toolName, input)                 │
│      │                                                │
│      ├── 生成 requestId，创建 Promise，存入 globalThis │
│      ├── emit("permission_request") → SSE → 前端弹窗  │
│      │                                                │
│      │   [前端显示权限 Modal]                           │
│      │   [用户点击: 允许 / 本次允许 / 拒绝]              │
│      │   [POST /api/chat/permission {requestId, decision}]│
│      │                                                │
│      ├── resolvePermission() → 解除 Promise           │
│      └── 返回 PermissionResult → SDK 继续执行          │
│                                                       │
│  超时: 120 秒                                         │
│  会话许可: allow_session 自动批准同工具后续请求          │
│  清理: 30 分钟不活动的会话许可自动过期                   │
└──────────────────────────────────────────────────────┘
```

### 5.2 Memory 记忆系统设计

#### 5.2.1 设计理念

Forge 的记忆系统不是简单的单文件方案（如仅用 CLAUDE.md），而是一个 **结构化的多层记忆架构**，追求：
- **精简上下文**：每次会话只加载必要信息，不浪费 token
- **Agent 驱动**：由 Agent 主动决定记什么，而非自动记录所有内容
- **透明可控**：所有记忆都是纯 Markdown，用户可见可编辑
- **自动归档**：老记忆不丢失，但也不占用上下文空间

#### 5.2.2 文件结构

```
<project>/.claude/
├── MEMORY.md              ← 索引文件（自动加载前 200 行）
├── memory/
│   ├── 2026-05-19.md      ← 每日记忆（Agent 主动记录）
│   ├── 2026-05-20.md
│   ├── 2026-05-21.md      ← 最近 2 天自动加载
│   ├── debugging.md       ← 主题文件（按需读取）
│   ├── api-conventions.md
│   └── performance.md
```

#### 5.2.3 四层记忆模型

```
┌───────────────────────────────────────────────────┐
│  Layer 1: MEMORY.md 索引（每次会话自动加载）        │
│  ┌─────────────────────────────────────────────┐  │
│  │ 前 200 行自动注入系统提示词                     │  │
│  │ 内容：指向其他记忆文件的索引                    │  │
│  │ 格式：- [标题](文件路径) — 一行描述             │  │
│  └─────────────────────────────────────────────┘  │
├───────────────────────────────────────────────────┤
│  Layer 2: 每日记忆（最近 2 天自动加载）             │
│  ┌─────────────────────────────────────────────┐  │
│  │ memory/YYYY-MM-DD.md                         │  │
│  │ 由 Agent 主动记录当天重要事项                   │  │
│  │ 最近 2 天的日志自动加载到上下文                  │  │
│  └─────────────────────────────────────────────┘  │
├───────────────────────────────────────────────────┤
│  Layer 3: 主题文件（按需加载）                      │
│  ┌─────────────────────────────────────────────┐  │
│  │ memory/debugging.md, api-conventions.md 等   │  │
│  │ Agent 根据当前任务判断是否需要读取               │  │
│  │ 不自动加载，避免浪费 token                     │  │
│  └─────────────────────────────────────────────┘  │
├───────────────────────────────────────────────────┤
│  Layer 4: 归档记忆（7 天自动归档）                  │
│  ┌─────────────────────────────────────────────┐  │
│  │ 超过 7 天的每日记忆被摘要压缩                   │  │
│  │ 不删除，但不再自动加载                          │  │
│  │ Agent 可主动查询历史记忆                        │  │
│  └─────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────┘
```

#### 5.2.4 记忆刷新机制

每次对话结束后，后台触发 `maybeFlushMemory()`（fire-and-forget）：
1. Agent 分析本次对话是否有值得记录的内容
2. 如果有，更新 `memory/YYYY-MM-DD.md`
3. 必要时更新 `MEMORY.md` 索引
4. 检查并归档 7 天前的记忆

#### 5.2.5 与系统提示词的关系

记忆通过 `buildSystemPrompt()` 的 Layer 4 注入：

```
buildSystemPrompt() = 基础指令 + 环境信息 + 人格文件 + MEMORY.md(前200行) + 项目规则
```

MEMORY.md 的前 200 行在每次会话开始时自动加载，超过 200 行的内容不会被加载（保持精简）。

### 5.3 Tools 工具系统设计

#### 5.3.1 工具来源

Forge 的工具 **完全来自 Claude Agent SDK 内置**，不自己定义工具：

```
工具集来源：SDK 内置
├── Bash          — 执行 shell 命令
├── Read          — 读取文件
├── Write         — 写入文件
├── Edit          — 精确字符串替换编辑
├── Glob          — 文件模式匹配
├── Grep          — 内容搜索（ripgrep）
├── WebSearch     — 网络搜索
├── WebFetch      — 网页抓取
├── NotebookEdit  — Jupyter 编辑
├── Agent         — 子 Agent 调度
├── TaskCreate/TaskUpdate/TaskList/TaskGet — 任务管理
└── ...更多工具
```

#### 5.3.2 工具执行流程

```
┌───────────────────────────────────────────────────┐
│  工具执行完整流程                                   │
│                                                    │
│  ① SDK 决定调用工具                                 │
│     yield: stream_event (content_block_start)      │
│     → 前端创建工具卡片                               │
│                                                    │
│  ② 工具参数流式传输                                  │
│     yield: stream_event (input_json_delta)         │
│     → MessageMapper 累积 JSON                      │
│     → 前端实时展示参数                               │
│                                                    │
│  ③ 参数接收完成                                      │
│     yield: stream_event (content_block_stop)       │
│     → MessageMapper 定稿工具调用                     │
│                                                    │
│  ④ 权限检查                                         │
│     SDK 调用 canUseTool(toolName, input)            │
│     → PermissionBridge 发 permission_request SSE   │
│     → 前端弹 Modal                                  │
│     → 用户决策                                      │
│     → POST /api/chat/permission                    │
│     → PermissionBridge 解除 Promise                 │
│     → SDK 获得授权继续                               │
│                                                    │
│  ⑤ 工具执行                                        │
│     SDK 在本地执行工具（真的调 bash、读写文件等）       │
│     yield: tool_progress（进度更新）                 │
│                                                    │
│  ⑥ 执行结果                                        │
│     yield: tool_use_summary                        │
│     → 前端更新工具卡片状态                            │
│                                                    │
│  ⑦ 结果回传                                        │
│     工具结果作为下一轮 "user" 消息                    │
│     SDK 继续下一轮 Agent Loop                       │
└───────────────────────────────────────────────────┘
```

#### 5.3.3 权限模式

Forge 提供两种权限模式：

| 模式 | 行为 |
|------|------|
| **Ask Permissions（确认模式）** | 每次工具调用都需要用户确认 |
| **Full Access（完全访问）** | 自动批准所有工具调用（bypass） |

在 bypass 模式下，`canUseTool` 自动批准所有操作，包括对 `.claude/` 路径的写入（这是为了绕过一个 SDK 已知问题的 workaround）。

### 5.4 MCP 设计

#### 5.4.1 MCP 概念

MCP（Model Context Protocol）是 Anthropic 定义的协议，允许 Agent 连接外部工具服务器。Forge 的 MCP 配置与 Claude Code CLI **完全同步**。

#### 5.4.2 MCP 加载流程

```
src/lib/sdk/mcp-loader.ts

加载来源：
├── ~/.claude/settings.json        — 全局 MCP 服务器配置
├── <project>/.claude/settings.json — 项目级 MCP 服务器配置
└── 用户在 Forge 中额外配置的 MCP 服务器

加载时机：
├── createForgeQuery() 时加载
└── 除非 skipMcpServers = true

运行时：
├── MCP 服务器状态实时监控
└── 配置变更自动同步
```

#### 5.4.3 MCP 与工具的关系

```
┌─────────────────────────────────────────────┐
│  Agent 可用的工具                             │
│                                             │
│  ┌─────────────────────────────────────┐    │
│  │  SDK 内置工具（bash/read/write/...）  │    │
│  └─────────────────────────────────────┘    │
│                   +                         │
│  ┌─────────────────────────────────────┐    │
│  │  MCP 服务器提供的工具                  │    │
│  │  （数据库、API、自定义服务...）         │    │
│  └─────────────────────────────────────┘    │
│                   =                         │
│  ┌─────────────────────────────────────┐    │
│  │  Agent 完整工具集                     │    │
│  └─────────────────────────────────────┘    │
└─────────────────────────────────────────────┘
```

#### 5.4.4 额外 MCP 配置

`createForgeQuery()` 支持通过 `extraMcpServers` 参数注入额外的 MCP 服务器配置，用于定时任务等场景。

---

## 六、IM 桥接系统

### 6.1 架构

```
┌───────────┐     ┌───────────┐     ┌───────────┐
│   飞书     │     │ Telegram  │     │  Discord  │
└─────┬─────┘     └─────┬─────┘     └─────┬─────┘
      │                 │                 │
      │ WebSocket(出站)  │ HTTP长轮询(出站)  │ Gateway WS(出站)
      │                 │                 │
      └────────┬────────┴────────┬────────┘
               │                 │
        ┌──────▼─────────────────▼──────┐
        │       Bridge Manager          │
        │  (src/lib/im/bridge-manager)  │
        │                               │
        │  · 统一消息格式               │
        │  · 命令解析（13个IM命令）      │
        │  · 会话绑定                   │
        │  · 文件传输                   │
        └───────────────┬───────────────┘
                        │
                        │ 调用
                        ▼
               ┌────────────────┐
               │  Claude Agent  │
               │     SDK        │
               └────────────────┘
```

**核心设计**：所有平台都使用 **出站连接**，无需公网 IP、无需端口转发、无需 webhook 服务器。

### 6.2 13 个 IM 命令

| 命令 | 功能 | 命令 | 功能 |
|------|------|------|------|
| `/new` | 创建新会话 | `/projects` | 列出所有项目 |
| `/bind <id>` | 绑定到已有会话 | `/switch <name>` | 切换项目 |
| `/sessions` | 列出会话 | `/newproject <path>` | 创建新项目 |
| `/clear` | 清空会话 | `/model [name]` | 查看/切换模型 |
| `/compact` | 压缩历史 | `/mode [confirm\|full]` | 切换权限模式 |
| `/status` | 查看状态 | `/stop` | 停止任务 |
| `/help` | 帮助 | | |

### 6.3 双向文件传输

```
用户 → Agent:
  发送图片 → Agent 分析
  发送文件（PDF/代码/文档）→ Agent 处理

Agent → 用户:
  Agent 生成/下载文件 → 自动通过 IM 回传
```

### 6.4 定时任务通知

定时任务执行完成后，结果自动推送到已连接的 IM 平台。

---

## 七、定时任务引擎

### 7.1 可视化调度器

无需写 cron 表达式，通过 UI 配置：

| 配置项 | 选项 |
|--------|------|
| 频率 | 一次 / 每X分钟 / 每小时 / 每天 / 每周 / 每月 |
| 动作 | 运行 Agent / 运行 Skill / 自定义提示词 |
| 通知 | 结果推送到飞书/Telegram/Discord |
| 执行 | 每次运行创建新会话（可在聊天列表查看） |

### 7.2 Heartbeat 心跳机制

结合 `HEARTBEAT.md` 文件实现周期性检查：

```
HEARTBEAT.md 内容示例：
- 检查 GitHub Actions 最新构建状态
- 检查是否有新的 issue 标记为 P0
- 检查数据库连接池是否正常

定时触发 → Agent 读取 HEARTBEAT.md → 逐项检查
├── 有异常 → 通过 IM 发送告警
└── 一切正常 → 静默（不发消息）
```

---

## 八、Marketplace 模板市场

### 8.1 设计理念

Forge 的 Marketplace 不是插件商店，而是 **编排模板库**：

```
一个模板 = 项目规则 + 多个 Agent + 多个 Skill + 配置文件 + 记忆模板
```

### 8.2 工作流

```
保存模板：
  运行良好的项目 → /save-as-template → 输入名称 → 保存到 ~/.forge/marketplace/

使用模板：
  Marketplace → 选择模板 → "Use This Template" → 选择文件夹 → 输入项目名
  → Forge 创建项目 + 导入所有配置 + 打开新会话

手动创建：
  Marketplace 编辑器 → 添加文件 → 组织文件夹 → 编写 Agent 定义和 Skill
```

---

## 九、数据存储架构

```
~/.forge/
├── forge.db               # SQLite 数据库（会话、消息、设置、定时任务）
├── uploads/               # 用户上传和 Agent 生成的文件
└── marketplace/           # 保存的解决方案模板

~/.claude/
├── skills/                # 全局技能（跨项目共享）
├── agents/                # 全局 Agent
└── settings.json          # 全局设置 + MCP 服务器配置

<project>/.claude/
├── CLAUDE.md              # 项目规则
├── SOUL.md                # 性格
├── IDENTITY.md            # 身份
├── USER.md                # 用户画像
├── MEMORY.md              # 记忆索引（前 200 行自动加载）
├── HEARTBEAT.md           # 周期检查清单
├── memory/                # 每日日志 + 主题文件
│   ├── YYYY-MM-DD.md
│   └── topic.md
├── agents/                # 项目级 Agent 定义
├── skills/                # 项目级技能
├── rules/                 # 条件规则（路径作用域）
└── settings.json          # 项目级设置 + MCP 配置
```

---

## 十、整体架构总结

### 10.1 Forge 做了什么

| 层面 | Forge 的贡献 | 说明 |
|------|-------------|------|
| **桌面化** | Electron + Next.js | 把终端 CLI 变成原生桌面 App |
| **人格化** | Identity/Soul/User/Memory | 每个项目独立的 AI "人格" |
| **记忆化** | 四层记忆系统 | 让 Agent 越用越懂你 |
| **远程化** | IM Bridge（飞书/Telegram/Discord） | 随时随地控制本地 AI |
| **自动化** | 定时任务 + Heartbeat | AI 主动工作 |
| **模板化** | Marketplace | 编排方案可复用 |
| **产品化** | UI/UX、权限管理、多模型 | 降低使用门槛 |

### 10.2 Forge 没做什么

| 层面 | 说明 |
|------|------|
| **Agent Loop** | 完全使用 SDK 内置，不自己实现 |
| **工具定义** | 完全使用 SDK 内置工具集 |
| **工具执行** | 完全由 SDK 在本地执行 |
| **LLM 调用** | 完全由 SDK 处理 |
| **会话恢复** | 使用 SDK 的 resume 机制 |

### 10.3 核心价值定位

```
Forge = Claude Agent SDK 的产品化封装

SDK 提供：Agent Loop + 工具执行 + 会话管理 + LLM 调用
Forge 提供：桌面 UI + IM 桥接 + 记忆系统 + 定时任务 + 模板市场 + 多模型支持

一句话：Forge 不造 Agent 的轮子，而是在 SDK 提供的能力之上做用户体验和企业级功能。
```

---

> **报告作者**: Claude AI Analysis
> **分析基于**: GitHub 仓库源码 + README 文档
> **许可证**: Apache License 2.0 (Forge 项目), 本报告仅供参考
