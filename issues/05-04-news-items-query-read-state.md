# 05-04: News Items Query + Read State

## Parent

`plans/05-ai-news-aggregator-prd.md` — Phase 1: Items API

## What to build

构建新闻条目的查询和管理端到端路径：IPC 通道 → 前端 store，使用户能够浏览、筛选和标记已读。

**IPC 通道**（在 05-02 的 `news` 通道域中新增）：
- `news:listItems({ domainId?, tier?, sourceId?, limit, offset })` — 分页查询，支持按 domain/tier/source 过滤
- `news:getItem(itemId)` — 获取单条完整内容
- `news:markRead(itemId)` — 标记单条已读
- `news:markAllRead(domainId?)` — 批量标记已读（domainId 为空时标记所有）

**前端 store 扩展** — `news-store.ts` 新增：
- `items` 列表 + 分页状态（`hasMore`, `totalCount`）
- `filters`（tier, sourceId, domainId）
- `unreadCount`（从 `countUnread` 获取）
- `loadItems()`, `loadMore()`, `refreshItems()`
- `markRead()`, `markAllRead()`
- loading / error 状态管理

**Preload 暴露**：`window.api.news.listItems`, `getItem`, `markRead`, `markAllRead`

## Acceptance criteria

- [ ] IPC 通道 `news:listItems` 支持按 domain/tier/source 过滤 + limit/offset 分页
- [ ] IPC 通道 `news:getItem` 返回完整条目（含 full_content, ai_summary）
- [ ] IPC 通道 `news:markRead` 更新 `is_read=true`
- [ ] IPC 通道 `news:markAllRead` 支持按 domain 过滤批量更新
- [ ] `news-store.ts` 提供 `items`, `filters`, `unreadCount`, `loadItems`, `loadMore`, `markRead`, `markAllRead`
- [ ] store 正确处理分页（append 而非 replace）
- [ ] `preload.ts` 暴露所有新方法
- [ ] `tests/server/db/repositories/news-items.test.ts` 覆盖查询和分页（可合并在 05-01 中已有的测试）
- [ ] TypeScript strict 编译无错误

## Blocked by

- [05-01](./05-01-schema-migration-repos.md) — 需要 `news_items` 表和 repository

## Execution

**批次**: Phase 1
**优先级**: P1
**User Stories**: #10, #28
