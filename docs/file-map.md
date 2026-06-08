# AgentClaw 文件索引

> AI 辅助开发时优先查阅此文件定位目标代码，避免全局搜索浪费 token。

## 项目结构

```
agentclaw/
├── electron/                     # Electron 主进程
│   ├── main.ts                   # 主进程入口（app 生命周期、数据库初始化、IPC 注册）
│   ├── preload.ts                # contextBridge 暴露类型安全的 IPC API
│   └── window.ts                 # BrowserWindow 创建与管理
│
├── src/                          # 渲染进程（Next.js）
│   ├── app/                      # Next.js App Router 页面
│   │   ├── layout.tsx            # 根布局
│   │   ├── error.tsx             # 全局错误边界页面（5.3）
│   │   └── (main)/               # 主布局路由组
│   │       ├── layout.tsx        # 三栏布局（侧边栏 + 主内容 + 详情面板）
│   │       ├── page.tsx          # 首页
│   │       ├── domain/           # 领域知识页
│   │       │   ├── page.tsx      # 领域知识列表（?id=xxx 查询参数）
│   │       │   ├── graph/
│   │       │   │   └── page.tsx  # 知识图谱可视化（?id=xxx 查询参数）
│   │       │   └── [id]/chat/
│   │       │       └── page.tsx  # 专家对话页（动态路由）
│   │       ├── inbox/
│   │       │   └── page.tsx      # 收件箱列表（待处理/已处理/已拒绝筛选）
│   │       ├── research/
│   │       │   └── page.tsx      # 研究仪表盘（每日摘要 + 历史时间线 + 成本追踪）
│   │       ├── framework/
│   │       │   └── page.tsx      # 框架分析页（框架选择 + 结果列表 + ADR + 领域摘要）
│   │       ├── timeline/
│   │       │   └── page.tsx      # 时间线与预测页（垂直时间线 + 预测卡片 + 趋势分析 + 筛选）
│   │       └── settings/         # 设置页
│   │           ├── page.tsx      # 设置主页
│   │           ├── models/       # 模型管理
│   │           ├── domains/      # 域管理
│   │           └── skills/       # 技能管理（4.5）
│   │
│   ├── components/
│   │   ├── layout/               # 布局组件
│   │   │   ├── sidebar.tsx       # 侧边栏（导航、域切换、折叠）
│   │   │   ├── titlebar.tsx      # 自定义标题栏
│   │   │   ├── statusbar.tsx     # 底部状态栏
│   │   │   ├── detail-panel.tsx  # 右侧详情面板
│   │   │   └── layout-context.tsx # 布局状态 Context
│   │   │
│   │   ├── ui/                   # 基础 UI 组件库
│   │   │   ├── index.ts          # 统一导出（Button, Input, Dialog, Toast, Tabs, ...）
│   │   │   ├── skeleton.tsx      # 骨架屏基元组件（Skeleton, SkeletonCircle, SkeletonLine 等）
│   │   │   ├── loading-timeout.tsx # 加载超时状态组件（超时提示 + 重试/取消）
│   │   │   └── launch-loader.tsx # 首次启动加载动画
│   │   │
│   │   ├── skeleton/             # 骨架屏视图组件
│   │   │   ├── view-skeletons.tsx # 9 个视图级骨架屏组件
│   │   │   └── view-loading.tsx  # ViewLoadingState 包装器 + 视图超时消息配置
│   │   │
│   │   ├── settings/             # 设置相关组件
│   │   │   ├── api-key-dialog.tsx
│   │   │   ├── model-list.tsx
│   │   │   └── domain-model-config.tsx
│   │   │
│   │   ├── domain/               # 域管理组件
│   │   │   ├── domain-list.tsx
│   │   │   └── create-domain-dialog.tsx
│   │   │
│   │   ├── cmd-palette/          # 命令面板组件（5.1）
│   │   │   ├── cmd-palette.tsx   # 主命令面板（搜索+命令+导航+知识搜索）
│   │   │   ├── search.ts         # 模糊匹配算法
│   │   │   ├── types.ts          # 类型定义
│   │   │   ├── result-list.tsx   # 分组结果列表
│   │   │   ├── result-group.tsx  # 单分组（header+items）
│   │   │   ├── result-item.tsx   # 单个结果项
│   │   │   ├── parameter-input.tsx # 参数输入模式
│   │   │   └── empty-state.tsx   # 无结果状态
│   │   │
│   │   ├── chat/                 # 对话组件
│   │   │   ├── model-switcher.tsx        # 模型切换下拉
│   │   │   ├── message-list.tsx         # 消息列表（Markdown + 流式）
│   │   │   ├── message-input.tsx        # 多行输入 + 斜杠命令支持 + 发送/中止
│   │   │   ├── command-autocomplete.tsx # 斜杠命令自动补全弹窗
│   │   │   └── conversation-tree.tsx    # 树状会话（分支 + 折叠 + 虚拟滚动）
│   │   │
│   │   ├── knowledge/            # 知识组件
│   │   │   ├── knowledge-card.tsx        # 知识节点卡片
│   │   │   ├── knowledge-detail.tsx      # 知识详情面板
│   │   │   ├── knowledge-form.tsx        # 知识创建/编辑表单
│   │   │   ├── comprehension-indicator.tsx # 理解度指示器（0-5 圆点）
│   │   │   └── comprehension-ring.tsx     # 理解度进度环（SVG，仪表盘用）
│   │   │
│   │   ├── graph/                # 知识图谱可视化
│   │   │   ├── force-graph.tsx           # D3.js 力导向图
│   │   │   ├── webgl-graph.tsx           # WebGL 降级（>1000 节点）
│   │   │   ├── graph-controls.tsx        # 图谱控制面板（布局/筛选）
│   │   │   └── graph-view.tsx            # 图谱/列表视图切换容器
│   │   │
│   │   ├── search/               # 混合搜索引擎
│   │   │   ├── search-bar.tsx            # 搜索栏 + 下拉结果
│   │   │   └── search-results.tsx        # 搜索结果列表 + 高亮
│   │   │
│   │   ├── inbox/                # 收件箱组件
│   │   │   ├── inbox-item.tsx            # 收件箱项目卡片（来源+摘要+确认/拒绝/编辑）
│   │   │   └── quick-record-dialog.tsx   # 快速记录对话框
│   │   │
│   │   ├── security/              # 安全审核组件
│   │   │   ├── diff-review-card.tsx      # 单个 diff 审核卡片
│   │   │   ├── diff-review-stack.tsx     # 待审核 diff 堆栈列表
│   │   │   ├── edit-and-apply.tsx        # 编辑后应用编辑器
│   │   │   ├── approve-confirm.tsx       # 高风险操作确认（输入 APPROVE）
│   │   │   └── pending-badge.tsx         # 输入区域待审核徽标
│   │   │
│   │   ├── framework/             # 框架分析组件（4.3）
│   │   │   ├── framework-result-card.tsx  # 分析结果卡片（展开/折叠）
│   │   │   ├── decision-record-card.tsx   # ADR 决策记录卡片
│   │   │   ├── domain-summary-panel.tsx   # 领域摘要面板
│   │   │   └── memory-layer-bar.tsx       # 三层记忆可视化条
│   │   ├── import/               # 导入管道组件（4.2）
│   │   │   ├── import-dialog.tsx        # 导入对话框（URL/PDF/RSS + 进度 + 结果预览）
│   │   │   └── import-history.tsx       # 导入历史列表（重试/取消）
│   │   ├── timeline/              # 时间线与预测组件（4.4）
│   │   │   └── timeline-event-card.tsx  # 时间线事件卡片 + 预测卡片 + 趋势分析 + 准确率面板
│   │   ├── diff/                 # 版本对比组件
│   │   │   ├── diff-viewer.tsx
│   │   │   └── version-history.tsx
│   │   │
│   │   └── onboarding/           # 首次使用引导
│   │       ├── onboarding-overlay.tsx  # 引导流程总控
│   │       ├── welcome-screen.tsx
│   │       ├── api-key-setup.tsx
│   │       ├── create-first-domain.tsx
│   │       ├── guided-research.tsx
│   │       └── no-api-key-blocker.tsx
│   │
│   │   ├── error/                # 错误处理组件（5.3）
│   │   │   ├── error-boundary.tsx      # React 错误边界（捕获渲染异常）
│   │   │   └── error-banner.tsx        # 通用错误横幅（error/warning/info 三种变体）
│   │   │
│   │   └── debug/                 # 调试组件（5.3）
│   │       └── debug-panel.tsx         # 调试面板（日志 + 错误 + 性能指标）
│   │
│   │   └── update/                 # 自动更新组件（5.8）
│   │       └── update-notification.tsx  # 更新通知（下载提示 + 进度 + 重启）
│   │
│   ├── stores/                   # Zustand 状态管理
│   │   ├── base.ts               # persistedStorage 基础设施
│   │   ├── app-store.ts          # 全局应用状态（视图、侧边栏、主题）
│   │   ├── model-store.ts        # 模型与 Provider 状态
│   │   ├── domain-store.ts       # 域列表与当前域状态
│   │   ├── knowledge-store.ts    # 知识节点/边状态
│   │   ├── chat-store.ts         # 对话、消息、流式状态
│   │   ├── onboarding-store.ts   # 引导流程状态
│   │   ├── security-store.ts     # 安全审核状态（待审核队列）
│   │   ├── research-store.ts     # 研究仪表盘状态（4.1）
│   │   ├── import-store.ts       # 导入管道状态（4.2）
│   │   └── framework-store.ts    # 框架分析状态（4.3）
│   │   └── timeline-store.ts     # 时间线与预测状态（4.4）
│   │   └── skill-store.ts        # 技能系统状态（4.5）
│   │
│   ├── lib/
│   │   ├── error/               # 错误处理基础设施（5.3）
│   │   │   ├── index.ts              # 统一导出
│   │   │   ├── error-registry.ts     # 错误注册表（43 个结构化错误定义）
│   │   │   └── error-recovery.ts     # 错误恢复（重试退避 + 错误 store + 日志 store）
│   │   ├── ipc/
│   │   │   └── channels.ts       # IPC 通道注册表（类型安全的 channel 定义）
│   │   ├── hooks/
│   │   │   ├── use-ipc.ts        # IPC 调用 hook
│   │   │   ├── use-theme.ts      # 主题切换 hook
│   │   │   ├── use-focus-trap.ts # 焦点陷阱与焦点转移 hook
│   │   │   ├── use-route-focus.ts # 路由切换焦点管理 hook
│   │   │   ├── use-security-gate.ts # 安全网关 hook（审核/生成 diff）
│   │   │   └── use-skeleton.ts    # 加载状态 hook（闪烁阈值 + 超时控制）
│   │   ├── platform.ts           # 跨平台工具（平台检测、修饰键判断）（5.8）
│   │   └── commands/
│   │       ├── index.ts           # 统一导出 + builtins 自动注册
│   │       ├── types.ts           # 命令类型定义（CommandDefinition, ParsedCommand 等）
│   │       ├── parser.ts          # 命令解析器（识别 /command [args] 格式）
│   │       ├── registry.ts        # 命令注册表（注册、查找、执行路由）
│   │       └── builtins.ts        # 10 个内置斜杠命令
│   │
│   ├── styles/
│   │   ├── tokens.css            # 设计 token（颜色、间距、圆角变量）
│   │   └── themes/               # 主题 CSS
│   │       ├── notion.css
│   │       ├── linear.css
│   │       ├── cursor.css
│   │       └── posthog.css
│   │
│   └── types/
│       └── electron.d.ts         # Electron API 类型声明
│
├── server/                       # Electron 主进程服务端逻辑
│   ├── db/                       # SQLite 数据库层
│   │   ├── index.ts              # 数据库初始化/关闭入口
│   │   ├── connection.ts         # 连接管理
│   │   ├── schema.ts             # 表结构定义
│   │   ├── vector.ts             # 向量存储
│   │   ├── migrations/           # 数据库迁移
│   │   │   ├── 001_initial_schema.ts
│   │   │   ├── 002_skill_executions.ts
│   │   │   ├── index.ts         # 迁移 barrel 导出
│   │   │   ├── runner.ts         # 迁移执行器
│   │   │   └── types.ts
│   │   └── repositories/         # 数据访问层
│   │       ├── base.ts           # Repository 基类
│   │       ├── domains.ts        # 域 CRUD
│   │       ├── api-keys.ts       # API Key 存储
│   │       ├── model-configs.ts  # 模型配置
│   │       ├── inbox.ts          # 收件箱
│   │       ├── inbox-items.ts    # 收件箱条目
│   │       ├── knowledge-nodes.ts # 知识节点
│   │       ├── knowledge-edges.ts # 知识边
│   │       ├── decision-records.ts # 决策记录
│   │       ├── conversations.ts   # 对话 CRUD
│   │       ├── messages.ts        # 消息 CRUD（树结构查询）
│   │       ├── research-runs.ts   # 研究运行 CRUD（4.1）
│   │       ├── imports.ts          # 导入记录 CRUD（4.2）
│   │       ├── framework-results.ts # 框架分析结果 CRUD（4.3）
│   │       ├── predictions.ts      # 预测 CRUD（4.4）
│   │       └── skills.ts           # 技能 CRUD（4.5）
│   │
│   ├── fs/                       # 文件系统抽象层
│   │   ├── index.ts              # 文件系统入口
│   │   ├── paths.ts              # 路径管理（跨平台：app.getPath('userData') + path.join）
│   │   ├── provider.ts           # 文件系统 Provider（跨平台文件操作抽象）
│   │   ├── domain-dirs.ts        # 域目录管理
│   │   └── markdown-parser.ts    # Markdown 解析器
│   ├── lib/                      # 服务端共享工具
│   │   ├── lru-cache.ts          # LRU 缓存（搜索结果、嵌入缓存）
│   │   └── model-resolver.ts     # 模型 ID 解析与成本估算
│   │
│   ├── ipc/                      # IPC Handler（主进程端）
│   │   ├── register.ts           # 注册所有 handler
│   │   ├── handler.ts            # handler 基础设施
│   │   └── handlers/             # 各模块 handler
│   │       ├── domain-handler.ts
│   │       ├── model-handler.ts
│   │       ├── knowledge-handler.ts
│   │       ├── chat-handler.ts          # 对话 IPC handler
│   │       ├── search-handler.ts        # 搜索 IPC handler（混合搜索）
│   │       ├── inbox-handler.ts         # 收件箱 IPC handler
│   │       ├── research-handler.ts      # 研究 IPC handler（4.1）
│   │       ├── import-handler.ts        # 导入管道 IPC handler（4.2）
│   │       ├── framework-handler.ts     # 框架分析 IPC handler（4.3）
│       ├── timeline-handler.ts      # 时间线与预测 IPC handler（4.4）
│       ├── skill-handler.ts         # 技能系统 IPC handler（4.5）
│   │       ├── security-handler.ts
│   │       └── version-control-handler.ts
│   │
│   ├── pi-mono/                  # Pi Mono SDK 集成（Agent 核心）
│   │   ├── index.ts              # 导出入口
│   │   ├── core.ts               # SDK 核心封装
│   │   ├── instance.ts           # 实例管理
│   │   ├── providers.ts          # LLM Provider 配置
│   │   ├── tools/                # Agent 工具
│   │   │   ├── domain-research.ts
│   │   │   ├── knowledge-write.ts
│   │   │   └── timeline-analyze.ts
│   │   └── extensions/           # Agent 扩展
│   │       ├── import-agent-extension.ts
│   │       ├── research-agent-extension.ts
│   │       ├── knowledge-tools-extension.ts
│   │       └── session-context.ts  # 会话上下文（领域信息注入）
│   │
│   ├── worker/                    # Utility Process Worker（5.7）
│   │   ├── types.ts               # 消息协议、任务类型、payload/result 接口
│   │   ├── task-queue.ts          # 优先级队列（HIGH/NORMAL/LOW, FIFO, 100 max）
│   │   ├── worker-process.ts      # Utility Process 入口（接收任务、执行、返回结果）
│   │   ├── worker-bridge.ts       # 主进程桥接（submit/cancel/progress, 生命周期管理）
│   │   └── tasks/                 # 任务处理器
│   │       ├── embedding-task.ts  # EMBEDDING_GENERATION + BATCH_EMBEDDINGS
│   │       ├── vector-index-task.ts # VECTOR_INDEX_BUILD
│   │       ├── graph-layout-task.ts # GRAPH_LAYOUT_COMPUTE（力导向布局）
│   │       └── pdf-parse-task.ts   # PDF_TEXT_EXTRACT
│   │
│   └── services/                 # 业务服务层
│       ├── domain-manager.ts     # 域管理服务
│       ├── domain-config.ts      # 域配置服务
│       ├── model-manager.ts      # 模型管理服务
│       ├── knowledge-graph.ts    # 知识图谱服务（节点/边 CRUD、图遍历）
│       ├── conversation-service.ts # 对话服务（会话管理、流式响应、领域上下文）
│       ├── search-engine.ts      # 混合搜索引擎（向量 + BM25 + RRF）
│       ├── inbox-processor.ts    # 收件箱处理（AI 摘要 + 领域建议 + 确认/拒绝）
│       ├── research-scheduler.ts # 定时研究调度器（4.1：cron 调度 + Agent 执行 + 结果入库）
│       ├── import-pipeline.ts    # 导入管道（4.2：URL/PDF/RSS 导入 + AI 摘要 + 来源追踪）
│       ├── framework-engine.ts   # 框架分析引擎（4.3：内置框架 + ADR + 三层记忆 + 领域摘要）
│       ├── timeline-engine.ts    # 时间线引擎（4.4：时间线CRUD + 趋势分析 + 预测生成 + 准确率追踪）
│       ├── skill-engine.ts       # 技能引擎（4.5：SKILL.md解析 + 注册 + 执行 + 沙箱 + 效果追踪）
│       ├── embedding-service.ts  # 嵌入向量生成服务
│       ├── version-control.ts    # 版本控制服务
│       ├── diff-service.ts       # Diff 生成服务（行级内容比较）
│       ├── security-gate.ts      # 安全网关（风险评估 + 审核队列）
│       ├── pi-mono-wrapper.ts    # Pi Mono 服务包装
│       └── logger.ts             # 结构化日志服务（5.3：JSON 格式 + 操作成本追踪）
│       └── auto-updater.ts       # 自动更新服务（5.8：electron-updater + GitHub Releases）

├── resources/                    # 内置资源
│   └── skills/                   # 内置技能定义（4.5）
│       ├── paper-summarizer/     # 论文摘要技能
│       ├── trend-analyzer/       # 趋势分析技能
│       ├── connection-finder/    # 跨域连接发现技能
│       └── domain-expert/        # 领域专家问答技能

├── docs/                         # 文档
│   ├── projection_design_planning/  # 设计规划文档（按需查阅）
│   ├── design-UI-UX-reuslt/        # UI/UX 设计参考
│   ├── history/                     # 开发历史记录
│   ├── reference/                   # 技术参考文档
│   └── risk/                        # 风险分析文档
│
└── openspec/                     # OpenSpec 任务与变更管理
```

