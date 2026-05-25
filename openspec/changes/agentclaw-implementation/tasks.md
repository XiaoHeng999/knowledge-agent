# AgentClaw Implementation Tasks

> 基于 agent-claw-v2.md (12 功能)、design-review-report.md (T1-T9)、after-review-plan.md (DT1-DT15) 综合产出
> 核心原则：细粒度、解耦、可独立验证、明确的依赖关系

---

## Phase 0: 设计规格补全（编码前必须完成）

> 在任何应用代码编写之前，补全评审识别的设计缺口。这些任务产出设计文档/规格，不产出代码。

### P0.1 错误/恢复规格（合并 T1 + DT2）

- [x] **P0.1.1** 编写 12 个功能的错误状态技术规格 — 为每个功能（F1-F12）定义错误状态、恢复路径、重试逻辑
- [x] **P0.1.2** 设计 TOP 5 错误场景 UI 线框图 — API 失败（对话中）、模型不可用、导入失败、数据库锁定、图谱渲染失败
- [x] **P0.1.3** 定义 Toast 组件规格 — 位置（右下角）、持续时间（成功 3s/错误 5s）、操作按钮（重试）
- **依赖**：无
- **验证**：每个功能有错误注册条目，5 个错误场景有线框图描述

### P0.2 测试策略（T2）

- [x] **P0.2.1** 编写单元测试策略 — 覆盖目标、框架选择（Vitest）、mock 策略
- [x] **P0.2.2** 编写集成测试策略 — 服务层集成、IPC 集成、数据库集成
- [x] **P0.2.3** 编写 E2E 测试策略 — Playwright + Spectron、关键用户流程覆盖
- **依赖**：无
- **验证**：测试策略文档包含框架、覆盖率目标、关键测试用例列表

### P0.3 Worker 架构规格（T3）

- [x] **P0.3.1** 设计 Electron Utility Process 架构图 — 进程间通信方式、任务队列模型
- [x] **P0.3.2** 定义 CPU/内存预算 — 向量索引、图谱计算、PDF 解析的资源限制
- [x] **P0.3.3** 指定 Worker 任务接口 — IWorkerTask 定义、进度报告机制、取消机制
- **依赖**：无
- **验证**：架构图 + 接口定义 + 资源预算表

### P0.4 主题 Token 系统（合并 T4 + DT7）

- [x] **P0.4.1** 定义 30 个规范 Token 集 — bg-primary, bg-secondary, text-primary, text-secondary, accent, border 等
- [x] **P0.4.2** 创建 4 种风格包到 Token 的映射 — Linear（默认）、Cursor、Notion、PostHog
- [x] **P0.4.3** 定义 Tokyo Night 默认值 — 作为无风格包时的 fallback
- [x] **P0.4.4** 设计运行时切换机制 — CSS 变量替换策略，即时生效无需重启
- **依赖**：无
- **验证**：30 个 Token 有定义值，4 个风格包有完整映射

### P0.5 数据库迁移系统（T5）

- [x] **P0.5.1** 设计迁移文件格式 — 版本号、UP/DOWN SQL、依赖声明
- [x] **P0.5.2** 设计迁移运行器 — 版本追踪表、执行顺序、回滚策略
- [x] **P0.5.3** 编写初始迁移脚本 — 14 张表的 CREATE TABLE 语句
- **依赖**：无
- **验证**：迁移系统可从空数据库创建完整 Schema，可回滚

### P0.6 首次运行引导流程（合并 T6 + DT1 + DT5）

- [x] **P0.6.1** 设计引导流程线框图 — 欢迎屏 → API Key 设置 → 创建首个领域 → 引导研究
- [x] **P0.6.2** 设计 7 个空状态场景 — 空收件箱、空领域、空时间线、空研究仪表盘、空专家对话、无 API Key（阻塞状态）、空知识列表
- [x] **P0.6.3** 设计领域预设模板 — "AI/ML"、"Web 开发"、"通用研究" 配置模板
- **依赖**：无
- **验证**：4 步引导流程有详细描述，7 个空状态有设计规格

### P0.7 日志与可观测性（T7）

- [x] **P0.7.1** 定义结构化日志格式 — JSON 格式、必填字段（timestamp, level, operation, duration, cost）
- [x] **P0.7.2** 设计按操作成本追踪 — API 调用成本、Token 用量、模型使用分布
- [x] **P0.7.3** 设计调试模式 — 详细日志开关、性能指标采集
- **依赖**：P0.3（Worker 架构影响日志采集方式）
- **验证**：日志格式定义 + 成本追踪 API + 调试模式规格

### P0.8 安全关卡规格（合并 T8 + DT13）

- [x] **P0.8.1** 定义自动化写入审核关卡 — Agent 写入前需要用户确认的场景列表
- [x] **P0.8.2** 设计 Diff 审核排队机制 — 右侧面板堆栈排队、输入区域"X 个待审核"徽标
- [x] **P0.8.3** 定义写入权限分级 — 自动通过（低风险）、需确认（中风险）、需明确批准（高风险）
- **依赖**：P0.1（错误规格定义后才能定义安全边界）
- **验证**：审核关卡场景列表 + Diff 排队交互规格 + 权限分级表

### P0.9 动画预设系统（DT4）

- [x] **P0.9.1** 定义 6-8 个标准动画预设 — fadeIn, slideUp, slideDown, scaleIn, fadeOut, collapse, expand, bounce
- [x] **P0.9.2** 为每个预设指定精确参数 — 持续时间、缓动函数、起始/结束状态
- [x] **P0.9.3** 定义 prefers-reduced-motion 降级方案 — 所有动画降级为即时状态变化
- **依赖**：无
- **验证**：每个预设可被 CSS/JS 直接引用，reduced-motion 有完整降级

### P0.10 骨架屏规格（DT6）

