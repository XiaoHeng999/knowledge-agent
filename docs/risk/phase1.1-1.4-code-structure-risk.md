# Phase 1.1–1.4 代码结构风险分析报告

> **分析范围**：`src/`、`server/`、`electron/` 三层代码
> **对照基准**：`tasks.md` Phase 1.1（项目初始化）、1.2（IPC 通信层）、1.3（三栏布局）、1.4（状态管理）
> **分析日期**：2026-05-23

---

## 一、当前代码结构总览

```
agentclaw/
├── electron/                     ← Electron 主进程（应用壳）
│   ├── main.ts                   ← 应用生命周期 + 启动编排
│   ├── preload.ts                ← contextBridge 安全 API（9域 + 事件订阅）
│   ├── window.ts                 ← BrowserWindow 工厂函数
│   └── tsconfig.json             ← 主进程独立 TS 编译配置
├── server/                       ← 后端业务逻辑层
│   └── ipc/
│       ├── handler.ts            ← IPC 基础设施（IpcError、超时、日志）
│       └── register.ts           ← 全部 Handler 注册入口（11 个域）
├── src/                          ← 前端渲染层（Next.js）
│   ├── app/
│   │   ├── globals.css           ← 完整暗色主题 CSS 变量 + 布局样式
│   │   ├── layout.tsx            ← Next.js 根布局
│   │   └── page.tsx              ← 首页占位
│   ├── lib/
│   │   └── ipc/
│   │       └── channels.ts       ← 🔑 IPC 唯一类型契约（10域、54通道）
│   └── types/
│       └── electron.d.ts         ← Window.api 全局类型声明
├── package.json                  ← 单包结构，concurrently 并发开发
└── tsconfig.json                 ← 前端 TS 配置
```

---

## 二、Phase 1.1–1.3 任务完成度对照

| 任务编号 | 任务描述 | 状态 | 差异说明 |
|----------|----------|------|----------|
| 1.1.1 | 初始化 monorepo | ✅ 完成 | 实际是单包结构（非 monorepo/turborepo），但功能等价 |
| 1.1.2 | 初始化 Electron 主进程 | ✅ 完成 | main.ts + preload.ts + window.ts 三文件清晰拆分 |
| 1.1.3 | 初始化 Next.js 15 前端 | ✅ 完成 | static export 模式，globals.css 含完整设计系统 |
| 1.1.4 | 配置 electron-builder | ✅ 完成 | electron-builder.yml 覆盖 macOS/Windows/Linux |
| 1.1.5 | 配置开发工具链 | ✅ 完成 | concurrently + HMR + TS path aliases |
| 1.2.1 | 定义 IPC 通道类型 | ✅ 完成 | channels.ts 含 10 域 54 通道 + IpcChannelMap |
| 1.2.2 | 实现 IPC 桥接 | ✅ 完成 | preload.ts 全域映射 + 类型安全 invoke |
| 1.2.3 | 实现 IPC Handler 基类 | ✅ 完成 | IpcError + 超时 + 日志 + unregisterAll |
| 1.2.4 | 注册所有 IPC Handler | ✅ 完成 | register.ts 11 个注册函数（部分为 stub） |
| 1.3.1 | 实现主布局组件 | ⚠️ 部分 | CSS 布局类已定义（.app-layout），但无 React 组件实现 |
| 1.3.2 | 实现侧边栏组件 | ⚠️ 部分 | CSS 样式已定义（.sidebar），但无 React 组件实现 |
| 1.3.3 | 实现右侧面板组件 | ⚠️ 部分 | CSS 样式已定义（.detail-panel），但无 React 组件实现 |
| 1.3.4 | 实现标题栏组件 | ⚠️ 部分 | CSS 样式已定义（.titlebar），但无 React 组件实现 |
| 1.3.5 | 实现状态栏组件 | ⚠️ 部分 | CSS 样式已定义（.statusbar），但无 React 组件实现 |
| 1.3.6 | 实现响应式断点 | ✅ 完成 | CSS @media 已实现 900px / 1200px 断点 |
| 1.4.1 | 实现 Zustand store 基类 | ❌ 未开始 | 无文件，无代码 |
| 1.4.2 | 实现应用全局 store | ❌ 未开始 | 无文件，无代码 |
| 1.4.3 | 实现领域 store | ❌ 未开始 | 无文件，无代码 |
| 1.4.4 | 实现 IPC 状态同步 Hook | ❌ 未开始 | 无文件，无代码 |