## 关键文件速查

| 场景 | 文件 |
|---|---|
| 加新页面 | `src/app/(main)/<route>/page.tsx` |
| 加新布局组件 | `src/components/layout/<name>.tsx` |
| 加新 UI 组件 | `src/components/ui/<name>.tsx` + 更新 `index.ts` 导出 |
| 加新状态 | `src/stores/<name>-store.ts` |
| 加新 IPC 通道 | `src/lib/ipc/channels.ts` 定义 → `electron/preload.ts` 暴露 → `server/ipc/handlers/` 实现 → `server/ipc/register.ts` 注册 |`
| 加新数据库表 | `server/db/schema.ts` 定义 → `server/db/migrations/` 迁移 → `server/db/repositories/` 数据访问 |
| 加新 Agent 工具 | `server/pi-mono/tools/<name>.ts` → `server/pi-mono/extensions/` 注册扩展 |
| 修改主题/样式 | `src/styles/tokens.css`（变量）或 `src/styles/themes/<name>.css` |
| 修改侧边栏 | `src/components/layout/sidebar.tsx` |
| 修改引导流程 | `src/components/onboarding/onboarding-overlay.tsx` + `src/stores/onboarding-store.ts` |

## IPC 通信链路

```
渲染进程                          主进程
─────────                        ──────
useIpc('channel', params)
  → preload.ts (contextBridge)
    → ipcRenderer.invoke()
      ──── IPC ────→
                        register.ts → handler.ts → handlers/<module>-handler.ts
                                                          ↓
                                                    services/<module>.ts
                                                          ↓
                                                    db/repositories/<name>.ts
```
