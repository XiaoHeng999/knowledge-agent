# 02-09: 自定义分析框架实现

## Parent

`plans/02-grill-audit-bugs-gaps-quality.md` — ID-05

## What to build

将 `framework-engine.ts` 中 Custom 框架的 placeholder 替换为真正的用户自定义框架分析能力。

1. **配置读取**：从域配置文件 `config.yaml` 的 `frameworks.custom` 节读取用户自定义框架定义（`name`, `description`, `dimensions[]`, `scoringPrompt`）。
2. **执行逻辑**：将自定义框架的维度和评分 prompt 注入到 LLM 请求中，遵循与内置框架相同的执行流程。
3. **结果解析**：输出遵循与内置框架相同的 `FrameworkResult` 结构。
4. **UI 条件显示**：如果 `config.yaml` 中没有定义自定义框架，UI 不显示 Custom 选项。

需要确认 `domain-config.ts` 是否已支持 `frameworks.custom` 配置节的读取。

## Acceptance criteria

- [ ] 用户可以在域配置中定义自定义分析框架
- [ ] 自定义框架的执行流程与内置框架一致
- [ ] 结果以 `FrameworkResult` 结构返回并在 UI 中正确展示
- [ ] 未定义自定义框架时不显示 Custom 选项
- [ ] 删除 `"A placeholder for user-defined custom analysis frameworks."` placeholder 文本

## Blocked by

None — can start immediately.

## Execution

**批次**: 第三批（功能补全）
**优先级**: P1
**User Stories**: #6
