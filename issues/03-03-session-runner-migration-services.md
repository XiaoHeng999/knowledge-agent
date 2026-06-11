# 03-03: SessionRunner 迁移 — framework/timeline/skill

## Parent

`plans/03-architecture-deepening-ipc-sessionrunner-framework.md` — Phase 1

## What to build

将 framework-engine、timeline-engine、skill-engine 三个服务中的 LLM session 样板替换为 `SessionRunner.runPrompt()` 调用。

每个服务中当前有 1-2 处 session 样板（create → subscribe → prompt → collect → destroy + chars/4 成本估算），替换为 `const { content, estimatedCost } = await runner.runPrompt(domainId, modelId, prompt)`。删除被替换的 session 样板代码和 chars/4 成本估算逻辑。三个服务使用默认的 `HeuristicCostEstimator`。

conversation-service 不在此 issue 范围内——它保留独立的流式 session 管理。

## Acceptance criteria

- [ ] framework-engine 中 session 样板替换为 `runPrompt()` 调用（2 处）
- [ ] timeline-engine 中 session 样板替换为 `runPrompt()` 调用（2 处）
- [ ] skill-engine 中 session 样板替换为 `runPrompt()` 调用（1 处）
- [ ] 三个服务中 `chars/4` 成本估算代码已删除
- [ ] `getPiMonoWrapper()` 的直接 session 调用已从三个服务中移除（改由 SessionRunner 内部处理）
- [ ] 功能行为不变——同样传入 prompt，同样返回 content + 成本
- [ ] TypeScript strict 编译无错误
- [ ] 现有测试全部通过

## Blocked by

- 03-02（SessionRunner 核心模块）

## Execution

**批次**: Phase 1 — SessionRunner 迁移
**优先级**: P0
**User Stories**: #3, #8
