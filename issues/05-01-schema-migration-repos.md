# 05-01: Schema + Migration + Repositories

## Parent

`plans/05-ai-news-aggregator-prd.md` — Phase 1: Data Layer

## What to build

为 News Aggregator 创建完整的数据库基础设施层：4 张新表（`news_sources`、`news_items`、`news_digests`、`source_poll_log`）的 schema 定义、第 5 号 migration、以及每张表对应的 typed repository（含 `BaseRepository` 白名单防注入）。所有 repository 通过 `DatabaseService` 注册并提供给上层服务使用。

这是整个 News 功能的基础层，后续所有 issue（05-02 ~ 05-10）都直接或间接依赖它。

### 表结构要点

**`news_sources`** — 每个 domain 的 RSS/web 源配置：
- `domain_id FK → domains.id`，`type`（"rss" / "web"），`category`（"academic" / "enterprise" / "individual" / "community"）
- `polling_interval_hours`，`auto_import`，`is_preset`，`enabled`
- `last_polled_at`，`last_error` 用于调度器判断

**`news_items`** — 拉取到的新闻条目：
- `source_id FK → news_sources.id`，`domain_id FK → domains.id`
- `url`（unique per source）用于去重
- `tier`（"high" / "medium" / "low" / null），`ai_summary`，`ai_tags`（JSON）
- `is_read` 用于未读计数，`knowledge_node_id FK → knowledge_nodes.id` 用于 KG 关联
- `digest_id FK → news_digests.id` 用于 Medium 条目归入日报

**`news_digests`** — 每日合成的日报：
- `domain_id`，`date`（YYYY-MM-DD），`sections`（JSON: `[{topic, summary, item_ids}]`）
- `model_id`，`cost_usd`，`token_count` 用于成本追踪

**`source_poll_log`** — 每次轮询的记录：
- `source_id`，`status`（"success" / "error" / "no_changes" / "new_items"）
- `items_found`，`items_new`，`duration_ms`

## Acceptance criteria

- [ ] `server/db/schema.ts` 新增 `NEWS_SOURCES_COLUMNS`、`NEWS_ITEMS_COLUMNS`、`NEWS_DIGESTS_COLUMNS`、`SOURCE_POLL_LOG_COLUMNS` 白名单常量及对应 `*Row` 类型
- [ ] `server/db/migrations/005-news-aggregator.ts` 创建 4 张表（含外键、索引：`news_sources(domain_id, enabled)`、`news_items(source_id, domain_id, tier, is_read, published_at)`、`news_digests(domain_id, date)`、`source_poll_log(source_id, polled_at)`）
- [ ] MigrationRunner 可正确执行 005 migration（从空库或已有库均可）
- [ ] `server/db/repositories/news-sources.ts` 提供 CRUD：`create`、`findById`、`findByDomainId`、`findEnabled`、`update`、`remove`、`findByUrl`
- [ ] `server/db/repositories/news-items.ts` 提供查询：`create`、`findById`、`findByDomainId`、`findByTier`、`findBySourceId`、`findUnread`、`countUnread`、`markRead`、`markAllRead`、`updateTier`、`updateSummary`
- [ ] `server/db/repositories/news-digests.ts` 提供：`create`、`findByDomainAndDate`、`updateStatus`
- [ ] `server/db/repositories/source-poll-log.ts` 提供：`create`、`findBySourceId`（带 limit）
- [ ] `server/db/index.ts` 的 `DatabaseService` 注册所有新 repository 实例
- [ ] `tests/server/db/repositories/news-sources.test.ts` 覆盖 CRUD + domain 过滤
- [ ] `tests/server/db/repositories/news-items.test.ts` 覆盖 tier/read/domain 查询 + 分页
- [ ] TypeScript strict 编译无错误

## Blocked by

None — 可立即开始。

## Execution

**批次**: Phase 1 — 基础设施
**优先级**: P0
**User Stories**: 基础层，无直接 user story，支撑所有后续 issue
