# 05-02: Preset Source Library + Source CRUD

## Parent

`plans/05-ai-news-aggregator-prd.md` — Phase 1: Source Management

## What to build

构建源管理的完整端到端路径：从 preset 源库到 IPC 通道到前端 store。

1. **Preset Source Library** — 一个 TS 常量，按 category 组织所有预设 AI/Agent 源：
   - Academic: arXiv cs.AI, arXiv cs.CL, arXiv cs.LG, Papers With Code
   - Enterprise: OpenAI Blog, Anthropic News, Google DeepMind Blog, Meta AI Blog, Microsoft Research Blog
   - Individual: Matt Pocock Blog, Simon Willison's Weblog, Lilian Weng Blog, Chips and Cheese
   - Community: HackerNews, Reddit r/MachineLearning, Reddit r/LocalLLaMA, GitHub Trending, Dev.to AI tag
   - 每个 preset 条目匹配 `news_sources` 表 schema

2. **Source CRUD IPC 通道** — 新增 `news` 通道域：
   - `news:listSources(domainId)` — 返回该 domain 下所有源（preset + custom）
   - `news:addSource(domainId, { name, type, url, category, pollingIntervalHours })` — 添加自定义源
   - `news:updateSource(sourceId, { enabled?, pollingIntervalHours?, ... })` — 更新源配置
   - `news:removeSource(sourceId)` — 删除源（仅限 custom，preset 只能 disable）
   - `news:triggerPoll(sourceId)` — 手动触发立即轮询
   - `news:getPollLog(sourceId, { limit })` — 查看轮询日志

3. **Domain 创建集成** — 当从模板创建 Domain 时，根据模板 category 自动插入匹配的 preset sources 到 `news_sources` 表（`is_preset=true`）

4. **前端 store** — `news-store.ts` 提供 `listSources`、`addSource`、`updateSource`、`removeSource`、`triggerPoll`

5. **通道定义** — `src/lib/ipc/channels/news.ts` + `IpcChannelMap` 注册 + `server/ipc/routes.ts` 路由注册

## Acceptance criteria

- [ ] `server/services/preset-sources.ts` 导出按 category 组织的预设源常量，至少覆盖 4 个 category 共 17+ 个源
- [ ] 每个 preset 源包含：name, type, url, category, pollingIntervalHours, autoImport 默认值
- [ ] IPC 通道 `news:*` 全部定义在 `src/lib/ipc/channels/news.ts`，类型注册到 `IpcChannelMap`
- [ ] `server/ipc/routes.ts` 新增 `news` 域路由（listSources, addSource, updateSource, removeSource, triggerPoll, getPollLog）
- [ ] `server/ipc/handlers/news-handler.ts` 实现所有 handler，preset 源只能 disable 不能删除
- [ ] Domain 创建流程（domain-handler）集成 preset source 自动插入
- [ ] `electron/preload.ts` 暴露 `window.api.news.*` 方法
- [ ] `src/stores/news-store.ts` 提供 source CRUD 方法和 loading/error 状态
- [ ] `tests/server/services/news-handler.test.ts` 覆盖 CRUD + preset 保护逻辑
- [ ] TypeScript strict 编译无错误

## Blocked by

- [05-01](./05-01-schema-migration-repos.md) — 需要 `news_sources` 表和 repository

## Execution

**批次**: Phase 1
**优先级**: P0
**User Stories**: #1, #2, #3, #4, #5, #6