- [x] **P0.10.1** 为 9 个主视图指定骨架屏布局 — 仪表盘、知识列表、时间线、研究仪表盘、专家对话、收件箱、领域概览、知识图谱、设置页
- [x] **P0.10.2** 定义闪烁阈值 100ms — 低于此值不显示骨架屏
- [x] **P0.10.3** 定义超时状态（> 10s）— 超时提示文案和重试按钮
- **依赖**：无
- **验证**：每个视图有骨架屏占位形状描述 + 阈值 + 超时状态

### P0.11 无障碍交互模型（DT3）

- [x] **P0.11.1** 编写键盘导航流程 — Tab/Shift+Tab 顺序、焦点管理、Escape 行为
- [x] **P0.11.2** 编写 ARIA 规格表 — 每个自定义组件的 ARIA 属性（理解指示器、领域色点、命令面板等）
- [x] **P0.11.3** 编写焦点管理规格 — 面板打开/关闭焦点转移、模态焦点陷阱、命令面板焦点陷阱
- [x] **P0.11.4** 定义颜色对比度要求 — WCAG AA（正文 4.5:1，大文本 3:1）
- **依赖**：无
- **验证**：键盘流程图 + ARIA 属性表 + 焦点转移规则 + 对比度清单

### P0.12 命令面板键盘模型（DT8）

- [x] **P0.12.1** 定义命令面板完整键盘交互 — 上/下箭头、Tab 分组、Enter 执行、Escape 关闭
- [x] **P0.12.2** 定义搜索过滤规则 — 防抖 150ms、每类最多 5 个结果、"显示 N 更多"
- [x] **P0.12.3** 定义参数输入模式 — 参数提示 UI、Tab 补全、参数验证
- **依赖**：P0.11（无障碍规格是基础）
- **验证**：完整键盘交互矩阵 + 搜索行为规格 + 参数模式规格

### P0.13 树状对话交互规格（DT9）

- [x] **P0.13.1** 定义折叠/展开行为 — 默认状态（活跃分支展开，非活跃折叠）、最大可见深度 3 层
- [x] **P0.13.2** 定义分支导航机制 — 点击第一条消息 + 箭头键导航
- [x] **P0.13.3** 定义虚拟滚动规格 — 50 条消息后启用虚拟滚动
- [x] **P0.13.4** 定义"新分支"按钮行为 — 在当前深度创建同级分支
- **依赖**：P0.11（键盘导航是基础）
- **验证**：树状对话完整交互规格 + 虚拟滚动触发条件

### P0.14 右侧面板密度规格（DT10）

- [x] **P0.14.1** 定义每种内容类型的最小宽度 — Diff 预览 400px、节点详情 320px、事件详情 280px
- [x] **P0.14.2** 评估 Diff 预览是否改为模态覆盖层 — 比较面板 vs 模态的优劣
- [x] **P0.14.3** 定义面板拖拽边界 — 主内容区最小 640px
- **依赖**：无
- **验证**：最小宽度表 + Diff 模式决策 + 拖拽边界规格

### P0.15 组件精确规格升级（DT12）

- [x] **P0.15.1** 为 28 个组件库中每个组件创建精确规格表 — 排版、颜色、间距、边框、阴影、状态（hover/active/disabled）
- [x] **P0.15.2** 对齐风格包精度 — 每个组件规格需与 Linear 风格包的 14 级排版 + 30 个颜色 Token 对齐
- **依赖**：P0.4（Token 系统是基础）
- **验证**：28 个组件每个有可实现的规格表

### P0.16 其他设计规格

- [x] **P0.16.1** 定义领域理解分数可视化（DT11）— 仪表盘 + 领域概览中的进度环/渐变条
- [x] **P0.16.2** 定义知识图谱导出/导入格式（T9）— JSON 格式、版本号、兼容性
- [x] **P0.16.3** 添加高度断点 + 最小窗口规格（DT14）— 1024x768 最小、视口 < 700px 侧边栏最大高度
- [x] **P0.16.4** 重新设计仪表盘焦点层级（DT15）— 首行 60/40 分割、主统计 48px/Bold
- **依赖**：P0.4（Token 系统）、P0.15（组件规格）
- **验证**：各规格文档完成

---

## Phase 1: 基础骨架

> 搭建项目脚手架、数据库层、pi-mono 集成。所有后续功能的基础。

### 1.1 项目初始化

- [x] **1.1.1** 初始化 monorepo — 创建根 package.json、turbo.json、tsconfig.json（基座配置）、.gitignore、.eslintrc
- [x] **1.1.2** 初始化 Electron 主进程 — electron/main.ts（窗口创建、生命周期）、electron/preload.ts（contextBridge 暴露安全 API）
- [x] **1.1.3** 初始化 Next.js 15 前端 — next.config.ts（Turbopack + Electron 适配）、src/app/ 目录结构、globals.css（CSS 变量基座）
- [x] **1.1.4** 配置 electron-builder.yml — 三平台构建目标（macOS DMG arm64+x64、Windows NSIS+Portable x64、Linux AppImage+deb+rpm）
- [x] **1.1.5** 配置开发工具链 — dev 脚本（concurrently 运行 Next.js + Electron）、HMR 配置、TypeScript path aliases
- **依赖**：无
- **验证**：`npm run dev` 启动 Electron 窗口，显示 Next.js 渲染的空白页面

### 1.2 IPC 通信层

- [x] **1.2.1** 定义 IPC 通道类型 — `src/lib/ipc/channels.ts`，双向通道类型定义（invoke/handle 模式）
- [x] **1.2.2** 实现 IPC 桥接 — `electron/preload.ts` 暴露 `window.electronAPI`，类型安全的方法映射
- [x] **1.2.3** 实现 IPC Handler 基类 — `server/ipc/handler.ts`，统一错误处理、请求日志、超时管理
- [x] **1.2.4** 注册所有 IPC Handler — `server/ipc/register.ts`，Main 进程启动时注册所有 handler
- **依赖**：1.1
- **验证**：Renderer 调用 `window.electronAPI.ping()` 返回 "pong"

### 1.3 三栏布局框架

