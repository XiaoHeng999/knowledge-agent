# 02-03: WebGL 图谱节点改为圆形渲染

## Parent

`plans/02-grill-audit-bugs-gaps-quality.md` — ID-03

## What to build

将 `webgl-graph.tsx` 中的节点绘制从两个三角形（矩形/菱形）改为三角形扇（TRIANGLE_FAN）绘制近似圆。每个节点用 16 段三角形片段构成圆形轮廓。选中节点的高亮外环同样改为圆形绘制。

当前绘制逻辑（两个三角形拼成方块）：

```
cx-r, cy-r → cx+r, cy-r → cx,cy（上三角）
cx-r, cy+r → cx+r, cy+r → cx,cy（下三角）
```

改为围绕圆心的 TRIANGLE_FAN：

```
cx, cy（圆心）→ cx + r*cos(θ), cy + r*sin(θ)（16个等分点）
```

验证点击检测（`handleCanvasClick`）的圆形距离判断与渲染形状匹配。

## Acceptance criteria

- [ ] 节点在 WebGL 模式下渲染为圆形（非方块/菱形）
- [ ] 选中节点的高亮环也是圆形
- [ ] 点击检测与渲染形状一致（圆形距离判断）
- [ ] 1000+ 节点场景下性能无明显退化（使用 16 段而非 32 段）
- [ ] 拖拽、缩放、平移交互不受影响

## Blocked by

None — can start immediately.

## Execution

**批次**: 第一批（基础设施 + Bug 修复）
**优先级**: P0
**User Stories**: #3