**总结**：Phase 1.1 完整交付；Phase 1.2 完整交付；Phase 1.3 仅交付 CSS 层，React 组件层缺失；Phase 1.4 完全未开始。

---

## 三、架构风险评估

### 风险 R1：`channels.ts` 位置导致跨层反向依赖

**严重度**：🔴 高
**影响范围**：全项目三层架构
**当前状态**：

`src/lib/ipc/channels.ts` 是全项目共享的 IPC 契约，被三层同时引用：

```
server/ipc/handler.ts  → import from "../../src/lib/ipc/channels"
electron/preload.ts    → import from "../src/lib/ipc/channels"
server/ipc/register.ts → import from "../../src/lib/ipc/channels"
```

这意味着后端（`server/`）和主进程（`electron/`）都反向依赖了前端目录（`src/`）。

**具体风险**：

1. **electron/tsconfig.json 的 exclude 脆弱性**：当前配置 `exclude: ["../src"]` 但又 `include: ["../src/lib/ipc/**/*.ts"]`，通过 include/exclude 的覆盖关系来精确允许一个子目录。如果有人重构 `src/` 目录结构或修改 tsconfig，这个脆弱的平衡会被打破。
2. **语义混乱**：后端开发者看到 `import from "../../src/..."` 会困惑——为什么 server 代码要引用前端源码？
3. **构建耦合**：前端 tsconfig（`noEmit: true`）和后端 tsconfig 同时编译同一个文件，虽然结果等价，但两套编译管线存在配置漂移风险。

**建议修复**：

```
shared/                          ← 新建独立目录
  ipc/
    channels.ts                  ← 从 src/lib/ipc/ 移出
electron/tsconfig.json           ← include 添加 "../shared/**/*.ts"
tsconfig.json                    ← paths 添加 "@shared/*" → "./shared/*"
```

---

### 风险 R2：`server/` 目录缺少模块化结构，register.ts 会成为瓶颈

**严重度**：🟡 中高
**影响范围**：Phase 2-4 所有后端业务开发
**当前状态**：

```
server/
  ipc/
    handler.ts    ← 169 行，基础设施，结构合理
    register.ts   ← 128 行，但已有 11 个注册函数
```

当前 `register.ts` 已包含 app、db、model、domain、knowledge、inbox、research、settings、import、window 共 10 个域的注册逻辑。随着 Phase 2-4 推进，每个域的 Handler 会从空 stub 变为数十行到数百行的真实业务代码。

**具体风险**：

1. **单文件膨胀**：若每个域的 Handler 实现 30-50 行，10 个域将导致 register.ts 膨胀至 500+ 行。
2. **合并冲突**：多人并行开发不同域时，都需修改 register.ts，极易产生 Git 合并冲突。
3. **职责不清**：register.ts 混合了注册编排和业务实现（如 window Handler 直接操作 BrowserWindow），违反单一职责。

**建议修复**（Phase 1.5 开始前）：

```
server/
  ipc/
    handler.ts              ← 保留不变
    register.ts             ← 精简为纯编排（只调用各模块的 register）
    handlers/               ← 按域拆分
      app-handler.ts
      db-handler.ts
      model-handler.ts
      domain-handler.ts
      knowledge-handler.ts
      inbox-handler.ts
      research-handler.ts
      settings-handler.ts
      import-handler.ts
      window-handler.ts
```

---

### 风险 R3：`preload.ts` 手动映射无法随 channels.ts 自动同步

