---
name: architecture-ddd-lite-fullstack
description: "Use before writing or reviewing any business code in Java (Spring Boot/Spring Cloud), Python (FastAPI/Django/Flask), Dart (Flutter/Serverpod/Shelf), React, or Vue. MUST be invoked after design/pre-implementation orientation and before the first source-code edit to decide the target layer, feature module, reusable atomic capability, and maintainability boundaries. Enforces DDD-lite layering, feature-based structure, one-way dependencies, clear code structure, low coupling, high cohesion, and prevents business logic from being written directly in Controller/UI/Page."
---

# DDD-lite 全栈架构编码规范

## 核心哲学

该项目采用 DDD-lite + Feature 模块化架构，目标是：代码结构清晰、易于维护、低耦合、高内聚、可复用、可扩展、适合 AI 协作开发。

**本 SKILL 与语言无关**——所有核心原则（分层+单向依赖 / Feature 模块化 / focused service per branch / 跨分支编排独立 / 横切走中间件 / 命名 taxonomy 项目级统一 / 聚合边界）是 SOLID + Clean Architecture + DDD-lite 的应用级表达，**在 Java、Python、Dart、TypeScript 上都一致适用**。SKILL 内的代码示例多用 Java 写法是因为它能精确表达事务/AOP/注解等机制，但**所有规则都有对应的 Python（decorator / contextvar / middleware）、Dart（class + middleware / Riverpod provider）、TypeScript（decorator / NestJS Pipe）等价实现**,见各章节后端机制对照表与「Python 后端约束」「Dart 后端约束」节。

任何业务代码，必须先判断属于哪一层，再实现；不允许直接写在 Controller / UI / Page 中。

清晰结构不是"代码写完后再优化"的附加项，而是第一行代码前的门禁。AI 不得为了快速完成而新增难读、难测、难替换、职责混杂的实现。

---

## 快速导航

