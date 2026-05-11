# 目录结构与引用边界

> 子文档 of [korepos-backend-service/SKILL.md](../SKILL.md)。
> 本文件规定 backend 代码的物理目录与 import 边界。`features/{module}/common/` 是 wire 真源，`features/{module}/backend/` 是后端蓝本；其它模块的 backend 层可直接互通，非 backend 层必须走门面。

## 目录结构模板（必须严格遵循）

业务模块代码物理分两层：

1. **`features/{module}/common/`** — **契约层（wire 真源）**：UI 与 backend 共用的 JSON DTO + 共享枚举（路由枚举 + 业务枚举），`@JsonSerializable()`，**禁止 freezed**（与现有 common 风格保持一致）
2. **`features/{module}/backend/`** — **后端蓝本层**：独立服务化时整体拷走；只含 endpoint(handler) / registry / service / dao，**不再自持 DTO 与路由枚举**（一律从 common 引用）

```
lib/features/{module}/
├── common/                                  # 契约层 ── UI + backend 共用
│   ├── enums/
│   │   ├── endpoints/
│   │   │   └── {module}_endpoint.dart       # 路由枚举 implements ApiEndpoint
│   │   └── business/
│   │       ├── {xxx}_state_enum.dart        # 业务状态枚举（订单/账单/流水状态等）
│   │       └── {yyy}_type_enum.dart         # 业务类型枚举（PaymentType / RefundMethodType 等）
│   └── models/
│       ├── request/
│       │   └── {action}_request.dart        # @JsonSerializable() 入参 DTO
│       └── response/
│           └── {action}_response.dart       # @JsonSerializable() 出参 DTO（data 部分）
└── backend/                                  # 后端蓝本 ── 独立服务化时整体搬走
    ├── endpoint/
    │   ├── {module}_handler.dart            # shelf HTTP handler，仅 parse/action/encode 薄壳
    │   └── intranet_handler_base.dart       # [直接从 refund/backendv2 拷贝复用] 通用模板基类
    ├── registry/
    │   └── {module}_backend_routes.dart     # register{Module}BackendRoutes(router, ref) — 挂路由
    ├── service/
    │   ├── internal/                        # ★ 原子能力层(多 service 复用单元,不挂 endpoint)
    │   │   └── {capability}_service.dart    # 详见 [service-rules.md § internal](./service-rules.md#serviceinternal-原子能力层细粒度复用单元)
    │   ├── models/                          # ★ service 装配中转 DTO(Rust FFI 入参对象/跨方法传递结构等)
    │   │   └── {xxx}.dart                   #   不是 wire DTO 也不是 DAO Row,详见 [service-rules.md § 装配中转 DTO](./service-rules.md#service-装配中转-dto)
    │   ├── {action}_service.dart            # 一接口一 service,编排 DAO + 事务 + BackendInfra
    │   └── {purpose}_orchestrator.dart     # 跨 service 共享的写入/校验链路（粗粒度编排）
    └── dao/
        ├── models/                          # ★ 本模块 DAO 私有 Row 实体(JOIN/聚合的强类型返回)
        │   └── {xxx}_row.dart               #   随 backend/ 整包独立服务化,不进 common
        └── {table}_dao.dart                 # ★ 原子 SQL 一方法一语句,禁止业务编排,事务由 service 包(详见 [dao-rules.md](./dao-rules.md))
```

### 关键约束（与历史 `backend/dto/` 自持副本的差异）

