# 03-10: 透传 Handler 迁移到声明式 Map

## Parent

`plans/03-architecture-deepening-ipc-sessionrunner-framework.md` — Phase 3

## What to build

将 ~90 个透传 IPC handler 迁移到声明式 `ChannelRoute[]` map，删除对应的 handler 文件或文件中的透传方法。

保留 10 个有真实编排逻辑的 handler 为显式注册：
- `chat:sendMessage` — 流式桥
- `knowledge:createNode/updateNode/deleteNode/createEdge/deleteEdge` — 安全门
- `domain:create`, `domain:updateConfig` — 跨 service skill 注册
- `inbox:suggestDomains` — 跨数据源组合
- `security:assessWrite` — 审核编排
- Window handlers (5) — Electron BrowserWindow 操作

可删除或大幅缩减的 handler 文件：research-handler、skill-handler（透传部分）、search-handler、import-handler、timeline-handler、version-control-handler、update-handler。保留文件中仅剩有真实逻辑的方法。

`register.ts` 统一注册 auto-routes + 保留的显式 handlers。

## Acceptance criteria

- [ ] `ChannelRoute[]` map 包含所有透传 channel 的路由条目
- [ ] 每个 route 的 `channel` 格式为 `module:action`
- [ ] 需要参数提取的 route 声明了 `params` 函数
- [ ] 需要响应包装的 route 声明了 `wrap` 键
- [ ] 已删除的 handler 文件不再存在（research-handler、search-handler、import-handler、timeline-handler、version-control-handler、update-handler）
- [ ] 保留的 handler 文件仅包含有真实逻辑的方法
- [ ] 所有 IPC channel 功能行为不变（通过声明式路由或显式 handler）
- [ ] `register.ts` 清晰地分为 auto-routes 区域和 explicit handlers 区域
- [ ] 删除 ~1500 行 handler 样板代码
- [ ] 所有测试通过
- [ ] TypeScript strict 编译无错误

## Blocked by

- 03-08（Framework Split 完成，service 名称和模块边界已确定）
- 03-09（声明式 Router 基础设施）

## Execution

**批次**: Phase 3 — IPC Router 迁移
**优先级**: P1
**User Stories**: #11, #14, #15
