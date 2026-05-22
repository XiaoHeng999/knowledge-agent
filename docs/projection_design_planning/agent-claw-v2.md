# AgentClaw V2 — 设计补充与修正

> 版本: v2 (基于 v1 设计文档的补充修正版)
> 更新日期: 2026-05-22
> 状态: DRAFT
> 关联文档: `docs/projection_design_planning/agent-claw.md` (v1 基础设计)

---

## 目录

- [一、v1 修正点](#一v1-修正点)
- [二、新增特性：模型管理 UI](#二新增特性模型管理-ui)
- [三、Obsidian + Claude Code 优秀模式借鉴](#三obsidian--claude-code-优秀模式借鉴)
- [四、pi-mono SDK 集成架构](#四pi-mono-sdk-集成架构)
- [五、跨平台设计](#五跨平台设计)
- [六、代码框架设计原则](#六代码框架设计原则)
- [七、更新后的完整功能清单](#七更新后的完整功能清单)
- [八、更新后的构建顺序](#八更新后的构建顺序)
- [九、多风格 UI 主题系统](#九多风格-ui-主题系统)
- [十、成本估算更新](#十成本估算更新)

---

## 一、v1 修正点

### 1.1 向量搜索：确认使用 SQLite-vss

v1 中的开放问题已解决。选择 SQLite-vss 的理由：

| 因素 | SQLite-vss | Qdrant |
|------|-----------|--------|
| 部署复杂度 | 零（嵌入式） | 需要独立进程 |
| 依赖管理 | 单个 npm 包 | 需要安装和运维 |
| 跨平台兼容性 | 原生支持 | 需要各平台单独编译 |
| 性能（个人级数据量） | 足够 | 过度 |
| 与 SQLite 集成 | 同一数据库 | 需要同步两个存储 |
| 备份/恢复 | 单文件 | 额外步骤 |

**决策**：使用 SQLite-vss，与主数据库共用一个 `.db` 文件。如果未来数据量超过百万级向量，可以迁移到 Qdrant，但通过抽象层保证接口不变。

### 1.2 跨平台要求

明确要求：**macOS + Windows + Linux 三平台支持**。

Electron 天然支持三平台。需要注意的点：

| 平台 | 注意事项 |
|------|---------|
| macOS | Apple Silicon (arm64) + Intel (x64) 双架构 |
| Windows | 路径分隔符、注册表集成、自动更新 |
| Linux | AppImage + deb + rpm 多格式分发 |

**关键架构决策**：
- 所有路径使用 `path.join()` 和 `app.getPath()` 而非硬编码
- 数据库文件放在 `app.getPath('userData')` 下
- 文件系统操作通过抽象层（`FileSystemProvider` 接口），不直接使用 `fs`
- 自动更新使用 `electron-updater`，支持三平台

---

## 二、新增特性：模型管理 UI

这是 v2 的核心新增功能。基于 pi-mono 的 `registerProvider()` 和 `setModel()` API，在 UI 中实现完整的模型生命周期管理。

### 2.1 功能概述

用户应该能够：
1. 在 Settings 页面导入各 Provider 的 API Key
2. 系统自动发现该 Provider 下可用的模型
3. 通过 UI 下拉菜单在已导入的模型之间切换
4. 每个领域（Domain）可以配置默认模型
5. 对话过程中可以随时切换模型

### 2.2 支持的 Provider 清单

基于 pi-mono 的 15+ Provider 支持，首期重点支持：

| Provider | API 协议 | 模型示例 | 成本级别 |
|----------|---------|---------|---------|
| Anthropic | anthropic-messages | Claude Opus, Sonnet, Haiku | 高 |
| OpenAI | openai-completions | GPT-4o, o3, o4-mini | 中 |
| DeepSeek | openai-completions | DeepSeek-V3, DeepSeek-R1 | 低 |
| Google | gemini | Gemini 2.5 Pro/Flash | 中 |
| Groq | openai-completions | Llama, Mixtral (高速) | 极低 |
| Ollama (本地) | openai-completions | 自定义本地模型 | 免费 |
| OpenRouter | openai-completions | 聚合多个模型 | 按模型 |
| xAI | openai-completions | Grok | 中 |
| Mistral | openai-completions | Mistral Large/Medium | 中 |

### 2.3 UI 设计

```
┌─────────────────────────────────────────────────┐
│  Settings > Model Management                     │
├─────────────────────────────────────────────────┤
│                                                   │
│  ┌─ API Key 管理 ──────────────────────────────┐ │
│  │                                               │ │
│  │  Provider     API Key          Status         │ │
│  │  ────────     ────────          ──────         │ │
│  │  Anthropic    sk-ant-...****   ✅ Connected   │ │
│  │  OpenAI       sk-...****       ✅ Connected   │ │
│  │  DeepSeek     sk-ds-...****    ✅ Connected   │ │
│  │  Google       (未设置)         ❌ No key      │ │
│  │  Ollama       localhost:11434  ✅ Connected   │ │
│  │                                               │ │
│  │  [+ Add Provider]                             │ │
│  └───────────────────────────────────────────────┘ │
│                                                   │
│  ┌─ 可用模型 ──────────────────────────────────┐ │
│  │                                               │ │
│  │  Model                    Provider    Cost/m  │ │
│  │  ─────                    ────────    ──────  │ │
│  │  ★ Claude Sonnet 4       Anthropic   $3/1M   │ │
│  │  ★ DeepSeek-V3           DeepSeek    $0.27/1M│ │
│  │    GPT-4o                OpenAI      $2.5/1M │ │
│  │    Claude Haiku 4        Anthropic   $0.80/1M│ │
│  │    o4-mini               OpenAI      $1.1/1M │ │
│  │    Gemini 2.5 Flash      Google      $0.15/1M│ │
│  │    Llama 3.3 70B (local) Ollama      Free    │ │
│  │                                               │ │
│  │  ★ = 当前活跃模型                            │ │
│  └───────────────────────────────────────────────┘ │
│                                                   │
│  ┌─ 领域默认模型 ──────────────────────────────┐ │
│  │                                               │ │
│  │  Domain          Default Model                │ │
│  │  ───────          ────────────                │ │
│  │  AI/ML           Claude Sonnet 4              │ │
│  │  前端开发         DeepSeek-V3                 │ │
│  │  产品设计         GPT-4o                      │ │
│  │  (日常研究)       DeepSeek-V3 (全局默认)      │ │
│  └───────────────────────────────────────────────┘ │
│                                                   │
└─────────────────────────────────────────────────┘
```

对话中的模型切换（状态栏下拉）：

```
┌─────────────────────────────────────────────────┐
│  Domain Expert Chat — AI/ML                      │
│                                          [v ▼]   │
│                                   Claude Sonnet 4 │
│  ┌─ Model Switcher ────────────────────────┐     │
│  │  ● Claude Sonnet 4 (当前)    $3/1M     │     │
│  │  ○ DeepSeek-V3              $0.27/1M   │     │
│  │  ○ GPT-4o                   $2.5/1M    │     │
│  │  ○ Claude Opus 4            $15/1M     │     │
│  │  ○ o4-mini                  $1.1/1M    │     │
│  │  ──────────────────────────────────     │     │
│  │  💡 提示: 简单问题可用 DeepSeek-V3     │     │
│  │     节省 ~90% 成本                      │     │
│  └─────────────────────────────────────────┘     │
│                                                   │
│  [输入消息...]                          [发送 ▶]  │
└─────────────────────────────────────────────────┘
```

### 2.4 技术实现

基于 pi-mono SDK 的 `AuthStorage` + `ModelRegistry` + `registerProvider()` API：

```typescript
// services/model-manager.ts

import { AuthStorage, ModelRegistry } from "@mariozechner/pi-coding-agent";

export class ModelManager {
  private authStorage: AuthStorage;
  private modelRegistry: ModelRegistry;

  constructor(dbPath: string) {
    this.authStorage = AuthStorage.create(dbPath);
    this.modelRegistry = ModelRegistry.create(this.authStorage);
  }

  // 导入 API Key
  async importApiKey(provider: string, apiKey: string): Promise<boolean> {
    this.authStorage.setRuntimeApiKey(provider, apiKey);
    // 验证连接
    return this.modelRegistry.verifyProvider(provider);
  }

  // 获取所有可用模型
  async getAvailableModels(): Promise<ModelInfo[]> {
    return this.modelRegistry.listModels();
  }

  // 切换当前会话模型
  async switchModel(sessionId: string, modelId: string): Promise<boolean> {
    const session = this.sessionManager.get(sessionId);
    return session.setModel(modelId);
  }

  // 设置领域默认模型
  async setDomainDefaultModel(domainId: string, modelId: string): Promise<void> {
    // 写入 SQLite 配置
  }
}
```

API Key 存储安全：
- 使用 `safeStorage` API（Electron 内置）加密存储 API Key
- 不明文写入磁盘
- 使用操作系统级别的密钥链（macOS Keychain / Windows Credential Manager / Linux Secret Service）

---

## 三、Obsidian + Claude Code 优秀模式借鉴

通过分析 Obsidian + Claude Code 的实际使用模式，以下是值得纳入 AgentClaw 的设计。

### 3.1 三层持久化记忆架构

Obsidian + Claude Code 社区中验证最有效的模式：

| 层级 | 名称 | 内容 | 加载策略 |
|------|------|------|---------|
| Hot | 原始会话日志 | 每日研究的原始输出、对话记录 | 不自动加载，按需检索 |
| Warm | 提升后的摘要 | 经 AI 处理的结构化知识节点 | 会话开始时自动加载相关部分 |
| Cold | 历史归档 | 已验证的稳定知识、历史决策 | 仅在检索时引用 |

**AgentClaw 应用**：
- 每日研究代理的原始输出 → Hot 层
- 领域专家分析后的结构化知识 → Warm 层（自动进入知识图谱）
- 经过验证的知识条目 → Cold 层（标记为已验证）
- 新会话开始时，根据当前领域加载 Warm 层数据作为上下文

### 3.2 斜杠命令工作流

Obsidian + Claude Code 最受欢迎的模式之一。AgentClaw 应内置：

| 命令 | 功能 | 对应 v1 功能 |
|------|------|-------------|
| `/daily` | 每日研究摘要 + 今日重点 | F2 (定时研究) |
| `/deep-dive <topic>` | 对某主题深度研究 | F5 (被动模式) |
| `/summarize <source>` | 摘要外部内容 | F8 (导入) |
| `/timeline <domain>` | 显示领域时间线 | F4 (时间线) |
| `/framework <name>` | 应用分析框架 | F3 (框架分析) |
| `/connect` | 发现当前知识与已有知识的关联 | F6 (跨领域) |
| `/predict <domain>` | 生成趋势预测 | F4 (预测) |
| `/skill <name>` | 激活特定技能 | F7 (技能系统) |
| `/review` | 复习某个领域的知识 | 新增：间隔复习 |
| `/import <url>` | 从 URL 导入内容 | F8 (导入) |

### 3.3 收件箱处理工作流

新知识的暂存区，简化流程：

```
流程：
1. 外部内容（网页、PDF、用户快速记录）进入 Inbox
2. AI 生成摘要 + 提取关键信息
3. 用户确认后存入对应领域
4. 每日研究的产出直接进入所属领域（已预配置），无需经过 Inbox

Inbox 来源：
- 外部导入（网页、PDF）
- 用户手动快速记录
- RSS 订阅更新

说明：
- 每日研究代理已绑定到特定领域，结果直接归入该领域，无需 Inbox 中转
- Inbox 主要服务于"非领域绑定"的内容来源（手动记录、外部导入）
- 不做实体提取或关联建立，保持简单：摘要 → 存入领域
```

### 3.4 决策记录模式

Obsidian + Claude Code 社区发现，**记录和检索过往决策**比记录信息本身更有价值。

**AgentClaw 应用**：
- 每次领域分析或框架判断都生成一条 `Decision Record`
- 格式：`ADR-NNN-title.md`，包含：上下文、决策、理由、预期结果
- 后续分析时自动检索相关历史决策
- 避免"重新发明轮子"

### 3.5 安全网：自动版本控制

Obsidian + Claude Code 社区最大的痛点之一是 **AI 误操作导致内容损坏**。

**AgentClaw 必须内置**：
- 每次写入操作前自动创建 git commit（类似 Obsidian 的 File Recovery）
- 用户可随时回滚到任何历史版本
- 代理的写操作范围限制：只能写入指定领域目录
- `git diff` 可视化：每次 AI 修改都显示差异，用户确认后才提交

### 3.6 CLAUDE.md 式的领域配置文件

Obsidian 的 CLAUDE.md 模式让 AI 理解项目上下文。AgentClaw 可以借鉴为每个领域的配置文件：

```yaml
# .agentclaw/domains/ai-ml/config.yaml

domain:
  name: "AI/ML"
  description: "人工智能与机器学习领域"

models:
  expert: "claude-sonnet-4"      # 深度分析用
  research: "deepseek-v3"        # 日常研究用
  summary: "claude-haiku-4"      # 摘要用

research:
  schedule: "0 9 * * *"          # 每天 9:00
  sources:
    - "arxiv.org/list/cs.AI"
    - "huggingface.co/papers"
    - "news.ycombinator.com"
  depth: "deep"

frameworks:
  - "technology-readiness-level"
  - "competitive-landscape"
  - "hype-cycle"

skills:
  - "paper-summarizer"
  - "trend-analyzer"
  - "connection-finder"

tags:
  - "transformer"
  - "llm"
  - "rl"
  - "multimodal"
```

---

## 四、pi-mono SDK 集成架构

### 4.1 pi-mono 作为 npm 依赖直接使用

**确认**：pi-mono SDK 可以直接作为 npm 包导入，无需 CLI。与 OpenClaw 的集成方式相同。

主要包：

```json
{
  "dependencies": {
    "@mariozechner/pi-coding-agent": "^0.73.0"
  }
}
```

单个包即可满足 AgentClaw 全部需求（agent core, AI providers, tools, sessions）。

### 4.2 SDK 核心架构

```
AgentClaw                    pi-mono SDK
┌──────────────────┐        ┌──────────────────────┐
│  Electron Main   │        │                      │
│  ┌────────────┐  │        │  AuthStorage         │
│  │ ModelManager│──┼───────│  ├── API Key 加密存储 │
│  └────────────┘  │        │  └── Provider 验证    │
│  ┌────────────┐  │        │                      │
│  │ AgentPool  │──┼───────│  ModelRegistry        │
│  │ ├── Expert │  │        │  ├── 模型发现/列表    │
│  │ ├── Research│ │        │  ├── 可用性检查       │
│  │ └── Import │  │        │  └── 成本估算         │
│  └────────────┘  │        │                      │
│  ┌────────────┐  │        │  createAgentSession() │
│  │ SkillEngine │──┼───────│  ├── 会话管理         │
│  └────────────┘  │        │  ├── 工具注册         │
│  ┌────────────┐  │        │  ├── 模型切换         │
│  │ KnowledgeDB │  │        │  └── 树状分支         │
│  └────────────┘  │        │                      │
└──────────────────┘        │  DefaultResourceLoader│
                            │  ├── 扩展加载         │
                            │  ├── 技能发现         │
                            │  └── 提示模板         │
                            └──────────────────────┘
```

### 4.3 关键集成代码模式

**初始化**：

```typescript
import {
  AuthStorage,
  ModelRegistry,
  createAgentSession,
  SessionManager,
  DefaultResourceLoader,
  defineTool,
  codingTools,
} from "@mariozechner/pi-coding-agent";

// AgentClaw 的 pi-mono 初始化
export class AgentClawCore {
  private authStorage: AuthStorage;
  private modelRegistry: ModelRegistry;
  private sessionManager: SessionManager;

  async initialize(userDataPath: string) {
    // 1. 认证存储（API Key 加密管理）
    this.authStorage = AuthStorage.create(`${userDataPath}/auth.json`);

    // 2. 模型注册中心
    this.modelRegistry = ModelRegistry.create(this.authStorage);

    // 3. 会话管理器（文件持久化）
    this.sessionManager = SessionManager.filesystem(`${userDataPath}/sessions`);

    // 4. 资源加载器（扩展 + 技能 + 提示模板）
    const resourceLoader = new DefaultResourceLoader({
      cwd: userDataPath,
      agentDir: `${userDataPath}/agent`,
      settingsManager: this.settingsManager,
      extensionFactories: [
        // 内置扩展：知识管理工具
        knowledgeToolsExtension,
        // 内置扩展：研究代理
        researchAgentExtension,
        // 内置扩展：导入处理
        importAgentExtension,
      ],
    });
    await resourceLoader.reload();
  }
}
```

**创建领域专家会话**：

```typescript
async createExpertSession(domain: Domain): Promise<AgentSession> {
  const { session } = await createAgentSession({
    model: domain.defaultModel || "claude-sonnet-4-20250514",
    tools: [...codingTools, ...this.getKnowledgeTools()],
    customTools: [
      this.createDomainResearchTool(domain),
      this.createKnowledgeWriteTool(domain),
      this.createTimelineTool(domain),
    ],
    sessionManager: this.sessionManager,
    authStorage: this.authStorage,
    modelRegistry: this.modelRegistry,
    resourceLoader: this.resourceLoader,
    thinkingLevel: "medium",
    cwd: domain.dataPath,
  });
  return session;
}
```

**模型切换（运行时）**：

```typescript
// 在 UI 中切换模型 → 调用 pi-mono API
async switchModel(sessionId: string, modelId: string): Promise<boolean> {
  const session = this.sessions.get(sessionId);
  if (!session) return false;

  // pi-mono 原生支持会话中途切换模型
  const success = session.setModel(modelId);
  if (success) {
    // 记录切换事件用于成本追踪
    await this.db.logModelSwitch(sessionId, modelId);
  }
  return success;
}
```

**注册新 Provider（API Key 导入）**：

```typescript
// 通过 pi-mono 的扩展 API 注册新 Provider
const extension = (pi: PiExtensionApi) => {
  pi.registerProvider("deepseek", {
    name: "DeepSeek",
    baseUrl: "https://api.deepseek.com",
    apiKey: userApiKey,  // 从加密存储中获取
    api: "openai-completions",
    models: [
      {
        id: "deepseek-chat",
        name: "DeepSeek-V3",
        reasoning: false,
        input: ["text"],
        cost: { input: 0.27, output: 1.10, cacheRead: 0, cacheWrite: 0 },
        contextWindow: 64000,
        maxTokens: 8192,
      },
      {
        id: "deepseek-reasoner",
        name: "DeepSeek-R1",
        reasoning: true,
        input: ["text"],
        cost: { input: 0.55, output: 2.19, cacheRead: 0, cacheWrite: 0 },
        contextWindow: 64000,
        maxTokens: 8192,
      },
    ],
  });
};
```

### 4.4 自定义工具定义

AgentClaw 的核心知识管理工具：

```typescript
// 领域研究工具
const domainResearchTool = defineTool({
  name: "domain_research",
  label: "Domain Research",
  description: "在指定领域搜索和综合信息",
  parameters: Type.Object({
    domain: Type.String({ description: "目标领域" }),
    query: Type.String({ description: "研究查询" }),
    depth: Type.Union([
      Type.Literal("quick"),
      Type.Literal("deep"),
    ]),
  }),
  execute: async (_id, params) => {
    const results = await researchEngine.search(params);
    return {
      content: [{ type: "text", text: results.summary }],
      details: results,
    };
  },
});

// 知识写入工具
const knowledgeWriteTool = defineTool({
  name: "knowledge_write",
  label: "Write Knowledge Node",
  description: "将知识写入知识图谱",
  parameters: Type.Object({
    title: Type.String(),
    content: Type.String(),
    domain: Type.String(),
    type: Type.Union([
      Type.Literal("concept"),
      Type.Literal("person"),
      Type.Literal("technology"),
      Type.Literal("event"),
      Type.Literal("decision"),
    ]),
    links: Type.Array(Type.String()),
    source: Type.String(),
  }),
  execute: async (_id, params) => {
    const nodeId = await knowledgeGraph.addNode(params);
    return {
      content: [{ type: "text", text: `Created node: ${nodeId}` }],
    };
  },
});

// 时间线分析工具
const timelineTool = defineTool({
  name: "timeline_analyze",
  label: "Timeline Analysis",
  description: "分析领域发展时间线并生成预测",
  parameters: Type.Object({
    domain: Type.String(),
    period: Type.Union([
      Type.Literal("month"),
      Type.Literal("quarter"),
      Type.Literal("year"),
    ]),
  }),
  execute: async (_id, params) => {
    const timeline = await timelineEngine.analyze(params);
    return {
      content: [{ type: "text", text: timeline.report }],
    };
  },
});
```

---

## 五、跨平台设计

### 5.1 目录结构

```
agentclaw/
├── electron/                    # Electron 主进程
│   ├── main.ts                  # 入口
│   ├── preload.ts               # 安全桥接
│   └── platform/                # 平台适配
│       ├── darwin.ts
│       ├── win32.ts
│       └── linux.ts
├── src/                         # Next.js 前端 (Renderer)
│   ├── app/                     # App Router
│   │   ├── (main)/
│   │   │   ├── layout.tsx       # 主布局（侧边栏 + 主区域）
│   │   │   ├── page.tsx         # 首页/仪表盘
│   │   │   ├── domain/
│   │   │   │   └── [id]/
│   │   │   │       ├── page.tsx # 领域视图
│   │   │   │       └── chat/    # 专家对话
│   │   │   ├── timeline/
│   │   │   │   └── page.tsx     # 时间线视图
│   │   │   ├── research/
│   │   │   │   └── page.tsx     # 研究仪表盘
│   │   │   └── settings/
│   │   │       ├── page.tsx     # 设置首页
│   │   │       ├── models/      # 模型管理
│   │   │       └── domains/     # 领域配置
│   │   └── globals.css
│   ├── components/
│   │   ├── ui/                  # 基础 UI 组件
│   │   ├── editor/              # Markdown 编辑器
│   │   ├── graph/               # 知识图谱可视化
│   │   ├── timeline/            # 时间线组件
│   │   ├── chat/                # 对话组件
│   │   └── settings/            # 设置页组件
│   ├── lib/
│   │   ├── ipc/                 # IPC 通信层
│   │   └── hooks/               # React Hooks
│   └── stores/                  # 状态管理 (Zustand)
├── server/                      # Node.js 后端（Electron Main 进程内）
│   ├── services/
│   │   ├── model-manager.ts     # 模型管理（pi-mono AuthStorage + ModelRegistry）
│   │   ├── agent-pool.ts        # Agent 池管理
│   │   ├── knowledge-graph.ts   # 知识图谱服务
│   │   ├── search-engine.ts     # 混合搜索引擎
│   │   ├── research-scheduler.ts# 研究调度器
│   │   ├── import-pipeline.ts   # 导入管道
│   │   └── skill-engine.ts      # 技能引擎
│   ├── db/
│   │   ├── schema.ts            # SQLite schema 定义
│   │   ├── migrations/          # 数据库迁移
│   │   ├── repositories/        # 数据访问层
│   │   └── vector.ts            # SQLite-vss 向量操作
│   └── pi-mono/
│       ├── core.ts              # pi-mono 初始化
│       ├── providers.ts         # Provider 注册
│       ├── tools/               # 自定义工具
│       └── extensions/          # 自定义扩展
├── skills/                      # AgentClaw Skills（SKILL.md 格式）
│   ├── paper-summarizer/
│   ├── trend-analyzer/
│   ├── connection-finder/
│   └── domain-expert/
├── resources/                   # Electron 资源文件
│   └── icon.png
├── package.json
├── electron-builder.yml         # 跨平台构建配置
├── next.config.ts
├── tsconfig.json
└── turbo.json                   # Turbopack 配置
```

### 5.2 IPC 通信架构

Electron 安全模型要求 Main 进程和 Renderer 进程通过 IPC 通信：

```
Renderer (Next.js)          Main (Electron + pi-mono)
┌───────────────┐           ┌───────────────────────┐
│ React UI      │   IPC     │ Services              │
│               │◄────────►│                       │
│ - Components  │           │ - ModelManager        │
│ - Stores      │           │ - AgentPool           │
│ - Hooks       │           │ - KnowledgeGraph      │
│               │           │ - SearchEngine        │
│               │           │ - ResearchScheduler   │
└───────────────┘           │ - ImportPipeline      │
                            │ - SkillEngine         │
                            └───────────────────────┘
                                      │
                                      ▼
                            ┌───────────────────────┐
                            │ pi-mono SDK            │
                            │ - Agent Sessions       │
                            │ - Model Registry       │
                            │ - Auth Storage         │
                            └───────────────────────┘
                                      │
                                      ▼
                            ┌───────────────────────┐
                            │ SQLite + SQLite-vss   │
                            │ (单文件数据库)          │
                            └───────────────────────┘
```

### 5.3 构建与分发

```yaml
# electron-builder.yml
appId: com.agentclaw.app
productName: AgentClaw

mac:
  target:
    - target: dmg
      arch: [x64, arm64]
  category: public.app-category.productivity
  hardenedRuntime: true

win:
  target:
    - target: nsis
      arch: [x64]
    - target: portable
      arch: [x64]

linux:
  target:
    - target: AppImage
      arch: [x64]
    - target: deb
      arch: [x64]
  category: Office

publish:
  provider: github
  releaseType: release
```

---

## 六、代码框架设计原则

由于这是一个会持续迭代的项目，框架设计必须为扩展做好准备。

### 6.1 六个核心抽象

每个抽象对应一个接口，实现可以替换：

```
┌─────────────────────────────────────────────────────────┐
│                     AgentClaw Core                       │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ IModelManager │  │ IAgentPool   │  │ IKnowledgeDB │  │
│  │               │  │              │  │              │  │
│  │ - importKey() │  │ - create()   │  │ - addNode()  │  │
│  │ - listModels()│  │ - destroy()  │  │ - query()    │  │
│  │ - switchModel │  │ - dispatch() │  │ - search()   │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ ISkillEngine │  │ IImportPipe  │  │ ISearchEngine│  │
│  │              │  │              │  │              │  │
│  │ - register() │  │ - register() │  │ - index()    │  │
│  │ - execute()  │  │ - process()  │  │ - hybrid()   │  │
│  │ - evolve()   │  │ - extract()  │  │ - search()   │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### 6.2 插件式领域配置

每个领域是一个独立的"插件"，包含自己的配置、模型、工具、技能：

```
domains/
├── ai-ml/
│   ├── config.yaml          # 领域配置
│   ├── skills/              # 领域专属技能
│   │   └── paper-summarizer/
│   │       └── SKILL.md
│   ├── tools/               # 领域专属工具
│   │   └── arxiv-search.ts
│   ├── prompts/             # 领域专属提示模板
│   │   └── expert-persona.md
│   └── data/                # 领域数据目录
│       ├── knowledge/       # 知识节点（Markdown 文件）
│       └── inbox/           # 收件箱
├── frontend-dev/
│   ├── config.yaml
│   ├── skills/
│   └── ...
└── product-design/
    ├── config.yaml
    ├── skills/
    └── ...
```

### 6.3 事件驱动架构

模块间通过事件总线解耦：

```typescript
// 核心事件
type AgentClawEvents = {
  // 模型事件
  "model:imported": { provider: string; modelCount: number };
  "model:switched": { sessionId: string; from: string; to: string };

  // 知识事件
  "knowledge:created": { nodeId: string; domain: string; type: string };
  "knowledge:updated": { nodeId: string; changes: string[] };
  "knowledge:created": { nodeId: string; domain: string; type: string };
  "knowledge:updated": { nodeId: string; changes: string[] };

  // 研究事件
  "research:started": { domain: string; query: string };
  "research:completed": { domain: string; findings: number };
  "research:ingested": { domain: string; newNodeIds: string[] };

  // 导入事件
  "import:started": { source: string; type: string };
  "import:completed": { source: string; nodeIds: string[] };

  // 技能事件
  "skill:registered": { name: string; domain?: string };
  "skill:executed": { name: string; result: string };
};
```

### 6.4 数据库 Schema（核心表）

```sql
-- 领域
CREATE TABLE domains (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  config_path TEXT,
  default_model TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- 知识节点
CREATE TABLE knowledge_nodes (
  id TEXT PRIMARY KEY,
  domain_id TEXT NOT NULL REFERENCES domains(id),
  title TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'concept',  -- concept, person, technology, event, decision
  content TEXT,
  frontmatter TEXT,  -- JSON
  comprehension INTEGER DEFAULT 0,  -- 0-5
  status TEXT DEFAULT 'draft',  -- draft, reviewed, verified
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- 知识关联
CREATE TABLE knowledge_edges (
  id TEXT PRIMARY KEY,
  source_id TEXT NOT NULL REFERENCES knowledge_nodes(id),
  target_id TEXT NOT NULL REFERENCES knowledge_nodes(id),
  relation TEXT NOT NULL,  -- related_to, depends_on, evolves_from, contradicts
  weight REAL DEFAULT 1.0,
  created_at TEXT DEFAULT (datetime('now'))
);

-- 来源追踪
CREATE TABLE sources (
  id TEXT PRIMARY KEY,
  node_id TEXT NOT NULL REFERENCES knowledge_nodes(id),
  type TEXT NOT NULL,  -- web, pdf, manual, research, import
  url TEXT,
  title TEXT,
  retrieved_at TEXT DEFAULT (datetime('now'))
);

-- 时间线条目
CREATE TABLE timeline_entries (
  id TEXT PRIMARY KEY,
  domain_id TEXT NOT NULL REFERENCES domains(id),
  date TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  significance TEXT,  -- low, medium, high
  prediction BOOLEAN DEFAULT FALSE,
  confidence REAL,  -- 0.0-1.0 for predictions
  source_node_id TEXT REFERENCES knowledge_nodes(id),
  created_at TEXT DEFAULT (datetime('now'))
);

-- 模型配置
CREATE TABLE model_configs (
  provider TEXT NOT NULL,
  model_id TEXT NOT NULL,
  display_name TEXT,
  cost_input REAL,
  cost_output REAL,
  context_window INTEGER,
  is_active BOOLEAN DEFAULT TRUE,
  PRIMARY KEY (provider, model_id)
);

-- 领域默认模型
CREATE TABLE domain_models (
  domain_id TEXT NOT NULL REFERENCES domains(id),
  model_id TEXT NOT NULL,
  purpose TEXT NOT NULL,  -- expert, research, summary
  PRIMARY KEY (domain_id, purpose)
);

-- API Key 存储（加密）
CREATE TABLE api_keys (
  provider TEXT PRIMARY KEY,
  encrypted_key TEXT NOT NULL,  -- Electron safeStorage 加密
  is_valid BOOLEAN DEFAULT FALSE,
  last_verified TEXT
);

-- 向量索引（SQLite-vss）
CREATE VIRTUAL TABLE knowledge_vectors USING vss0(
  embedding(1536)  -- text-embedding-3-large 维度
);

-- 收件箱
CREATE TABLE inbox (
  id TEXT PRIMARY KEY,
  raw_content TEXT NOT NULL,
  source_type TEXT NOT NULL,  -- research, import, manual, rss
  source_url TEXT,
  status TEXT DEFAULT 'pending',  -- pending, processing, processed, rejected
  domain_id TEXT REFERENCES domains(id),
  created_at TEXT DEFAULT (datetime('now'))
);

-- 决策记录
CREATE TABLE decision_records (
  id TEXT PRIMARY KEY,
  domain_id TEXT NOT NULL REFERENCES domains(id),
  title TEXT NOT NULL,
  context TEXT,
  decision TEXT NOT NULL,
  reasoning TEXT,
  outcome TEXT,
  status TEXT DEFAULT 'active',  -- active, superseded, revoked
  created_at TEXT DEFAULT (datetime('now'))
);
```

---

## 七、更新后的完整功能清单

基于 v1 的 8 大功能 + v2 的新增/修改：

| # | 功能 | v1 | v2 变化 |
|---|------|----|---------|
| F1 | GUI 界面 | Electron + Next.js | 不变 |
| F2 | 定时每日网络研究 | 基础设计 | 新增：三层记忆架构，Hot/Warm/Cold 分层 |
| F3 | 领域摘要与框架分析 | 基础设计 | 新增：决策记录模式 (ADR) |
| F4 | 领域时间线与预测 | 基础设计 | 不变 |
| F5 | 双模式知识录入 | 基础设计 | 新增：收件箱暂存工作流（外部内容经过 Inbox，研究直接入库） |
| F6 | 领域分类 | 基础设计 | 新增：插件式领域配置，每个领域独立逻辑线 |
| F7 | 自进化技能系统 | 基础设计 | 新增：斜杠命令接口 |
| F8 | 外部内容导入 | 基础设计 | 新增：导入管道，来源追踪增强 |
| **F9** | **模型管理 UI** | 无 | **新增**：API Key 导入，模型切换，领域默认模型 |
| **F10** | **知识图谱可视化** | 隐含在 F6 | **新增**：按领域分类的知识视图，时间线关联 |
| **F11** | **安全版本控制** | 无 | **新增**：自动 git commit，diff 可视化，一键回滚 |
| **F12** | **跨平台支持** | 隐含 | **明确**：macOS + Windows + Linux 三平台构建 |

---

## 八、更新后的构建顺序

### Phase 1: 基础骨架 (第 1-2 周)

```
Week 1:
├── Day 1-2: Electron + Next.js 15 项目初始化
│   ├── electron-builder.yml (三平台配置)
│   ├── next.config.ts (Turbopack + Electron 适配)
│   ├── IPC 通信桥接 (preload.ts)
│   └── 基础布局框架 (侧边栏 + 主区域)
│
├── Day 3-4: SQLite 数据库层
│   ├── schema.ts (全部表定义)
│   ├── migration 系统
│   ├── SQLite-vss 向量索引
│   └── 基础 Repository 层 (CRUD)
│
└── Day 5: pi-mono SDK 集成
    ├── Core.ts (初始化)
    ├── providers.ts (默认 Provider 注册)
    └── 基础 agent 会话创建/销毁

Week 2:
├── Day 1-2: 模型管理 UI (F9) ← 优先！这是基础
│   ├── Settings > Model Management 页面
│   ├── API Key 导入 + 加密存储
│   ├── 模型列表 + 状态显示
│   └── 运行时模型切换下拉
│
├── Day 3-4: 领域管理 (F6)
│   ├── 领域创建/编辑界面
│   ├── 领域配置文件 (config.yaml)
│   ├── 领域默认模型设置
│   └── 领域目录结构创建
│
└── Day 5: 安全版本控制 (F11)
    ├── 自动 git init on first run
    ├── pre-write auto-commit hook
    └── diff 可视化组件
```

### Phase 2: 核心智能 (第 3-4 周)

```
Week 3:
├── Day 1-2: 知识存储基础 (F10)
│   ├── Markdown 知识文件格式
│   ├── YAML frontmatter 解析
│   ├── 按领域分类的知识列表视图
│   └── 基础可视化 (时间线 + 领域视图)
│
├── Day 3-4: 专家对话 (F5 主动模式)
│   ├── 对话界面 (树状会话)
│   ├── pi-mono agent session 集成
│   ├── 领域上下文自动加载
│   └── 斜杠命令框架 (/daily, /deep-dive 等)
│
└── Day 5: 混合搜索引擎 (F6)
    ├── SQLite-vss 向量搜索
    ├── BM25 全文搜索
    └── RRF 融合排序

Week 4:
├── Day 1-2: 收件箱处理 (F5 被动模式)
│   ├── Inbox 界面
│   ├── AI 摘要生成
│   ├── 用户确认后存入领域
│   └── 手动/导入内容专用（研究产出直接入库）
│
├── Day 3-4: 框架分析 (F3) + 决策记录
│   ├── 分析框架引擎
│   ├── 框架判断 → 知识节点
│   ├── Decision Record 生成
│   └── 历史决策检索
│
└── Day 5: 领域摘要生成 (F3)
    ├── 定期摘要触发
    ├── 三层记忆分层 (Hot → Warm → Cold)
    └── 摘要质量评估
```

### Phase 3: 自动化 (第 5-6 周)

```
Week 5:
├── Day 1-2: 定时研究代理 (F2)
│   ├── 研究调度器 (cron)
│   ├── 领域来源配置
│   ├── 研究代理 (pi-mono + cheap model)
│   └── 研究结果 → Inbox 自动入库
│
├── Day 3-4: 导入管道 (F8)
│   ├── URL 导入 + 内容提取
│   ├── PDF 导入 + 文本抽取
│   ├── RSS 订阅源
│   └── 导入 → AI 摘要 → 知识图谱
│
└── Day 5: 研究仪表盘 (F2)
    ├── 每日研究摘要视图
    ├── 研究历史时间线
    └── 研究成本追踪

Week 6:
├── Day 1-2: 时间线视图 (F4)
│   ├── 领域时间线组件
│   ├── 趋势分析生成
│   ├── 预测生成 (带置信度)
│   └── 预测准确率追踪
│
├── Day 3-4: 技能系统 (F7)
│   ├── SKILL.md 加载和执行
│   ├── 内置技能 (paper-summarizer, trend-analyzer, connection-finder)
│   ├── 技能注册界面
│   └── 技能效果追踪
│
└── Day 5: 集成测试 + 打磨
    ├── 跨端到端流程测试
    ├── 性能优化
    └── UI 打磨
```

### Phase 4: 打磨与发布 (第 7-8 周)

```
Week 7:
├── 跨平台构建测试 (macOS, Windows, Linux)
├── 自动更新机制
├── 性能优化 (大知识图谱加载)
└── 错误处理和边缘情况

Week 8:
├── 用户文档
├── 开源准备 (LICENSE, README, CONTRIBUTING)
├── GitHub Release 构建
└── 社区反馈收集
```

---

## 九、多风格 UI 主题系统

AgentClaw 的前端界面需要实现 **4 种视觉风格**，用户可以在设置中手动切换，**默认使用 Linear 风格**。

### 9.1 支持的风格

| 风格 | 参考设计 | 核心特征 |
|------|---------|---------|
| **Linear** (默认) | Linear App | 极简、暗色主题、紫色强调色、紧凑布局 |
| Cursor | Cursor IDE | 开发者友好、深色为主、代码编辑器风格 |
| Notion | Notion | 白色为主、块状编辑、柔和圆角、文档感 |
| PostHog | PostHog | 数据仪表盘风格、彩色图表、明亮配色 |

### 9.2 设计规范来源

各风格的详细 UI/UX 设计规范位于 `docs/design-UI-UX-reuslt/` 目录下：

```
docs/design-UI-UX-reuslt/
├── linear-style/      # Linear 风格设计规范（默认）
├── cursor-style/      # Cursor 风格设计规范
├── notion-style/      # Notion 风格设计规范
└── PostHog-style/     # PostHog 风格设计规范
```

### 9.3 实现要求

- 用户可在 **Settings > Appearance** 中切换风格，切换后即时生效，无需重启
- 风格切换通过 CSS 变量 / Tailwind 主题实现，不引入独立组件库
- 所有功能在不同风格下保持一致，仅视觉表现不同
- 构建阶段需在 Phase 1（基础骨架）完成后立即启动多风格适配

---

## 十、成本估算更新

基于多模型自由切换，成本估算更加灵活：

| 场景 | 模型选择 | 日成本 | 月成本 |
|------|---------|--------|--------|
| **经济模式** | DeepSeek-V3 全场景 | ~$0.05 | ~$1.50 |
| **平衡模式** | DeepSeek 研究 + Claude 专家 | ~$0.30 | ~$9.00 |
| **质量模式** | Claude Sonnet 全场景 | ~$1.00 | ~$30.00 |
| **本地模式** | Ollama 全场景 (Llama 3.3 70B) | $0 | $0 |
| **混合模式（推荐）** | 研究: DeepSeek, 专家: Claude, 摘要: Haiku | ~$0.20 | ~$6.00 |

---

## 附：关键技术依赖版本

```json
{
  "dependencies": {
    "@mariozechner/pi-coding-agent": "^0.73.0",
    "better-sqlite3": "^11.0.0",
    "sqlite-vec": "^0.1.0",
    "next": "^15.0.0",
    "react": "^19.0.0",
    "zustand": "^5.0.0",
    "d3": "^7.9.0",
    "electron-store": "^10.0.0",
    "gray-matter": "^4.0.3",
    "marked": "^12.0.0"
  },
  "devDependencies": {
    "electron": "^33.0.0",
    "electron-builder": "^25.0.0",
    "typescript": "^5.5.0",
    "@types/better-sqlite3": "^7.6.0"
  }
}
```