- [x] **1.3.1** 实现主布局组件 — `src/app/(main)/layout.tsx`，三栏自适应（侧边栏 + 主区域 + 右侧面板）
- [x] **1.3.2** 实现侧边栏组件 — `src/components/layout/sidebar.tsx`，领域导航、搜索入口、设置入口
- [x] **1.3.3** 实现右侧面板组件 — `src/components/layout/detail-panel.tsx`，可拖拽宽度（0-320px）、内容类型路由
- [x] **1.3.4** 实现标题栏组件 — `src/components/layout/titlebar.tsx`，36px 自定义无边框窗口标题栏（领域色点 + 名称 + 面包屑 + Cmd+K 提示 + 窗口控制）
- [x] **1.3.5** 实现状态栏组件 — `src/components/layout/statusbar.tsx`，28px 状态栏（模型名 + 费用 + 研究状态）
- [x] **1.3.6** 实现响应式断点 — < 900px（侧边栏折叠，右侧面板变覆盖层）、900-1200px（侧边栏 180px，面板 260px）、> 1200px（完整布局）
- **依赖**：1.1
- **验证**：三栏布局可拖拽调整、响应式断点正确切换

### 1.4 状态管理基座

- [x] **1.4.1** 实现 Zustand store 基类 — `src/stores/base.ts`，persist 中间件配置（SQLite 持久化）
- [x] **1.4.2** 实现应用全局 store — `src/stores/app-store.ts`，当前领域、当前视图、面板状态、主题
- [x] **1.4.3** 实现领域 store — `src/stores/domain-store.ts`，领域列表、当前领域、领域操作
- [x] **1.4.4** 实现 IPC 状态同步 Hook — `src/lib/hooks/use-ipc.ts`，封装 IPC 调用为 React Hook
- **依赖**：1.2
- **验证**：Store 可持久化到 SQLite，页面刷新后状态恢复

### 1.5 SQLite 数据库层

- [x] **1.5.1** 实现 Schema 定义 — `server/db/schema.ts`，14 张表的 TypeScript 类型定义 + SQL CREATE 语句
- [x] **1.5.2** 实现数据库连接管理 — `server/db/connection.ts`，单例连接、WAL 模式配置、连接池
- [x] **1.5.3** 实现迁移系统 — `server/db/migrations/`，迁移运行器（`runner.ts`）+ 版本追踪表 + 初始迁移脚本
- [x] **1.5.4** 实现 Repository 基类 — `server/db/repositories/base.ts`，泛型 CRUD 操作
- [x] **1.5.5** 实现 Domains Repository — `server/db/repositories/domains.ts`
- [x] **1.5.6** 实现 KnowledgeNodes Repository — `server/db/repositories/knowledge-nodes.ts`
- [x] **1.5.7** 实现 KnowledgeEdges Repository — `server/db/repositories/knowledge-edges.ts`
- [x] **1.5.8** 实现 Sources Repository — `server/db/repositories/sources.ts`
- [x] **1.5.9** 实现 TimelineEntries Repository — `server/db/repositories/timeline-entries.ts`
- [x] **1.5.10** 实现 ModelConfigs Repository — `server/db/repositories/model-configs.ts`
- [x] **1.5.11** 实现 ApiKeys Repository — `server/db/repositories/api-keys.ts`（含加密/解密逻辑）
- [x] **1.5.12** 实现 Inbox Repository — `server/db/repositories/inbox.ts`
- [x] **1.5.13** 实现 DecisionRecords Repository — `server/db/repositories/decision-records.ts`
- [x] **1.5.14** 实现向量索引层 — `server/db/vector.ts`，SQLite-vec 嵌入存储、向量搜索、索引管理
- **依赖**：1.2
- **验证**：迁移系统可创建完整 Schema，每个 Repository CRUD 测试通过

### 1.6 pi-mono SDK 集成

- [x] **1.6.1** 实现 pi-mono 核心初始化 — `server/pi-mono/core.ts`，AuthStorage + ModelRegistry + SessionManager + ResourceLoader 初始化
- [x] **1.6.2** 实现 Provider 注册模块 — `server/pi-mono/providers.ts`，9 个 Provider 注册（Anthropic, OpenAI, DeepSeek, Google, Groq, Ollama, OpenRouter, xAI, Mistral）
- [x] **1.6.3** 实现自定义工具 — `server/pi-mono/tools/domain-research.ts`（domain_research 工具）
- [x] **1.6.4** 实现自定义工具 — `server/pi-mono/tools/knowledge-write.ts`（knowledge_write 工具）
- [x] **1.6.5** 实现自定义工具 — `server/pi-mono/tools/timeline-analyze.ts`（timeline_analyze 工具）
- [x] **1.6.6** 实现扩展加载器 — `server/pi-mono/extensions/`，知识管理扩展 + 研究代理扩展 + 导入处理扩展
- [x] **1.6.7** 实现 pi-mono 封装层接口 — `server/services/pi-mono-wrapper.ts`，6 大核心接口（IModelManager, IAgentPool, IKnowledgeDB, ISkillEngine, IImportPipe, ISearchEngine）
- **依赖**：1.5
- **验证**：pi-mono 可初始化，Provider 可注册，自定义工具可被 Agent 调用

### 1.7 文件系统抽象层

- [x] **1.7.1** 实现 FileSystemProvider 接口 — `server/fs/provider.ts`，抽象文件读写操作
- [x] **1.7.2** 实现路径工具 — `server/fs/paths.ts`，跨平台路径处理（`app.getPath('userData')`）
- [x] **1.7.3** 实现领域目录管理器 — `server/fs/domain-dirs.ts`，领域目录结构创建/验证（config.yaml, skills/, tools/, prompts/, data/knowledge/, data/inbox/）
- [x] **1.7.4** 实现 Markdown 文件解析器 — `server/fs/markdown-parser.ts`，gray-matter 解析 YAML frontmatter
- **依赖**：1.1
- **验证**：领域目录可正确创建，Markdown 文件可解析出 frontmatter + content

---

## Phase 2: 基础功能层

> 在骨架上实现核心用户可见功能：模型管理、领域管理、版本控制、主题系统。

### 2.1 模型管理 UI（F9）

