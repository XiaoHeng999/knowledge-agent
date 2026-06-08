# 02-08: 命令面板最近记录

## Parent

`plans/02-grill-audit-bugs-gaps-quality.md` — ID-04（最近记录部分）

## What to build

实现命令面板的最近执行命令/访问页面历史记录功能。当前 `cmd-palette.tsx` 第 72 行的 `recentItems` 永远为空数组。

新建 `src/lib/commands/history.ts` 模块：
- 维护最近 20 条记录列表（命令执行 + 页面访问）
- 持久化到 Settings（key: `agentclaw:cmd-history`）
- 提供 `addHistoryEntry(item)`, `getRecentItems(limit)`, `clearHistory()` 接口

`cmd-palette.tsx` 打开时从 history 模块加载 recentItems，在命令面板顶部以"Recent"分组展示。每次执行命令或导航到页面时，记录到 history。

## Acceptance criteria

- [ ] `src/lib/commands/history.ts` 模块存在
- [ ] 命令面板打开时显示最近执行的命令和访问的页面
- [ ] 执行命令后历史记录被更新
- [ ] 导航到页面后历史记录被更新
- [ ] 历史记录持久化，应用重启后仍可读取
- [ ] 历史上限 20 条，超出时移除最旧的
- [ ] 删除 `// TODO: Populate recentItems` 注释

## Blocked by

- 02-01（Settings Repository，history 持久化依赖 settings:get/set）
- 02-07（命令面板知识搜索，先完成搜索再做历史）

## Execution

**批次**: 第三批（功能补全）
**优先级**: P1
**User Stories**: #5
