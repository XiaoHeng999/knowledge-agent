# PRD: AI/Agent Domain News Aggregator

> **Status**: Approved
> **Created**: 2026-06-12
> **Phases**: 3 (Data+Scheduling → AI Processing → UI+Notifications)

---

## Problem Statement

AgentClaw 用户追踪 AI/Agent 领域的高速发展，目前需要手动访问 GitHub Trending、arXiv、企业博客（OpenAI、Anthropic）、个人博主（Matt Pocock、Simon Willison）和社区（HackerNews、Reddit）才能了解最新动态。这种碎片化的信息获取方式效率低、易遗漏重要更新，且无法将行业动态自动沉淀到 Domain 知识体系中。

**现状差距**：代码库中已有通用 RSS 解析器（`import-pipeline.ts`）和预配置的源 URL（`domain-config.ts`），但 `pollingIntervalHours` / `autoImport` 是死配置，从未被调度器消费。Research Scheduler 只触发 LLM 研究提示词，不拉取 RSS。用户必须手动粘贴 feed URL 才能触发拉取。

---

## Solution

构建一个全自动多源信息聚合系统：

1. **自动调度拉取**：激活已有的 `pollingIntervalHours` / `autoImport` 配置字段，新增 Source Scheduler 服务定时检测 RSS feed 变化（hybrid 模式：检测 pubDate → 有变化才完整拉取）
2. **AI 分级处理**：新条目先提取标题+摘要，AI 快速打分（高/中/低），高级立刻详细总结，中级攒入日报，低级仅存标题
3. **全链路知识沉淀**：单篇摘要 + 每日日报合成 + 分级 Knowledge Graph 入库（高级自动入库，中低级用户确认）
4. **双入口 UI**：全局新闻页聚合所有 Domain 新闻流 + Domain 内 News Tab 过滤视图，时间线+日报卡片混合展示
5. **多通道触达**：应用内未读 badge + macOS/Windows 系统通知 + 欢迎回来摘要卡片

---

## User Stories

### Source Management（源管理）

1. As a user, I want to see a curated list of preset AI/Agent sources organized by category (Academic, Enterprise, Individual, Community), so that I can quickly enable relevant sources without hunting for RSS URLs
2. As a user, I want to check/uncheck preset sources per Domain, so that each Domain only pulls news relevant to its topic
3. As a user, I want to add custom sources by entering a URL (auto-detected as RSS or web page), so that I can track sources not in the preset library
4. As a user, I want to edit or remove custom sources, so that I can manage my source list over time
5. As a user, I want to see the polling status and last-fetched timestamp for each source, so that I know the system is working
6. As a user, I want to manually trigger a poll for any source immediately, so that I don't have to wait for the next scheduled check

### Scheduling & Fetching（调度与拉取）

7. As a user, I want sources to be polled automatically on their configured interval (e.g. every 24h for arXiv, every 4h for HackerNews), so that I don't need to manually trigger fetches
8. As a user, I want the system to only fetch full content when new items are detected (via pubDate change), so that API costs and bandwidth are minimized
9. As a user, I want to configure the polling interval per source, so that high-frequency sources are checked more often
10. As a user, I want deduplication across multiple runs, so that I don't see the same article twice
11. As a user, I want the system to handle transient fetch failures gracefully (retry with backoff, log error), so that temporary network issues don't break the pipeline

### AI Processing（AI 处理）

12. As a user, I want every new item to be automatically classified as High/Medium/Low importance, so that I can focus on what matters
13. As a user, I want High-importance items to get an immediate detailed AI summary with auto-tags, so that I can understand the significance without reading the full article
14. As a user, I want Medium-importance items to be accumulated for a daily digest, so that I can scan them efficiently once per day
15. As a user, I want Low-importance items stored as title-only records, so that they're searchable but don't clutter my view
16. As a user, I want a daily digest synthesized each morning that groups all Medium items by topic with a global summary, so that I can catch up quickly
17. As a user, I want AI cost tracking for all tiering and summarization operations, so that I can monitor spending per Domain

