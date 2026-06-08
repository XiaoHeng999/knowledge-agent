# 02-14: file-map.md 重写

## Parent

`plans/02-grill-audit-bugs-gaps-quality.md` — ID-13

## What to build

基于实际代码库结构完整重写 `docs/file-map.md`。当前 file-map 存在多处严重不一致。

**需修正项**：
- 删除不存在的文件：`server/db/repositories/sources.ts`, `server/db/repositories/timeline-entries.ts`
- 补充遗漏文件：`inbox-items.ts`, `predictions.ts`, `002_skill_executions.ts`, `model-resolver.ts`, `session-context.ts`, 10 个 UI 组件, `global-error.tsx` 等
- 修正目录归属：`paths.ts`, `provider.ts`, `domain-dirs.ts`, `markdown-parser.ts` 从 `server/lib/` 改为 `server/fs/`
- 删除幽灵目录：`src/components/research/`
- 反映 02-10 的 channels 拆分（如果已完成）

## Acceptance criteria

- [ ] file-map 中列出的所有文件在磁盘上存在
- [ ] 磁盘上的关键源文件在 file-map 中都有记录
- [ ] 目录归属全部正确（无 `server/lib/` 下错列 `server/fs/` 文件的情况）
- [ ] 关键文件速查表和 IPC 通信链路描述与代码一致

## Blocked by

- 02-10（channels 拆分，需反映新目录结构）
- 02-12（timeline 拆分，需反映新组件目录）

## Execution

**批次**: 第四批（代码质量）
**优先级**: P2
**User Stories**: #14
