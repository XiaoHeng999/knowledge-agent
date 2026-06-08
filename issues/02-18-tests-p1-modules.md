# 02-18: 测试补齐 — P1 模块

## Parent

`plans/02-grill-audit-bugs-gaps-quality.md` — ID-15（P1 测试部分）

## What to build

为 P1 优先级模块编写测试，全部遵循 TDD 流程。

**测试目标**：

| 模块 | 测试类型 | 验证内容 |
|------|----------|----------|
| `src/lib/commands/parser.ts` | 单元测试 | 命令解析（识别 /command [args] 格式） |
| `src/lib/commands/registry.ts` | 单元测试 | 注册、查找、执行路由 |
| `src/stores/*.ts`（14 个 store） | 单元测试 | 状态流转（mock window.api） |
| `server/services/search-engine.ts` | 单元测试 | 混合搜索 + RRF 融合 |
| `server/services/knowledge-graph.ts` | 单元测试 | 节点/边 CRUD + 图遍历 |
| `server/services/conversation-service.ts` | 单元测试 | 会话管理 + 流式响应 |

Store 测试模式：创建 store 实例，mock `window.api` 的 IPC 返回值，验证状态变化。

## Acceptance criteria

- [ ] `src/lib/commands/parser.test.ts` 存在且通过
- [ ] `src/lib/commands/registry.test.ts` 存在且通过
- [ ] 14 个 store 各有对应测试文件
- [ ] `server/services/search-engine.test.ts` 存在且通过
- [ ] `server/services/knowledge-graph.test.ts` 存在且通过
- [ ] `server/services/conversation-service.test.ts` 存在且通过
- [ ] 所有测试遵循 TDD 流程
- [ ] `pnpm run test` 全部通过

## Blocked by

- 02-17（P0 测试先行，建立测试模式样板）

## Execution

**批次**: 贯穿性（持续进行）
**优先级**: P1
**User Stories**: #16
