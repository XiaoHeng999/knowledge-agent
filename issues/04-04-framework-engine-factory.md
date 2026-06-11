# 04-04: framework-engine 工厂化迁移

## Parent

`plans/04-architecture-deepening-prd.md` — Candidate 2: Service Factory Pattern

## What to build

将 framework-engine 从模块级单例转换为工厂函数，遵循 04-03 建立的模式。

framework-engine 是 DB-only 服务（不需要 PiMono），使用 repositories：domains, knowledgeNodes, decisionRecords, frameworkResults。内部委托给 session-runner、framework-definitions、domain-summary-service 等辅助模块（保持直接 import）。

- 工厂函数：`createFrameworkEngine(deps: DbDeps)`
- 导出类型 `FrameworkEngine = ReturnType<typeof createFrameworkEngine>`
- `register.ts` 构建依赖，调用工厂，注册到 service registry
- routes.ts 中 framework 路由的 service 名称不变

测试更新：`framework-engine-session.test.ts` 重写为工厂模式。

## Acceptance criteria

- [ ] `createFrameworkEngine(deps: DbDeps)` 工厂函数存在
- [ ] 内部所有 `getDatabaseService()` 替换为 `deps.db`
- [ ] 导出 `FrameworkEngine` 类型
- [ ] `register.ts` 正确构建并注册
- [ ] 相关测试重写为工厂模式
- [ ] TypeScript strict 编译无错误
- [ ] 现有测试全部通过

## Blocked by

- 04-03（Service Factory 基础设施 + 模式确立）

## Execution

**批次**: Phase 2
**优先级**: P1
**User Stories**: #10, #13, #16