**严重度**：🟡 中
**影响范围**：新增 IPC 通道时的维护成本
**当前状态**：

`preload.ts` 为每个通道手动编写了一行 invoke 映射，总计约 50 行方法定义。新增通道时必须同步修改三处：

1. `channels.ts` — 添加通道常量 + 类型
2. `preload.ts` — 添加 invoke 方法
3. `register.ts` — 添加 Handler

其中第 2 步完全是机械性的手动劳动，且容易遗漏。

**具体风险**：

1. **遗漏风险**：channels.ts 新增了通道但 preload.ts 漏写，前端编译不报错（TypeScript 只检查已引用的属性），运行时才发现 `window.api.xxx is not a function`。
2. **类型不一致**：手动写 `ChannelRequest<"xxx">` 时可能写错通道名，虽然有类型检查但需等到实际调用处才暴露。

**建议修复**：

利用 `IpcChannelMap` 和条件类型，在 `preload.ts` 中自动推导 API 对象结构，将手动映射改为按域前缀自动分组。这样新增通道只需改 channels.ts 和 register.ts 两处。

---

### 风险 R4：Phase 1.3 React 组件层缺失，CSS 与组件脱节

**严重度**：🟡 中
**影响范围**：后续 UI 开发的起步效率
**当前状态**：

`globals.css` 已包含完整的三栏布局样式系统（titlebar、sidebar、statusbar、detail-panel、responsive breakpoints），但对应的 React 组件均不存在：

- 无 `src/app/(main)/layout.tsx`（任务 1.3.1）
- 无 `src/components/layout/sidebar.tsx`（任务 1.3.2）
- 无 `src/components/layout/detail-panel.tsx`（任务 1.3.3）
- 无 `src/components/layout/titlebar.tsx`（任务 1.3.4）
- 无 `src/components/layout/statusbar.tsx`（任务 1.3.5）

**具体风险**：

1. **CSS 与组件可能脱节**：CSS 先行编写时假设了特定的 DOM 结构和类名。后续实现组件时，开发者可能发现 CSS 类名不匹配或 DOM 层级与 CSS 选择器冲突，导致返工。
2. **CSS 无人验证**：大量 CSS（680+ 行）从未被任何组件实际使用，其中可能存在样式错误、z-index 冲突、动画性能问题等，直到组件实现时才会暴露。
3. **globals.css 膨胀**：所有布局、组件样式都堆积在一个文件中。随着组件库增长（Phase 2.6 有 12 个 UI 组件），这个文件会变得极难维护。

**建议修复**：

1. 尽快实现 Phase 1.3 的 React 组件，让 CSS 得到实际验证
2. 考虑将 CSS 按组件拆分为 CSS Modules 或独立文件，而非全部放在 globals.css

---

### 风险 R5：`handler.ts` 的 `unregisterAll()` 硬编码通道列表

**严重度**：🟡 中低
**影响范围**：测试和关闭时的清理
**当前状态**：

`unregisterAll()` 函数（handler.ts:116-169）手动列出了全部 54 个通道名，用于测试清理和优雅关闭。每次新增通道必须同步更新此函数。

**具体风险**：

1. **遗忘风险**：新增通道后忘记在 unregisterAll 中添加，导致测试间状态泄漏。
2. **维护成本**：54 行重复的 `ipcMain.removeHandler(...)` 调用，纯手工维护。

**建议修复**：

用动态方式替代硬编码——从 `IpcChannelMap` 的 `keyof` 提取所有通道名并遍历调用 `removeHandler`。

---

### 风险 R6：tsconfig 路径别名声明但未在 electron/server 端生效

**严重度**：🟢 低
**影响范围**：开发体验
**当前状态**：

根 `tsconfig.json` 定义了路径别名：

```json
"paths": {
  "@/*": ["./src/*"],
  "@electron/*": ["./electron/*"],
  "@server/*": ["./server/*"]
}
```

