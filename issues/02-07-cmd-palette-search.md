# 02-07: 命令面板知识搜索

## Parent

`plans/02-grill-audit-bugs-gaps-quality.md` — ID-04（知识搜索部分）

## What to build

实现命令面板（Cmd/Ctrl+K）的知识节点搜索功能。当前 `cmd-palette.tsx` 第 148 行的 `handleQuery` 中知识搜索结果硬编码为 `items = []`，需要改为调用 `window.api.search.search({ query, limit: 5 })`，将返回的搜索结果映射为 `PaletteItem`（type: `knowledge`），点击后导航到 `/domain?id=<nodeId>`。

需要确认 `search:search` IPC channel 的请求/响应类型与 cmd-palette 的 item 映射逻辑。

## Acceptance criteria

- [ ] 命令面板输入查询文本时调用 search API
- [ ] 搜索结果在命令面板中以"Knowledge"分组展示
- [ ] 点击知识搜索结果导航到对应的知识节点
- [ ] 搜索失败时显示空状态而非报错
- [ ] 删除 `// TODO: Wire knowledge search` 注释

## Blocked by

- 02-01（Settings Repository，确保 search service 的 settings 依赖可靠）

## Execution

**批次**: 第三批（功能补全）
**优先级**: P1
**User Stories**: #4
