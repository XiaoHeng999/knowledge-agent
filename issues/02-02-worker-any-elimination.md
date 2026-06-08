# 02-02: Worker handler map 消除 any 类型

## Parent

`plans/02-grill-audit-bugs-gaps-quality.md` — ID-09

## What to build

在 `server/worker/worker-process.ts` 中将 `handlers` map 的 `any` 类型替换为正确的 TypeScript 接口。当前代码：

```ts
const handlers: Record<string, (payload: any, ctx: any) => Promise<unknown>> = {
```

定义 `WorkerHandlerContext` 接口和 `WorkerHandler<T>` 泛型类型。各 task handler 函数的参数签名从 `(payload: any, ctx: any)` 改为具体的 payload 类型 + `WorkerHandlerContext`。删除 `eslint-disable` 注释。

## Acceptance criteria

- [ ] `server/worker/worker-process.ts` 中无 `any` 类型（无 `as any`、无 `: any`）
- [ ] 无 `eslint-disable @typescript-eslint/no-explicit-any` 注释
- [ ] handler map 使用 `WorkerHandler` 或 `WorkerHandler<T>` 类型
- [ ] 各 task handler（embedding, vector-index, graph-layout, pdf-parse）使用具体 payload 类型
- [ ] TypeScript strict 编译通过

## Blocked by

None — can start immediately.

## Execution

**批次**: 第一批（基础设施 + Bug 修复）
**优先级**: P0
**User Stories**: #10
