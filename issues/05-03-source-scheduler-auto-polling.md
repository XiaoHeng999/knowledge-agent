# 05-03: Source Scheduler + Auto RSS Polling

## What to build

构建自动 RSS 轮询调度器，激活已有的死配置字段（`pollingIntervalHours`、`autoImport`），实现 hybrid 模式的核心调度逻辑。

**调度器服务** `createNewsSourceScheduler(deps)` — 遵循 `createResearchScheduler` 的 factory 模式：
- 60 秒 tick 间隔（复用 Research Scheduler 的 `setInterval` 模式）
- 每个 tick：查询所有 enabled 的 `news_sources`，筛选 `last_polled_at + polling_interval_hours <= now` 的源
- 对每个到期源执行：
  1. 调用 `parseRssFeed`（复用 import-pipeline）解析 feed
  2. 对比最新条目 `pubDate` vs `last_polled_at`，检测增量
  3. 无新条目 → 记录 `source_poll_log(status="no_changes")`，跳过
  4. 有新条目 → 对每个新条目：通过 `fetchAndExtractUrl` 获取正文（回退到 RSS snippet），创建 `news_items` 行（`tier=null`），记录 `source_poll_log(status="new_items")`
  5. 更新 `last_polled_at`
- 每个 source 同一时间只允许一个活跃 poll（`Map<sourceId, AbortController>`）
- 失败处理：记录 `source_poll_log(status="error")`，下次 tick 自然重试

**IPC 集成**：
- `news:triggerPoll(sourceId)` 调用调度器的手动触发方法
- `news:getPollLog(sourceId, { limit })` 读取轮询日志

**Electron 主进程集成**：在 `main.ts` 的 `app.whenReady()` 中启动调度器，`will-quit` 中停止。

## Acceptance criteria

- [ ] `server/services/news-source-scheduler.ts` 导出 `createNewsSourceScheduler(deps)` factory，返回 `{ start, stop, triggerPoll, getPollLog }` 方法
- [ ] 60 秒 tick 间隔，每次 tick 正确筛选到期源（`last_polled_at + interval <= now`）
- [ ] 调用 `parseRssFeed` 解析 RSS，对比 `pubDate` 检测新条目
- [ ] 新条目通过 `fetchAndExtractUrl` 获取正文，创建 `news_items` 行（`tier=null, is_read=false`）
- [ ] 去重：同一 source 的相同 URL 不重复创建
- [ ] 无新条目时记录 `source_poll_log(status="no_changes")`
- [ ] 失败时记录 `source_poll_log(status="error")`，不阻塞其他源
- [ ] 每个 source 同一时间只有一个活跃 poll
- [ ] `electron/main.ts` 在 `app.whenReady()` 启动调度器，`will-quit` 停止
- [ ] `tests/server/services/news-source-scheduler.test.ts` 覆盖：tick 触发、pubDate 检测、增量拉取、去重、错误处理、并发控制
- [ ] 测试复用 research-scheduler 的 factory DI + mock DB 模式
- [ ] TypeScript strict 编译无错误

## Blocked by

- [05-01](./05-01-schema-migration-repos.md) — 需要 `news_sources`、`news_items`、`source_poll_log` 表
- [05-02](./05-02-preset-sources-crud.md) — 需要源管理 IPC 和 preset 数据

## Execution

**批次**: Phase 1
**优先级**: P0
**User Stories**: #7, #8, #9, #10, #11
