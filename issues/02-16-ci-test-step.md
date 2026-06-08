# 02-16: CI 添加 pnpm test 步骤

## Parent

`plans/02-grill-audit-bugs-gaps-quality.md` — ID-15（CI 部分）

## What to build

在 `.github/workflows/build.yml` 的 `lint-and-typecheck` job 中添加 `pnpm run test` 步骤，在 lint 和 typecheck 之后执行。当前 CI 只跑 lint + typecheck，从不执行测试——即使已有的 2 个测试文件损坏也不会被发现。

## Acceptance criteria

- [ ] CI workflow 中 `lint-and-typecheck` job 包含 `pnpm run test` 步骤
- [ ] test 步骤在 lint 和 typecheck 之后执行
- [ ] 测试失败时整个 job 失败，阻止合并
- [ ] 本地 `pnpm run test` 命令正常工作

## Blocked by

None — can start immediately.

## Execution

**批次**: 贯穿性（持续进行）
**优先级**: P0
**User Stories**: #17
