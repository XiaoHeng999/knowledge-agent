# 02-06: 流式聊天错误恢复

## Parent

`plans/02-grill-audit-bugs-gaps-quality.md` — ID-06

## What to build

在流式聊天中处理中途失败（网络超时、API 限流、token 上限等），让用户看到明确的错误提示并能重试。

**chat-store 修改**：在流式监听器中新增 `error` 事件处理。收到错误时：
1. 将当前 partial content 保存为 assistant 消息，标记 `status: 'incomplete'`，内容加 `⚠️ Response interrupted` 前缀
2. 清理 streaming 状态
3. 触发 error-banner 提示

**message-list 修改**：对 `status: 'incomplete'` 的消息在下方显示"Retry"按钮。点击后重新发送原始 user 消息（复用 `sendMessage` 逻辑）。

**schema 影响确认**：`MessageRow` 的 `status` 字段当前可能的值需要确认是否支持新增 `incomplete`。如果不支持需加 migration 或调整。

## Acceptance criteria

- [ ] 流式传输中途断开时，用户看到不完整消息 + 错误提示
- [ ] 不完整消息标记为 `incomplete` 状态，带 `⚠️` 前缀
- [ ] 不完整消息下方有"Retry"按钮
- [ ] 点击 Retry 后重新发送原始 user 消息
- [ ] streaming 状态正确清理，不会阻塞后续发送

## Blocked by

None — can start immediately.

## Execution

**批次**: 第二批（核心功能修复）
**优先级**: P1
**User Stories**: #7
