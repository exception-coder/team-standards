---
name: architecture-ddd-lite-fullstack
description: "Use before writing or reviewing any business code in Java Spring Boot/Spring Cloud, React, Vue, or Flutter. MUST be invoked after design/pre-implementation orientation and before the first source-code edit to decide the target layer, feature module, and reusable atomic capability. Enforces DDD-lite layering, feature-based structure, one-way dependencies, and prevents business logic from being written directly in Controller/UI/Page."
---

# DDD-lite 全栈架构编码规范

## 核心哲学

该项目采用 DDD-lite + Feature 模块化架构，目标是：高内聚、低耦合、可复用、可扩展、适合 AI 协作开发。

任何业务代码，必须先判断属于哪一层，再实现；不允许直接写在 Controller / UI / Page 中。

---

## 快速导航

- **触发与门禁** → [触发时机](#触发时机) / [编码前检查清单](#编码前检查清单) / [输出要求](#输出要求)
- **架构分层** → [标准分层模型](#标准分层模型) / [各层职责](#各层职责)
- **项目组织** → [Feature 模块化结构](#feature-模块化结构) / [原子能力沉淀](#原子能力沉淀)
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
2. Service 不能变成巨型类；一个 Service 应围绕一个清晰业务能力或流程。
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
