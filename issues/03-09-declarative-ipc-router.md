# 03-09: 声明式 IPC Router 基础设施

## Parent

`plans/03-architecture-deepening-ipc-sessionrunner-framework.md` — Phase 3

## What to build

创建声明式 IPC Router 基础设施。定义 `ChannelRoute` 类型（channel、service、method、可选 params 提取函数、可选 wrap 键），实现通用 dispatch 函数：接收 route + req，通过 service registry 查找 service 对象，调用指定 method，应用 params 提取和 response 包装。

Service registry 是一个简单的 `Map<string, object>`，在初始化时注册所有 service 实例（framework-engine、decision-service、domain-summary-service、timeline-engine 等）。

Router 注册到 Electron IPC 的方式与现有 `registerHandler` 兼容——每个 auto-route 注册为一个 `ipcMain.handle(channel, handler)` listener。

编写 router 的基础测试：验证 channel 格式校验、params 提取、wrap 包装、无 params 时传完整 req、无 wrap 时直接返回。

## Acceptance criteria

- [ ] `ChannelRoute` 类型定义存在
- [ ] 通用 dispatch 函数存在，接受 route + req + service registry
- [ ] `params` 提取：有声明时 `method(...params(req))`，无声明时 `method(req)`
- [ ] `wrap` 包装：有声明时 `{ [wrap]: result }`，无声明时直接返回 result
- [ ] Service registry 可注册和查找 service 实例
- [ ] Router 注册方式与现有 `registerHandler` 兼容
- [ ] 基础测试覆盖 dispatch 逻辑
- [ ] TypeScript strict 编译无错误

## Blocked by

None — can start immediately（与 Phase 1/2 并行）。

## Execution

**批次**: Phase 3 — IPC Router
**优先级**: P1
**User Stories**: #9, #10, #12, #13
