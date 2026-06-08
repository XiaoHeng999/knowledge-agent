# 02-17: 测试补齐 — P0 模块

## Parent

`plans/02-grill-audit-bugs-gaps-quality.md` — ID-15（P0 测试部分）

## What to build

为最高优先级模块编写测试，全部遵循 TDD 流程（先写失败测试 → 实现 → 重构）。

**测试目标**：

| 模块 | 测试类型 | 验证内容 |
|------|----------|----------|
| `server/db/repositories/settings.ts` | 单元测试 | get/set/remove + JSON 编码正确性（无双重编码） |
| `server/pi-mono/extensions/research-agent-extension.ts` | 单元测试 | turn_end 成本提取逻辑 |
| `server/services/security-gate.ts` | 单元测试 | 风险评估 + 三层审核流程 |
| `server/db/migrations/` | 集成测试 | migration up/down 正确性 |

测试缝隙：Repository 层 mock `better-sqlite3`，Extension 层 mock pi-mono SDK event，Service 层 mock DB。

## Acceptance criteria

- [ ] `server/db/repositories/settings.test.ts` 存在且通过
- [ ] `server/pi-mono/extensions/research-agent-extension.test.ts` 存在且通过
- [ ] `server/services/security-gate.test.ts` 存在且通过
- [ ] `server/db/migrations/migrations.test.ts` 存在且通过
- [ ] 所有测试遵循 TDD 流程（测试先行）
- [ ] `pnpm run test` 全部通过

## Blocked by

- 02-01（Settings Repository，测试目标文件需先创建）
- 02-05（研究成本追踪，turn_end hook 需先实现）

## Execution

**批次**: 贯穿性（持续进行）
**优先级**: P0
**User Stories**: #16