- [x] **2.1.1** 实现 ModelManager 服务 — `server/services/model-manager.ts`，API Key 导入/验证/加密存储、模型发现/列表、模型切换、领域默认模型
- [x] **2.1.2** 实现 ModelManager IPC Handler — `server/ipc/handlers/model-handler.ts`
- [x] **2.1.3** 实现模型管理设置页 — `src/app/(main)/settings/models/page.tsx`，API Key 管理表格 + 可用模型列表 + 领域默认模型配置
- [x] **2.1.4** 实现 API Key 导入对话框 — `src/components/settings/api-key-dialog.tsx`，Provider 选择 + Key 输入 + 验证状态 + 连接测试
- [x] **2.1.5** 实现模型列表组件 — `src/components/settings/model-list.tsx`，模型名 + Provider + 成本/m + 活跃状态星标
- [x] **2.1.6** 实现模型切换下拉 — `src/components/chat/model-switcher.tsx`，对话中模型切换（当前模型 + 备选列表 + 成本提示）
- [x] **2.1.7** 实现领域默认模型设置 — `src/components/settings/domain-model-config.tsx`，按领域配置 expert/research/summary 模型
- **依赖**：1.5, 1.6
- **验证**：可导入 API Key、查看可用模型、切换活跃模型、设置领域默认模型

### 2.2 领域管理（F6）

- [x] **2.2.1** 实现 DomainManager 服务 — `server/services/domain-manager.ts`，领域 CRUD、目录创建、配置解析、模型绑定
- [x] **2.2.2** 实现 DomainManager IPC Handler — `server/ipc/handlers/domain-handler.ts`
- [x] **2.2.3** 实现领域创建对话框 — `src/components/domain/create-domain-dialog.tsx`，名称 + 描述 + 颜色选择 + 图标选择 + 预设模板
- [x] **2.2.4** 实现领域列表组件 — `src/components/domain/domain-list.tsx`，侧边栏领域树（颜色标识 + 名称 + 知识节点数）
- [x] **2.2.5** 实现领域编辑页面 — `src/app/(main)/settings/domains/page.tsx`，领域配置编辑（模型、来源、框架、技能）
- [x] **2.2.6** 实现领域配置文件解析 — `server/services/domain-config.ts`，config.yaml 读写（模型、研究配置、框架、技能、标签）
- **依赖**：1.5, 1.7
- **验证**：可创建/编辑/删除领域，领域目录结构正确创建

### 2.3 安全版本控制（F11）

- [x] **2.3.1** 实现 VersionControl 服务 — `server/services/version-control.ts`，git 初始化、自动 commit、diff 生成、回滚
- [x] **2.3.2** 实现 pre-write 自动 commit 钩子 — Agent 写入操作前自动 `git add + git commit`
- [x] **2.3.3** 实现 Diff 可视化组件 — `src/components/diff/diff-viewer.tsx`，行级 diff 显示（新增/删除/修改高亮）
- [x] **2.3.4** 实现版本历史面板 — `src/components/diff/version-history.tsx`，commit 列表 + 点击查看 diff
- [x] **2.3.5** 实现一键回滚功能 — 选择历史版本 → 确认 → `git checkout` → 刷新
- [x] **2.3.6** 实现写入范围限制 — Agent 只能写入指定领域目录
- **依赖**：1.5, 1.7
- **验证**：AI 写入触发自动 commit，可查看 diff，可回滚到历史版本

### 2.4 主题系统

- [x] **2.4.1** 实现 CSS Token 变量系统 — `src/styles/tokens.css`，30 个规范 Token 定义
- [x] **2.4.2** 实现 Linear 风格包 — `src/styles/themes/linear.css`，30 个 Token 的 Linear 映射值（默认）
- [x] **2.4.3** 实现 Cursor 风格包 — `src/styles/themes/cursor.css`
- [x] **2.4.4** 实现 Notion 风格包 — `src/styles/themes/notion.css`
- [x] **2.4.5** 实现 PostHog 风格包 — `src/styles/themes/posthog.css`
- [x] **2.4.6** 实现主题切换器 — `src/lib/hooks/use-theme.ts`，运行时 CSS 变量替换，即时生效
- [x] **2.4.7** 实现外观设置页 — `src/app/(main)/settings/page.tsx`，风格选择器 + 预览
- **依赖**：1.3, P0.4（Token 系统规格）
- **验证**：可切换 4 种风格，切换后所有组件即时更新

### 2.5 首次运行引导流程

- [x] **2.5.1** 实现引导流程控制器 — `src/stores/onboarding-store.ts`，引导步骤状态管理
- [x] **2.5.2** 实现欢迎屏 — `src/components/onboarding/welcome-screen.tsx`，价值主张展示
- [x] **2.5.3** 实现 API Key 设置引导 — `src/components/onboarding/api-key-setup.tsx`，Provider 选择 + Key 输入 + 连接验证 + "免费试用"（Ollama 本地）选项
- [x] **2.5.4** 实现创建首个领域引导 — `src/components/onboarding/create-first-domain.tsx`，预设模板选择（AI/ML, Web 开发, 通用研究）
- [x] **2.5.5** 实现引导研究步骤 — `src/components/onboarding/guided-research.tsx`，触发首次研究并展示结果
- [x] **2.5.6** 实现"无 API Key"阻塞状态 — 全屏引导卡片，非普通空状态
- **依赖**：2.1, 2.2, P0.6（引导流程规格）
- **验证**：首次启动显示引导流程，完成后可正常使用应用

### 2.6 基础 UI 组件库

