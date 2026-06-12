# 05-09: Domain News Tab + Source Management UI

## Parent

`plans/05-ai-news-aggregator-prd.md` — Phase 3: UI

## What to build

构建 Domain 级别的新闻视图和源管理 UI，使用户能在 Domain 内查看过滤后的新闻并管理信息源。

**1. Domain News Tab `/domain/[id]/news`**：
- 复用 05-08 的时间线组件，`domainId` 硬编码为当前 Domain
- 页面分为两个区域：
  - 左侧/主区域：Domain 新闻时间线（与全局页相同的卡片组件）
  - 右侧/面板：源管理设置

**2. 源管理设置面板**：
- Preset 源列表：按 category 分组（Academic / Enterprise / Individual / Community）
  - 每个源显示：名称、URL、上次轮询时间、状态指示灯（绿=正常 / 黄=有错误 / 灰=已禁用）
  - 启用/禁用 toggle 开关
- 自定义源区域：
  - "Add Source" 按钮 → 弹出对话框（输入 name + URL，自动检测 RSS/web）
  - 已添加的自定义源可编辑（名称、轮询间隔）或删除
- 轮询控制：
  - 每个源旁边有 "Poll Now" 按钮
  - 展开/折叠查看 `source_poll_log`（最近 10 条记录）

**3. Domain 导航集成**：
- Domain 详情页的 tab 栏新增 "News" tab（与 Chat、Knowledge 等并列）

## Acceptance criteria

- [ ] `/domain/[id]/news` 路由可访问，正确过滤当前 Domain 的新闻
- [ ] 时间线组件复用 05-08 的实现，仅 domainId 不同
- [ ] 源管理面板按 category 分组展示 preset 源
- [ ] 每个 preset 源有 enable/disable toggle，状态持久化
- [ ] "Add Source" 对话框支持输入 name + URL，自动检测 RSS 类型
- [ ] 自定义源可编辑轮询间隔和名称，可删除
- [ ] "Poll Now" 按钮触发 `news:triggerPoll`，显示 loading 状态
- [ ] source_poll_log 折叠面板显示最近 10 条记录（时间、状态、新条目数）
- [ ] Domain tab 栏新增 "News" 入口
- [ ] 样式与项目已有设计语言一致
- [ ] TypeScript strict 编译无错误

## Blocked by

- [05-08](./05-08-global-news-page-timeline-ui.md) — 复用时间线组件和卡片组件

## Execution

**批次**: Phase 3
**优先级**: P1
**User Stories**: #23, #27
