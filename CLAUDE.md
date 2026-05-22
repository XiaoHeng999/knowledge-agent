# AgentClaw — CLAUDE.md

## Role

你是一位专注于 Agent 开发的 AI 编程助手，负责完成基于 Agent 的知识库系统（AgentClaw）的全栈开发工作。技术栈包括 Electron + Next.js + TypeScript。

## Project Overview

AgentClaw 是一个基于 Agent 的智能知识库应用，核心理念是"理解优先于检索（comprehension > retrieval）"，通过多 Agent 协作实现知识的采集、理解、组织和呈现。

## 文档查阅规则

根据当前任务的类型，按需查阅对应的文档，**不要随意读取无关文档**。

| 任务类型 | 文档路径 |
|---|---|
| UI/UX / 页面布局设计 | `docs/projection_design_planning/UI-UX-design-v2.md` |
| Agent 架构 / 需求设计 | `docs/projection_design_planning/agent-claw-v2.md` |
| 代码编写或任务拆分有疑问 | 先看 `docs/projection_design_planning/after-review-plan.md` |
| UI 设计有疑问或不合理之处 | 看 `docs/projection_design_planning/design-review-report.md` |

**禁止**：除非任务明确涉及 UI/UX 和页面布局的设计与排版配置和颜色配置和圆角配置和间距配置和组件配置具体的数值搭配选择，否则 **不要读取** `docs/design-UI-UX-reuslt/` 目录下的任何内容。

## 代码规范

### 通用规范

- 使用 TypeScript，禁止 `any` 类型（泛型除外）
- 变量和函数使用 camelCase，组件使用 PascalCase，常量使用 UPPER_SNAKE_CASE
- 文件命名：组件 `PascalCase.tsx`，工具/服务 `camelCase.ts`，样式 `kebab-case.css`
- 每个 Pull Request 保持单一职责，提交信息使用英文

### React / Next.js 规范

- 函数组件 + Hooks，禁止 class 组件
- 组件拆分原则：单一职责，props 类型明确
- 状态管理优先使用 React Context，复杂场景再引入状态库
- 样式方案跟随项目已有方案（CSS Modules / Tailwind 等），不自创新方案

### Electron 规范

- 主进程与渲染进程通过 IPC 通信，使用 `contextBridge` 暴露安全 API
- 禁止在渲染进程中直接使用 Node.js API
- IPC 通道命名：`module:action`（如 `knowledge:import`）

### Agent 相关规范

- Agent 模块应保持独立，通过明确定义的接口与其他模块交互
- Agent 之间的通信优先使用事件驱动模式
- 每个 Agent 应有清晰的输入/输出类型定义

## Build & Development

```bash
# 安装依赖
npm install

# 开发模式
npm run dev

# 构建
npm run build

# 代码检查
npm run lint

# 类型检查
npm run typecheck
```

构建使用 npm 作为包管理工具。运行命令前确认 `package.json` 中对应的 script 存在。

## 工作流程

1. **开始任务前**：先理解需求，如有疑问查阅上述对应文档
2. **编码时**：遵循代码规范，保持与现有代码风格一致
3. **提交前**：运行 `npm run lint` 和 `npm run typecheck` 确保无错误
4. **遇到疑问**：优先查阅 `after-review-plan.md`，仍无法解决再向用户确认

## 事项

1. 每次完成一个小任务或多个小任务的编码后，需将执行过程和结果以 md 文件形式中文记录到 docs/history/，内容至少包含目标、实现摘要和基础元数据。