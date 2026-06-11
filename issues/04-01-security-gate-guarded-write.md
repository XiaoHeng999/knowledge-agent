# 04-01: Security Gate guardedWrite/guardedDelete

## Parent

`plans/04-architecture-deepening-prd.md` — Candidate 1: Security Gate Orchestration

## What to build

在 `security-gate.ts` 中新增两个深层函数，将 5 处重复的安全评估流程收归一处：

- `guardedWrite<T>(operation, executeFn)` — 处理写操作（create/update/edge）：blocked → throw，autoApprove → log audit + 执行回调，其余 → 创建 pending audit。返回 `KnowledgeWriteResponse<T>`。
- `guardedDelete(operation)` — 处理删除操作：blocked → throw，其余 → 创建 pending audit（永远不 autoApprove）。返回 `KnowledgeWriteVoidResponse`。

将 `makeAuditEntry` 辅助函数从 knowledge-handler 移入 security-gate 作为私有函数。

然后重构 knowledge-handler.ts 的 5 个 handler（createNode, updateNode, deleteNode, createEdge, deleteEdge），全部替换为 3-5 行的 thin dispatcher，直接调用 guardedWrite 或 guardedDelete。ASSESS_WRITE handler 不变（模式 C，独立评估）。

operation 构建保留在 handler 中（updateNode/deleteNode 需要先查节点获取 domainId）。

## Acceptance criteria

- [ ] `guardedWrite` 函数接受 `WriteOperation` + `executeFn` 回调，返回 `KnowledgeWriteResponse<T>`
- [ ] `guardedDelete` 函数接受 `WriteOperation`，返回 `KnowledgeWriteVoidResponse`
- [ ] blocked 操作抛出 Error，handler 不处理 blocked 分支
- [ ] autoApprove 路径：记录 audit log + 调用 executeFn + 返回 result
- [ ] pending 路径：创建 PendingAudit + 返回 pending 结果，不调用 executeFn
- [ ] delete 操作任何非 blocked 风险都走 pending，永远不 autoApprove
- [ ] knowledge-handler 的 5 个 handler 各 ~5 行，直接调用 guardedWrite/guardedDelete
- [ ] security-handler 的 ASSESS_WRITE handler 行为不变
- [ ] `makeAuditEntry` 从 knowledge-handler 移到 security-gate
- [ ] 为 guardedWrite/guardedDelete 编写测试（blocked, autoApprove, pending 三条路径）
- [ ] TypeScript strict 编译无错误
- [ ] 现有测试全部通过

## Blocked by

None — 可立即开始。

## Execution

**批次**: Phase 1
**优先级**: P0
**User Stories**: #1, #2, #3, #4, #5, #6, #7, #8, #9
