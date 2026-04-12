# {项目名} 项目画像

> 自动生成于 {YYYY-MM-DD HH:mm} | 生成工具：{tool_name}
> 项目路径：`{project_path}`
> 服务注册名称：`{service_name}`
>
> 本文档由 `generate-project-profile` Skill 生成，供 AI Agent 分层消费。
> 每个 `## ` 章节可独立作为向量化分片单元。
>
> **按需加载指南**：
> - 需求分析阶段 → 加载 A 组（维度 1-5）
> - 方案设计阶段 → 加载 A 组 + C 组（维度 6-8）
> - 代码生成阶段 → 加载 D 组（维度 9-10）
> - 完整画像 → 加载全部

---

<!-- group: A - 业务能力层（需求分析消费） -->

## 1. 项目概述

- **项目名称**：{name}
- **服务注册名称**：{spring.application.name / 服务发现中的名称}
- **项目用途**：{一句话描述核心业务}
- **构建工具**：{Maven / Gradle / npm / pnpm / Go Modules / ...}
- **语言与版本**：{Java 17 / TypeScript 5.x / Go 1.21 / ...}
- **模块列表**：

| 模块名 | 职责 |
|--------|------|
| {module-a} | {一句话说明} |
| {module-b} | {一句话说明} |

---

## 2. 技术栈

| 分类 | 技术 | 版本 | 用途 |
|------|------|------|------|
| 框架 | Spring Boot | 3.2.x | Web 应用框架 |
| ORM | MyBatis-Plus | 3.5.x | 数据访问 |
| 缓存 | Redis | 7.x | 分布式缓存 |
| 消息队列 | RabbitMQ | 3.x | 异步消息 |
| ... | ... | ... | ... |

---

## 3. 数据模型与状态机

### 实体清单

| 实体/表名 | 核心字段 | 关联关系 | 说明 |
|-----------|---------|---------|------|
| Order / t_order | id, user_id, amount, status | 1:N -> OrderItem, N:1 -> User | 订单主表 |
| OrderItem / t_order_item | id, order_id, sku_id, qty, price | N:1 -> Order | 订单明细 |
| Payment / t_payment | id, order_id, amount, status, channel | N:1 -> Order | 支付记录 |
| ... | ... | ... | ... |

> 只列核心实体，辅助表可省略。关联关系用 `1:N` / `N:1` / `M:N` 标注。

### 状态机

| 实体 | 状态枚举类 | 状态值 | 流转路径 | 说明 |
|------|-----------|--------|---------|------|
| Order | OrderStatus | CREATED → PAID → SHIPPED → COMPLETED | 正常流程 | |
| Order | OrderStatus | PAID → REFUNDING → REFUNDED | 退款流程 | |
| Order | OrderStatus | CREATED → CANCELLED | 超时/用户取消 | |
| Payment | PaymentStatus | PENDING → SUCCESS | 支付成功 | |
| Payment | PaymentStatus | PENDING → FAILED | 支付失败 | |
| ... | ... | ... | ... | ... |

> 从枚举类中提取。若项目无枚举类但有状态字段，从注释或常量中推断。
> 未检测到状态流转时标注「未检测到状态枚举」。

---

## 4. 业务能力清单

> 按业务域分组。每个能力附一句话业务语义说明，而非纯技术方法签名。

### {业务域1：如 订单域}

| 能力 | Service#Method | 说明 |
|------|---------------|------|
| 创建订单 | OrderService#placeOrder | 校验库存 → 锁库存 → 创建订单 → 发布 ORDER_CREATED |
| 取消订单 | OrderService#cancelOrder | 仅 CREATED 状态可取消 → 释放库存 → ORDER_CANCELLED |
| 查询订单 | OrderService#getOrderDetail | 按 ID / 用户 / 状态查询 |
| ... | ... | ... |

### {业务域2：如 支付域}

| 能力 | Service#Method | 说明 |
|------|---------------|------|
| 发起支付 | PaymentService#createPayment | 调用支付网关 → 创建 Payment 记录 → 状态 PENDING |
| 支付回调 | PaymentService#handleCallback | 验签 → 更新 Payment 状态 → 更新 Order 为 PAID |
| ... | ... | ... |

> Service 接口（I*Service）优先，无接口则读实现类。只列公开方法。
> 业务域分组依据：按包结构（modules/xxx/）或按 Service 名前缀推断。

---

## 5. 核心业务流程

> 用编号列表描述 2-5 个核心业务流程。每步标注涉及的 Service、状态变迁和事件。
> 不画 Mermaid（追求精简可检索，流程图在 init-project-docs 中画）。

### {流程1：如 下单流程}

1. 用户提交订单 → `OrderController#placeOrder`
2. `OrderService` 校验参数 + 校验库存
3. 调用 `inventory-service`（Feign）锁定库存
4. 创建 Order 记录（状态：CREATED）→ 写入 `t_order` + `t_order_item`
5. 发布事件 `ORDER_CREATED`（orderId, userId, amount）
6. 返回订单详情

