# 04-02: Type-safe ChannelRoute 泛型化

## Parent

`plans/04-architecture-deepening-prd.md` — Candidate 3: Type-Safe IPC Routes

## What to build

将 `ChannelRoute` 接口泛型化，使其 `params` 提取器自动从 `IpcChannelMap` 获得请求类型，消除 routes.ts 中所有手动 `as` 类型断言。

核心变更：
- `ChannelRoute` 增加 `<C extends ChannelName>` 泛型参数
- `params` 的 `req` 参数类型从 `unknown` 变为 `ChannelRequest<C>`
- `wrap` 和 `transform` 保持 `(result: unknown) => unknown`（无法从 IpcChannelMap 推断 service 返回类型）
- routes.ts 中每个 route 定义的 params 闭包去掉所有 `(req as SomeType)` cast，直接使用 `req.fieldName`
- void-request channel 的 params 类型为 `(req: void) => unknown[]`，实际中 void channel 不提供 params

这是纯类型层面的重构——运行时行为零变化。dispatch 和 registerRoutes 逻辑不变。

## Acceptance criteria

- [ ] `ChannelRoute<C extends ChannelName>` 泛型接口定义完成
- [ ] `params` 的 req 参数从 `IpcChannelMap[C]["request"]` 推导
- [ ] routes.ts 中所有 `(req as ...)` 断言消除，改为直接属性访问
- [ ] void-request channel 的 params 处理正确（不提供 params 或类型安全）
- [ ] `wrap` 和 `transform` 保持 `unknown` 类型
- [ ] `pnpm tsc --noEmit` 通过，无类型错误
- [ ] `tests/server/ipc/router.test.ts` 和 `tests/server/ipc/routes.test.ts` 通过
- [ ] 运行时行为零变化

## Blocked by

None — 可立即开始（与 04-01、04-03 并行）。

## Execution

**批次**: Phase 1
**优先级**: P1
**User Stories**: #18, #19, #20, #21, #22