但 `electron/tsconfig.json` 没有定义 `paths`，且使用 `moduleResolution: "node"`（不支持路径别名）。当前 server 和 electron 代码全部使用相对路径引用。

**具体风险**：

1. `server/ipc/handler.ts` 和 `register.ts` 使用 `../../src/lib/ipc/channels` 这样的深层相对路径，阅读和维护不便。
2. 若未来移动 channels.ts（如 R1 建议的 shared/），所有相对引用都需手动修正。
3. 前端代码理论上可以用 `@server/*` 引用后端代码（虽然不应该这样做），路径别名配置未做互斥限制。

**建议**：

如果执行 R1（移 channels.ts 到 shared/），在 `electron/tsconfig.json` 中添加对应的 `paths` 配置。

---

### 风险 R7：Phase 1.4（状态管理）未开始，阻塞后续开发

**严重度**：🔴 高
**影响范围**：Phase 2 全部任务、Phase 3.3（专家对话）、Phase 3.6（收件箱）
**当前状态**：

任务 1.4.1-1.4.4 均未开始：
- 无 `src/stores/base.ts`
- 无 `src/stores/app-store.ts`
- 无 `src/stores/domain-store.ts`
- 无 `src/lib/hooks/use-ipc.ts`

`zustand` 已作为依赖安装在 `package.json` 中，但未在任何代码中实际使用。

**具体风险**：

1. **关键路径阻塞**：Phase 2.1（模型管理）、2.2（领域管理）等均依赖 store 层来管理前端状态。没有状态管理基座，UI 组件无法正确管理加载状态、错误状态、缓存数据。
2. **IPC Hook 缺失**：没有 `use-ipc.ts` Hook 意味着前端调用 IPC 时缺少统一的错误处理、loading 状态管理、缓存策略。每个组件都需要自行处理这些横切关注点，导致重复代码。
3. **持久化缺失**：任务的验证标准要求"Store 可持久化到 SQLite，页面刷新后状态恢复"。当前无任何持久化机制。

---

### 风险 R8：IPC 错误返回方式存在歧义

**严重度**：🟡 中低
**影响范围**：前端错误处理
**当前状态**：

`handler.ts` 中，错误通过 `return err.toJSON()` 返回（非 throw），返回值形状为 `{ __ipcError: true, code, message, details }`。但前端 `invoke()` 的返回类型声明为 `Promise<ChannelResponse<C>>`，这意味着 TypeScript 认为返回的始终是成功响应，不会包含错误字段。

**具体风险**：

1. **类型安全漏洞**：前端代码直接解构 `const { data } = await window.api.xxx()` 时，TypeScript 不会提醒需要处理错误情况。运行时如果返回的是 IpcError JSON，`data` 会是 `undefined`。
2. **缺少统一的错误拦截**：preload.ts 的 `invoke()` 函数只是透传 `ipcRenderer.invoke()` 的结果，没有检查 `__ipcError` 标记并抛出异常的逻辑。

**建议修复**：

在 `invoke()` 函数中添加错误检测：检查返回值是否包含 `__ipcError` 标记，如果是则抛出结构化异常。或者将 `ChannelResponse` 改为 `ChannelResponse | IpcError` 的联合类型。

---

## 四、架构解耦评估

### 4.1 三层职责分离 — 评分：良好 ✅

| 层 | 职责 | 是否越界 | 评价 |
|---|---|---|---|
| `electron/` | 应用生命周期、窗口管理、安全桥 | 未越界 | main.ts 只做编排，window.ts 只做窗口，preload.ts 只做桥接 |
| `server/` | 业务逻辑处理 | 有轻微越界 | register.ts 中 window Handler 直接操作 BrowserWindow，应通过 electron 层代理 |
| `src/` | UI 渲染 | 未越界 | 当前只有占位页面和类型声明 |

**唯一越界点**：`register.ts:80-109` 中 `registerWindowHandlers()` 直接 import `BrowserWindow` 并操作窗口。这打破了"server 层不依赖 Electron API"的原则。