| 项 | 旧约束（历史） | 新约束 |
|---|---|---|
| DTO 位置 | `backend/dto/{request,response}/` 自持副本 | `common/models/{request,response}/` 共享，UI 与 backend 一份 |
| DTO 框架 | freezed + json_serializable | **`@JsonSerializable()` 单边**（与现有 common 一致），不写 freezed |
| 路由枚举 | `backend/endpoint/{module}_endpoint.dart` | `common/enums/endpoints/{module}_endpoint.dart` |
| 业务枚举 | 散落在 `backend/dto/` 下 | `common/enums/business/` 统一 |
| backend 引用 common | 不允许（彻底自闭环） | **必须走 common**（DTO 与路由枚举不能在 backend 重写） |
| UI 引用 common | 之前未明确 | 允许且推荐（UI 调 backend 接口直接复用同一份 DTO，无需再写转换） |
| internal 调试字段 | 直接 `@JsonKey(includeToJson: false)` 加在 backend DTO | common DTO **必须 wire 干净**；internal 字段拆到 backend 私有 record/class（详见 [dto-and-acl.md § ACL](./dto-and-acl.md#aclanti-corruption-layer内部类型与-wire-dto-的边界)） |
| DAO 粒度 | 含 `db.transaction()` 事务编排 + 多步 SQL | **原子 SQL 一方法一语句**，事务由 service 包（详见 [dao-rules.md](./dao-rules.md)） |

**禁止出现的目录**（老 `backend/` v1 风格 + 已废弃的 backend 自持 DTO 风格）：

- `backend/application/` ❌（service 直接放 `service/` 下）
- `backend/data/` ❌（DAO 直接放 `dao/` 下）
- `backend/domain/` ❌（任何 backend 自持的 DTO 都禁止；DTO 一律到 `common/models/`）
- `backend/presentation/` ❌（backend 不允许碰 UI 层）
- `backend/dto/` ❌（**新增禁止**——DTO 必须放 `common/models/`，backend 不再自持）
- `backend/endpoint/{module}_endpoint.dart` ❌（**新增禁止**——路由枚举搬到 `common/enums/endpoints/`；`backend/endpoint/` 目录仅留 `{module}_handler.dart` 与 `intranet_handler_base.dart`）

**存量例外**：`refund/backendv2/dto/` 与 `refund/backendv2/endpoint/refund_v2_endpoint.dart` 是历史缺陷副本（与 `refund/common/models/` 双轨并存），**新接口一律走 common，不要往 backendv2/dto/ 加新文件**；存量副本的迁移由独立 PR 处理（详见 [dto-and-acl.md § 存量处理](./dto-and-acl.md#现存-backenddto-副本与-backendendpointmodule_endpointdart-路由枚举的存量处理)）。

**老骨架并存特例**：若模块的 `backend/` 已存在 `application/data/domain`（v1 老骨架），新代码仍按上方结构并存落盘，**不要迁移老代码**（避免跨 PR 大搬家）；老代码下线由另行 PR 处理。

---

## 引用边界（backend 独立服务化蓝本）

`backend/` 将整体拷贝到未来的独立服务中，import 边界就是服务边界。

**核心心智模型**：

- **backend 阵营互通**：所有 `features/{x}/backend/` 同属"后台团队介入开发的代码区"，互相 import 不受限；未来独立服务化时这些目录会一起搬走
- **非 backend 层是禁区**：UI 团队维护的 `presentation/` / `application/` / `data/` / `domain/` 不得被 backend 引用（破坏分离），跨此类依赖必须走 `BackendInfra` 门面

### ✅ 允许引用（视为基础能力，会一起拷走）

- `lib/common/**` — 数据库 / 日志 / 网络 / 存储 / 通用工具
- `lib/common/backend_infra/**` — 门面层（**非 backend 层**依赖的必经之路，详见 [backend-infra.md](./backend-infra.md)）
- **`lib/features/{module}/common/**`** — **本模块**的契约层（DTO + 共享枚举），backend service / handler / dao 都从这里 import；同时 UI 也读这层 → 是双方共享真源
- **`lib/features/{other}/common/**`** — 其它模块的契约层（跨模块拿对方的 DTO / 共享枚举时走这里）
- **`lib/features/{other}/backend/**`** — 其它模块的 backend 层（同属后台团队代码区，可直接 import；含 `service / dao / endpoint / registry` 任一子目录）
- `lib/features/auth/application/auth_service.dart` — **只通过 `infra.auth`**，禁止直接 import
- `lib/features/order/data/order_local_repository.dart` — **只通过 `infra.createOrderRepo()`**
- `lib/features/store/application/store_service.dart` — **只通过 `infra.store`**

### ❌ 禁止引用（违反即阻止落盘）

- `lib/features/{module}/domain/**` — 前端 UI 领域模型；backend 须从 `common/models/` 取 DTO，**不得**借用 domain 模型
- `lib/features/{module}/data/**`、`application/**`、`presentation/**` — UI 侧（同模块内 UI 文件同样禁引）
- `lib/features/{other}/{data,application,presentation,domain}/**` — 其它 feature 的**非 backend / 非 common 层** — 一律经 BackendInfra 暴露或拒绝引用
- 任何 `*_notifier.dart` / `*_view_model.dart` / `*_controller.dart`（UI 层 Riverpod 控制器）
- `package:flutter/widgets.dart`、`package:flutter/material.dart`（仅 `debugPrint` 场景豁免，用 `package:flutter/foundation.dart`）
- 同模块老 `backend/application/`、`backend/data/`、`backend/dto/`（如果共存期）—— 新代码不反向依赖老骨架/旧 DTO 副本，老代码下线时直接删

**发现越界 import 时立刻停下**，与调用方确认：

- 如果是其它模块的 **common 层** → 直接 import 即可（DTO/枚举共享真源）
- 如果是其它模块的 **backend 层** → 直接 import 即可，不必走门面（本 skill v1.10 起放开）
- 如果是其它模块的 **非 backend / 非 common 层**（application / data / domain / presentation）→ 走 BackendInfra 扩展，或该项不属于 backend 职责
