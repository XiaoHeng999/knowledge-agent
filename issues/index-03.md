# 03 - Architecture Deepening Issues 执行索引

## 依赖关系总览

```
Phase 1: SessionRunner ─────────────────────────────────────────
  03-01 ──→ 03-02 ──┬──→ 03-03 ──┬──→ 03-06 ──┐
                     ├──→ 03-04   │              ├──→ 03-08
                     └──→ 03-05   └──→ 03-07 ──┘
                                                     │
Phase 3: IPC Router ─────────────────────────────────│───────
  03-09 ────────────────────────────────────────┐    │
                                                  ├──→ 03-10
                                                 ┘    │
```

## Phase 1: SessionRunner

**03-01 无前置依赖，可与 Phase 3 的 03-09 并行启动。03-03 和 03-04 可并行。**

| Issue | Title | 优先级 | 阻塞项 |
|-------|-------|--------|--------|
| [03-01](./03-01-cost-estimator-interface.md) | CostEstimator 接口 + 默认实现 | P0 | 无 |
| [03-02](./03-02-session-runner-core.md) | SessionRunner 核心模块 | P0 | 03-01 |
| [03-03](./03-03-session-runner-migration-services.md) | SessionRunner 迁移 framework/timeline/skill | P0 | 03-02 |
| [03-04](./03-04-session-runner-migration-research.md) | SessionRunner 迁移 research-scheduler | P0 | 03-02 |
| [03-05](./03-05-session-runner-tests.md) | SessionRunner 测试 | P0 | 03-02 |

```
03-01 ──→ 03-02 ──┬──→ 03-03
                   ├──→ 03-04
                   └──→ 03-05
```

## Phase 2: Framework Split

**03-06 和 03-07 可并行（都依赖 03-03）。03-08 需等两者都完成。**

| Issue | Title | 优先级 | 阻塞项 |
|-------|-------|--------|--------|
| [03-06](./03-06-decision-service-extract.md) | Decision Service 抽取 | P1 | 03-03 |
| [03-07](./03-07-domain-summary-service-extract.md) | Domain Summary Service 抽取 | P1 | 03-03 |
| [03-08](./03-08-framework-slimdown-slug-helper.md) | Framework Engine 瘦身 + slug helper 统一 | P1 | 03-06, 03-07 |

```
03-03 ──┬──→ 03-06 ──┐
        │             ├──→ 03-08
        └──→ 03-07 ──┘
```

## Phase 3: IPC Router

**03-09 无前置依赖，可与 Phase 1 并行。03-10 需等 Phase 2 和 03-09 都完成。**

| Issue | Title | 优先级 | 阻塞项 |
|-------|-------|--------|--------|
| [03-09](./03-09-declarative-ipc-router.md) | 声明式 IPC Router 基础设施 | P1 | 无 |
| [03-10](./03-10-handler-migration-to-map.md) | 透传 Handler 迁移到声明式 Map | P1 | 03-08, 03-09 |

```
03-08 ──┐
         ├──→ 03-10
03-09 ──┘
```

## 推荐执行路线

```
时间线 →

T1  │ 03-01  03-09
    │  ├─────┤
T2  │  03-02
    │  ├─────┤
T3  │  03-03  03-04  03-05
    │  ├──────────────────────┤
T4  │  03-06  03-07
    │  ├──────────────┤
T5  │  03-08
    │  ├─────┤
T6  │  03-10
    │  ├──────────────────────────┤
```

**并行机会**: 03-01 和 03-09 可同时启动。03-03/03-04/03-05 可同时启动。03-06/03-07 可同时启动。
