# 02-01: Settings Repository + 双重 JSON 编码修复

## Parent

`plans/02-grill-audit-bugs-gaps-quality.md` — ID-01

## What to build

创建独立的 `SettingsRepository` 类，替代 `server/ipc/register.ts` 中直接操作数据库的 settings handler。Settings 表使用 `key` 做 PK（非 `id`），因此不继承 `BaseRepository`，提供 `get(key)`, `set(key, value)`, `remove(key)` 三个方法。

核心修复：`set()` 方法对 value 做类型判断——如果已经是 `string` 则直接存入，否则 `JSON.stringify()` 后存入。`get()` 返回原始字符串，让调用方决定如何反序列化。这消除了当前 `register.ts` 中 `JSON.stringify(req.value)` 对已经是字符串的值再次编码的 Bug（导致 Zustand stores rehydrate 时拿到双重编码的损坏数据）。

将 `SettingsRepository` 注册到 `DatabaseService`，`register.ts` 的 settings handler（GET/SET/GET_THEME/SET_THEME）全部改为调用 `db.settings`。

## Acceptance criteria

- [ ] `server/db/repositories/settings.ts` 存在且包含 `SettingsRepository` 类
- [ ] `DatabaseService` 接口和实现中包含 `settings` 属性
- [ ] `register.ts` 中 settings handler 不再包含原始 SQL，全部委托给 repository
- [ ] 存入字符串值后读回来不含多余引号（无双重 JSON 编码）
- [ ] 存入对象值后读回来是正确的 JSON 字符串
- [ ] `GET_THEME` 返回的 theme 值是纯净字符串（如 `"linear"` 而非 `"\"linear\""`）
- [ ] 所有已有测试通过，TypeScript strict 编译无错误

## Blocked by

None — can start immediately.

## Execution

**批次**: 第一批（基础设施 + Bug 修复）
**优先级**: P0
**User Stories**: #1
