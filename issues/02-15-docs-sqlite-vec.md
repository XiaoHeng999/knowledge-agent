# 02-15: 文档 SQLite-vss → SQLite-vec 更新

## Parent

`plans/02-grill-audit-bugs-gaps-quality.md` — ID-14

## What to build

在 `docs/projection_design_planning/agent-claw-v2.md` 中将所有 `SQLite-vss` / `sqlite-vss` 引用替换为 `SQLite-vec` / `sqlite-vec`。代码实现使用的是 SQLite-vec，文档需与之对齐。

## Acceptance criteria

- [ ] `agent-claw-v2.md` 中无 `SQLite-vss` / `sqlite-vss` 引用
- [ ] 所有向量数据库相关描述使用 `SQLite-vec` / `sqlite-vec`
- [ ] 其他文档中如有相同问题也一并修正

## Blocked by

None — can start immediately.

## Execution

**批次**: 第四批（代码质量）
**优先级**: P2
**User Stories**: #15
