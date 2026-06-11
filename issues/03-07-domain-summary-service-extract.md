# 03-07: Domain Summary Service 抽取

## Parent

`plans/03-architecture-deepening-ipc-sessionrunner-framework.md` — Phase 2

## What to build

从 `framework-engine.ts` 中抽取领域摘要和三层记忆统计相关的 2 个函数到独立的 `server/services/domain-summary-service.ts` 模块。

迁移的函数：`generateDomainSummary`、`getMemoryStats`。新模块通过 `getDatabaseService()`、`getPiMonoWrapper()` 和 `SessionRunner` 获取依赖，与 framework-engine 无直接导入关系。

`framework-handler.ts` 中的摘要相关 handler（GENERATE_SUMMARY、GET_MEMORY_STATS）改为从 `domain-summary-service` 导入。

## Acceptance criteria

- [ ] `server/services/domain-summary-service.ts` 存在并导出 `generateDomainSummary`、`getMemoryStats`
- [ ] `framework-engine.ts` 中不再包含摘要/记忆相关函数（已迁移）
- [ ] `framework-handler.ts` 的摘要 handler 改为从 domain-summary-service 导入
- [ ] 摘要生成和记忆统计功能行为完全不变
- [ ] TypeScript strict 编译无错误
- [ ] 现有测试全部通过

## Blocked by

- 03-03（framework-engine 已迁移到 SessionRunner）

## Execution

**批次**: Phase 2 — Framework Split
**优先级**: P1
**User Stories**: #17