- [x] **2.6.1** 实现 Button 组件 — `src/components/ui/button.tsx`，primary/secondary/ghost/danger 变体 + loading 状态
- [x] **2.6.2** 实现 Input 组件 — `src/components/ui/input.tsx`，text/search/textarea 变体 + 验证状态
- [x] **2.6.3** 实现 Dialog 组件 — `src/components/ui/dialog.tsx`，模态 + 非模态 + 焦点陷阱
- [x] **2.6.4** 实现 Toast 组件 — `src/components/ui/toast.tsx`，成功/错误/警告 + 操作按钮（重试）+ 自动消失
- [x] **2.6.5** 实现 Tabs 组件 — `src/components/ui/tabs.tsx`
- [x] **2.6.6** 实现 SegmentedControl 组件 — `src/components/ui/segmented-control.tsx`，列表 | 图谱 视图切换
- [x] **2.6.7** 实现 Dropdown 组件 — `src/components/ui/dropdown.tsx`
- [x] **2.6.8** 实现 Skeleton 组件 — `src/components/ui/skeleton.tsx`，骨架屏占位（行/卡片/圆形/矩形）
- [x] **2.6.9** 实现 Badge 组件 — `src/components/ui/badge.tsx`
- [x] **2.6.10** 实现 Tooltip 组件 — `src/components/ui/tooltip.tsx`
- [x] **2.6.11** 实现 Progress 组件 — `src/components/ui/progress.tsx`，线性 + 环形
- [x] **2.6.12** 实现 EmptyState 组件 — `src/components/ui/empty-state.tsx`，温暖感文案 + 主操作按钮 + 上下文说明
- **依赖**：1.3, 2.4（主题系统）
- **验证**：每个组件在 4 种风格下渲染正确

---

## Phase 3: 核心智能层

> 实现知识存储、专家对话、搜索引擎等核心 AI 功能。

### 3.1 知识存储基础（F10 部分）

- [x] **3.1.1** 实现 KnowledgeGraph 服务 — `server/services/knowledge-graph.ts`，节点 CRUD、边 CRUD、图遍历、统计
- [x] **3.1.2** 实现 KnowledgeGraph IPC Handler — `server/ipc/handlers/knowledge-handler.ts`
- [x] **3.1.3** 实现知识列表视图 — `src/app/(main)/domain/page.tsx`，按领域分类的知识列表 + 搜索 + 筛选（类型/状态/理解度，query param ?id=xxx）
- [x] **3.1.4** 实现知识节点卡片 — `src/components/knowledge/knowledge-card.tsx`，标题 + 类型标签 + 理解指示器（0-5 圆点）+ 领域色 + 来源数
- [x] **3.1.5** 实现知识节点详情面板 — `src/components/knowledge/knowledge-detail.tsx`，右侧面板内容（标题 + Markdown 内容 + frontmatter + 理解度 + 相关节点 + 来源）
- [x] **3.1.6** 实现知识节点创建/编辑表单 — `src/components/knowledge/knowledge-form.tsx`
- [x] **3.1.7** 实现理解指示器组件 — `src/components/knowledge/comprehension-indicator.tsx`，0-5 圆点 + aria-label
- **依赖**：1.5, 1.6
- **验证**：可创建/查看/编辑/删除知识节点，列表视图按领域正确展示

### 3.2 知识图谱可视化（F10 部分）

- [x] **3.2.1** 实现 D3.js 力导向图基础 — `src/components/graph/force-graph.tsx`，节点（颜色=领域色，大小=连接数）+ 边（粗细=权重）+ 缩放 + 平移
- [x] **3.2.2** 实现节点交互 — 点击打开详情面板、悬停显示 tooltip、拖拽重新布局
- [x] **3.2.3** 实现 WebGL 降级 — `src/components/graph/webgl-graph.tsx`，> 1000 节点自动切换
- [x] **3.2.4** 实现图谱控制面板 — 缩放按钮、布局切换（力导向/分层/环形）、筛选（按领域/类型/理解度）
- [x] **3.2.5** 实现图谱 → 列表视图切换 — SegmentedControl 切换 + 平滑过渡动画
- [x] **3.2.6** 实现图谱无障碍降级 — aria-hidden + "使用列表视图进行键盘可访问浏览" 提示
- **依赖**：3.1, P0.11（无障碍规格）
- **验证**：图谱可缩放/平移/点击，> 1000 节点降级到 WebGL，列表视图可完全替代图谱

### 3.3 专家对话（F5 主动模式）

- [x] **3.3.1** 实现 AgentPool 服务 — `server/services/agent-pool.ts`，会话创建/销毁、会话池管理、模型绑定
- [x] **3.3.2** 实现 AgentPool IPC Handler — `server/ipc/handlers/agent-handler.ts`
- [x] **3.3.3** 实现对话界面容器 — `src/app/(main)/domain/[id]/chat/page.tsx`
- [x] **3.3.4** 实现消息列表组件 — `src/components/chat/message-list.tsx`，Markdown 渲染（marked）+ 代码高亮 + 流式输出
- [x] **3.3.5** 实现消息输入组件 — `src/components/chat/message-input.tsx`，多行输入 + 发送按钮 + 附件
- [x] **3.3.6** 实现树状会话分支 — `src/components/chat/conversation-tree.tsx`，分支显示 + 折叠/展开 + 分支导航（点击 + 箭头键）+ 虚拟滚动（> 50 条消息）
- [x] **3.3.7** 实现领域上下文自动加载 — 进入对话时加载领域 Warm 层数据作为 system prompt
- [x] **3.3.8** 实现流式响应处理 — pi-mono 流式输出 → IPC 流 → React 状态更新
- **依赖**：1.6, 2.1（模型管理）, P0.13（树状对话规格）
- **验证**：可发起对话、收到流式响应、创建/切换分支、领域上下文自动加载

### 3.4 斜杠命令框架

- [x] **3.4.1** 实现命令解析器 — `src/lib/commands/parser.ts`，识别 `/command [args]` 格式
- [x] **3.4.2** 实现命令注册表 — `src/lib/commands/registry.ts`，命令注册 + 参数定义 + 执行路由
- [x] **3.4.3** 实现内置命令 — `/daily`, `/deep-dive`, `/summarize`, `/timeline`, `/framework`, `/connect`, `/predict`, `/skill`, `/review`, `/import`
- [x] **3.4.4** 实现命令自动补全 — 输入 `/` 后弹出命令列表 + 参数提示
- **依赖**：3.3
- **验证**：输入 `/daily` 触发每日研究，输入 `/deep-dive transformer` 触发深度研究

### 3.5 混合搜索引擎

