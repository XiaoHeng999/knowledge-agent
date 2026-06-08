# 02-12: timeline/page.tsx 子组件抽取

## Parent

`plans/02-grill-audit-bugs-gaps-quality.md` — ID-11

## What to build

将 `src/app/(main)/timeline/page.tsx`（760 行）中的内联子组件抽取到 `src/components/timeline/` 目录：

- `timeline-event-list.tsx` — 事件列表 + 筛选
- `timeline-prediction-panel.tsx` — 预测卡片 + 准确率
- `timeline-trend-analysis.tsx` — 趋势分析图表
- `timeline-filters.tsx` — 时间范围 + 类型筛选器

page.tsx 只保留数据获取和布局编排，目标缩减到 200 行以内。

## Acceptance criteria

- [ ] `src/components/timeline/` 目录存在，包含至少 4 个子组件文件
- [ ] `timeline/page.tsx` 行数 < 250 行
- [ ] 页面功能与拆分前完全一致
- [ ] 无内联 CSS 样式残留在 page.tsx 中

## Blocked by

None — can start immediately.

## Execution

**批次**: 第四批（代码质量）
**优先级**: P2
**User Stories**: #12
