# Phase 1.1–1.7 风险分析与设计一致性评估

> **分析范围**：对照 `agent-claw-v2.md` 和 `after-review-plan.md` 评估当前代码是否偏离设计意图
> **分析日期**：2026-05-23
> **前置报告**：`phase1.1-1.7-code-structure-risk.md`（代码结构风险清单）

---

## 一、核心结论

风险分析报告（`phase1.1-1.7-code-structure-risk.md`）中提出的大部分建议 **不会破坏原始设计**，许多建议与设计文档的 Phase 2 规划完全一致。但其中 R1（移动 channels.ts 到 shared/）和 R3（统一 IPC/Service 类型）两项建议会偏离设计文档，不应执行。

唯一当前代码**明确违反设计**的是 R13（API Key 加密方式），需要修正。

---

## 二、建议分类详评

### 2.1 与设计完全一致 — 可直接执行

以下建议与 `tasks.md` Phase 2 规划和设计文档完全对齐，不存在冲突：

| 风险编号 | 建议 | 设计文档对应 | 说明 |
|----------|------|-------------|------|
| R2 | 拆分 `register.ts` 为 `server/ipc/handlers/*.ts` | tasks.md 2.1.2 明确写了 `server/ipc/handlers/model-handler.ts`，2.2.2 写了 `domain-handler.ts`，后续每个域都有独立 handler 文件 | **完全一致**，Phase 2 每个 `x.x.2` 任务会自然创建独立 Handler 文件 |
| R5 | Stub Handler 返回占位数据 | Phase 2 每个任务会实现真实 Handler（2.1.2、2.2.2、3.1.2 等） | **自然解决**，无需额外处理 |
| R14 | 引入 Vitest 测试框架 | tasks.md P0.2 已规划测试策略（P0.2.1 单元测试策略明确提到 Vitest） | **完全一致** |
| R15 | 实现类型安全事件总线 | `agent-claw-v2.md` Section 6.3 定义了 `AgentClawEvents` 类型化事件总线用于模块间解耦 | **完全一致**，设计明确要求 |
| R7 | preload invoke() 中拦截 IPC Error | P0.1 定义了错误/恢复规格，P0.1.3 定义了 Toast 组件规格 | **不冲突**，属于错误处理基础设施的一部分 |
| R11 | `unregisterAll()` 改为动态遍历 | 纯实现细节优化 | **不冲突**，不影响设计 |
| R16 | CSS 按组件拆分 | 设计未指定 CSS 必须集中在一个文件 | **不冲突** |

### 2.2 会偏离设计 — 不应执行

#### R1：将 channels.ts 移到 shared/ 目录 ❌ 不执行

**我之前的建议**：将 `src/lib/ipc/channels.ts` 移至 `shared/` 目录，消除反向依赖。

**设计文档的明确规划**：

- `agent-claw-v2.md` 第 622 行的目录结构明确指定 IPC 层位于 `src/lib/ipc/`
- 设计文档的顶层目录为 `electron/`、`src/`、`server/`、`skills/`、`resources/`，**没有 `shared/` 目录**
- `electron/tsconfig.json` 已通过 `include: ["../src/lib/ipc/**/*.ts"]` 精确处理了这个跨层引用

**为什么不执行**：

1. 引入 `shared/` 会偏离设计文档的目录结构
2. 当前 tsconfig 配置已经解决了编译问题，反向依赖在实践中不阻塞开发
3. 这是"理论上的架构不优雅"但"实践中可工作"的问题
4. 移动文件会影响 Phase 1 所有已提交代码的 import 路径，增加不必要的变更

**结论**：channels.ts 保留在 `src/lib/ipc/`，不做移动。

#### R3：统一 IPC 类型与 Service 类型 ❌ 不执行

**我之前的建议**：将 `channels.ts` 和 `pi-mono-wrapper.ts` 中的重复类型统一为单一来源。

**设计文档的实际意图**：

设计文档暗示了两种类型**应当共存**，因为它们服务于不同层次：

- **IPC 层类型**（`src/lib/ipc/channels.ts`）：定义渲染进程看到的 API 契约，是前端与后端的通信协议
- **Service 层类型**（`server/services/pi-mono-wrapper.ts`）：定义业务逻辑的接口，封装 pi-mono SDK 的复杂性

这两套类型的**职责不同**：

| 维度 | IPC 类型 | Service 类型 |
|------|---------|-------------|
| 消费者 | 前端 React 组件 | 后端 IPC Handler |
| 关注点 | 传输契约（前端需要什么数据） | 业务能力（服务能做什么） |
| 粒度 | 精简（如 `ModelInfo` 4 字段） | 完整（如 `ModelInfo` 9 字段） |
| 稳定性 | 随 API 变化 | 随 SDK 变化 |

**真正的风险不是"有两套类型"，而是"没有映射层"**。Phase 2 实现 IPC Handler 时，自然需要编写 Service → IPC 的类型转换逻辑，这是每个 `x.x.2` 任务的正常职责。

**结论**：不统一类型。Phase 2 实现 Handler 时添加类型转换函数。