- [x] **3.5.1** 实现 SearchEngine 服务 — `server/services/search-engine.ts`
- [x] **3.5.2** 实现向量索引管道 — 新增/更新知识节点 → 生成 embedding → 存入 SQLite-vec
- [x] **3.5.3** 实现 BM25 全文搜索 — SQLite FTS5 虚拟表 + 全文索引
- [x] **3.5.4** 实现 RRF 融合排序 — 向量搜索结果 + 全文搜索结果 → 倒数排名融合
- [x] **3.5.5** 实现 SearchEngine IPC Handler — `server/ipc/handlers/search-handler.ts`
- [x] **3.5.6** 实现搜索 UI 组件 — `src/components/search/search-bar.tsx` + 结果列表
- **依赖**：1.5（向量索引层）, 3.1（知识节点）
- **验证**：搜索可返回向量 + 全文融合结果

### 3.6 收件箱处理（F5 被动模式）

- [x] **3.6.1** 实现 InboxProcessor 服务 — `server/services/inbox-processor.ts`，AI 摘要生成 + 领域分配
- [x] **3.6.2** 实现 InboxProcessor IPC Handler — `server/ipc/handlers/inbox-handler.ts`
- [x] **3.6.3** 实现收件箱列表视图 — `src/app/(main)/inbox/page.tsx`，待处理/已处理/已拒绝 筛选
- [x] **3.6.4** 实现收件箱项目卡片 — `src/components/inbox/inbox-item.tsx`，来源信息 + AI 摘要 + 确认/拒绝/编辑 操作
- [x] **3.6.5** 实现确认后存入领域流程 — 选择目标领域 → 创建知识节点 → 从收件箱移除
- [x] **3.6.6** 实现快速记录入口 — 侧边栏"快速记录"按钮 → 输入文本 → 进入 Inbox
- **依赖**：3.1, 3.3（AI 摘要通过 Agent 生成）
- **验证**：手动输入文本进入 Inbox，AI 生成摘要，确认后存入领域

### 3.7 Diff 审核与安全关卡

- [x] **3.7.1** 实现 Diff 生成服务 — `server/services/diff-service.ts`，比较新旧内容生成行级 diff
- [x] **3.7.2** 实现 Diff 审核队列 — 右侧面板堆栈排队（最新在顶部），输入区域"X 个待审核"徽标
- [x] **3.7.3** 实现 Diff 审核交互 — 接受/拒绝/编辑后接受 三个操作按钮
- [x] **3.7.4** 实现写入权限检查 — 中风险操作触发确认、高风险操作需要明确批准
- **依赖**：2.3（版本控制）, P0.8（安全关卡规格）
- **验证**：AI 写入触发 Diff 显示，用户可逐条审核，拒绝后写入不执行

---

## Phase 4: 自动化层

> 定时研究、导入管道、时间线、技能系统。

### 4.1 定时研究代理（F2）

- [x] **4.1.1** 实现 ResearchScheduler 服务 — `server/services/research-scheduler.ts`，cron 表达式解析 + 任务调度
- [x] **4.1.2** 实现研究代理执行器 — 基于 pi-mono AgentSession，使用廉价模型（DeepSeek-V3）执行研究
- [x] **4.1.3** 实现研究结果处理 — 研究输出 → AI 摘要 → 自动创建知识节点（直接入库，不经 Inbox）
- [x] **4.1.4** 实现研究来源配置 — 领域 config.yaml 中的 sources 配置解析
- [x] **4.1.5** 实现 ResearchScheduler IPC Handler — `server/ipc/handlers/research-handler.ts`
- [x] **4.1.6** 实现研究仪表盘 — `src/app/(main)/research/page.tsx`，每日研究摘要 + 研究历史时间线 + 成本追踪
- [x] **4.1.7** 实现研究触发组件 — 手动触发研究按钮 + 研究进度显示
- **依赖**：3.1, 3.3, 2.1
- **验证**：配置 cron 后研究自动执行，结果自动入库，仪表盘显示研究历史

### 4.2 导入管道（F8）

- [x] **4.2.1** 实现 ImportPipeline 服务 — `server/services/import-pipeline.ts`
- [x] **4.2.2** 实现 URL 导入器 — URL → 内容抓取（HTML → Markdown） → AI 摘要 → 来源追踪
- [x] **4.2.3** 实现 PDF 导入器 — PDF → 文本抽取 → AI 摘要 → 来源追踪
- [x] **4.2.4** 实现 RSS 订阅源轮询 — RSS feed 解析 + 新内容检测 + 自动导入
- [x] **4.2.5** 实现 ImportPipeline IPC Handler — `server/ipc/handlers/import-handler.ts`
- [x] **4.2.6** 实现导入 UI — `src/components/import/import-dialog.tsx`，URL/PDF 输入 + 进度显示 + 结果预览
- [x] **4.2.7** 实现导入失败处理 — 部分导入 + 错误报告 + 重试按钮
- **依赖**：3.6（导入结果进入 Inbox 或直接入库）
- **验证**：可导入 URL/PDF 内容，RSS 自动轮询新内容

### 4.3 框架分析（F3）

- [x] **4.3.1** 实现 FrameworkEngine 服务 — `server/services/framework-engine.ts`，分析框架定义 + 执行 + 结果生成
- [x] **4.3.2** 实现内置框架 — 技术就绪度（TRL）、竞争格局（Competitive Landscape）、炒作周期（Hype Cycle）
- [x] **4.3.3** 实现框架判断 → 知识节点 — 框架分析结果自动创建知识节点
- [x] **4.3.4** 实现 Decision Record 生成 — ADR-NNN-title.md 格式（上下文 + 决策 + 理由 + 预期结果）
- [x] **4.3.5** 实现历史决策检索 — 新分析时自动检索相关历史决策
- [x] **4.3.6** 实现领域摘要生成 — 定期摘要触发 + 三层记忆分层（Hot → Warm → Cold）
- [x] **4.3.7** 实现框架分析 UI — 框架选择 + 分析结果展示 + ADR 列表
- **依赖**：3.1, 3.3
- **验证**：可选择框架执行分析，结果生成知识节点 + Decision Record

