# 04-03: Service Factory 基础设施 + skill-engine 试点迁移

## Parent

`plans/04-architecture-deepening-prd.md` — Candidate 2: Service Factory Pattern

## What to build

建立 Service Factory 模式的基础设施，并以 skill-engine 作为试点完成首次端到端迁移。

**基础设施**：
- 定义 `DbDeps { db: DatabaseService }` 接口
- 定义 `FullDeps extends DbDeps { piMono: PiMonoWrapper }` 接口
- 两个接口放在 `server/services/types.ts` 或共用位置

**skill-engine 试点**：
- 将 skill-engine 从模块级单例转换为工厂函数：`createSkillEngine(deps: DbDeps)`
- 工厂函数闭包持有 `deps`，所有 `getDatabaseService()` 调用替换为 `deps.db`
- 导出类型 `SkillEngine = ReturnType<typeof createSkillEngine>`
- 旧的逐函数导出移除

**调用方更新**：
- `register.ts`：构建 DbDeps，调用 `createSkillEngine(deps)`，将返回对象注册到 service registry
- `domain-handler.ts`：`registerDomainHandlers` 接收 `skillEngine` 参数，不再 import skill-engine 模块
- `routes.ts` 中 skill 路由的 service 名称不变（仍为 `"skill-engine"`）

**测试更新**：
- `tests/server/services/skill-engine.test.ts` 重写为工厂模式
- 创建 `const engine = createSkillEngine({ db: mockDb })`
- 消除 `vi.mock("@server/db/index")`
- 按 cost-estimator.test.ts 零 mock 模式编写

## Acceptance criteria

- [ ] `DbDeps` 和 `FullDeps` 接口定义完成
- [ ] `createSkillEngine(deps: DbDeps)` 工厂函数存在
- [ ] skill-engine 内部所有 `getDatabaseService()` 替换为 `deps.db`
- [ ] 导出 `SkillEngine = ReturnType<typeof createSkillEngine>` 类型
- [ ] `register.ts` 构建依赖并调用工厂，注册到 service registry
- [ ] `domain-handler.ts` 通过参数接收 skillEngine，不直接 import
- [ ] skill-engine 测试重写为工厂模式，无 `vi.mock("@server/db/index")`
- [ ] TypeScript strict 编译无错误
- [ ] 现有测试全部通过

## Blocked by

None — 可立即开始（与 04-01、04-02 并行）。

## Execution

**批次**: Phase 1
**优先级**: P0
**User Stories**: #10, #11, #12, #13, #16, #17
