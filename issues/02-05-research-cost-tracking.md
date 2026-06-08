# 02-05: 研究调度成本追踪 — turn_end 真实 token 数据

## Parent

`plans/02-grill-audit-bugs-gaps-quality.md` — ID-02

## What to build

将研究调度的成本追踪从"字符数除以 4 估算"改为基于 LLM API 返回的真实 token 用量。

**turn_end hook 实现**：在 `research-agent-extension.ts` 的 `turn_end` hook 中，从 pi-mono SDK event 对象提取 `inputTokens` 和 `outputTokens`。通过 `session-context.ts` 的 sessionId → domainId 映射找到对应 research run，更新其 `token_count` 和 `cost_usd` 字段。成本计算从 model pricing 配置读取 `costPerMillionInput/Output`，乘以真实 token 数。

**删除估算逻辑**：移除 `research-scheduler.ts` 中的 `inputChars / 4` 估算代码段。

**预算检查调整**：`maxCostPerRunUsd` 改为研究完成后校验（而非预先估算），超出时标记 run 为 `over_budget` 但不删除结果。

前置依赖：需要先验证 pi-mono SDK `turn_end` event 的具体字段结构（打印 event 对象确认可用字段）。

## Acceptance criteria

- [ ] `turn_end` hook 从 SDK event 提取真实 token 数据
- [ ] research run 的 `cost_usd` 和 `token_count` 为 LLM API 返回的真实值
- [ ] 删除 `research-scheduler.ts` 中的字符数估算逻辑
- [ ] `maxCostPerRunUsd` 在研究完成后校验
- [ ] 超出预算时 run 被标记为 `over_budget` 状态
- [ ] 前端 Research 仪表盘显示的成本数据为真实值

## Blocked by

- 02-01（Settings Repository，需确认 session-context 的 domain 映射可靠）

## Execution

**批次**: 第二批（核心功能修复）
**优先级**: P0
**User Stories**: #2
