# 05 - AI News Aggregator Issues 执行索引

> **PRD**: `plans/05-ai-news-aggregator-prd.md`
> **Created**: 2026-06-12

## 依赖关系总览

```
Phase 1 (数据层 + 调度) ──────────────────────────────────
  05-01 ── Schema + Migration + Repos
    ├──→ 05-02 ── Preset Sources + Source CRUD
    │       └──→ 05-03 ── Source Scheduler + Auto Polling
    │                   └──→ 05-05 ── AI Tiering Service
    │                            ├──→ 05-06 ── Summary + KG Integration
    │                            └──→ 05-07 ── Daily Digest Synthesis
    └──→ 05-04 ── News Items Query + Read State
            └──→ 05-08 ── Global News Page + Timeline UI
                     ├──→ 05-09 ── Domain News Tab + Source UI
                     └──→ 05-10 ── Notifications + Welcome Back

Phase 2 (AI 处理) ───────────────────────────────────────
  05-05 ── AI Tiering
    ├──→ 05-06 ── Summary + KG
    └──→ 05-07 ── Daily Digest

Phase 3 (UI + 通知) ─────────────────────────────────────
  05-08 ── Global News Page
    ├──→ 05-09 ── Domain Tab
    └──→ 05-10 ── Notifications
```

## Phase 1: 数据层 + 调度 + 源管理

| Issue | Title | 优先级 | 阻塞项 | User Stories |
|-------|-------|--------|--------|-------------|
| [05-01](./05-01-schema-migration-repos.md) | Schema + Migration + Repositories | P0 | 无 | 基础设施 |
| [05-02](./05-02-preset-sources-crud.md) | Preset Source Library + Source CRUD | P0 | 05-01 | #1-6 |
| [05-03](./05-03-source-scheduler-auto-polling.md) | Source Scheduler + Auto RSS Polling | P0 | 05-02 | #7-11 |
| [05-04](./05-04-news-items-query-read-state.md) | News Items Query + Read State | P1 | 05-01 | #10, #28 |

```
05-01 ──┬──→ 05-02 ──→ 05-03
        │
        └──→ 05-04

(05-02 和 05-04 可并行，均仅依赖 05-01)
```

## Phase 2: AI 处理管线

| Issue | Title | 优先级 | 阻塞项 | User Stories |
|-------|-------|--------|--------|-------------|
| [05-05](./05-05-ai-tiering-service.md) | AI Tiering Service | P0 | 05-03 | #12, #15, #17 |
| [05-06](./05-06-summary-generation-kg-integration.md) | Summary Generation + KG Integration | P0 | 05-05 | #13, #18-21 |
| [05-07](./05-07-daily-digest-synthesis.md) | Daily Digest Synthesis | P1 | 05-05 | #14, #16 |

```
05-03 ──→ 05-05 ──┬──→ 05-06
                  └──→ 05-07

(05-06 和 05-07 可并行，均仅依赖 05-05)
```

## Phase 3: UI + 通知

| Issue | Title | 优先级 | 阻塞项 | User Stories |
|-------|-------|--------|--------|-------------|
| [05-08](./05-08-global-news-page-timeline-ui.md) | Global News Page + Timeline UI | P0 | 05-04, 05-07 | #22, #24-26 |
| [05-09](./05-09-domain-news-tab-source-ui.md) | Domain News Tab + Source Management UI | P1 | 05-08 | #23, #27 |
| [05-10](./05-10-notifications-welcome-back-badges.md) | Notifications + Welcome Back + Badges | P1 | 05-08, 05-06 | #28-32 |

```
05-04 ──┐
05-07 ──┤──→ 05-08 ──┬──→ 05-09
                    └──→ 05-10  (还需 05-06)

(05-09 和 05-10 可并行，均仅依赖 05-08)
```

## 推荐执行路线

```
时间线 →

T1  │ 05-01
    │ ├──────────────┤
T2  │  05-02   05-04
    │  ├───────┤├────┤      (并行)
T3  │  05-03
    │  ├──────────────────┤
T4  │   05-05
    │   ├────────────────────┤
T5  │    05-06  05-07  05-08
    │    ├──────┤├─────┤├─────────────────┤   (并行)
T6  │     05-09  05-10
    │     ├────────────┤                   (并行)
```

**关键路径**: 05-01 → 05-02 → 05-03 → 05-05 → (05-06 → 05-10 / 05-07 → 05-08 → 05-09)

**并行机会**:
- T2: 05-02 和 05-04 并行（都只依赖 05-01）
- T5: 05-06、05-07、05-08 并行（前两者依赖 05-05，后者依赖 05-04 + 05-07）
- T6: 05-09 和 05-10 并行（都依赖 05-08）

## 总量统计

| 指标 | 数量 |
|------|------|
| Issue 总数 | 10 |
| Phase 1 | 4 个 |
| Phase 2 | 3 个 |
| Phase 3 | 3 个 |
| P0 | 6 个 |
| P1 | 4 个 |
| User Stories 覆盖 | 32/32 |

## 风险提示

| Issue | 风险 | 缓解措施 |
|-------|------|---------|
| 05-01 | 低 | 纯 schema + migration，无运行时逻辑 |
| 05-02 | 低 | CRUD 模式成熟，复用已有 IPC 路由模式 |
| 05-03 | 中 | RSS 解析依赖外部 feed 可用性；需要健壮的错误处理和超时 |
| 05-04 | 低 | 简单查询 + 更新，无复杂逻辑 |
| 05-05 | 中 | LLM 输出结构化 JSON 需要可靠的 prompt engineering；批量处理的边界情况 |
| 05-06 | 中 | KG 节点类型推断可能不准确；需要 fallback 到 "event" |
| 05-07 | 低 | 日报合成的 LLM prompt 相对直接 |
| 05-08 | 中 | UI 复杂度最高，时间线+卡片+筛选+无限滚动，需注意性能 |
| 05-09 | 低 | 复用 05-08 组件，增量开发 |
| 05-10 | 中 | Electron Notification API 在不同 macOS 版本行为可能不同；需要测试跨平台 |
