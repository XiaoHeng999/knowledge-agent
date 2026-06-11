# 04-08: model-manager 工厂化迁移

## Parent

`plans/04-architecture-deepening-prd.md` — Candidate 2: Service Factory Pattern

## What to build

将 model-manager 从模块级单例转换为工厂函数。这是 PiMono 依赖最重的服务（5 次调用），且使用原始 SQL（`db.db.prepare(...)`）。

- 工厂函数：`createModelManager(deps: FullDeps)`
- 导出类型 `ModelManager = ReturnType<typeof createModelManager>`
- `register.ts` 构建 FullDeps，调用工厂，注册到 service registry
- routes.ts 中 model 路由的 service 名称不变

无现有测试文件（model-manager.test.ts 不存在）。验证通过 TypeScript 编译 + 其他引用该服务的测试通过。

## Acceptance criteria

- [ ] `createModelManager(deps: FullDeps)` 工厂函数存在
- [ ] 内部所有 `getDatabaseService()` 替换为 `deps.db`，`getPiMonoWrapper()` 替换为 `deps.piMono`
- [ ] 导出 `ModelManager` 类型
- [ ] `register.ts` 构建 FullDeps 并注册
- [ ] TypeScript strict 编译无错误
- [ ] 现有测试全部通过

## Blocked by

- 04-03（Service Factory 基础设施 + 模式确立）

## Execution

**批次**: Phase 2
**优先级**: P1
**User Stories**: #10, #14, #16
