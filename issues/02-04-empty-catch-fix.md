# 02-04: 空 catch 块加 warn + error-banner 触发

## Parent

`plans/02-grill-audit-bugs-gaps-quality.md` — ID-07

## What to build

对以下 8 个文件中的空 catch 块添加错误输出和 UI 提示：

- `src/stores/security-store.ts`
- `src/stores/model-store.ts`
- `src/stores/research-store.ts`
- `src/stores/skill-store.ts`（2 处）
- `src/app/(main)/page.tsx`
- `src/app/(main)/inbox/page.tsx`
- `src/components/ui/launch-loader.tsx`

统一模式：catch 中 `console.warn('[StoreName] Failed to load:', err)` + 通过 app-store 触发 error-banner。如果 app-store 尚未暴露全局错误方法，需先添加 `setGlobalError(error: string | null)` action。

注意：`src/stores/base.ts` 的空 catch 不需要修改——它有明确的 localStorage fallback 降级逻辑。

## Acceptance criteria

- [ ] 上述 8 个文件中不再有空 catch 块（不含 `base.ts`）
- [ ] 每个 catch 块都有 `console.warn` 输出错误信息
- [ ] Store hydration 失败时用户能看到 error-banner 提示
- [ ] 不影响正常的 fallback 逻辑（如 base.ts 的 localStorage 降级）

## Blocked by

None — can start immediately.

## Execution

**批次**: 第一批（基础设施 + Bug 修复）
**优先级**: P1
**User Stories**: #8
