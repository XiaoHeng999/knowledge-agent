## Context

AgentClaw 是一个桌面端 AI 知识管理应用，核心理念为"理解 > 检索"。经过两轮设计评审（CEO 评审 7.5/10 + UI/UX 设计评审 4/10），现有以下设计资产：

- 产品设计文档 v2（12 个功能 F1-F12）
- 数据库 Schema（14 张表）
- 4 套 UI 风格包设计规范（Linear/Cursor/Notion/PostHog）
- 28 个组件库规格
- pi-mono SDK 集成架构
- IPC 通信架构

评审识别出 24 项设计规格补全任务（T1-T9 + DT1-DT15），需在编码前完成。

**技术栈**：Electron 33 + Next.js 15 + React 19 + TypeScript 5.5 + pi-mono SDK 0.73 + better-sqlite3 + SQLite-vec + D3.js + Zustand 5

**架构模式**：Electron Main 进程运行服务层（pi-mono + SQLite），Next.js 作为 Renderer 进程，通过 IPC 桥接通信。

## Goals / Non-Goals

**Goals:**

- 构建一个完整的桌面端 AI 知识管理应用，覆盖 12 个核心功能
- 实现基于 Token 的多风格主题系统，支持 4 种风格运行时切换
- 集成 pi-mono SDK 实现多 Provider/多模型管理
- 通过 SQLite + SQLite-vec 实现混合搜索引擎（向量 + 全文）
- 支持三平台（macOS/Windows/Linux）构建和分发
- 补全所有评审识别的设计规格缺口
- 实现完整无障碍支持（WCAG AA）

**Non-Goals:**

- 移动端/平板端应用（v1 仅桌面）
- 实时协作 / 多用户同步
- 插件市场 / 云备份服务
- 国际化（i18n）— v1 仅英文
- 性能基准 / SLA 目标

## Decisions

### D1: Electron + Next.js 架构（而非纯 Electron 或 Tauri）

**选择**：Electron Main 进程 + Next.js Renderer 进程 + IPC 桥接

**理由**：
- Next.js App Router 提供 SSR 能力和成熟的路由系统
- pi-mono SDK 依赖 Node.js API（fs, child_process），必须在 Main 进程运行
- Tauri 虽更轻量但 Rust 侧无法直接运行 pi-mono SDK
- Electron safeStorage 提供 OS 级密钥链集成

**替代方案**：Tauri + React（被否决，pi-mono 兼容性问题）

### D2: SQLite 单文件数据库（而非 LevelDB 或 IndexedDB）

**选择**：better-sqlite3 + SQLite-vec + WAL 模式

**理由**：
- 单文件部署，备份/恢复简单
- SQLite-vec 原生支持向量搜索
- WAL 模式支持并发读写
- 个人级数据量（< 100 万向量）性能足够

### D3: pi-mono SDK 封装层（而非直接使用）

**选择**：创建 `server/pi-mono/core.ts` 封装层，6 大核心接口抽象（IModelManager, IAgentPool, IKnowledgeDB, ISkillEngine, IImportPipe, ISearchEngine）

**理由**：CEO 评审决策 D4 — 尽早抽象，避免深度耦合 pi-mono API 变更

### D4: 主题系统 — 基于 Token 的 CSS 变量

**选择**：定义 30 个规范 Token，每种风格包表达为 Token 映射。Tokyo Night 为默认映射值。

**理由**：设计评审 DT7 识别 — 无映射将导致两个不兼容的主题系统

### D5: 知识图谱 — D3.js SVG + WebGL 降级

**选择**：小图（≤ 1000 节点）用 D3.js SVG 渲染，大图降级到 WebGL

**理由**：CEO 评审决策 D8 — SVG 可访问性好，WebGL 满足性能需求

### D6: 重计算操作 — Electron Utility Process

**选择**：CPU 密集任务（向量索引、图谱计算）在 Electron Utility Process 中运行

**理由**：CEO 评审决策 D5 — 避免 UI 线程阻塞

### D7: 事件驱动架构

**选择**：模块间通过事件总线（AgentClawEvents）解耦

**理由**：6 大核心服务之间松耦合，事件溯源支持状态恢复

### D8: Worker 架构 — 单 Utility Process + 任务队列

**选择**：一个 Utility Process 处理所有重计算任务，内部任务队列调度

**理由**：避免多进程内存开销，个人应用不需要并行计算

## Risks / Trade-offs

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| pi-mono SDK API 不稳定 | 大量适配代码重写 | 封装层隔离变更，接口先于实现 |
| SQLite-vec 在 Windows 上编译问题 | Windows 构建失败 | 预编译二进制 + fallback 到纯 BM25 搜索 |
| 大知识图谱（> 10K 节点）D3.js 性能 | UI 卡顿 | WebGL 降级 + 虚拟化渲染 |
| Electron 打包体积过大（> 200MB） | 用户体验差 | Tree-shaking + 按需加载 + ASAR 压缩 |
| 多风格主题维护成本 | 4 倍 UI 测试工作量 | Token 系统统一 + 视觉回归测试 |
| 首次运行无 API Key | 用户流失 | 引导流程 + Ollama 本地方案 |
| D3.js 知识图谱无障碍访问 | 排障残障用户 | 列表视图作为完整替代 + aria-hidden |
