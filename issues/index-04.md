# 04 - Architecture Deepening Issues 执行索引

## 依赖关系总览

```
Phase 1 (并行，无阻塞) ────────────────────────────────
  04-01 ── Security Gate
  04-02 ── Type-safe Routes
  04-03 ── Service Factory 基础设施 + skill-engine 试点

Phase 2 (依赖 04-03，可并行) ──────────────────────────
  04-03 ──┬──→ 04-04 ── framework-engine
           ├──→ 04-05 ── timeline-engine
           ├──→ 04-06 ── research-scheduler
           ├──→ 04-07 ── conversation-service
           └──→ 04-08 ── model-manager
```

## Phase 1: 独立重构

**04-01、04-02、04-03 无互相依赖，可并行启动。**

| Issue | Title | 优先级 | 阻塞项 |
|-------|-------|--------|--------|
| [04-01](./04-01-security-gate-guarded-write.md) | Security Gate guardedWrite/guardedDelete | P0 | 无 |
| [04-02](./04-02-type-safe-channel-route.md) | Type-safe ChannelRoute 泛型化 | P1 | 无 |
| [04-03](./04-03-service-factory-infra-skill-engine.md) | Service Factory 基础设施 + skill-engine 试点 | P0 | 无 |

```
04-01 ──┐
04-02 ──┤  (并行)
04-03 ──┘
```

## Phase 2: 服务工厂化迁移

**04-04~04-08 全部依赖 04-03（factory 模式确立），彼此可并行。**

| Issue | Title | 优先级 | 阻塞项 |
|-------|-------|--------|--------|
| [04-04](./04-04-framework-engine-factory.md) | framework-engine 工厂化迁移 | P1 | 04-03 |
| [04-05](./04-05-timeline-engine-factory.md) | timeline-engine 工厂化迁移 | P1 | 04-03 |
| [04-06](./04-06-research-scheduler-factory.md) | research-scheduler 工厂化迁移 | P1 | 04-03 |
| [04-07](./04-07-conversation-service-factory.md) | conversation-service 工厂化 + chat-handler | P1 | 04-03 |
| [04-08](./04-08-model-manager-factory.md) | model-manager 工厂化迁移 | P1 | 04-03 |

```
04-03 ──┬──→ 04-04
        ├──→ 04-05
        ├──→ 04-06   (并行)
        ├──→ 04-07
        └──→ 04-08
```

## 推荐执行路线

```
时间线 →

T1  │ 04-01  04-02  04-03
    │ ├─────────────────────┤
T2  │  04-04  04-05  04-06  04-07  04-08
    │  ├────────────────────────────────────┤
```

**并行机会**: Phase 1 三个 issue 完全并行。Phase 2 五个 issue 在 04-03 完成后全部并行。

## 风险提示

| Issue | 风险 | 缓解措施 |
|-------|------|---------|
| 04-01 | 低 | 先写 guardedWrite/guardedDelete 测试，再重构 handler |
| 04-02 | 低 | `tsc --noEmit` 验证，运行时行为零变化 |
| 04-03 | 中 | skill-engine 是最简单的 DB-only 服务，作为试点降低风险 |
| 04-04~04-08 | 中 | 每个服务独立迁移，逐个验证测试通过 |
