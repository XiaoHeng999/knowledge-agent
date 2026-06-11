# 04-05: timeline-engine 工厂化迁移

## Parent

`plans/04-architecture-deepening-prd.md` — Candidate 2: Service Factory Pattern

## What to build

将 timeline-engine 从模块级单例转换为工厂函数，遵循 04-03 建立的模式。

timeline-engine 是 DB-only 服务，是使用 DB 最多的服务（11 次 `getDatabaseService()` 调用）。使用 repositories：predictions, knowledgeNodes, domains。内部使用 pi-mono tools（timeline-analyze executor），但不直接使用 getPiMonoWrapper。

- 工厂函数：`createTimelineEngine(deps: DbDeps)`
- 导出类型 `TimelineEngine = ReturnType<typeof createTimelineEngine>`
- `register.ts` 构建依赖，调用工厂，注册到 service registry

测试更新：`timeline-engine.test.ts` 重写为工厂模式，消除 `vi.mock("@server/db/index")`。

## Acceptance criteria

- [ ] `createTimelineEngine(deps: DbDeps)` 工厂函数存在
- [ ] 内部 11 处 `getDatabaseService()` 全部替换为 `deps.db`
- [ ] 导出 `TimelineEngine` 类型
- [ ] `register.ts` 正确构建并注册
- [ ] timeline-engine 测试重写为工厂模式
- [ ] TypeScript strict 编译无错误
- [ ] 现有测试全部通过

## Blocked by

- 04-03（Service Factory 基础设施 + 模式确立）

## Execution

**批次**: Phase 2
**优先级**: P1
**User Stories**: #10, #13, #16
