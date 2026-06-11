# 03-04: SessionRunner 迁移 — research-scheduler

## Parent

`plans/03-architecture-deepening-ipc-sessionrunner-framework.md` — Phase 1

## What to build

将 research-scheduler 中的 LLM session 样板替换为 `SessionRunner.runPrompt()` 调用。与 03-03 不同，research-scheduler 使用 `TrackerCostEstimator`（包装 `research-cost-tracker`）而非默认的启发式估算。

创建 `TrackerCostEstimator` 实例并注入到 `createSessionRunner(trackerEstimator)`。替换后 research-scheduler 的成本追踪仍然走 `research-cost-tracker` 的精确路径。

## Acceptance criteria

- [ ] research-scheduler 中 session 样板替换为 `runPrompt()` 调用（1 处）
- [ ] 使用 `TrackerCostEstimator` 注入而非默认 `HeuristicCostEstimator`
- [ ] 成本追踪行为不变——仍然通过 `research-cost-tracker` 的 accumulateUsage
- [ ] 功能行为不变——同样传入 prompt，同样返回 content + 成本
- [ ] TypeScript strict 编译无错误
- [ ] 现有测试全部通过

## Blocked by

- 03-02（SessionRunner 核心模块）

## Execution

**批次**: Phase 1 — SessionRunner 迁移
**优先级**: P0
**User Stories**: #4, #5
