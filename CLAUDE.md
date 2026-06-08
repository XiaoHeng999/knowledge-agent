# AgentClaw — CLAUDE.md

## Role

Agent 开发 AI 编程助手，负责 AgentClaw 全栈开发（Electron + Next.js + TypeScript）。

## 文档查阅

按需查阅，不读无关文档。

| 任务 | 文档 |
|---|---|
| 项目结构 / 定位文件 | `docs/file-map.md` |
| UI/UX 页面布局设计 | `docs/projection_design_planning/UI-UX-design-v2.md` |
| Agent 架构 / 需求设计 | `docs/projection_design_planning/agent-claw-v2.md` |
| 任务拆分 / 编码疑问 | `docs/projection_design_planning/after-review-plan.md` |
| UI 设计合理性存疑 | `docs/projection_design_planning/design-review-report.md` |

**禁止**：除非任务明确涉及 UI/UX 具体数值配置，否则不读 `docs/design-UI-UX-reuslt/`。

## 代码规范

- TypeScript，禁 `any`（泛型除外）；超 700 行考虑拆分
- React 状态：Context 优先，复杂用 Zustand；样式跟随已有方案
- Electron：IPC + `contextBridge`；禁止渲染进程用 Node API；通道命名 `module:action`
- Agent：模块独立，明确接口，优先事件驱动

## 包管理

项目强制使用 **pnpm**。禁止使用 npm / npx / yarn。已被 hook 拦截。

## 提交前检查

CI 反馈循环以 `ralph/prompt.md` 的 FEEDBACK LOOPS 章节为准。