### 4.4 时间线与预测（F4）

- [x] **4.4.1** 实现 TimelineEngine 服务 — `server/services/timeline-engine.ts`，时间线 CRUD + 趋势分析 + 预测生成
- [x] **4.4.2** 实现时间线条目管理 — 从知识节点提取时间事件 + 手动创建
- [x] **4.4.3** 实现趋势分析生成 — 基于时间线数据 + AI 分析生成趋势报告
- [x] **4.4.4** 实现预测生成 — 带置信度的预测 + 关联知识节点
- [x] **4.4.5** 实现预测准确率追踪 — 预测到期后自动对比实际结果
- [x] **4.4.6** 实现时间线视图 — `src/app/(main)/timeline/page.tsx`，垂直时间线 + 事件卡片 + 预测高亮
- [x] **4.4.7** 实现时间线筛选 — 按领域/日期范围/重要性筛选
- **依赖**：3.1, 3.3
- **验证**：可查看时间线、生成趋势分析、创建/追踪预测

### 4.5 技能系统（F7）

- [x] **4.5.1** 实现 SkillEngine 服务 — `server/services/skill-engine.ts`，SKILL.md 解析 + 注册 + 执行
- [x] **4.5.2** 实现技能执行沙箱 — 隔离执行环境 + 资源限制 + 超时控制
- [x] **4.5.3** 实现内置技能 — paper-summarizer, trend-analyzer, connection-finder, domain-expert
- [x] **4.5.4** 实现技能效果追踪 — 执行次数 + 成功率 + 用户评分
- [x] **4.5.5** 实现技能注册 UI — 设置页技能列表 + 启用/禁用 + 效果指标
- [x] **4.5.6** 实现领域专属技能加载 — 按领域 config.yaml 加载 skills/ 目录下的技能
- **依赖**：1.6, 3.3
- **验证**：可查看内置技能、执行技能、查看效果指标

---

## Phase 5: 打磨与发布

> 命令面板、无障碍、错误处理、跨平台构建。

### 5.1 命令面板（Cmd+K）

- [x] **5.1.1** 实现命令面板组件 — `src/components/cmd-palette/cmd-palette.tsx`，搜索 + 命令 + 导航 + 知识搜索
- [x] **5.1.2** 实现键盘交互模型 — 上/下箭头移动选中项、Tab 切换分组、Enter 执行、Escape 关闭
- [x] **5.1.3** 实现搜索过滤 — 防抖 150ms、按类别分组、每类最多 5 个结果
- [x] **5.1.4** 实现参数输入模式 — 命令需要参数时替换搜索输入为参数提示
- [x] **5.1.5** 实现焦点陷阱 — 打开时焦点移入面板，Escape 关闭后焦点返回触发元素
- **依赖**：3.5（搜索集成）, P0.12（键盘模型规格）
- **验证**：Cmd+K 打开面板，搜索过滤正确，键盘导航流畅

### 5.2 无障碍完善

- [x] **5.2.1** 添加 ARIA 属性 — 所有自定义组件添加 aria-label、aria-describedby、role
- [x] **5.2.2** 实现焦点管理 — 面板打开/关闭焦点转移、模态焦点陷阱
- [x] **5.2.3** 实现键盘导航 — Tab/Shift+Tab 全应用导航、跳过导航链接
- [x] **5.2.4** 实现 prefers-reduced-motion — 所有动画降级为即时状态变化
- [x] **5.2.5** 验证颜色对比度 — 所有文本-背景组合满足 WCAG AA
- [x] **5.2.6** 验证最小触控目标 — 所有交互元素 ≥ 32x32px
- **依赖**：P0.11（无障碍规格）, Phase 2-4（所有组件完成后统一审计）
- **验证**：无障碍审计通过

### 5.3 错误处理统一

- [ ] **5.3.1** 实现全局错误边界 — React ErrorBoundary + Electron 未捕获异常处理
- [ ] **5.3.2** 实现 TOP 5 错误 UI — API 失败（行内错误横幅）、模型不可用（断开状态）、导入失败（错误徽标）、数据库锁定（全局 Toast）、图谱渲染失败（列表视图降级）
- [ ] **5.3.3** 实现错误恢复服务 — 重试逻辑（指数退避）、降级策略、错误上报
- [ ] **5.3.4** 实现结构化日志服务 — `server/services/logger.ts`，JSON 格式 + 按操作成本追踪
- [ ] **5.3.5** 实现调试模式 — 详细日志开关 + 性能指标面板
- **依赖**：P0.1（错误规格）, Phase 2-4
- **验证**：模拟各错误场景，UI 正确显示错误状态和恢复选项

### 5.4 骨架屏与加载状态

- [ ] **5.4.1** 为 9 个主视图实现骨架屏 — 仪表盘、知识列表、时间线、研究仪表盘、对话、收件箱、领域概览、图谱、设置
- [ ] **5.4.2** 实现闪烁阈值控制 — 100ms 以下不显示骨架屏
- [ ] **5.4.3** 实现超时状态（> 10s）— 超时提示 + 重试按钮
- [ ] **5.4.4** 实现 pi-mono 首次启动状态 — 初始化 2-5 秒的加载动画
- **依赖**：P0.10（骨架屏规格）, Phase 2-4
- **验证**：每个视图有正确的骨架屏 → 内容 → 错误状态过渡

### 5.5 空状态完善

- [ ] **5.5.1** 实现 7 个空状态视图 — 空收件箱、空领域、空时间线、空研究仪表盘、空专家对话、无 API Key（全屏引导）、空知识列表
- [ ] **5.5.2** 每个"无 API Key"空状态为全屏引导卡片（非常规空状态）
- [ ] **5.5.3** 每个空状态包含：温暖感文案 + 主操作按钮 + 上下文说明
- **依赖**：P0.6（空状态设计）, Phase 2-4
- **验证**：每个视图在空数据时显示对应空状态

### 5.6 仪表盘优化

