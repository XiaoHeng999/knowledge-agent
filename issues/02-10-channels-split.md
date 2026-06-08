# 02-10: channels.ts 按域拆分为目录

## Parent

`plans/02-grill-audit-bugs-gaps-quality.md` — ID-08

## What to build

将 `src/lib/ipc/channels.ts`（1311 行）拆分为 `src/lib/ipc/channels/` 目录结构。每个域一个文件，`index.ts` 统一导出并组装 `IpcChannelMap` 联合类型。共享类型（如 `KnowledgeNode`, `ModelInfo` 等）放入 `shared.ts`。

拆分为 21 个文件：`index.ts` + 19 个域文件 + `shared.ts`。

TypeScript module resolution 会自动将 `import { ... } from '@/lib/ipc/channels'` 解析到 `channels/index.ts`，所有消费者无需改 import path。需验证 esbuild 和 Turbopack 的 resolve 配置兼容。

## Acceptance criteria

- [ ] `src/lib/ipc/channels.ts` 文件被 `src/lib/ipc/channels/` 目录替代
- [ ] 每个域的 channel 常量和类型在独立文件中
- [ ] `IpcChannelMap` 联合类型在 `index.ts` 中正确组装
- [ ] 所有消费者的 import path 不需要修改
- [ ] TypeScript strict 编译通过
- [ ] esbuild（electron/server）和 Turbopack（Next.js）构建通过

## Blocked by

None — can start immediately.

## Execution

**批次**: 第四批（代码质量）
**优先级**: P2
**User Stories**: #9
