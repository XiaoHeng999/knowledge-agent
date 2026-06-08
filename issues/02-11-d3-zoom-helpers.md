# 02-11: D3 zoom helpers 消除 force-graph any

## Parent

`plans/02-grill-audit-bugs-gaps-quality.md` — ID-10

## What to build

新建 `src/components/graph/d3-zoom-helpers.ts`，封装 D3 zoom 操作，消除 `force-graph.tsx` 中的 7 处 `as any` 和 `eslint-disable` 注释。

封装以下函数：
- `attachZoomBehavior(selection, container, callbacks)` — 绑定 zoom 到 SVG selection
- `zoomIn(selection, scale)` / `zoomOut(selection, scale)` — 缩放控制
- `zoomReset(selection)` — 重置到初始视图

内部通过 D3 泛型正确处理 `Selection<SVGSVGElement, unknown, null, undefined>` 类型，对外暴露无 `any` 的简洁接口。

## Acceptance criteria

- [ ] `src/components/graph/d3-zoom-helpers.ts` 存在
- [ ] `force-graph.tsx` 中无 `as any` 强转
- [ ] `force-graph.tsx` 中无 `eslint-disable @typescript-eslint/no-explicit-any` 注释
- [ ] 缩放、平移、重置功能与修改前行为一致
- [ ] TypeScript strict 编译通过

## Blocked by

None — can start immediately.

## Execution

**批次**: 第四批（代码质量）
**优先级**: P2
**User Stories**: #11
