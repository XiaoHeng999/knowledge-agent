## Why

AgentClaw 是一个基于 Electron + Next.js + pi-mono SDK 的桌面端 AI 知识管理应用，核心理念为"理解 > 检索"。经过 CEO 设计评审（7.5/10）和 UI/UX 设计评审（4/10 → 目标 8/10），已完成产品设计（12 个功能 F1-F12）和两轮评审反馈。现在需要将设计文档转化为可执行的开发任务，进入编码实施阶段。

## What Changes

**全新构建** — 从零开始实现 AgentClaw 桌面应用，包含：

- **基础架构层**：Electron + Next.js 15 项目脚手架、IPC 通信桥接、SQLite 数据库（14 张表）、SQLite-vec 向量索引
- **pi-mono SDK 集成**：AuthStorage（API Key 加密）、ModelRegistry（模型发现）、AgentSession（会话管理）、自定义工具和扩展
- **6 大核心服务**：ModelManager、AgentPool、KnowledgeGraph、SearchEngine、ResearchScheduler、ImportPipeline、SkillEngine
- **12 个功能模块**：F1 GUI 界面、F2 定时研究、F3 框架分析、F4 时间线预测、F5 双模式知识录入、F6 领域分类、F7 技能系统、F8 外部导入、F9 模型管理 UI、F10 知识图谱可视化、F11 安全版本控制、F12 跨平台构建
- **设计评审补全**：9 项 CEO 评审任务（T1-T9）+ 15 项设计评审任务（DT1-DT15），在编码前完成规格补全
- **4 套 UI 风格包**：Linear（默认）、Cursor、Notion、PostHog，基于 Token 的主题系统支持运行时切换
- **首次运行引导流程**：欢迎屏 → API Key 设置 → 创建首个领域 → 引导研究
- **完整无障碍支持**：键盘导航、ARIA 属性、焦点管理、颜色对比度、减少动效降级

## Capabilities

### New Capabilities

- `electron-scaffold`: Electron + Next.js 15 项目初始化，三栏自适应布局，IPC 通信桥接，preload 安全桥接，窗口管理
- `database-layer`: SQLite 数据库层 — 14 张表 Schema 定义、migration 系统（版本追踪 + 回滚）、SQLite-vec 向量索引、Repository CRUD 层
- `pi-mono-integration`: pi-mono SDK 集成 — AuthStorage 初始化、ModelRegistry 配置、Provider 注册（9 个 Provider）、自定义工具定义、扩展加载
- `model-management`: 模型管理 UI（F9）— API Key 导入/加密存储、模型列表与状态显示、运行时模型切换、领域默认模型配置
- `domain-management`: 领域管理（F6）— 领域创建/编辑/删除、插件式领域目录结构、config.yaml 配置、领域色和图标
- `version-control`: 安全版本控制（F11）— 自动 git 初始化、pre-write 自动 commit、diff 可视化组件、一键回滚
- `knowledge-storage`: 知识存储基础（F10）— Markdown 知识文件格式、YAML frontmatter 解析、按领域分类的知识列表视图
- `expert-chat`: 专家对话（F5 主动模式）— 树状会话 UI、pi-mono agent session 集成、领域上下文自动加载、斜杠命令框架
- `hybrid-search`: 混合搜索引擎 — SQLite-vec 向量搜索、BM25 全文搜索、RRF 融合排序
- `inbox-processing`: 收件箱处理（F5 被动模式）— Inbox 界面、AI 摘要生成、用户确认后存入领域
- `framework-analysis`: 框架分析（F3）— 分析框架引擎、框架判断 → 知识节点、Decision Record 生成、领域摘要生成
- `research-agent`: 定时研究代理（F2）— 研究调度器（cron）、领域来源配置、研究代理会话、研究结果自动入库、研究仪表盘
- `import-pipeline`: 导入管道（F8）— URL 导入 + 内容提取、PDF 导入 + 文本抽取、RSS 订阅源、导入 → AI 摘要 → 知识图谱
- `timeline-prediction`: 时间线与预测（F4）— 领域时间线组件、趋势分析生成、预测生成（带置信度）、预测准确率追踪
- `skill-system`: 技能系统（F7）— SKILL.md 加载和执行、内置技能（paper-summarizer, trend-analyzer, connection-finder）、技能注册界面
- `theme-system`: 多风格主题系统 — 规范 Token 集（30 个）、4 种风格包映射、Linear 默认值、运行时切换
- `onboarding`: 首次运行引导流程 — 欢迎屏、API Key 设置、创建首个领域、引导研究
- `error-recovery`: 错误处理与恢复 — 12 个功能错误/恢复规格、TOP 5 错误 UI 状态、Toast 组件、结构化日志
- `accessibility`: 无障碍交互模型 — 键盘导航流程、ARIA 规格、焦点管理、颜色对比度 WCAG AA、prefers-reduced-motion 降级
- `cross-platform`: 跨平台构建（F12）— macOS（arm64 + x64）、Windows（NSIS + Portable）、Linux（AppImage + deb + rpm）、自动更新
- `design-specs`: 设计规格补全 — 动画预设系统、骨架屏规格、空状态线框图、命令面板键盘模型、树状对话交互规格、右侧面板密度规格

### Modified Capabilities

（全新项目，无现有 capabilities 需修改）

## Impact

- **技术栈**：Electron 33 + Next.js 15 + React 19 + TypeScript 5.5 + pi-mono SDK 0.73 + SQLite (better-sqlite3) + SQLite-vec + D3.js + Zustand 5
- **运行时依赖**：Node.js、Git（版本控制功能）、Ollama（可选本地模型）
- **安全影响**：API Key 使用 Electron safeStorage 加密存储，不明文写入磁盘
- **平台影响**：macOS + Windows + Linux 三平台桌面应用
- **数据存储**：本地 SQLite 单文件数据库 + Markdown 知识文件 + Git 仓库