### {流程2：如 支付回调流程}

1. 第三方支付回调 → `PaymentController#callback`
2. `PaymentService` 验签 + 幂等校验（paymentId）
3. 更新 Payment 状态 PENDING → SUCCESS
4. 更新 Order 状态 CREATED → PAID
5. 发布事件 `ORDER_PAID`（orderId, paymentId）

> 如果流程涉及调用其他服务，标注目标服务名称。
> 未检测到明确业务流程时标注「需进一步分析」。

---

<!-- group: C - 接口与交互层（方案设计消费 + 图谱拼接） -->

## 6. 对外暴露接口

> 本服务暴露给其他服务或前端调用的接口。按业务域分组。

### {业务域1}

| Method | URL | 入参 | 出参 | 说明 |
|--------|-----|------|------|------|
| POST | /api/orders | PlaceOrderDTO | OrderVO | 创建订单 |
| GET | /api/orders/{id} | PathVariable: id | OrderDetailVO | 查询订单详情 |
| PUT | /api/orders/{id}/cancel | PathVariable: id | void | 取消订单 |
| ... | ... | ... | ... | ... |

> 按 Controller 分组，标注鉴权方式（如有特殊配置）。

---

## 7. 对外调用服务

> 本服务作为客户端，调用了哪些其他服务。这是知识图谱的「出边」。

| 目标服务 | 调用方式 | 接口 | 用途 | 触发场景 |
|---------|---------|------|------|---------|
| inventory-service | Feign | POST /api/inventory/lock | 锁定库存 | 创建订单时 |
| inventory-service | Feign | POST /api/inventory/release | 释放库存 | 取消订单时 |
| payment-gateway | HTTP | POST /api/pay/create | 发起支付 | 用户确认支付时 |
| ... | ... | ... | ... | ... |

> 目标服务名必须与对方 profile 中的服务注册名称一致。
> 从 @FeignClient / RestTemplate / WebClient / HttpClient 中扫描。
> 未检测到时标注「未检测到对外调用」。

---

## 8. 事件与消息契约

> 本服务发布和消费的异步事件/消息。这是知识图谱的「事件边」。

### 发布的事件

| Topic/Exchange | 事件类型 | Payload 关键字段 | 触发条件 |
|----------------|---------|-----------------|---------|
| order-events | ORDER_CREATED | orderId, userId, amount | 订单创建成功 |
| order-events | ORDER_PAID | orderId, paymentId | 支付回调成功 |
| order-events | ORDER_CANCELLED | orderId, reason | 用户取消订单 |
| ... | ... | ... | ... |

### 消费的事件

| Topic/Exchange | 事件类型 | 来源服务 | 处理逻辑 |
|----------------|---------|---------|---------|
| payment-events | PAYMENT_SUCCESS | payment-service | 更新订单状态为 PAID |
| payment-events | PAYMENT_FAILED | payment-service | 标记支付失败，释放库存 |
| ... | ... | ... | ... |

> 从 @RabbitListener / @KafkaListener / @EventListener / MQ Producer 中扫描。
> 未检测到时标注「未检测到事件/消息」。

---

<!-- group: D - 编码规范层（代码生成消费） -->

## 9. 编码约定

### 命名规范

| 类型 | 规则 | 示例 |
|------|------|------|
| Controller | {规则} | `UserController` |
| Service | {规则} | `UserService` / `IUserService` |
| Repository | {规则} | `UserRepository` / `UserMapper` |
| DTO | {规则} | `CreateUserDTO` / `UserVO` |
| 常量 | {规则} | `MAX_RETRY_COUNT` |

### 异常处理模式

```java
// 从项目中提取的真实代码示例
{粘贴项目中典型的异常处理代码片段}
```

### 返回值包装

```java
// 从项目中提取的真实代码示例
{粘贴项目中典型的返回值包装代码片段}
```

### 通用基类与工具类

| 类名 | 用途 | 说明 |
|------|------|------|
| {BaseEntity} | {所有实体基类} | {含 id / createTime / updateTime} |
| {Result} | {统一返回包装} | {含 code / message / data} |
| ... | ... | ... |

> 本节内容从代码中归纳而来，如项目无明显约定则标注「未检测到统一约定」。

---

## 10. 配置概要

> 仅列业务相关配置（功能开关、限额、超时、重试等），跳过纯基础设施配置。

| 配置项 | 值 | 说明 |
|--------|-----|------|
| {order.max-items} | 50 | 单笔订单最大商品数 |
| {payment.timeout-seconds} | 1800 | 支付超时时间 |
| {order.cancel.auto-cancel-minutes} | 30 | 未支付自动取消时间 |
| ... | ... | ... |

> 敏感值（password / secret / key / token）一律用 `***` 替代。
> 无业务配置时标注「未检测到业务相关配置」。