- **触发与门禁** → [触发时机](#触发时机) / [编码前检查清单](#编码前检查清单) / [输出要求](#输出要求)
- **架构分层** → [标准分层模型](#标准分层模型) / [各层职责](#各层职责)
- **项目组织** → [Feature 模块化结构](#feature-模块化结构) / [原子能力沉淀](#原子能力沉淀) / [聚合边界与事务一致性](#聚合边界与事务一致性) / [结构质量门禁](#结构质量门禁)
- **Service 形态铁律** → [Service 业务动作扩展铁律](#service-业务动作扩展铁律每个业务分支一个-focused-service任何新方法都不进-god-service) / [跨分支编排](#跨分支编排同一回合调用-2-个-focused-service-时的归属) / [横切关注点不计入 god service 判定](#横切关注点不计入-god-service-判定aop--拦截器--事务声明的豁免)
- **技术栈约束** → [前端约束](#前端约束) / [Flutter 约束](#flutter-约束) / [Java 后端约束](#java-后端约束) / [Python 后端约束](#python-后端约束) / [Dart 后端约束](#dart-后端约束)
- **命名规范** → [服务命名 taxonomy](#服务命名-taxonomyservice--usecase--handler--orchestrator)

---

## 触发时机

在以下场景必须主动调用本 Skill：

| 场景 | 动作 |
|------|------|
| 准备编写 Java / Python / Dart / TypeScript / React / Vue / Flutter 业务代码 | 先判断代码所属层级与 feature 模块 |
| 根据设计文档或 coding.md 开始实现 | 在第一行源码改动前完成分层检查 |
| 新增接口、页面、UseCase、Service、Repository、DAO、HTTP Client | 明确职责边界和调用链 |
| 重构现有业务逻辑 | 先识别现有逻辑应沉到 Application / Domain / Infrastructure 的哪一层 |
| 代码审查发现跨层调用、巨型 Service、重复业务逻辑 | 用本规范判定违规类型 |
| 代码实现可能继续沿用低质量旧结构 | 先判断是否会增加耦合、职责混杂或维护成本 |

---

## 标准分层模型

```text
UI / Controller / Page
        ↓
Application（UseCase / Service）
        ↓
Domain（业务规则）
        ↓
Repository（数据抽象）
        ↓
Infrastructure（DB / HTTP / MQ / Storage）
```

### 强制规则

1. 上层只能依赖下层，依赖方向必须单向。
2. UI / Controller / Page 层不能直接调用 Repository、DAO、DB、HTTP、MQ、Storage。
3. Application 层负责业务流程编排，不直接写技术细节。
4. Domain 层只表达业务规则、状态机、校验逻辑，不依赖 Spring、HTTP、DB、Flutter Provider、React/Vue 框架。
5. Repository 层只定义数据访问抽象，不写具体 DB / HTTP 实现。
6. Infrastructure 层只做技术实现，包括 DB、Redis、HTTP Client、MQ、Storage、本地缓存。

---

## Feature 模块化结构

所有业务代码必须按 feature 组织，而不是按技术层全局平铺。

```text
features/
  {feature_name}/
    presentation/      # UI / Controller / Page
    application/       # UseCase / Application Service / Composable Service
    domain/            # Entity / Value Object / Rule / Policy / State Machine
    repository/        # Repository 接口定义
    infrastructure/    # Repository 实现、DB、HTTP、MQ、Storage
    api/               # 前端 HTTP 请求封装
    dao/               # Flutter 本地数据访问
    components/        # 前端纯展示组件
    hooks/             # React Hook / Vue Composable / 状态编排
    types/             # DTO / ViewModel / 类型定义
```

### 结构取舍

| 项目复杂度 | 允许简化 | 禁止事项 |
|------------|----------|----------|
| 简单项目 | 可省略独立 Domain 目录，把简单规则放在 Application 内部私有方法 | 不能让 UI / Controller 直接访问 DB / HTTP |
| 中型项目 | 使用完整 DDD-lite 分层 | 不能把所有逻辑塞进单个 Service |
| 复杂系统 | DDD-lite + 状态机 + 领域事件 + 原子能力沉淀 | 不能跨 feature 随意 import 内部实现 |

---

## 各层职责

### Presentation 层

职责：
- 接收用户输入或 HTTP 请求。
- 做轻量参数适配与响应转换。
- 调用 Application 层。
- 渲染结果或返回响应。

禁止：
- 写业务规则。
- 写 SQL、HTTP、MQ、缓存访问。
- 直接调用 Repository / DAO / Infrastructure。

### Application 层

职责：
- 编排业务流程。
- 调用 Domain 规则、Repository 抽象、外部能力接口。
- 处理事务边界、幂等边界、流程日志。

要求：
- 必须体现流程编排，而不是 Controller 的搬运函数。
- 复杂流程拆成多个私有步骤或原子能力，禁止堆成巨型方法。
- 跨 UseCase 复用的能力必须下沉为原子能力。

### Domain 层

职责：
- 表达核心业务规则。
- 表达状态机、合法流转、金额/数量/权限等校验。
- 提供业务语义清晰的 Entity、Value Object、Policy、Rule。

禁止：
- 依赖 Spring、MyBatis、HTTP Client、DB、MQ、Flutter Provider、React/Vue 框架。
- 读取配置、发请求、写日志流水表。

### Repository 层

职责：
- 定义数据访问抽象。
- 使用业务语义命名查询和保存能力。

示例：
```text
OrderRepository
  findById()
  save()
  findRefundableItems()
```

禁止：
- 泄漏 SQL 细节到上层方法名。
- 把 HTTP / DB 实现写进接口层。

### Infrastructure 层

职责：
- 实现 Repository。
- 调用数据库、Redis、HTTP、MQ、Storage、SQLite、本地文件。
- 做 DTO 与领域对象之间的转换。

禁止：
- 编排完整业务流程。
- 反向调用 Application / Presentation。

---

## 原子能力沉淀

所有通用业务能力必须抽象为可复用的原子能力，避免多个 UseCase 重复实现同一段业务逻辑。

### 判定标准

命中任一条件，应沉淀为原子能力：

| 条件 | 示例 |
|------|------|
| 被两个及以上 UseCase 复用 | 退款金额计算、订单可退校验 |
| 代表稳定业务规则 | 状态流转校验、会员价计算 |
| 需要独立测试 | 手续费分摊、优惠抵扣拆分 |
| 未来可能被接口、定时任务、消息消费共同调用 | 退款终态登记、库存释放 |

### 命名示例

```text
RefundService
  validateRefundable()
  calculateRefundAmount()
  createRefundTransaction()
  callRefundChannel()
  registerRefundFinalState()
```

禁止在多个 UseCase 中重复写同一份退款、支付、库存、订单状态流转逻辑。

---

## 聚合边界与事务一致性

> 立场:focused service 拆分回答的是"**业务分支**怎么分",聚合边界回答的是"**数据一致性边界**怎么分"——这是两个正交但配套的决策。一个 focused service 的方法体内修改了哪些数据、能不能在同事务里完成、跨聚合需要不需要发 Domain Event,**取决于这些数据落在哪几个聚合里**。本节给出实用判定规则,不展开 DDD 教科书全套。

### 核心规则(3 条)

1. **一个事务只修改一个聚合根** —— `@Transactional` 标注的方法,只允许修改一个聚合的状态(及其内部 Entity / VO)。跨聚合的"同时修改"必须改为:**事务内只改一个聚合 + 发 Domain Event + 异步另一聚合订阅消费**。
2. **跨聚合调用走 Domain Event 或 Saga**,不走同事务直接修改。两个聚合之间不互相持有强引用,只持有 ID。
3. **聚合内部 → 强一致** / **聚合之间 → 最终一致**。Saga 模式负责跨聚合编排 + 失败补偿,见上面「跨分支编排」节。

### 判定:Refund 是 Order 聚合内动作还是独立 Refund 聚合?(实用 5 问)

| # | 判定问 | 答 Yes → Refund 是**独立聚合** | 答 No → Refund 是**Order 聚合内动作** |
|---|--------|--------------------------------|---------------------------------------|
| A1 | Refund 有独立生命周期吗?(待退 → 已退 → 已撤销,与 Order 状态机不重合) | ✓ 独立聚合 | 跟 Order 状态机绑死 |
| A2 | Refund 需要独立查询吗?(列表页 / 详情页能脱离 Order 单独打开) | ✓ 独立聚合 | 只通过 Order 详情页展开 |
| A3 | Refund 需要独立审计 / 版本号 / 乐观锁吗? | ✓ 独立聚合 | 跟 Order 共审计 |
| A4 | Refund 会被其它业务流程独立引用吗?(对账 / 财务 / 风控独立拉取) | ✓ 独立聚合 | 只在 Order 流程内使用 |
| A5 | Refund 改动量和频次 ≥ Order 主表?或独立扩展字段持续增加? | ✓ 独立聚合 | 共表或单字段足够 |

**判定输出**:

- ≥3 个 Yes → **独立聚合**:建 `RefundRepository`、`refund_order` 表、`Refund` 实体;`RefundService` 操作 Refund 聚合,与 `OrderService` 通过 `OrderRefundedEvent` / Saga 协同。
- ≤2 个 Yes → **Order 聚合内动作**:Refund 是 Order 的状态变迁,`RefundService` 仍然是 focused branch service,但内部直接通过 `OrderRepository` 修改 Order 聚合,事务内完成。
- 模糊 → 默认按"独立聚合"处理,因为反向重构(独立 → 内置)比正向(内置 → 独立)简单。

### 聚合边界 → focused service 的影响

| 场景 | focused service 的形态 |
|------|------------------------|
| Order 聚合内动作(refund / cancel / reject 都修改 Order 状态) | focused service 直接通过 `OrderRepository` 修改 Order;同事务;不发 Domain Event(除非外部需要监听) |
| Refund 是独立聚合 | `RefundService` 通过 `RefundRepository` 操作 Refund 聚合;不直接修改 Order;Order 状态变化通过订阅 `RefundCompletedEvent` 异步更新 |
| 跨 ≥2 聚合的复合动作(approveAndRefund 改 Order + Refund + Inventory) | 走 `Saga` / `Orchestrator`:事务内只改一个聚合,其余通过 Event / 补偿动作 |

### 反模式

- ❌ **一个 `@Transactional` 方法同时修改 ≥2 个聚合根**(`Order` + `Refund` + `Inventory` 同事务硬改) → 走 Domain Event 或 Saga
- ❌ **跨聚合持有强引用 / 同事务 join 修改** → 只持有 ID,通过 Repository 查
- ❌ **业务流程紧耦合聚合**:订单创建必须等库存扣减完成才返回(同事务) → 库存预占(同事务)+ 库存扣减(异步 / Saga)
- ❌ **没想清楚聚合边界就拆 focused service** → 先按上面 5 问判定聚合,再决定 focused service 的数据访问路径

### 与既有规则的关系

- 「Service 业务动作扩展铁律」回答"业务分支怎么拆 service";本节回答"数据一致性怎么拆事务"。两者**正交且必须同时满足**——focused service 不会自动给出聚合边界,聚合边界也不会自动决定 focused service 数量。
- 「跨分支编排」节的 `Orchestrator` / `Saga` 命名,在本节的"跨聚合协同"语境下复用同一套类——一个 `Saga` 既可能是跨分支编排,也可能是跨聚合最终一致性载体,两者本质同源(都是"协调多个不能放同事务的动作")。
- `backend-knowledge-graph-required` 的全景 ER / 表关系图是聚合判定的输入证据;判定结果反过来更新该图谱(标注哪些表属于同一聚合)。

---

## 结构质量门禁

所有业务代码在实现前必须满足以下结构质量要求。若无法满足，必须先调整设计或拆分实现，不能带着明显结构债继续编码。

### 代码结构清晰

- 文件、类、方法命名必须能表达业务意图，而不是技术动作堆叠。
- 一个文件只承载一个清晰职责；超过一个职责时拆分到 UseCase、Domain Rule、Repository 或 Adapter。
- 方法应围绕一个步骤或一个业务判断，复杂流程拆成有语义的私有方法或原子能力。
- 新增代码必须能从目录位置看出所属 feature、层级和责任边界。

### 易于维护

- 新逻辑必须有明确变更点，避免把多个不相关规则揉在同一个 if/else 或 switch 中。
- 未来新增同类规则时，应能通过新增策略、规则、原子能力或配置扩展，而不是修改多个分散位置。
- 对外契约、领域规则、技术适配必须分开，避免一个改动牵动 UI、DB、HTTP 和业务规则多处联动。
- 不为了一次性需求复制旧代码；若复用旧逻辑，应先判断是否需要提取公共能力。

### 低耦合

- 上层依赖抽象和业务语义，不依赖下层实现细节。
- 跨 feature 调用必须通过公开能力、Application Service、Repository 抽象或明确的端口，不直接 import 对方内部实现。
- DTO、Entity、ViewModel、DB Model 不得无边界混用；跨层传递时必须做转换或隔离。
- 外部系统、设备、DB、缓存、文件、HTTP Client 必须隔离在 Infrastructure / Adapter，不得渗透到 Domain / UI。

### 高内聚

- 同一业务能力的状态判断、金额计算、幂等规则、表操作约束应集中在同一能力边界内。
- 一个 Service / UseCase 围绕一个业务流程或能力，不把多个业务场景塞进同一个类。
- 通用原子能力集中沉淀，禁止多个页面、接口、UseCase 各自维护一份类似规则。
- 状态机、动作规范、表操作矩阵等核心业务模型优先集中表达，禁止散落在 UI 判断或临时 SQL 条件里。

### 新代码落点决策（扩展现有功能时不要在旧结构堆叠）

**默认原则：扩展现有能力时，新代码放到新结构（新 service / 新子门面 / 新原子能力）并暴露公开方法，旧代码只调用一行——不要在旧文件里就地堆叠新增逻辑。**

为什么这是默认默认行为而不是可选优化：

| 后果 | 在旧代码就地堆叠 | 新结构暴露 + 旧代码引用 |
|------|------------------|--------------------------|
| 旧文件污染面积 | 持续扩大（每次扩展 +N 行） | 每次只 +1 行调用 |
| 新代码是否符合目标态规范 | 跟旧代码同污染（裸 SQL / 内联决策门 / 巨型方法） | 一开始就符合（DAO 唯一容器 / 私有方法粒度 / 强类型） |
| 后续重构成本 | 新增的 N 行也要再迁一次 | 已经在目标态，无需再迁 |
| 可单元测试粒度 | 与旧巨型方法绑定，只能整体测 | 新方法独立可测 |
| 调用方迁移路径 | 旧代码删除前不能切换 | 新结构稳定后调用方可立刻切换 |

**触发场景（满足任一就必须按本原则落点）**：

- bug 修复需要新增 record 处理、字段映射、决策门或落库段
- 功能扩展要在已有 ~500 行以上的方法/类里追加分支
- 数据同步、事件订阅、状态机等链路要补齐字段、新事件、新副作用
- 即将动 SKILL 已识别为"历史巨型方法 / 待重构骨架"的旧代码
- **扩展既有 service:任何往多分支 god service(如 `OrderService` 已有 `refund/cancel/reject`)追加 public 业务方法的动作——不论是新业务分支(`reverseCheckout`)还是同分支变种(`partialRefund`)** —— 详见下面「Service 业务动作扩展铁律」专节,**god service 不加方法,每个分支去自己的 focused service**

**正确决策流程**（编码前必须走完）：

1. 这次新增逻辑是否独立可命名？（"持久化 X 数据" / "校验 Y 合法性" / "派发 Z 副作用"）
2. 是 → 在合适新结构暴露 public 方法（新 service / 子门面 / 原子能力）
3. 旧代码只在原有插入点改 1-3 行：`import` + 调用一行
4. 新方法内部按 SKILL 现行规范实现（分层 / 命名 / 私有方法粒度 / 强类型 / SQL 唯一容器等）
5. 新方法的 dartdoc / 类注释里说明"该段未来可独立替换 / 这是 strangler pattern 第 N 段"

**反模式（即使旧代码本来就乱也不允许）**：在 1500 行的历史方法中再加 95 行新逻辑、跟旧风格混在一起、SQL 内联、决策门 inline、字段名靠字符串 key——只因为"旧代码已经这样了我跟着抄"。这是把新代码的目标态成本一并计入未来重构债。

#### Service 业务动作扩展铁律:**每个业务分支一个 focused service,任何新方法都不进 god service**

> **核心一句话**:扩展既有 service 时,**不允许往多分支 god service(如 `OrderService` 同时承载 `refund`/`cancel`/`reject`)里追加任何 public 业务方法**——无论新方法是新业务分支(`reverseCheckout`)还是既有分支的变种(`partialRefund`)。所有新方法必须落到**该分支自己的 focused sub-service** 里。
>
> 上一节「新代码落点决策」是通用兜底,适用所有"扩展旧代码"场景;本节是它在 service 层面的特化与下钻——**判定更硬、零退路**,因为 service 是被惯性追加最严重的容器,每一次"先在原 service 加一个"都会让下一次更难拒绝。

**核心原则**:

1. **每个业务分支聚焦到一个独立 service** —— `RefundService` 只管退款分支,`CancelService` 只管取消分支,`ReverseCheckoutService` 只管反结账分支。
2. **同一分支的所有方法都放在该分支自己的 service 内** —— `refund` + `partialRefund` 都属于退款分支,**两者都放在 `RefundService` 里**,作为该 service 的两个 public 方法(或参数化的同一方法);**不论原入口是不是 `OrderService`,都不该往 `OrderService` 里塞**。
3. **god service 只能做 1 行 delegate 入口** —— 若历史遗留的 `OrderService` 同时承载多个分支动作,新方法**一律**走新建/已有的 focused sub-service;原 `OrderService` 若需要保留统一入口,新方法只能 1 行 `xxxService.execute(req);`,**不允许在 `OrderService` 内写任何业务逻辑**。

**判断哪个分支:新增逻辑是否构成一个独立可命名的业务分支?**

判断"是新业务分支"的识别信号(命中任一即认定为独立分支):

| 信号 | 说明 / 举例 |
|------|-------------|
| 业务语义上是独立动作 | `refund` / `cancel` / `reject` / `reverseCheckout` 是 4 个独立分支 |
| 对应 UI / 流程图上一个独立动作节点 | 用户在前端可单独触发 / 业务流程图上独立的菱形或矩形 |
| 引入新状态机或新状态转换 | 反结账涉及账单状态机 ≠ 订单生命周期状态机 |
| 引入新下游依赖 | 新增对其它 service / 外部 HTTP / 新表的依赖 |
| 引入新事务边界 | 独立事务 / 补偿事务 / 不与原方法共事务 |
| 前置校验 / 权限规则 / 幂等键语义与既有方法不同 | "账单已结+今日内"≠"订单已支付" |

**变种的归属**:`refund` 与 `partialRefund` 共享同一状态机 + 同一下游 + 同一前置校验 → 属于**同一退款分支**,两者都进 `RefundService`,**不进** `OrderService`。

**新方法落点决策表**:

| 新方法是什么 | 已有该分支的 focused service 吗? | 落点 |
|-------------|------------------------------|------|
| 新业务分支(如反结账) | 没有 | **新建** `ReverseCheckoutService`,新方法作为其 public |
| 同一分支的变种(如 partialRefund) | 已有(如 `RefundService`) | 加进该 service,作为它的第 2 个 public 方法或参数化合并 |
| 同一分支的变种(如 partialRefund) | 没有,既有方法 `refund` 还在 god service | **新建** `RefundService`,把变种 + 既有方法**一并迁过去**;god service 内对应方法降级为 1 行 delegate(或彻底删掉让调用方直接注入) |

**正确形态 — 加反结账(新分支)**:

```text
[新建] features/billing/application/ReverseCheckoutService.java
        - public void execute(ReverseCheckoutRequest req) { ... }   // 唯一 public,内部拆 _xxxStep 私有方法
        - 自己注入 BillingDao / OrderDao / 状态机校验

[修改] 调用方(Controller / 上游 UseCase)直接注入 ReverseCheckoutService 调用;
        OrderService 不新增 public 方法。

[或者]  若必须保留 OrderService 作为统一入口:
        - OrderService 注入 ReverseCheckoutService;
        - OrderService 新方法只 1 行: `reverseCheckoutService.execute(req);`
        - 禁止把任何业务逻辑写在该 1 行方法里。
```

**正确形态 — 加 partialRefund(同分支变种,但既有 refund 还在 god service)**:

```text
[新建] features/refund/application/RefundService.java
        - public void refund(RefundRequest req) { ... }                  // 把既有 OrderService.refund 迁过来
        - public void partialRefund(PartialRefundRequest req) { ... }    // 新增的变种
        - (或 refactor 成参数化的单一 refund(RefundRequest req, RefundScope scope))

[修改] 调用方直接注入 RefundService;
        OrderService 中原 refund 方法降级为 1 行 delegate `refundService.refund(req)`,
        或彻底删掉,让调用方切到新 service。
```

**反模式 — 无任何例外**:

```java
// ❌ 反例 1:新业务分支塞进 god service
class OrderService {
    public void refund(...) { ... }
    public void cancel(...) { ... }
    public void reject(...) { ... }
    public void reverseCheckout(...) {  // ❌ 新业务分支 → 必须新建 ReverseCheckoutService
        // 任何业务逻辑都不允许
    }
}

// ❌ 反例 2:同分支变种也不能塞进 god service
class OrderService {
    public void refund(...) { ... }
    public void cancel(...) { ... }
    public void reject(...) { ... }
    public void partialRefund(...) {    // ❌ 即使共享退款状态机,也不放 god service
        // 应该把 refund + partialRefund 一起搬到 RefundService
    }
}
```

**自检两连问**(写第一行前必须答):

1. **"这个新方法属于哪个业务分支?"** — 用前面"识别信号"表认定。
2. **"这个分支有自己的 focused service 吗?"** —
   - 有 → 新方法进该 focused service,作为它的下一个 public 方法或参数化合并。
   - 没有,但既有方法散落在 god service → **新建该分支的 focused service**,把既有方法 + 新方法**一并迁过去**;god service 对应位置降级为 1 行 delegate 或删除。
   - 完全是新分支 → 新建该分支的 focused service,新方法作为它的首个 public。

**任何情况下都不允许往 god service 里加业务方法**——god service 最多保留 1 行 delegate 入口,且禁止写任何业务逻辑。

**常见自我说服话术 → 一律视为违规**:

- "反正只是加个开关 / 一个字段判断 / 几十行"
- "这个 service 才 200 行还没到巨型"
- "和 cancel 长得差不多,放一起也行"
- "先加进来,以后再拆"
- "建新文件太麻烦,审 PR 的人会觉得过度设计"
- "partialRefund 和 refund 共享状态机,所以可以放 OrderService" — **错**,共享状态机说明它们属于同一退款分支,**两者都应该在 `RefundService` 里**,而不是都留在 god service
- "把既有 refund 也迁出去太大动静,先把新方法塞进来" — strangler pattern 的目的就是逐步迁出,**这次扩展就是迁出契机**

以上任何一种,都是把"AI 惯性追加"包装成"合理判断"。**听到自己说这些话时直接停手,新建/复用 focused sub-service**。

**与既有规则的关系**:

- 通用「新代码落点决策」(上一节)兜底所有"扩展旧代码"场景;本节是它在 service 粒度的**硬化下钻**——零退路。
- `coding-standards-common §2 函数原子`(80 行硬阈值)在方法粒度限制单一方法体积;本节在 service 粒度限制每个 service 只服务一个业务分支。两者**正交**。
- `korepos-backend-service` 的"一接口一 service"是 Flutter backend 侧的强约束;本节是它在 Java/Spring + 通用全栈侧的对应规则,本质同向:**业务分支隔离 + god service 只做 delegate 入口**。

#### 跨分支编排(同一回合调用 ≥2 个 focused service 时的归属)

> 一旦"focused service per branch"落实,新的问题就来了:用户点一个按钮"批准并退款",对应 cancel + refund 两个分支需要在同一事务 / 同一回合内顺序执行——这段编排代码**不能**写在 `RefundService` 里(它就该只管退款分支),也**不能**写在 `CancelService` 里,更**不能**留在 Controller / UI 里。它有自己的归属。

**核心原则**:**跨分支编排逻辑(顺序、事务、补偿、回滚)走独立的上层 Orchestrator / UseCase / Saga**,不进任何一个 focused service 内部。

**判定 — 何时必须建独立 orchestrator**:

满足以下**任一**条件,跨分支调用必须收敛到独立 orchestrator,而不是让上游(Controller / 上层 UseCase / 另一个 focused service)直接连续调用 ≥2 个 focused service:

| # | 条件 | 举例 |
|---|------|------|
| O1 | 调用 ≥2 个 focused service 且需要**原子事务边界** | `approveAndRefund`:cancel + refund 必须同事务,任一失败全部回滚 |
| O2 | 调用 ≥2 个 focused service 且有**顺序依赖**或**条件分支** | "先校验是否可退,再决定走全额退还是部分退" |
| O3 | 调用 ≥2 个 focused service 且需要**失败补偿**(Saga 模式) | "退款成功但通知失败 → 不回滚退款,补一条异步重试" |
| O4 | 业务概念本身就是**一个独立可命名的复合动作** | "审核通过 + 通知卖家 + 释放库存"在 UI 上是一个按钮、一个流程节点 |

**正确形态**:

```text
[新建] features/order/application/ApproveAndRefundOrchestrator.java
        - public void execute(ApproveAndRefundRequest req) {
              cancelService.cancel(...);       // 调用 CancelService 的 focused 能力
              refundService.refund(...);       // 调用 RefundService 的 focused 能力
              // orchestrator 只编排:顺序 / 事务声明 / 失败补偿 / 编排日志
              // 不写任何 cancel 或 refund 的业务逻辑(那些归 focused service)
          }

[调用方] Controller / 上层 UseCase 注入 ApproveAndRefundOrchestrator 调用,
        不再直接连续调用 CancelService + RefundService。
```

**Orchestrator 内部职责清单**(只允许这些):

- 调用顺序编排
- 事务边界声明(`@Transactional` / 显式事务管理)
- 失败补偿 / 回滚 / Saga 补偿动作触发
- 跨分支幂等键的协调
- 编排级别的流程日志(不是分支内部日志,那归 focused service)

**Orchestrator 内部禁止**:

- **业务规则**(状态判断 / 金额计算 / 校验逻辑)——这些归对应 focused service 或 Domain
- **数据访问**(SQL / DAO / Repository 直接调用)——必须经过 focused service
- **协议适配**(HTTP / DTO 转换)——归 Controller
- **业务方法 ≥ 2 个 public**——一个 orchestrator 一个复合动作;多个复合动作建多个 orchestrator(与"每分支一 service"原则同向)

**反模式**:

```java
// ❌ 反例 1:Controller 直接连续调用 ≥2 个 focused service,编排逻辑漏到 Controller
class OrderController {
    public void approveAndRefund(Request req) {
        cancelService.cancel(req);    // ❌ 编排在 Controller
        refundService.refund(req);    // ❌ 事务边界不清
    }
}

// ❌ 反例 2:把编排塞进其中一个 focused service
class RefundService {
    public void refundWithApprove(Request req) {
        cancelService.cancel(req);    // ❌ RefundService 不该知道 cancel 分支
        // refund 逻辑...
    }
}

// ✅ 正确:独立 orchestrator
class ApproveAndRefundOrchestrator {
    @Transactional
    public void execute(ApproveAndRefundRequest req) {
        cancelService.cancel(req);
        refundService.refund(req);
    }
}
```

**自检**:写第一行前问——本次新代码是否要在同一回合调用 ≥2 个 focused service?是 → 必须落到独立 orchestrator,不进任何 focused service 内部。

#### 横切关注点不计入 god service 判定(AOP / 拦截器 / 事务声明的豁免)

> 容易混淆的边界:日志、审计、权限、事务声明、metrics、缓存、限流、链路追踪——这些**横切关注点**如果按"每个 focused service 各自实现一遍"就重复污染;但它们的**集中实现类**(`AuditAspect` / `LoggingInterceptor` / `SecurityFilter`)看起来像 god class(一个类切到所有 service)。**这种集中实现不算 god service,不受本节约束**,因为它们处理的不是业务分支,是横切机制。

**横切关注点的归属(Java / Python / Dart 三栈对照)**:

| 横切类别 | Java(Spring) | Python(FastAPI / Django) | Dart(Flutter / Shelf / Serverpod) |
|---------|-------------|--------------------------|-----------------------------------|
| 日志 / 审计 | Spring AOP `@Aspect` / Servlet Filter / Interceptor | `@audit` decorator / FastAPI `Depends` / Django middleware | Shelf middleware / Riverpod ProviderObserver / Serverpod future hooks |
| 权限 / 鉴权 | Spring Security / `@PreAuthorize` + AOP | FastAPI `Depends(get_current_user)` / Django `@login_required` / DRF `permission_classes` | Shelf middleware / Serverpod auth handler / Flutter route guard |
| 事务声明 | `@Transactional` | SQLAlchemy `with session.begin():` / Django `@transaction.atomic` / 上下文管理器 | Drift `transaction()` / SQLite `db.transaction()` / Serverpod `db.transaction()` |
| Metrics / 链路追踪 | Micrometer / OpenTelemetry / AOP | OpenTelemetry / Prometheus client + middleware / `@trace` decorator | OpenTelemetry Dart SDK / Riverpod observer |
| 缓存 | `@Cacheable` + AOP | `functools.lru_cache` / `@cache` decorator / Redis client + middleware | `package:cache` / Riverpod `AsyncValue` cache |
| 限流 / 熔断 | Resilience4j / Sentinel / 网关层 | `slowapi` / `aiolimiter` / API Gateway | Shelf rate-limiter middleware / API Gateway |
| 入参校验 | `@Valid` + Bean Validation | Pydantic models / FastAPI 自动校验 / Django Form | freezed + json_serializable / built_value / 手动 assert |
| 错误统一处理 | `@ControllerAdvice` + `@ExceptionHandler` | FastAPI `@app.exception_handler` / Django middleware | Shelf middleware / Serverpod endpoint error handler |

**强制规则**:

- **focused service 内部不重复实现横切**——不在每个 service 方法里手写 `log.info(...)` + `auditService.record(...)` + `permissionCheck(...)`;这些走 AOP / 拦截器统一注入。
- **横切实现类不计入业务 service**——`AuditAspect` 切到 100 个 service 也不是 god service;它是**横切机制**,不是**业务容器**。判定 god service 的标准是"承载多个业务分支的业务方法",不是"被很多人调用"。
- **事务边界归 orchestrator / Application 层**,不归 Domain / focused service 内部;focused service 的方法应该可以脱离事务运行(便于单测)。
- **横切关注点不算"新下游依赖"**——focused service 上加 `@Transactional` / `@Cacheable` / `@PreAuthorize` 不触发"引入新下游 → 拆分支"的判定,因为它们是机制不是业务依赖。

**反模式与正确形态对照(Java / Python / Dart 三栈写法等价)**:

```java
// Java ❌ — focused service 内手写横切
class RefundService {
    public void refund(req) {
        log.info("refund start, req={}", req);      // ❌ 横切走 AOP
        permissionCheck(req.userId, "REFUND");       // ❌ 走 @PreAuthorize
        auditService.record("refund", req);          // ❌ 走 @Audited + AOP
        // ... 业务逻辑
    }
}

// Java ✅ — 横切由注解 + AOP 统一注入
@Audited @PreAuthorize("hasPermission('REFUND')")
class RefundService {
    @Transactional
    public void refund(req) { /* 只写退款业务 */ }
}
```

```python
# Python ❌ — focused service 内手写横切
class RefundService:
    def refund(self, req):
        logger.info("refund start, req=%s", req)              # ❌ 走 middleware/decorator
        if not has_permission(req.user_id, "REFUND"): raise   # ❌ 走 Depends 注入
        audit_service.record("refund", req)                   # ❌ 走 @audit decorator
        # ... 业务逻辑

# Python ✅ — 横切由 decorator + Depends 统一注入
@audit("refund")
@require_permission("REFUND")
class RefundService:
    @transactional
    def refund(self, req): pass  # 只写退款业务
```

```dart
// Dart ❌ — focused service 内手写横切
class RefundService {
  Future<void> refund(req) async {
    logger.info('refund start, req=$req');                    // ❌ 走 middleware
    if (!hasPermission(req.userId, 'REFUND')) throw ...;      // ❌ 走 auth guard
    await auditService.record('refund', req);                 // ❌ 走 middleware
    // ... 业务逻辑
  }
}

// Dart ✅ — 横切由 middleware / interceptor 统一注入
// (在 endpoint 注册时挂上 auth/audit/logging middleware)
class RefundService {
  Future<void> refund(req) async {
    await db.transaction(() async {
      // 只写退款业务
    });
  }
}
```

### 禁止行为

| 禁止行为 | 正确处理 |
|----------|----------|
| 为了快，直接复制一个相似文件再改几行 | 先识别可复用能力，必要时抽象公共能力或拆分职责 |
| 一个方法同时处理参数适配、业务判断、SQL、HTTP、日志流水 | 按 Presentation / Application / Domain / Infrastructure 拆分 |
| 为了少建文件，把多个业务场景塞进一个 Service | 按 UseCase 或原子能力拆分，保持单一职责 |
| 上层直接依赖 DAO / HTTP Client / 其它 feature 内部类 | 通过 Repository、Application Service 或能力端口隔离 |
| 继续沿用低质量旧结构，只因为项目里已有类似写法 | 先评估现有代码质量；差结构只能提取业务事实，不能扩散 |
| 在已有的巨型方法 / 旧骨架文件里就地追加新逻辑（新增 N 行内联在旧代码段里） | 新逻辑放到新 service / 新子门面 / 新原子能力暴露 public 方法，旧文件只 +1 行调用，详见「新代码落点决策」节 |
| 往多分支 god service（如 `OrderService` 同时承载 `refund`/`cancel`/`reject`）里追加**任何** public 业务方法——不论新方法是新业务分支（`reverseCheckout`）还是同分支变种（`partialRefund`） | **新业务分支** → 新建该分支的 focused service（`ReverseCheckoutService`），作为其 public 方法；**同分支变种** → 若该分支已有 focused service（`RefundService`）则加进去，若分支仍散落在 god service 则新建 focused service 并把既有方法+变种**一并迁过去**。任何情况下 god service 都不新增业务方法，最多保留 1 行 delegate 入口，且禁止写任何业务逻辑。详见「Service 业务动作扩展铁律」节 |

---

## 前端约束

适用于 React / Vue。

标准调用链：

```text
Page
  ↓
Hook / Composable
  ↓
Service
  ↓
API
```

强制规则：

1. Page 不能直接调用 API。
2. API 必须封装在 `api/` 层。
3. 业务流程放在 hook / composable / service。
4. UI 组件必须尽量纯展示，不承载业务规则。
5. 跨页面复用的业务逻辑不能复制粘贴，必须沉淀为 service 或 reusable hook。

---

## Flutter 约束

标准调用链：

```text
Widget
  ↓
ViewModel / Provider / StateNotifier
  ↓
Application Service / UseCase
  ↓
Repository
  ↓
Infrastructure / DAO / HTTP
```

强制规则：

1. Widget 不写业务逻辑。
2. 状态管理层只做状态编排，不直接写 SQL / HTTP。
3. 所有数据访问必须通过 Repository。
4. SQLite、HTTP、本地文件统一放 Infrastructure / DAO。
5. 金额、状态、业务规则优先沉到 Domain / Application，不散落在 Widget。

---

## Java 后端约束

适用于 Spring Boot / Spring Cloud。

标准调用链：

```text
Controller
  ↓
Application Service / UseCase
  ↓
Domain Service / Policy / Entity
  ↓
Repository Interface
  ↓
Infrastructure Mapper / Client / MQ Adapter
```

强制规则：

1. Controller 只处理协议适配、参数校验入口、响应包装。
2. Service 不能变成巨型类；一个 Service 应围绕一个清晰业务能力或流程。**多分支 god service**(如 `OrderService` 同时承载 `refund`/`cancel`/`reject`)**不允许追加任何 public 业务方法**——无论新方法是新业务分支(`reverseCheckout`)还是同分支变种(`partialRefund`)。新业务分支新建该分支的 focused service;同分支变种进该分支的 focused service(若分支散落在 god service 则新建并把既有方法+变种**一并迁过去**)。god service 只保留 1 行 delegate 入口。详见「Service 业务动作扩展铁律」节。
3. 领域规则不能写在 Mapper、Controller、Feign Client 中。
4. Feign / Mapper / Redis / MQ 调用必须隔离到 Infrastructure 或 Adapter。
5. 事务边界放在 Application 层，Domain 不感知事务框架。

---

## Python 后端约束

适用于 FastAPI / Django(含 DRF) / Flask。

标准调用链：

```text
Endpoint(FastAPI router / Django view / Flask route)
  ↓
Application Service / UseCase  (XxxService class)
  ↓
Domain Service / Policy / Entity  (纯业务规则,无 IO)
  ↓
Repository Interface(协议 / Protocol / ABC)
  ↓
Infrastructure(SQLAlchemy / Django ORM / httpx / aio-pika)
```

强制规则：

1. Endpoint(`@router.post(...)` / `views.py` / `@app.route(...)`)只处理协议适配、Pydantic / DRF Serializer 校验、响应包装。
2. Service 不能变成巨型类;一个 Service 围绕一个清晰业务分支。**god service 不允许新增业务方法**——铁律与 Java 完全一致,详见「Service 业务动作扩展铁律」节。
3. 领域规则(纯函数 / Pydantic model 方法 / dataclass 行为)**不依赖** FastAPI / Django ORM / SQLAlchemy / Celery 等框架,可脱离 web 框架单测。
4. SQLAlchemy / Django ORM / httpx / redis-py / aio-pika 等技术调用必须隔离到 Infrastructure 或 Adapter。
5. **事务边界放在 Application 层**(`with session.begin():` / `@transaction.atomic` / `async with db.transaction():`),Domain 不感知 session / transaction;事务跨聚合时改走 Domain Event(blinker / Celery / Kafka)+ Saga。
6. **依赖注入用 FastAPI `Depends()` / Django app 配置 / DI 容器**,禁止在 Service 内部 import 具体 Infrastructure 实现;Service 只依赖 Repository 协议(`Protocol` / `ABC`)。
7. **异步与同步分层一致**——同步项目(Django)和异步项目(FastAPI)的分层规则一致,异步项目所有 IO 必须 `async`,Service / Repository 接口同步异步选定一种贯彻。
8. **数据 DTO 用 Pydantic / dataclass**,禁 ORM 模型穿透到 Endpoint / Domain;DTO ↔ Domain ↔ ORM 三态分离,在 Application / Infrastructure 边界做转换。

横切机制对照(同上「横切关注点不计入 god service 判定」节的 Python 列):FastAPI `Depends` / decorator / middleware 等价 Spring 的 `@Aspect` + AOP,**横切实现类不计入 god service**。

---

## Dart 后端约束

适用于 Serverpod / Shelf / koreposBackendService / Aqueduct 等。

> Flutter 客户端约束见上面「Flutter 约束」节;本节专管 Dart 服务端 / Flutter backend 模块的业务代码。

标准调用链：

```text
Endpoint(Shelf router / Serverpod Endpoint class / koreposBackendService backend)
  ↓
Application Service / UseCase  (XxxService class)
  ↓
Domain Service / Policy / Entity  (纯 Dart class / freezed model)
  ↓
Repository Interface(abstract class)
  ↓
Infrastructure(Drift / sqflite / dio / Serverpod db)
```

强制规则：

1. Endpoint(Shelf handler / Serverpod `Endpoint` 子类 / koreposBackendService 的 `backend/` 目录入口)只处理协议适配、freezed / json_serializable DTO 反序列化、响应包装。
2. Service 不能变成巨型类;一个 Service 围绕一个清晰业务分支。**god service 不允许新增业务方法**——铁律与 Java / Python 完全一致;`korepos-backend-service` 的"一接口一 service"是它在 Flutter backend 侧的更强表达。
3. 领域规则(纯 class / freezed sealed class / value object)**不依赖** Flutter / Drift / Riverpod / Serverpod 框架,可在纯 Dart VM 下单测。
4. Drift / sqflite / dio / Serverpod db / shared_preferences 等技术调用必须隔离到 Infrastructure / DAO。
5. **事务边界放在 Application 层**(`db.transaction(() async { ... })` / Drift `transaction()` / Serverpod `session.db.transaction()`),Domain 不感知 transaction;跨聚合走 Serverpod stream / Riverpod provider 通信 + Saga。
6. **依赖注入用 get_it / Riverpod / 构造器注入**,禁止在 Service 内部直接 `new` 具体 Infrastructure 实现;Service 只依赖 Repository 抽象。
7. **DTO 用 freezed + json_serializable**(参见 `korepos-backend-service` 强约束:wire DTO 必须 `@JsonSerializable(explicitToJson: true)`,禁 `@freezed`);DTO ↔ Domain ↔ DB Entity 三态分离,在 Application / Infrastructure 边界做转换。
8. **避免在 Service 用 `dynamic` / `Object?` / `Map<String, dynamic>` 容忍多形态**(详见 `korepos-backend-service` Step 2/3 通用章节),所有字段声明唯一确定类型。

横切机制对照见上面「横切关注点不计入 god service 判定」节的 Dart 列:Shelf middleware / Riverpod ProviderObserver / Serverpod future hooks 等价 Spring AOP,**横切实现类不计入 god service**。

---

## 命名规范

### 服务命名 taxonomy(Service / UseCase / Handler / Orchestrator)

> 立场:Application 层的"业务容器类"在不同流派下有不同叫法——CQRS 流派叫 `XxxCommandHandler` / `XxxHandler`、Clean Architecture 流派叫 `XxxUseCase` / `XxxInteractor`、传统 Spring 流派叫 `XxxService`。**三种叫法语义等价**(都是 focused 业务分支容器),但**同一项目内必须选定一种贯彻**,不能 `RefundService` / `CancelUseCase` / `ReverseCheckoutHandler` 三种混用。本节给出选型矩阵 + 强制映射,把"叫法之争"封死。

**1. 选型矩阵(项目级选定一种,后续所有 focused service 沿用)**:

| 项目主流派 | 语言典型框架 | 选用命名 | 理由 |
|-----------|-------------|---------|------|
| 传统 Spring Boot / 主流 Java 后端 | Spring Boot / Spring Cloud | **`XxxService`** | 与 `@Service` 注解 + Spring 教科书 + 团队既有命名一致 |
| Python Web 后端(主流) | FastAPI / Django / Flask | **`XxxService`** | Python 社区主流命名(FastAPI 文档、cosmic-python 等),与 Java 跨栈一致 |
| Dart 后端(跨端 + Flutter backend) | Serverpod / Shelf / `korepos-backend-service` | **`XxxService`**(与 `korepos-backend-service` 对齐) | 已有 skill 强约束 + Flutter 社区主流 |
| TypeScript 后端 | NestJS / tRPC | **`XxxService`** | NestJS `@Injectable()` 标准命名 |
| CQRS / 命令-查询分离 / EventSourcing | Axon(Java) / MediatR(.NET) / cqrs(Python) | **`XxxCommandHandler`**(写)/ **`XxxQueryHandler`**(读) | CQRS 教科书命名 |
| Clean Architecture / Hexagonal / 强调用例 | 跨语言通用 | **`XxxUseCase`** / **`XxxInteractor`** | Robert Martin 命名,与 Use Case Driven Design 一致 |

> 多语言项目原则:**全栈选同一种命名**(默认 `XxxService`),避免 Java 项目用 `XxxService`、Python 项目用 `XxxUseCase`、Dart 项目用 `XxxHandler` 这种"按语言切换叫法"——团队 onboarding 成本太高。CQRS 流派除外(它本身就是跨语言一致的)。

**2. 跨分支编排类(orchestrator)统一叫法**(与上面 focused service 命名解耦):

| 编排类型 | 统一命名 | 用途 |
|---------|---------|------|
| 跨分支同步编排 | **`XxxOrchestrator`** | 调用 ≥2 个 focused service,同事务边界 |
| 跨分支异步编排 / 失败补偿 | **`XxxSaga`** | 长事务 / 补偿动作 / 跨服务最终一致性 |
| Application 层用例聚合(可选) | **`XxxUseCase`** | 注意:若 focused service 已选 `XxxUseCase`,则 orchestrator 用 `XxxOrchestrator` 区分 |

**3. 其它角色命名(全局统一)**:

| 类型 | 命名示例 | 备注 |
|------|----------|------|
| Domain Service / 原子能力(纯业务规则,无 IO) | `RefundCalculator` / `RefundPolicy` / `RefundValidator` | 避免与 focused service 同名;用 `Calculator` / `Policy` / `Validator` / `Resolver` 等表达"纯规则" |
| Repository 接口 | `OrderRepository` | 业务语义命名 |
| Repository 实现 | `OrderRepositoryImpl` / `MybatisOrderRepository` | 实现可带技术前缀 |
| Controller | `RefundController` | RESTful 路由对应 |
| React Hook | `useRefund` | 复用业务流程 |
| Vue Composable | `useRefund` | 同上 |
| Flutter ViewModel | `RefundViewModel` | 状态编排 |
| 横切实现(AOP / Filter) | `AuditAspect` / `LoggingInterceptor` / `SecurityFilter` | 用 `Aspect` / `Interceptor` / `Filter` / `Middleware` 后缀标明横切机制 |

**4. 反模式(禁止)**:

- ❌ **同一项目混用 focused service 命名**:`RefundService` + `CancelUseCase` + `ReverseCheckoutHandler` 三种叫法并存,后续 AI / 新人不知道该建哪种 → 选定一种贯彻
- ❌ **`XxxApplicationService` 容器化命名**:这个名字暗示"一个 aggregate 一个 service 含多方法"的传统 DDD 模式,与本 SKILL 的"每分支一 focused service"相反,**禁止新建**;若历史代码已有,按 god service 处置(对应分支抽到独立 focused service)
- ❌ **`XxxManager` / `XxxHelper` / `XxxUtil`**:语义模糊,容易演化成 god class → 改用 `XxxService` / `XxxCalculator` / `XxxPolicy` 等表意命名
- ❌ **focused service 与 Domain 原子能力同名**:`RefundService`(application 编排)与 `RefundService`(domain 规则)冲突 → Domain 侧改 `RefundCalculator` / `RefundPolicy` 等

---

## 编码前检查清单

写第一行业务代码前，必须逐项确认：

- [ ] 本次代码属于哪个 feature。
- [ ] 本次代码属于哪一层。
- [ ] 调用方向是否只从上层到下层。
- [ ] UI / Controller / Page 是否没有直接访问 Repository / DB / HTTP。
- [ ] 业务规则是否没有写进 Infrastructure。
- [ ] 可复用业务能力是否已沉淀为原子能力。
- [ ] 是否复用了已有原子能力，而不是重复实现。
- [ ] 是否避免新增巨型 Service。
- [ ] **扩展既有 service 时,是否答了两连问:(1) 新方法属于哪个业务分支?(2) 该分支有 focused service 吗?——任何情况下都不允许往多分支 god service 里加业务方法,新分支新建 focused service,同分支变种进该分支的 focused service(若散落在 god service 则新建并把既有方法一并迁过去),god service 只保留 1 行 delegate 入口。**
- [ ] **本次新代码是否在同一回合调用 ≥2 个 focused service?是 → 必须落到独立 Orchestrator / Saga,不进任一 focused service 内部,Controller 也不直接连续调用。**
- [ ] **横切关注点(日志/审计/权限/事务/metrics/缓存/限流)是否走 AOP / 拦截器 / 注解统一注入,而不是在 focused service 内部手写?横切实现类(`AuditAspect` 等)不算 god service。**
- [ ] **本次新建 / 复用的 focused service / orchestrator 命名是否符合项目选定的 taxonomy(同一项目内 `Service` / `UseCase` / `CommandHandler` 三种叫法只选一种贯彻)?Orchestrator / Saga 命名是否与 focused service 区分?禁止 `XxxApplicationService` / `XxxManager` / `XxxHelper` 等模糊命名。**
- [ ] **本次修改涉及 ≥2 个表 / ≥2 个领域对象时,是否先用「聚合边界 5 问」判定它们是否同聚合?同聚合 → 同事务直接修改;不同聚合 → 走 Domain Event 或 Saga,禁止 `@Transactional` 内硬改 ≥2 个聚合根。**
- [ ] 代码结构是否清晰，文件/类/方法职责是否单一。
- [ ] 新增实现是否易于维护，未来规则扩展是否有稳定落点。
- [ ] 是否保持低耦合，避免跨层、跨 feature 直接依赖内部实现。
- [ ] 是否保持高内聚，同一业务能力的规则和状态处理是否集中表达。
- [ ] 生成代码时能说明每个类/文件属于哪一层。

---

## 输出要求

当本 Skill 参与编码时，AI 在动手前必须先给出简短分层判断：

```text
分层判断：
- Feature：{feature_name}
- Presentation：{是否涉及，文件/类}
- Application：{是否涉及，文件/类}
- Domain：{是否涉及，文件/类}
- Repository：{是否涉及，文件/类}
- Infrastructure：{是否涉及，文件/类}
- 原子能力复用/新增：{说明}
- 结构质量：{清晰性 / 可维护性 / 低耦合 / 高内聚判断}
```

如果无法判断层级，必须先读取项目结构或设计文档；仍无法判断时，向用户确认，不得直接把逻辑写进 UI / Controller。

---

## 红色警告

| 想法 | 正确处理 |
|------|----------|
| "这个逻辑很短，直接写 Controller 里" | 先判断是否是业务规则；是则下沉 Application / Domain |
| "页面直接调 API 更快" | API 封装到 api 层，页面调用 hook / service |
| "Repository 实现里顺便编排业务流程" | 编排放 Application，Infrastructure 只做技术实现 |
| "多个 UseCase 复制一段计算逻辑" | 抽成原子能力并补测试 |
| "Domain 里注入 HTTP Client / Mapper" | Domain 保持纯业务，技术依赖放 Infrastructure |
| "一个 Service 什么都管" | 按 UseCase / 原子能力拆分，职责单一 |
| "原 service 才 200 行,反正还没到巨型,加个 reverseCheckout 没事" | 错。Service 业务动作扩展看的不是行数,是**新方法属于哪个业务分支 + 该分支有没有 focused service**。多分支 god service 一律不允许加业务方法,只允许 1 行 delegate |
| "新增方法只有几十行,先在原 service 加,以后再拆" | "以后再拆"几乎不会发生;一旦塞进去,下次再加新分支时上一个先例就成了借口,会持续向同一容器堆叠。**第一次扩展就建 focused sub-service** |
| "partialRefund 和 refund 共享状态机,所以可以放 OrderService" | 错。共享状态机说明它们属于同一退款分支——**两者都应该在 `RefundService` 里**,不是都留在 god service。若既有 refund 还在 god service,本次扩展就是把它+新变种一并迁出的契机 |
| "把既有 refund 也迁出去太大动静,先把新方法塞 god service" | strangler pattern 的目的就是逐步迁出,**这次扩展就是迁出契机**。如果只迁新方法、既有方法还留在 god service,既有方法以后永远迁不出去 |
| "先能跑，结构以后再说" | 结构质量是编码前门禁，先拆职责和依赖边界再写 |
| "复制旧实现最快" | 先判断旧实现是否值得参考；低质量旧结构不能扩散 |
