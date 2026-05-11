---
name: architecture-ddd-lite-fullstack
description: "Use before writing or reviewing any business code in Java Spring Boot/Spring Cloud, React, Vue, or Flutter. MUST be invoked after design/pre-implementation orientation and before the first source-code edit to decide the target layer, feature module, reusable atomic capability, and maintainability boundaries. Enforces DDD-lite layering, feature-based structure, one-way dependencies, clear code structure, low coupling, high cohesion, and prevents business logic from being written directly in Controller/UI/Page."
---

# DDD-lite 全栈架构编码规范

## 核心哲学

该项目采用 DDD-lite + Feature 模块化架构，目标是：代码结构清晰、易于维护、低耦合、高内聚、可复用、可扩展、适合 AI 协作开发。

任何业务代码，必须先判断属于哪一层，再实现；不允许直接写在 Controller / UI / Page 中。

清晰结构不是“代码写完后再优化”的附加项，而是第一行代码前的门禁。AI 不得为了快速完成而新增难读、难测、难替换、职责混杂的实现。

---

## 快速导航

- **触发与门禁** → [触发时机](#触发时机) / [编码前检查清单](#编码前检查清单) / [输出要求](#输出要求)
- **架构分层** → [标准分层模型](#标准分层模型) / [各层职责](#各层职责)
- **项目组织** → [Feature 模块化结构](#feature-模块化结构) / [原子能力沉淀](#原子能力沉淀) / [结构质量门禁](#结构质量门禁)
- **技术栈约束** → [前端约束](#前端约束) / [Flutter 约束](#flutter-约束) / [Java 后端约束](#java-后端约束)

---

## 触发时机

在以下场景必须主动调用本 Skill：

| 场景 | 动作 |
|------|------|
| 准备编写 Java / React / Vue / Flutter 业务代码 | 先判断代码所属层级与 feature 模块 |
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

## 命名规范

| 类型 | 命名示例 |
|------|----------|
| UseCase | `ConfirmRefundUseCase` |
| Application Service | `RefundApplicationService` |
| Domain Service / 原子能力 | `RefundService` |
| Repository 接口 | `OrderRepository` |
| Repository 实现 | `OrderRepositoryImpl` |
| Controller | `RefundController` |
| React Hook | `useRefund` |
| Vue Composable | `useRefund` |
| Flutter ViewModel | `RefundViewModel` |

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