#### R4：DB snake_case 与 IPC camelCase 的映射鸿沟 ⚠️ 不单独处理

这与 R3 同源。Phase 2 实现 Handler 时，Repository 返回的 snake_case 行数据需要转换为 camelCase IPC 响应，这是 Handler 层的正常职责。

设计文档中 SQL 列名全部使用 snake_case（如 `domain_id`、`comprehension_level`、`created_at`），TypeScript 代码使用 camelCase（如 `domainId`、`comprehensionLevel`、`createdAt`），两套命名约定都有明确的设计依据。映射逻辑应在 Handler 中处理。

### 2.3 真正违反设计 — 必须修正

#### R13：API Key 加密方式 🔴 必须修正

**设计文档的明确要求**（`agent-claw-v2.md` 第 205-207 行）：

> 使用 `safeStorage` API（Electron 内置）加密存储 API Key
> 不明文写入磁盘
> 使用操作系统级别的密钥链（macOS Keychain / Windows Credential Manager / Linux Secret Service）

**当前实现**（`server/db/repositories/api-keys.ts`）：

```typescript
const ENCRYPTION_KEY = process.env.AGENTCLAW_ENCRYPTION_KEY
  || "agentclaw-default-encryption-key-change-in-production";
// 使用 AES-256-GCM + 硬编码默认密钥
```

**差异**：

| 维度 | 设计要求 | 当前实现 |
|------|---------|---------|
| 加密方式 | Electron `safeStorage` API | AES-256-GCM（手动实现） |
| 密钥来源 | OS 密钥链（Keychain/Credential Manager/Secret Service） | 环境变量 / 硬编码默认值 |
| 密钥管理 | 由 Electron 和 OS 自动管理 | 需要用户手动设置环境变量 |

**修正方案**：

1. 使用 `electron.safeStorage.encryptString()` / `decryptString()` 替代手动 AES
2. 加密后的数据仍存储在 SQLite `api_keys` 表中
3. 不需要环境变量，由 OS 密钥链自动管理密钥
4. 跨平台兼容（macOS Keychain / Windows Credential Manager / Linux Secret Service）

**修正时机**：Phase 2.1（模型管理）开始前，因为 2.1.1（ModelManager 服务）依赖 API Key 的加密存储。

---

## 三、风险优先级修正

基于与设计文档的对齐分析，修正优先级：

| 优先级 | 风险编号 | 描述 | 行动 |
|--------|---------|------|------|
| **P0** | R13 | API Key 加密方式违反设计（应使用 safeStorage） | Phase 2.1 前修正 |
| **P1** | R2 | register.ts 拆分为独立 Handler 文件 | Phase 2 按 tasks.md 自然执行 |
| **P1** | R5 | Stub Handler 空实现 | Phase 2 按 tasks.md 自然解决 |
| **P1** | R14 | 测试基础设施 | 按 tasks.md P0.2 规划引入 |
| **P2** | R15 | 事件总线 | Phase 3 前实现 |
| **P2** | R7 | preload 错误拦截 | Phase 2 随 Handler 实现一并处理 |
| **P2** | R9 | PiMonoWrapper 与 Handler 连接 | Phase 2.1 实现时自然建立 |
| **~~P0~~→P5** | ~~R1~~ | ~~channels.ts 移到 shared/~~ | **不执行，保留在 src/lib/ipc/** |
| **~~P0~~→P5** | ~~R3~~ | ~~统一 IPC/Service 类型~~ | **不执行，两层类型职责不同** |
| **~~P0~~→P5** | ~~R4~~ | ~~DB/IPC 映射层~~ | **不单独处理，Handler 层自然解决** |

---

## 四、执行路线建议

### 推荐路线：按 tasks.md Phase 2 推进，不做大重构

```
1. 修正 R13（API Key safeStorage）       ← 唯一的前置修改
2. 开始 Phase 2.1 模型管理
   - 2.1.1 server/services/model-manager.ts
   - 2.1.2 server/ipc/handlers/model-handler.ts   ← 自然创建独立 Handler
   - Handler 中处理 Service → IPC 类型映射         ← 自然解决 R3+R4
3. 继续 Phase 2.2 领域管理
4. Phase 2.2+ 按依赖图推进
```

### 不推荐路线

```
❌ 先做大规模结构重构（移动 channels.ts、统一类型、创建 shared/ 目录）
❌ 修改设计文档来适应当前代码
```

---

## 五、总结

Phase 1 的代码结构 **基本符合设计文档的意图**。风险分析中提出的问题分为三类：

1. **与设计一致的改进**（R2、R5、R14、R15、R7、R11、R16）— 可做，但大多会在 Phase 2 自然完成
2. **会偏离设计的建议**（R1、R3、R4）— 不做，当前结构虽有瑕疵但不阻塞开发
3. **真正违反设计的问题**（R13）— 必须修正，API Key 应使用 Electron safeStorage

**核心建议**：不要因为风险分析做大规模重构，按 tasks.md 的 Phase 2 有序推进即可。唯一需要前置处理的是 R13（API Key 加密方式修正）。
