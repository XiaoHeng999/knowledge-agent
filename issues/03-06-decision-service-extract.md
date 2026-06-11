# 03-06: Decision Service 抽取（ADR 模块独立）

## Parent

`plans/03-architecture-deepening-ipc-sessionrunner-framework.md` — Phase 2

## What to build

从 `framework-engine.ts` 中抽取 ADR 决策记录相关的 5 个函数到独立的 `server/services/decision-service.ts` 模块。

迁移的函数：`generateDecisionRecord`、`updateDecisionStatus`、`listDecisionRecords`、`getDecisionRecord`、`retrieveRelevantDecisions`。新模块通过 `getDatabaseService()` 和 `getPiMonoWrapper()` 单例获取依赖，与 framework-engine 无直接导入关系。

`framework-handler.ts` 中的 ADR 相关 handler（LIST_DECISIONS、GET_DECISION、CREATE_DECISION、UPDATE_DECISION、RETRIEVE_RELATED）改为从 `decision-service` 导入而非 `framework-engine`。其余行为不变。

## Acceptance criteria

- [ ] `server/services/decision-service.ts` 存在并导出 5 个 ADR 函数
- [ ] `framework-engine.ts` 中不再包含 ADR 相关函数（已迁移）
- [ ] `framework-handler.ts` 的 ADR handler 改为从 decision-service 导入
- [ ] ADR CRUD 功能行为完全不变
- [ ] TypeScript strict 编译无错误
- [ ] 现有测试全部通过

## Blocked by

- 03-03（framework-engine 已迁移到 SessionRunner，代码更干净时再拆分）

## Execution

**批次**: Phase 2 — Framework Split
**优先级**: P1
**User Stories**: #16, #19
