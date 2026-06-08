# 02-13: Server console → Logger 迁移

## Parent

`plans/02-grill-audit-bugs-gaps-quality.md` — ID-12

## What to build

将 server 端 35 处 `console.log/error/warn` 调用迁移到项目的 `Logger` 服务。两阶段处理：

**阶段 1（不改动）**：Logger 就绪前（`electron/main.ts` 初始化、`server/db/` 初始化），保留 `console`。在文件顶部加注释 `// Note: Logger not yet available during early init`。

**阶段 2（迁移）**：Logger 就绪后的模块替换为 Logger 实例调用。`Logger` 构造函数增加 `module: string` 参数，每个模块用自己的 logger 实例。涉及文件：

- `server/ipc/handler.ts`（3 处）
- `server/services/research-scheduler.ts`（7 处）
- `server/worker/worker-bridge.ts`（6 处）
- `server/db/migrations/runner.ts`（5 处）
- `server/db/index.ts`（2 处）
- `server/services/skill-engine.ts`（2 处）
- `electron/main.ts`（4 处，阶段 1 保留）
- `server/services/knowledge-graph.ts`（3 处）
- `server/ipc/handlers/chat-handler.ts`（1 处）

## Acceptance criteria

- [ ] Logger 就绪后的模块中无直接 `console.log/error/warn` 调用（Logger init 前的除外）
- [ ] `Logger` 支持模块参数，日志输出包含模块名
- [ ] 所有日志进入结构化日志文件
- [ ] `electron/main.ts` 和 `server/db/` 初始化代码保留 `console` 并有注释说明

## Blocked by

None — can start immediately.

## Execution

**批次**: 第四批（代码质量）
**优先级**: P2
**User Stories**: #13
