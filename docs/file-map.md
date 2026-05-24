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
│   │   └── (main)/               # 主布局路由组
│   │       ├── layout.tsx        # 三栏布局（侧边栏 + 主内容 + 详情面板）
│   │       ├── page.tsx          # 首页
│   │       ├── domain/           # 领域知识页
│   │       │   ├── page.tsx      # 领域知识列表（?id=xxx 查询参数）
│   │       │   ├── graph/
│   │       │   │   └── page.tsx  # 知识图谱可视化（?id=xxx 查询参数）
│   │       │   └── [id]/chat/
│   │       │       └── page.tsx  # 专家对话页（动态路由）
│   │       └── settings/         # 设置页
│   │           ├── page.tsx      # 设置主页
│   │           ├── models/       # 模型管理
│   │           └── domains/      # 域管理
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
│   │   │   └── index.ts          # 统一导出（Button, Input, Dialog, Toast, Tabs, ...）
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
│   │   │   └── comprehension-indicator.tsx # 理解度指示器（0-5 圆点）
│   │   │
│   │   ├── graph/                # 知识图谱可视化
│   │   │   ├── force-graph.tsx           # D3.js 力导向图
│   │   │   ├── webgl-graph.tsx           # WebGL 降级（>1000 节点）
│   │   │   ├── graph-controls.tsx        # 图谱控制面板（布局/筛选）
│   │   │   └── graph-view.tsx            # 图谱/列表视图切换容器
│   │   │
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
│   ├── stores/                   # Zustand 状态管理
│   │   ├── base.ts               # persistedStorage 基础设施
│   │   ├── app-store.ts          # 全局应用状态（视图、侧边栏、主题）
│   │   ├── model-store.ts        # 模型与 Provider 状态
│   │   ├── domain-store.ts       # 域列表与当前域状态
│   │   ├── knowledge-store.ts    # 知识节点/边状态
│   │   ├── chat-store.ts         # 对话、消息、流式状态
│   │   └── onboarding-store.ts   # 引导流程状态
│   │
│   ├── lib/
│   │   ├── ipc/
│   │   │   └── channels.ts       # IPC 通道注册表（类型安全的 channel 定义）
│   │   ├── hooks/
│   │   │   ├── use-ipc.ts        # IPC 调用 hook
│   │   │   └── use-theme.ts      # 主题切换 hook
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
│   │   │   ├── runner.ts         # 迁移执行器
│   │   │   └── types.ts
│   │   └── repositories/         # 数据访问层
│   │       ├── base.ts           # Repository 基类
│   │       ├── domains.ts        # 域 CRUD
│   │       ├── api-keys.ts       # API Key 存储
│   │       ├── model-configs.ts  # 模型配置
│   │       ├── sources.ts        # 知识源
│   │       ├── inbox.ts          # 收件箱
│   │       ├── knowledge-nodes.ts # 知识节点
│   │       ├── knowledge-edges.ts # 知识边
│   │       ├── timeline-entries.ts # 时间线
│   │       ├── decision-records.ts # 决策记录
│   │       ├── conversations.ts   # 对话 CRUD
│   │       └── messages.ts        # 消息 CRUD（树结构查询）
│   │
│   ├── fs/                       # 文件系统抽象层
│   │   ├── index.ts              # 文件系统入口
│   │   ├── paths.ts              # 路径管理
│   │   ├── provider.ts           # 文件系统 Provider
│   │   ├── domain-dirs.ts        # 域目录管理
│   │   └── markdown-parser.ts    # Markdown 解析器
│   │
│   ├── ipc/                      # IPC Handler（主进程端）
│   │   ├── register.ts           # 注册所有 handler
│   │   ├── handler.ts            # handler 基础设施
│   │   └── handlers/             # 各模块 handler
│   │       ├── domain-handler.ts
│   │       ├── model-handler.ts
│   │       ├── knowledge-handler.ts
│   │       ├── chat-handler.ts          # 对话 IPC handler
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
│   │       └── knowledge-tools-extension.ts
│   │
│   └── services/                 # 业务服务层
│       ├── domain-manager.ts     # 域管理服务
│       ├── domain-config.ts      # 域配置服务
│       ├── model-manager.ts      # 模型管理服务
│       ├── knowledge-graph.ts    # 知识图谱服务（节点/边 CRUD、图遍历）
│       ├── conversation-service.ts # 对话服务（会话管理、流式响应、领域上下文）
│       ├── version-control.ts    # 版本控制服务
│       ├── security-gate.ts      # 安全网关
│       └── pi-mono-wrapper.ts    # Pi Mono 服务包装

├── docs/                         # 文档
│   ├── projection_design_planning/  # 设计规划文档（按需查阅）
│   └── history/                     # 开发历史记录
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
