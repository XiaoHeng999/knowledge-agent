# 05-07: Daily Digest Synthesis

## Parent

`plans/05-ai-news-aggregator-prd.md` — Phase 2: AI Processing

## What to build

构建每日日报合成服务：每天定时将过去 24h 的 Medium-tier 条目聚合为一份结构化日报。

**日报服务** `createNewsDigestService(deps)`：
- 调度：每天早上 6:00 AM（本地时间）对每个有 Medium 条目的 domain 触发一次
- 集成到 Source Scheduler 的 tick 循环中（与 source polling 共用 60 秒 tick）
- 每个 tick 检查是否有 domain 需要生成今日日报（检查 `news_digests` 是否已存在今日记录）

**处理流程**：
1. 查询该 domain 过去 24h 的 Medium-tier 条目（`tier="medium" AND published_at >= now-24h`）
2. 如果无 Medium 条目 → 跳过
3. 将所有条目的 title + snippet 拼接为 LLM 输入
4. LLM 输出结构化日报：`{ globalSummary: string, sections: [{ topic: string, summary: string, itemIds: string[] }] }`
5. 存储到 `news_digests` 表（`status="generated"`）
6. 关联 Medium 条目：更新 `news_items.digest_id`

**成本追踪**：记录 model_id, cost_usd, token_count

**IPC 通道**：
- `news:listDigests(domainId, { limit })` — 列出历史日报
- `news:getDigest(digestId)` — 获取完整日报
- `news:triggerDigest(domainId)` — 手动触发日报生成

## Acceptance criteria

- [ ] `server/services/news-digest-service.ts` 导出 `createNewsDigestService(deps)` factory
- [ ] 每天早上 6:00 AM 自动为每个 domain 检查是否需要生成日报
- [ ] 正确收集过去 24h 的 Medium-tier 条目
- [ ] 无 Medium 条目时跳过，不创建空日报
- [ ] LLM 输出包含 `globalSummary` + 分组的 `sections`（每 section 有 topic, summary, itemIds）
- [ ] `news_digests` 表存储完整日报，`status="generated"`
- [ ] `news_items.digest_id` 正确关联到对应日报
- [ ] 成本追踪：记录 model_id, cost_usd, token_count
- [ ] IPC 通道 `news:listDigests`、`news:getDigest`、`news:triggerDigest` 可用
- [ ] 同一 domain 同一天不重复生成
- [ ] `tests/server/services/news-digest-service.test.ts` 覆盖：调度触发、Medium 收集、空队列跳过、日报存储、成本记录、幂等性
- [ ] TypeScript strict 编译无错误

## Blocked by

- [05-05](./05-05-ai-tiering-service.md) — 需要 tiering 完成，才有 Medium 条目可聚合

## Execution

**批次**: Phase 2
**优先级**: P1
**User Stories**: #14, #16