### Knowledge Graph Integration（知识图谱关联）

18. As a user, I want High-importance news to be automatically saved as Knowledge Nodes in my Domain, so that my Chat AI is aware of current events
19. As a user, I want Medium/Low items to appear in my news feed with a "Save to Knowledge Base" action, so that I can manually promote interesting items
20. As a user, I want saved news items to be linked to existing Knowledge Nodes (via the `knowledge_edges` table), so that my knowledge graph reflects relationships between news and existing knowledge
21. As a user, I want the Knowledge Graph integration to respect the existing node types (`event`, `technology`, `person`, etc.), so that news nodes fit naturally into the graph

### News Feed UI（新闻流界面）

22. As a user, I want a global "News" page in the sidebar, so that I can see an aggregated timeline of news across all my Domains
23. As a user, I want a "News" tab within each Domain, so that I can see news filtered to that Domain's sources
24. As a user, I want news items displayed as cards in a timeline (newest first) with title, summary, source, tier badge, and timestamp, so that I can quickly scan and prioritize
25. As a user, I want to filter the timeline by tier (All / High / Medium / Low), source, and Domain, so that I can narrow down to what I care about
26. As a user, I want to click a news card to see the full AI summary and optionally open the original article in my browser, so that I can dive deeper when interested
27. As a user, I want a daily digest card auto-inserted into the timeline each morning, showing a synthesized summary grouped by topic with importance ranking, so that I can catch up in one glance
28. As a user, I want unread badges on the News sidebar icon and on Domain news tabs, so that I know when there's new content

### Notifications（通知）

29. As a user, I want High-importance news to trigger a macOS/Windows system notification, so that I'm alerted even when the app is in the background
30. As a user, I want clicking a system notification to jump directly to that news item in the app, so that I can read the summary immediately
31. As a user, I want a "Welcome back" summary card at the top of the news feed when I return after being away, showing "X updates while you were away, Y important", so that I can quickly assess what I missed
32. As a user, I want to configure notification preferences per Domain (all notifications / important only / none), so that I'm not overwhelmed by low-priority alerts

---

## Implementation Decisions

### Phase 1: Data Layer + Scheduling + Source Management

#### 1.1 New Database Tables

**`news_sources` table** — tracks configured RSS/web sources per domain:

| Column | Type | Notes |
|---|---|---|
| id | TEXT PK | UUID |
| domain_id | TEXT FK → domains.id | Which domain this source belongs to |
| name | TEXT | Display name (e.g. "arXiv cs.AI") |
| type | TEXT | `"rss"` or `"web"` |
| url | TEXT | RSS feed URL or web page URL |
| category | TEXT | `"academic"`, `"enterprise"`, `"individual"`, `"community"` |
| polling_interval_hours | INTEGER | How often to check for new items (default 24) |
| auto_import | BOOLEAN | Whether to auto-stage items into inbox |
| is_preset | BOOLEAN | Whether this is a preset source (vs user-added) |
| enabled | BOOLEAN | User can disable without deleting |
| last_polled_at | TEXT (ISO) | Timestamp of last poll |
| last_error | TEXT | Last error message, if any |
| config | TEXT (JSON) | Source-specific config (e.g. GitHub repo filter) |
| created_at | TEXT (ISO) | |
| updated_at | TEXT (ISO) | |

**`news_items` table** — stores fetched news entries:

