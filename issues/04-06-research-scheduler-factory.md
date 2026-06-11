# 04-06: research-scheduler 工厂化迁移

## Parent

`plans/04-architecture-deepening-prd.md` — Candidate 2: Service Factory Pattern

## What to build

将 research-scheduler 从模块级单例转换为工厂函数。这是第一个需要 `FullDeps`（DB + PiMono）的服务，也是跨服务依赖最复杂的——使用 session-runner, cost-estimator, research-cost-tracker, knowledge-graph, domain-config 等模块。

- 工厂函数：`createResearchScheduler(deps: FullDeps)`
- 导出类型 `ResearchScheduler = ReturnType<typeof createResearchScheduler>`
- `register.ts` 构建 FullDeps（含 PiMono），调用工厂，注册到 service registry
- 辅助模块 import 不变（session-runner 等不是 factory 转换目标）

测试更新：`research-scheduler.test.ts` 重写为工厂模式。这是当前 mock 最重的测试（9 处 vi.mock），改写后应降至 0-2 处（仅 mock 未转换的辅助模块）。

## Acceptance criteria

- [ ] `createResearchScheduler(deps: FullDeps)` 工厂函数存在
- [ ] 内部所有 `getDatabaseService()` 替换为 `deps.db`，`getPiMonoWrapper()` 替换为 `deps.piMono`
- [ ] 导出 `ResearchScheduler` 类型
- [ ] `register.ts` 构建 FullDeps 并注册
- [ ] research-scheduler 测试重写为工厂模式，vi.mock 数量降至 0-2
- [ ] TypeScript strict 编译无错误
- [ ] 现有测试全部通过

## Blocked by

- 04-03（Service Factory 基础设施 + 模式确立）

## Execution

**批次**: Phase 2
**优先级**: P1
**User Stories**: #10, #14, #16
