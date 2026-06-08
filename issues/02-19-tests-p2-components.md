# 02-19: 测试补齐 — P2 组件测试

## Parent

`plans/02-grill-audit-bugs-gaps-quality.md` — ID-15（P2 测试部分）

## What to build

为前端组件编写交互测试，使用 `@testing-library/react`（已安装但未使用）。全部遵循 TDD 流程。

**测试目标**：

| 模块 | 测试类型 | 验证内容 |
|------|----------|----------|
| `src/components/cmd-palette/cmd-palette.tsx` | 组件测试 | 搜索、导航、参数输入 |
| `src/components/chat/conversation-tree.tsx` | 组件测试 | 虚拟滚动、折叠、分支 |
| `src/components/graph/webgl-graph.tsx` | 组件测试 | Canvas 渲染 + 交互 |

组件测试模式：render 组件 → 模拟用户交互（输入、点击）→ 验证 DOM 状态和回调调用。

## Acceptance criteria

- [ ] `src/components/cmd-palette/cmd-palette.test.tsx` 存在且通过
- [ ] `src/components/chat/conversation-tree.test.tsx` 存在且通过
- [ ] `src/components/graph/webgl-graph.test.tsx` 存在且通过
- [ ] 所有测试遵循 TDD 流程
- [ ] `pnpm run test` 全部通过

## Blocked by

- 02-18（P1 测试先行，建立组件测试模式样板）

## Execution

**批次**: 贯穿性（持续进行）
**优先级**: P2
**User Stories**: #16
