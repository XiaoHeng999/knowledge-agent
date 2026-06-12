# 05-05: AI Tiering Service

## Parent

`plans/05-ai-news-aggregator-prd.md` — Phase 2: AI Processing

## What to build

构建 AI 分级打分服务：当 Source Scheduler 创建了新的 `news_items`（`tier=null`）后，自动触发 AI 批量打分，将条目分为 High/Medium/Low 三个等级。

**Tiering 服务** `createNewsTieringService(deps)`：
- 触发条件：`news_items` 中存在 `tier=null AND processed_at IS NULL` 的条目
- 批量处理：每次最多取 10 条未处理条目，合并为一次 LLM 调用降低成本
- 输入：每条 item 的 title + snippet（≤300 tokens/条）
- 输出：每条 item 返回 `{ tier: "high"|"medium"|"low", reason: string, tags: string[] }`
- System prompt 评估维度：novelty（新颖性）、domain relevance（领域相关性）、potential impact（潜在影响）、source authority（来源权威性）
- 模型选择：使用 domain 的 `default_summary_model`，回退到最便宜的可用模型（与 Research Scheduler 相同逻辑）
- 成本追踪：复用 `createTrackerCostEstimator` 模式，记录每批的 token 数和 cost

**触发方式**：
- Source Scheduler 拉取新条目后自动调用 tiering
- 也支持手动触发 `news:tierItems({ domainId? })` IPC 通道

**数据更新**：
- 更新 `news_items` 的 `tier`, `tier_reason`, `ai_tags`, `processed_at`
- Low-tier 条目：仅存标题，`full_content` 可不获取以节省带宽

## Acceptance criteria

- [ ] `server/services/news-tiering-service.ts` 导出 `createNewsTieringService(deps)` factory
- [ ] 自动检测 `tier=null` 的条目，批量处理（≤10 条/批）
- [ ] LLM 输入包含 title + snippet，输出包含 tier + reason + tags
- [ ] System prompt 覆盖 4 个评估维度（novelty, relevance, impact, authority）
- [ ] 正确更新 `news_items.tier`, `tier_reason`, `ai_tags`, `processed_at`
- [ ] Low-tier 条目标记 `processed_at` 但不获取 full_content
- [ ] 模型选择：优先 domain `default_summary_model`，回退到最便宜可用
- [ ] 成本追踪：每批记录 token_count 和 cost_usd
- [ ] Source Scheduler 拉取新条目后自动触发 tiering
- [ ] IPC 通道 `news:tierItems` 支持手动触发
- [ ] `tests/server/services/news-tiering-service.test.ts` 覆盖：批量分组、tier 赋值、成本记录、模型回退、空队列处理
- [ ] TypeScript strict 编译无错误

## Blocked by

- [05-03](./05-03-source-scheduler-auto-polling.md) — 需要 Source Scheduler 产生 `tier=null` 的条目

## Execution

**批次**: Phase 2
**优先级**: P0
**User Stories**: #12, #15, #17
