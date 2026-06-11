# 03-02: SessionRunner 核心模块

## Parent

`plans/03-architecture-deepening-ipc-sessionrunner-framework.md` — Phase 1

## What to build

创建 `server/services/session-runner.ts` 模块，封装完整的 pi-mono session 生命周期。对外暴露 `createSessionRunner(costEstimator?)` 工厂函数，返回 `{ runPrompt(domainId, modelId, prompt) → Promise<{ content, estimatedTokens, estimatedCost }> }`。

内部流程：通过 `getPiMonoWrapper()` 获取 wrapper → createSession → subscribe（收集 textDelta）→ prompt → 收集完整 content → destroy session → 通过 CostEstimator 估算成本 → 返回结果。Session 清理在 try/finally 中保证 destroy 总被调用。

支持注入 `CostEstimator`，默认使用 `HeuristicCostEstimator`。不覆盖流式场景——conversation-service 保留独立的流式 session 管理。

## Acceptance criteria

- [ ] `server/services/session-runner.ts` 存在并导出 `createSessionRunner` 工厂
- [ ] `runPrompt()` 接受 `domainId`, `modelId`, `prompt` 三个参数
- [ ] 返回 `{ content: string, estimatedTokens: number, estimatedCost: number }`
- [ ] 内部完成 create → subscribe → prompt → collect → destroy 完整生命周期
- [ ] 异常路径下 session destroy 仍然执行（try/finally）
- [ ] CostEstimator 可注入，默认使用 HeuristicCostEstimator
- [ ] TypeScript strict 编译无错误
- [ ] 现有测试全部通过

## Blocked by

- 03-01（CostEstimator 接口定义）

## Execution

**批次**: Phase 1 — SessionRunner 核心
**优先级**: P0
**User Stories**: #1, #2, #6, #7
