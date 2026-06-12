# 05-10: Notifications + Welcome Back + Unread Badges

## Parent

`plans/05-ai-news-aggregator-prd.md` — Phase 3: Notifications

## What to build

构建多通道通知系统，确保用户不会错过重要新闻。

**1. 系统 Notification（macOS/Windows）**：
- 触发条件：AI Tiering 将条目标记为 High-tier 且摘要生成完成后
- 使用 Electron `Notification` API
- 通知内容：标题 = 新闻标题，正文 = AI 摘要第一行
- 点击行为：`focus` app 窗口 + 导航到 `/news?item={itemId}`
- 防止通知轰炸：同一 source 在 5 分钟内最多触发 1 次通知
- Domain 设置中可配置通知级别（all / important-only / none）

**2. 欢迎回来摘要卡片**：
- 显示条件：用户打开 News 页面时，存在 `is_read=false` 的条目 且 用户上次访问 News 页面超过 4 小时
- 内容："X updates since your last visit, Y marked as important"
- 提供 "View important" 按钮（筛选到 High tier）
- 提供 "Dismiss" 按钮
- 关闭后不再出现，直到下次满足 4 小时间隔条件
- 最后访问时间存储在 `localStorage` 或 `settings` 表

**3. 未读 Badge 完善**：
- 侧边栏 "News" 图标的红色 badge 显示未读总数
- Domain tab "News" 的 badge 显示该 Domain 未读数
- 标记已读后 badge 实时更新
- 使用 `news-store` 的 `unreadCount` 响应式状态

**4. 通知设置**：
- Domain 设置新增 "Notification Level" 选项：All / Important Only / None
- 存储在 domain config 或 `settings` 表

## Acceptance criteria

- [ ] High-tier 条目处理完成后触发 Electron `Notification`
- [ ] 通知标题 = 新闻标题，正文 = AI 摘要第一行（截断至合理长度）
- [ ] 点击通知 → focus 窗口 + 导航到 `/news?item={itemId}` + 自动展开该条目
- [ ] 同一 source 5 分钟内最多 1 次通知（防止轰炸）
- [ ] Domain 设置可配置通知级别（all / important-only / none）
- [ ] 欢迎回来卡片在满足条件时自动显示在时间线顶部
- [ ] 卡片显示正确数量（总更新数 + 重要数）
- [ ] "View important" 按钮切换 tier filter 到 High
- [ ] "Dismiss" 关闭卡片，4 小时内不再出现
- [ ] 侧边栏 badge 正确反映 `unreadCount`
- [ ] Domain tab badge 正确反映该 Domain 未读数
- [ ] 标记已读后 badge 实时更新（无页面刷新）
- [ ] macOS 和 Windows 上通知行为正确（Electron Notification API 跨平台）
- [ ] TypeScript strict 编译无错误

## Blocked by

- [05-08](./05-08-global-news-page-timeline-ui.md) — 需要新闻页面 UI 来放置欢迎卡片和接收导航
- [05-06](./05-06-summary-generation-kg-integration.md) — 通知触发依赖 High-tier 摘要完成

## Execution

**批次**: Phase 3
**优先级**: P1
**User Stories**: #28, #29, #30, #31, #32
