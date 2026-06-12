# 05-06: Summary Generation + Knowledge Graph Integration

## Parent

`plans/05-ai-news-aggregator-prd.md` — Phase 2: AI Processing + KG

## What to build

构建 AI 摘要生成和 Knowledge Graph 集成的完整链路：

**1. High-tier 摘要生成**：
- Tiering Service 完成 High-tier 赋值后，自动触发摘要生成
- 输入：`full_content`（Readability 提取的 Markdown）或回退到 `snippet`
- 输出：结构化摘要（key points, significance, related topics）+ auto-tags
- 模型：使用 domain 的 `default_expert_model`（比 tiering 用更强的模型）
- 成本追踪同 tiering

**2. High-tier 自动 KG 入库**：
- 摘要生成完成后，自动调用 `KnowledgeGraph.createNode()` 创建知识节点
- 节点属性：
  - `node_type`: 从 ai_tags 推断（默认 `"event"`）
  - `title`: 新闻标题
  - `content`: AI 摘要
  - `summary`: AI 摘要前 200 字
  - `source_ids`: `[news_item.url]`
  - `status`: `"active"`
- 自动生成向量嵌入
- 更新 `news_items.knowledge_node_id` 关联

**3. Medium/Low 手动 KG 入库**：
- 新增 IPC 通道 `news:saveToKnowledgeBase(itemId)`
- 用户点击"Save to Knowledge Base"后，创建 Knowledge Node + 更新关联
- 同样自动生成嵌入

## Acceptance criteria

- [ ] High-tier 条目在 tiering 后自动触发摘要生成
- [ ] 摘要生成使用 domain `default_expert_model`，输入为 full_content
- [ ] 结构化摘要包含 key points, significance, related topics
- [ ] High-tier 摘要完成后自动创建 `knowledge_node`，`node_type` 从 tags 推断
- [ ] `news_items.knowledge_node_id` 正确关联
- [ ] IPC 通道 `news:saveToKnowledgeBase(itemId)` 可手动将 Medium/Low 条目保存到 KG
- [ ] 手动保存同样生成嵌入并创建节点
- [ ] 成本追踪：摘要生成和 KG 创建的 token/cost 被记录
- [ ] `preload.ts` 暴露 `window.api.news.saveToKnowledgeBase`
- [ ] `news-store.ts` 提供 `saveToKnowledgeBase` 方法
- [ ] `tests/server/services/news-summary-kg.test.ts` 覆盖：High 自动入库、Medium 手动入库、tags→node_type 推断、成本记录
- [ ] TypeScript strict 编译无错误

## Blocked by

- [05-05](./05-05-ai-tiering-service.md) — 需要 tiering 完成后才能触发生成

## Execution

**批次**: Phase 2
**优先级**: P0
**User Stories**: #13, #18, #19, #20, #21