| Column | Type | Notes |
|---|---|---|
| id | TEXT PK | UUID |
| source_id | TEXT FK → news_sources.id | Which source produced this item |
| domain_id | TEXT FK → domains.id | Domain for fast filtering |
| title | TEXT | Article title |
| url | TEXT | Original article URL (unique per source) |
| snippet | TEXT | Short text from RSS feed or extracted meta |
| full_content | TEXT | Full article markdown (null until fetched) |
| ai_summary | TEXT | AI-generated summary (null until processed) |
| ai_tags | TEXT (JSON array) | Auto-generated tags |
| tier | TEXT | `"high"`, `"medium"`, `"low"`, or `null` (unprocessed) |
| tier_reason | TEXT | AI's reasoning for the tier assignment |
| published_at | TEXT (ISO) | Original publish date from source |
| fetched_at | TEXT (ISO) | When we fetched this item |
| processed_at | TEXT (ISO) | When AI processing completed |
| is_read | BOOLEAN | Read state for badge counting |
| knowledge_node_id | TEXT FK → knowledge_nodes.id | Linked KG node (null until saved) |
| digest_id | TEXT FK → news_digests.id | Which digest this item belongs to (for medium items) |
| metadata | TEXT (JSON) | Extra data (author, image URL, etc.) |
| created_at | TEXT (ISO) | |
| updated_at | TEXT (ISO) | |

**`news_digests` table** — daily synthesized digests:

| Column | Type | Notes |
|---|---|---|
| id | TEXT PK | UUID |
| domain_id | TEXT FK → domains.id | |
| date | TEXT | YYYY-MM-DD |
| summary | TEXT | AI-generated global summary |
| sections | TEXT (JSON) | Grouped sections: `[{topic, summary, item_ids}]` |
| model_id | TEXT | Which model generated the digest |
| cost_usd | REAL | Cost of digest generation |
| token_count | INTEGER | Tokens used |
| status | TEXT | `"pending"`, `"generated"`, `"failed"` |
| created_at | TEXT (ISO) | |

**`source_poll_log` table** — tracks each poll attempt for observability:

| Column | Type | Notes |
|---|---|---|
| id | TEXT PK | UUID |
| source_id | TEXT FK → news_sources.id | |
| status | TEXT | `"success"`, `"error"`, `"no_changes"`, `"new_items"` |
| items_found | INTEGER | Total items in feed |
| items_new | INTEGER | New items not seen before |
| error_message | TEXT | |
| polled_at | TEXT (ISO) | |
| duration_ms | INTEGER | Poll duration |

#### 1.2 Source Scheduler Service

- New service: `createNewsSourceScheduler(deps)` following the same factory pattern as `createResearchScheduler`
- Uses the same 60-second `setInterval` tick mechanism from Research Scheduler
- Each tick: iterate all enabled `news_sources` where `last_polled_at + polling_interval_hours <= now`
- For each due source:
  1. Fetch and parse RSS feed (reuse `parseRssFeed` from `import-pipeline.ts`)
  2. Compare latest item `pubDate` against `last_polled_at` to detect changes
  3. If no new items → log `source_poll_log` with status `"no_changes"`, skip
  4. If new items → for each new item, create `news_items` row with tier=`null`, then trigger AI processing pipeline
  5. Update `last_polled_at` on source
- One active poll per source at a time (tracked via in-memory `Map<sourceId, AbortController>`)
- Failed polls: log error in `source_poll_log`, retry next tick (natural backoff via interval)

#### 1.3 Preset Source Library

A curated JSON/TS constant of verified AI/Agent sources, organized by category:

**Academic:**
- arXiv cs.AI RSS, arXiv cs.CL RSS, arXiv cs.LG RSS, Papers With Code RSS

**Enterprise:**
- OpenAI Blog RSS, Anthropic News, Google DeepMind Blog, Meta AI Blog, Microsoft Research Blog

**Individual:**
- Matt Pocock Blog, Simon Willison's Weblog, Lilian Weng Blog, Chips and Cheese

**Community:**
- HackerNews (RSS), Reddit r/MachineLearning, Reddit r/LocalLLaMA, GitHub Trending (via mshibanami RSS proxy), Dev.to AI tag

Each preset entry matches the `news_sources` schema. On Domain creation from template, preset sources matching the template category are auto-inserted into `news_sources` with `is_preset=true`.

#### 1.4 Source CRUD IPC

New IPC channel domain: `news`. Channels:

```
news:listSources(domainId)
news:addSource(domainId, { name, type, url, category, pollingIntervalHours })
news:updateSource(sourceId, { enabled?, pollingIntervalHours?, ... })
news:removeSource(sourceId)
news:triggerPoll(sourceId)                          // manual immediate poll
news:getPollLog(sourceId, { limit })
news:listItems({ domainId?, tier?, sourceId?, limit, offset })
news:getItem(itemId)
news:markRead(itemId)
news:markAllRead(domainId?)
```

