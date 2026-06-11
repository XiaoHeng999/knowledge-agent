# 03-01: CostEstimator 接口 + 默认 chars/4 实现

## Parent

`plans/03-architecture-deepening-ipc-sessionrunner-framework.md` — Phase 1

## What to build

定义 `CostEstimator` 接口并提供默认的 `chars/4` 启发式实现。这是 SessionRunner 的依赖 seam——两个 adapter 证明 seam 真实：默认启发式用于 framework/timeline/skill，`research-cost-tracker` 的适配器用于 research-scheduler。

接口提供两个方法：`estimateTokens` 基于 input/output 字符数估算 token 数，`estimateCost` 基于 token 数和 modelId 估算成本。默认实现使用 `chars/4` token 估算 + `model-resolver` 中的模型成本数据。为 research-cost-tracker 提供一个适配器实现（`TrackerCostEstimator`），包装现有的 `accumulateUsage` 逻辑。

## Acceptance criteria

- [ ] `CostEstimator` 接口定义在 `server/services/` 下（随 SessionRunner 一起或独立类型文件）
- [ ] 默认 `HeuristicCostEstimator` 实现存在，使用 `chars/4` 估算
- [ ] `TrackerCostEstimator` 适配器存在，包装 `research-cost-tracker` 的逻辑
- [ ] 两个实现的接口签名完全一致，可互相替换
- [ ] TypeScript strict 编译无错误
- [ ] 现有测试全部通过

## Blocked by

None — can start immediately.

## Execution

**批次**: Phase 1 — SessionRunner 基础
**优先级**: P0
**User Stories**: #4, #5
