# 05-08: Global News Page + Timeline UI

## Parent

`plans/05-ai-news-aggregator-prd.md` — Phase 3: UI

## What to build

构建全局新闻页面和核心时间线 UI 组件，这是用户与 News Aggregator 交互的主要界面。

**1. 侧边栏入口**：
- 在 sidebar 的 `.sidebar__actions` 中，Research 和 Inbox 之间新增 "News" 按钮
- 图标：报纸/RSS 样式 SVG
- 右上角显示未读数 badge（红色圆点 + 数字，`unreadCount > 0` 时显示）
- 点击导航到 `/news`

**2. 全局新闻页 `/news`**：
- 顶部：筛选栏（tier 下拉：All/High/Medium/Low + source 筛选 + domain 筛选）
- 主体：垂直时间线滚动列表，无限滚动（loadMore）
- 每张新闻卡片包含：
  - Tier badge（🔴 High / 🟡 Medium / ⚪ Low）
  - 标题（可点击展开）
  - AI 摘要（截断显示，展开后显示完整）
  - 来源名称 + 图标
  - 相对时间（"2h ago"、"Yesterday"）
  - 操作："Open original"（外部链接）+ "Save to Knowledge Base"（Medium/Low 显示）
- 卡片展开后显示：完整 AI 摘要 + tier_reason + ai_tags

**3. 日报卡片**：
- 在时间线中，日报按日期位置插入，视觉上区别于普通卡片（更大的头部、不同背景色）
- 显示：日期 + globalSummary + sections 摘要
- 点击展开显示完整 sections

**4. 路由**：
- `src/app/(main)/news/page.tsx` — 全局新闻页
- 复用 `news-store.ts` 的 `items`, `filters`, `loadItems`, `loadMore`, `markRead`

## Acceptance criteria

- [ ] 侧边栏 "News" 按钮位于 Research 和 Inbox 之间，带 RSS 图标
- [ ] 点击导航到 `/news`，页面正确渲染
- [ ] 未读 badge 在 `unreadCount > 0` 时显示
- [ ] 时间线按 `published_at` 降序排列，支持无限滚动加载
- [ ] 新闻卡片正确显示 tier badge、标题、截断摘要、来源、时间
- [ ] 点击卡片展开显示完整 AI 摘要 + tier_reason + tags
- [ ] "Open original" 在新窗口打开原始 URL
- [ ] "Save to Knowledge Base" 按钮在 Medium/Low 卡片展开时可见，点击调用 `saveToKnowledgeBase`
- [ ] 筛选栏支持按 tier/source/domain 过滤，切换时重新加载
- [ ] 日报卡片视觉区别于普通卡片，正确插入时间线位置
- [ ] 点击新闻卡片自动标记已读（`is_read=true`）
- [ ] 样式跟随项目已有的 CSS 方案（参考 Inbox 页面和 Research 页面的设计语言）
- [ ] TypeScript strict 编译无错误

## Blocked by

- [05-04](./05-04-news-items-query-read-state.md) — 需要 news-store 的查询和 read state 方法
- [05-07](./05-07-daily-digest-synthesis.md) — 日报卡片需要 digest 数据

## Execution

**批次**: Phase 3
**优先级**: P0
**User Stories**: #22, #24, #25, #26