Route registration follows existing pattern in `server/ipc/routes.ts` with `route()` helper.

### Phase 2: AI Processing Pipeline

#### 2.1 AI Tiering Service

- New service: `createNewsTieringService(deps)`
- Triggered when a new `news_item` is created with `tier=null`
- Input to LLM: item title + snippet (≤300 tokens per item)
- Batch processing: group up to 10 unprocessed items into one LLM call to reduce cost
- Output per item: `{ tier: "high"|"medium"|"low", reason: string, tags: string[] }`
- System prompt instructs the model to evaluate based on: novelty, domain relevance, potential impact, source authority
- Cost tracking: reuses `createTrackerCostEstimator` pattern from research-cost-tracker
- Model selection: uses domain's `default_summary_model`, falls back to cheapest available (same logic as Research Scheduler)

#### 2.2 Summary Generation

- Triggered for High-tier items immediately after tiering
- Input: full_content (from Readability extraction) or snippet if full fetch failed
- Output: structured summary (key points, significance, related topics) + auto-tags
- Model: domain's `default_expert_model` for quality

#### 2.3 Daily Digest Synthesis

- New service: `createNewsDigestService(deps)`
- Scheduled: runs once daily per domain (e.g. 6:00 AM local time via cron)
- Gathers all Medium-tier items from the past 24h for the domain
- If no Medium items → skip digest generation
- LLM input: all Medium item titles + snippets
- LLM output: `{ globalSummary: string, sections: [{ topic: string, summary: string, itemIds: string[] }] }`
- Stores result in `news_digests` table
- Cost tracked per digest

#### 2.4 Knowledge Graph Integration

- **Auto-save (High tier)**: After summary generation, create a `knowledge_node` with:
  - `node_type`: inferred from tags (default `"event"`)
  - `title`: news item title
  - `content`: AI summary
  - `summary`: first 200 chars of AI summary
  - `source_ids`: `[news_item.url]`
  - `status`: `"active"`
- **Manual save (Medium/Low)**: IPC endpoint `news:saveToKnowledgeBase(itemId)` creates the node on user action
- Both paths reuse `KnowledgeGraph.createNode()` and auto-generate embeddings

### Phase 3: UI + Notifications

#### 3.1 Sidebar & Navigation

- Add "News" entry in sidebar's `.sidebar__actions` section, positioned between "Research" and "Inbox"
- Route: `/news` (global) and `/domain/[id]/news` (per-domain)
- Unread count badge on sidebar icon (aggregated from `news_items.is_read=false`)

#### 3.2 Global News Page (`/news`)

- Timeline view: vertical scroll of news cards
- Each card: title, AI summary (truncated), source icon/name, tier badge (🔴 High / 🟡 Medium / ⚪ Low), relative timestamp
- Daily digest card: visually distinct (larger, colored header), inserted at the appropriate date position in the timeline
- Filters: tier dropdown, source filter, domain filter
- Click card → expand to show full summary + "Open original" link + "Save to Knowledge Base" button (for Medium/Low)

#### 3.3 Domain News Tab (`/domain/[id]/news`)

- Same timeline component as global page, pre-filtered by domain
- Source management: settings panel to enable/disable sources, add custom sources, adjust polling intervals

#### 3.4 Welcome Back Summary Card

- Shown at top of news feed when: `count(is_read=false) > 0` AND user hasn't visited news page in >4 hours
- Content: "X updates since your last visit, Y marked as important"
- Dismissible; doesn't reappear until next significant absence

#### 3.5 System Notifications

- Uses Electron `Notification` API
- Triggered when a High-tier item is processed
- Notification body: item title + first line of AI summary
- Click action: focus app window + navigate to `/news?item={itemId}`
- Configurable per-domain in Domain settings (notification level: all / important / none)

---

## Testing Decisions

