# 03-08: Framework Engine 瘦身 + slug helper 统一

## Parent

`plans/03-architecture-deepening-ipc-sessionrunner-framework.md` — Phase 2

## What to build

Framework Engine 拆分后的收尾工作：

1. 验证 `framework-engine.ts` 已缩减至 ~300 行，仅保留框架分析执行逻辑（listFrameworks、executeAnalysis、listResults、getResult）。
2. 将 `extractSlugFromConfigPath()` 辅助函数从 framework-engine 移到 `domain-config.ts`，并更新 domain-manager 和 security-guard 中的内联 slug 提取代码（`config_path?.split("/").filter(Boolean).pop()`）改为调用统一函数。
3. 为 `decision-service` 和 `domain-summary-service` 编写基础测试，验证模块独立可用。

## Acceptance criteria

- [ ] `framework-engine.ts` 行数 ≤ 350 行（原 838 行）
- [ ] 仅导出框架分析相关函数（listFrameworks、executeAnalysis、listResults、getResult）
- [ ] `extractSlugFromConfigPath` 移至 `domain-config.ts` 并导出
- [ ] domain-manager 和 security-guard 中不再有内联 slug 提取代码
- [ ] `tests/server/services/decision-service.test.ts` 存在且覆盖基础 CRUD
- [ ] `tests/server/services/domain-summary-service.test.ts` 存在且覆盖摘要生成
- [ ] 所有测试通过
- [ ] TypeScript strict 编译无错误

## Blocked by

- 03-06（Decision Service 抽取）
- 03-07（Domain Summary Service 抽取）

## Execution

**批次**: Phase 2 — Framework Split 收尾
**优先级**: P1
**User Stories**: #18, #20, #21
