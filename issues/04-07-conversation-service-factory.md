# 04-07: conversation-service 工厂化 + chat-handler 更新

## Parent

`plans/04-architecture-deepening-prd.md` — Candidate 2: Service Factory Pattern

## What to build

将 conversation-service 从模块级单例转换为工厂函数，并同步更新其唯一的外部调用方 chat-handler。

conversation-service 使用 DB + PiMono（FullDeps），使用 repositories：conversations, messages, knowledgeNodes, decisionRecords。它是 chat-handler 的直接依赖（`sendMessageStream`）。

- 工厂函数：`createConversationService(deps: FullDeps)`
- 导出类型 `ConversationService = ReturnType<typeof createConversationService>`
- `register.ts` 构建 FullDeps，调用工厂，注册到 service registry
- `chat-handler.ts`：`registerChatHandlers` 接收 `conversationService` 参数，不再直接 import

测试更新：`conversation-service.test.ts` 重写为工厂模式。

## Acceptance criteria

- [ ] `createConversationService(deps: FullDeps)` 工厂函数存在
- [ ] 内部所有 `getDatabaseService()` 替换为 `deps.db`，`getPiMonoWrapper()` 替换为 `deps.piMono`
- [ ] 导出 `ConversationService` 类型
- [ ] `register.ts` 构建 FullDeps 并注册
- [ ] `chat-handler.ts` 通过参数接收 conversationService
- [ ] conversation-service 测试重写为工厂模式
- [ ] TypeScript strict 编译无错误
- [ ] 现有测试全部通过

## Blocked by

- 04-03（Service Factory 基础设施 + 模式确立）

## Execution

**批次**: Phase 2
**优先级**: P1
**User Stories**: #10, #14, #15, #16