**建议**：将 window Handler 移至 `electron/` 目录下（如 `electron/window-handlers.ts`），或在 handler 中通过回调/事件间接操作窗口。

### 4.2 依赖方向 — 评分：需改进 ⚠️

理想的依赖方向：

```
electron/ → server/ → shared/
src/      → shared/
```

当前实际依赖方向：

```
electron/ → server/ → src/lib/ipc/   ← 反向依赖
electron/preload → src/lib/ipc/      ← 反向依赖
src/types → electron/preload         ← 反向依赖
```

`src/types/electron.d.ts` 通过 `import type { ElectronAPI } from "../../electron/preload"` 引用了 electron 目录，形成前端 → 主进程的直接依赖。这在类型层面是合理的（需要知道 API 类型），但增加了编译耦合。

### 4.3 可修改性评估 — 评分：中等 ⚠️

| 修改场景 | 需修改文件数 | 难度 |
|----------|-------------|------|
| 新增一个 IPC 通道 | 3（channels.ts + preload.ts + register.ts） | 中等 |
| 修改已有通道的请求/响应类型 | 1（channels.ts） | 低 |
| 新增一个业务域（如 notification） | 4+（channels + preload + register + 新 handler 文件） | 中等 |
| 替换状态管理方案 | 影响范围待定（Phase 1.4 未开始） | 未知 |
| 修改 IPC 基础设施（如添加中间件） | 1（handler.ts） | 低 |

---

## 五、安全合规检查

| 检查项 | 状态 | 说明 |
|--------|------|------|
| `nodeIntegration: false` | ✅ | window.ts:18 |
| `contextIsolation: true` | ✅ | window.ts:19 |
| `sandbox: true` | ✅ | window.ts:20 |
| 使用 contextBridge 暴露 API | ✅ | preload.ts:128 |
| 渲染进程无 Node.js API 直接访问 | ✅ | 通过 window.api 代理 |
| 单实例锁 | ✅ | main.ts:8 |
| 外部链接在系统浏览器打开 | ✅ | window.ts:23-26 |
| IPC 通道命名规范 `module:action` | ✅ | 全部通道遵循 |

---

## 六、风险优先级排序与建议执行计划

| 优先级 | 风险 | 建议执行时机 |
|--------|------|-------------|
| P0 | R7：Phase 1.4 未开始 | 立即执行，所有 Phase 2 的前置依赖 |
| P0 | R1：channels.ts 位置 | Phase 1.5 开始前修复，避免 server 层膨胀后重构成本激增 |
| P1 | R4：Phase 1.3 组件缺失 | Phase 1.4 完成后立即执行，验证 CSS 正确性 |
| P1 | R2：server/ 模块化 | Phase 1.5 开始前执行，为 DB/Service 层提供清晰结构 |
| P2 | R8：IPC 错误返回歧义 | Phase 1.4 实现 use-ipc Hook 时一并修复 |
| P2 | R3：preload 自动推导 | Phase 2 开始前优化，减少后续维护成本 |
| P3 | R5：unregisterAll 硬编码 | Phase 1.5 完成后优化 |
| P3 | R6：路径别名 | 随 R1 一并处理 |

---

## 七、结论

Phase 1.1-1.2 的实现质量较高，IPC 全链路类型安全是架构的核心亮点。但存在两个结构性问题需要在后续 Phase 启动前解决：

1. **共享契约（channels.ts）的目录归属**——当前放在 `src/` 下导致反向依赖，应移至独立共享目录。
2. **server 层的模块化结构**——当前扁平结构无法支撑 Phase 1.5（14 个 Repository + 迁移系统）和 Phase 2-4 的业务模块增长。

Phase 1.3 的 CSS 前置实现策略在验证阶段存在风险（CSS 与组件可能不匹配），建议尽快补充 React 组件实现。

Phase 1.4 完全未开始，是当前最紧迫的阻塞项，直接影响 Phase 2 所有任务的开发。