### Testing Philosophy

Tests validate external behavior through dependency injection, not internal implementation details. Services are tested via their public method contracts with mock dependencies.

### Test Seams (Existing, Reused)

1. **Service factory pattern** — `createXxxService(deps)` with mock `deps` (same as research-scheduler tests)
2. **Repository pattern** — `createMockDb()` with `vi.fn()` per repository method (existing test helper)
3. **IPC channel contracts** — verify request/response shapes match `IpcChannelMap` types

### Test Seams (New, Proposed)

4. **Source Scheduler tick** — test `processDueSources()` directly with a fixed clock, verify correct poll/no-poll decisions
5. **Tiering prompt → structured output** — test with a mock LLM that returns predetermined tier JSON, verify item state transitions
6. **Digest synthesis trigger** — test the "gather Medium items → generate digest → store" flow with a mock session runner

### Test Files

| Test | Mirrors | What it validates |
|---|---|---|
| `tests/server/services/news-source-scheduler.test.ts` | `server/services/news-source-scheduler.ts` | Poll timing, pubDate detection, dedup, error handling |
| `tests/server/services/news-tiering-service.test.ts` | `server/services/news-tiering-service.test.ts` | Batch tiering, tier assignment, cost tracking |
| `tests/server/services/news-digest-service.test.ts` | `server/services/news-digest-service.ts` | Digest generation, Medium item grouping, cron trigger |
| `tests/server/db/repositories/news-sources.test.ts` | `server/db/repositories/news-sources.ts` | CRUD operations, filtering by domain/enabled |
| `tests/server/db/repositories/news-items.test.ts` | `server/db/repositories/news-items.ts` | Query by tier/domain/read state, pagination |

### Prior Art

- `tests/server/services/research-scheduler.test.ts` — exact same patterns: factory DI, mock DB, vi.hoisted, vi.waitFor
- `tests/server/services/import-pipeline.test.ts` — RSS parsing and dedup testing patterns

---

## Out of Scope

- **Real-time push notifications** (WebSocket/SSE from external sources) — polling is sufficient for the defined intervals
- **Full-text search within news items** — the existing hybrid search engine can be used later if needed; Phase 1 relies on DB queries
- **Social features** (sharing, commenting, collaborative reading) — single-user app
- **Browser extension** for one-click source adding — can be a future enhancement
- **Content recommendation engine** — tiering handles relevance; personalized ranking is out of scope
- **News source health monitoring dashboard** — poll_log table exists for debugging but no dedicated UI
- **Audio/podcast source support** — text-only for now
- **Multi-language news processing** — assume English sources; i18n of summaries is future work

---

## Further Notes

### Data Migration

- Phase 1 requires a new migration (migration 005) adding `news_sources`, `news_items`, `news_digests`, `source_poll_log` tables
- Existing `domains` config YAML files contain `sources` arrays with RSS URLs — migration script should read these and insert into `news_sources` table, marking `is_preset=true`
- The dead `autoImport` and `pollingIntervalHours` fields in YAML become the live config for `news_sources` rows

### Preset Source Maintenance

Preset sources should be periodically validated (feed still active, URL still works). This is a manual process for now — the `source_poll_log` table will surface broken feeds naturally.

### Cost Model

- Tiering: ~10 items per batch, ~300 tokens each → ~3K input tokens + ~500 output tokens per batch. With a cheap model (DeepSeek/Groq), cost is negligible (<$0.001/batch)
- Summary generation (High tier only): ~2K input + ~500 output per item, ~10-20 High items/day → ~$0.01-0.05/day
- Daily digest: ~5K input + ~1K output → ~$0.005/day
- **Total estimated cost: <$0.10/day per domain with active sources**

### Performance Considerations

- RSS polling is I/O-bound, not CPU-bound — the 60-second tick interval is sufficient
- Full content extraction (Readability) for new items should be offloaded to the Worker process (existing `worker-bridge.ts`) to avoid blocking the main process
- AI processing (tiering + summaries) is already async via SessionRunner — no special handling needed
