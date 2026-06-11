# 03-05: SessionRunner 测试

## Parent

`plans/03-architecture-deepening-ipc-sessionrunner-framework.md` — Phase 1

## What to build

为 SessionRunner 模块编写完整的单元测试。测试通过 stub PiMonoWrapper 和 stub CostEstimator 验证行为，不依赖真实的 pi-mono 实例或数据库。

测试覆盖：正常 prompt 流程（create → subscribe → collect → destroy → cost）、异常路径（session 创建失败、prompt 失败，verify destroy 仍被调用）、CostEstimator 注入替换、content 收集（多个 textDelta 事件合并）。

## Acceptance criteria

- [ ] 测试文件位于 `tests/server/services/session-runner.test.ts`
- [ ] 使用 stub PiMonoWrapper 验证完整生命周期
- [ ] 验证成功路径：create → subscribe → prompt → collect → destroy → cost 返回
- [ ] 验证异常路径：prompt 失败时 destroy 仍被调用
- [ ] 验证 CostEstimator 注入：stub estimator 的返回值出现在结果中
- [ ] 验证 content 收集：多个 textDelta 事件正确合并为完整 content
- [ ] 所有测试通过（`pnpm test`）

## Blocked by

- 03-02（SessionRunner 核心模块）

## Execution

**批次**: Phase 1 — SessionRunner 测试
**优先级**: P0
**User Stories**: #3