- [ ] **5.6.1** 实现仪表盘焦点层级 — 首行 60/40 分割（今日概览占 60%，收件箱 40%）
- [ ] **5.6.2** 实现领域理解分数可视化 — 仪表盘 + 领域概览中的进度环/渐变条
- [ ] **5.6.3** 实现仪表盘统计卡片 — 主统计 48px/Bold + 次要统计
- **依赖**：P0.15（组件规格）, P0.16（仪表盘设计）
- **验证**：仪表盘有明确视觉焦点，领域理解分数可视化

### 5.7 Utility Process 集成

- [ ] **5.7.1** 实现 Worker 进程启动 — Electron Utility Process 创建 + 通信通道
- [ ] **5.7.2** 实现向量索引 Worker — 将 embedding 生成和索引移入 Worker
- [ ] **5.7.3** 实现图谱计算 Worker — 力导向布局计算移入 Worker
- [ ] **5.7.4** 实现 PDF 解析 Worker — PDF 文本抽取移入 Worker
- [ ] **5.7.5** 实现 Worker 任务队列 — 优先级调度 + 进度报告 + 取消机制
- **依赖**：P0.3（Worker 架构规格）, Phase 3-4
- **验证**：CPU 密集操作不阻塞 UI 线程

### 5.8 跨平台构建

- [ ] **5.8.1** 配置 macOS 构建 — DMG (arm64 + x64) + hardenedRuntime + 代码签名
- [ ] **5.8.2** 配置 Windows 构建 — NSIS 安装器 + Portable 版本 + x64
- [ ] **5.8.3** 配置 Linux 构建 — AppImage + deb + rpm + x64
- [ ] **5.8.4** 实现路径抽象层验证 — `FileSystemProvider` 在三平台正确工作
- [ ] **5.8.5** 配置自动更新 — electron-updater + GitHub Releases
- [ ] **5.8.6** 三平台构建测试 — CI/CD 矩阵构建 + 手动测试
- **依赖**：Phase 1-4 完成
- **验证**：三平台构建成功，安装后可正常启动

### 5.9 性能优化

- [ ] **5.9.1** 大知识图谱虚拟化渲染 — > 1000 节点虚拟化 + WebGL 降级
- [ ] **5.9.2** 搜索性能优化 — 向量索引缓存 + 查询优化
- [ ] **5.9.3** Electron 打包体积优化 — Tree-shaking + 按需加载 + ASAR 压缩
- [ ] **5.9.4** 首屏加载优化 — 骨架屏 + 代码分割 + 预加载
- **依赖**：Phase 3-4
- **验证**：打包体积 < 200MB，首屏 < 3s，大图谱不卡顿

### 5.10 最终质量保障

- [ ] **5.10.1** 端到端流程测试 — 首次启动 → 引导 → 创建领域 → 对话 → 研究 → 查看知识图谱
- [ ] **5.10.2** 无障碍审计 — 键盘全流程导航、屏幕阅读器测试、对比度验证
- [ ] **5.10.3** 4 种风格全流程测试 — 每种风格下全部功能正常
- [ ] **5.10.4** 错误场景测试 — 模拟 API 失败、网络断开、数据库锁定、磁盘满
- [ ] **5.10.5** 用户文档 — README + 快速开始 + 功能说明 + FAQ
- [ ] **5.10.6** 开源准备 — LICENSE、CONTRIBUTING、GitHub Release 构建
- **依赖**：Phase 1-4 全部完成
- **验证**：全部功能在三平台、4 种风格下正常工作

---

## 任务统计

| Phase | 任务数 | 描述 |
|-------|--------|------|
| Phase 0: 设计规格补全 | 16 项（38 子任务） | 编码前必须完成 |
| Phase 1: 基础骨架 | 7 项（32 子任务） | 项目初始化 + 数据库 + pi-mono |
| Phase 2: 基础功能层 | 6 项（29 子任务） | 模型管理 + 领域 + 版本控制 + 主题 |
| Phase 3: 核心智能层 | 7 项（31 子任务） | 知识图谱 + 对话 + 搜索 + 收件箱 |
| Phase 4: 自动化层 | 5 项（25 子任务） | 研究 + 导入 + 框架 + 时间线 + 技能 |
| Phase 5: 打磨发布 | 10 项（32 子任务） | 命令面板 + 无障碍 + 错误处理 + 构建 |
| **总计** | **51 项（187 子任务）** | |

## 依赖关系图

```
Phase 0（设计规格）— 不阻塞编码但有 5 项被 Phase 1-5 依赖
   ↓
Phase 1（基础骨架）— 所有后续 Phase 的基础
   ↓
Phase 2（基础功能）— 依赖 Phase 1 的数据库和 pi-mono
   ↓
Phase 3（核心智能）— 依赖 Phase 2 的模型管理和领域管理
   ↓
Phase 4（自动化）— 依赖 Phase 3 的知识存储和对话系统
   ↓
Phase 5（打磨发布）— 依赖 Phase 1-4 全部完成
```

## 关键路径

```
P0.1/P0.2（错误+测试规格）
  → P0.3（Worker 架构）
    → P0.7（日志规格）
      → P0.8（安全关卡）

1.1（项目初始化）
  → 1.2（IPC）
    → 1.5（数据库）
      → 1.6（pi-mono）
        → 2.1（模型管理）
          → 3.3（专家对话）
            → 4.1（定时研究）
              → 5.8（跨平台构建）
```

## 并行执行建议

以下任务组可并行开发（无依赖关系）：

- Phase 0 中 P0.1 + P0.2 + P0.3 + P0.4 + P0.5 + P0.6 + P0.9 + P0.10 + P0.11 可全部并行
- Phase 1 中 1.3（布局）和 1.5（数据库）可并行
- Phase 2 中 2.3（版本控制）和 2.4（主题系统）可并行
- Phase 3 中 3.5（搜索）和 3.6（收件箱）可并行
- Phase 4 中 4.1（研究）和 4.4（时间线）可并行
- Phase 5 中 5.2（无障碍）和 5.7（Worker）和 5.8（构建）可并行
