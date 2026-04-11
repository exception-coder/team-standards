# {项目名} 项目画像

> 自动生成于 {YYYY-MM-DD HH:mm} | 生成工具：{tool_name}
> 项目路径：`{project_path}`
>
> 本文档由 `generate-project-profile` Skill 生成，供 AI Agent 消费。
> 每个 `## ` 章节可独立作为向量化分片单元。

---

## 1. 项目概述

- **项目名称**：{name}
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
| 搜索 | Elasticsearch | 8.x | 全文检索 |
| ... | ... | ... | ... |

---

## 3. 项目结构

```text
{项目根目录}/
├── {module-a}/
│   └── src/main/java/{base.package}/
│       ├── controller/          # API 层：协议处理、入参校验
│       ├── service/             # 应用层：业务编排、事务边界
│       ├── domain/              # 领域层：业务规则、领域模型
│       ├── infrastructure/      # 基础设施层：DB、HTTP、缓存
│       └── repository/          # 数据访问层
├── {module-b}/
│   └── ...
├── docs/                        # 项目文档
└── pom.xml                      # 构建配置
```

> 标注各目录的职责，只列出关键目录，省略 test / resources 等通用目录。

---

## 4. 分层架构

- **分层模式**：{DDD-lite / MVC / 六边形 / 无明显分层}
- **层间依赖方向**：

```text
Controller → Application Service → Domain Service → Repository
                                          ↓
                                    Infrastructure
```

- **依赖规则**：{如：上层可调下层，禁止反向依赖；Domain 层不依赖 Infrastructure}
- **违规项**：{从 import 分析中发现的违规，无则标注"无违规"}

---

## 5. 数据模型

| 实体/表名 | 核心字段 | 关联关系 | 说明 |
|-----------|---------|---------|------|
| User / t_user | id, username, email, status | 1:N -> Order | 用户主表 |
| Order / t_order | id, user_id, amount, status | N:1 -> User, 1:N -> OrderItem | 订单主表 |
| ... | ... | ... | ... |

> 只列核心实体，辅助表可省略。关联关系用 `1:N` / `N:1` / `M:N` 标注。

---

## 6. Service 能力清单

### {模块名/业务域}

| Service 类 | 方法签名 | 说明 |
|-----------|---------|------|
| UserService | `findById(Long id): User` | 按 ID 查询用户 |
| UserService | `createUser(CreateUserDTO dto): User` | 创建用户 |
| UserService | `updateStatus(Long id, UserStatus status): void` | 更新用户状态 |
| OrderService | `placeOrder(PlaceOrderDTO dto): Order` | 下单 |
| ... | ... | ... |

> 只列公开方法（public），忽略 private/protected 方法。
> Service 接口（I*Service）优先，无接口则读实现类。

---

## 7. API 接口

### {Controller 名 / 业务域}

| Method | URL | 入参 | 出参 | 说明 |
|--------|-----|------|------|------|
| GET | /api/users/{id} | PathVariable: id | User | 查询用户 |
| POST | /api/users | @RequestBody CreateUserDTO | User | 创建用户 |
| PUT | /api/users/{id}/status | PathVariable: id, @RequestBody StatusDTO | void | 更新状态 |
| ... | ... | ... | ... | ... |

> 按 Controller 分组，标注鉴权方式（如有特殊配置）。

---

## 8. 外部依赖服务

| 服务 | 协议 | 配置项 | 用途 |
|------|------|--------|------|
| MySQL | JDBC | spring.datasource.url | 主数据库 |
| Redis | redis:// | spring.data.redis.host | 缓存 + 分布式锁 |
| RabbitMQ | AMQP | spring.rabbitmq.host | 异步消息 |
| {第三方 API} | HTTP/gRPC | {配置项} | {用途} |
| ... | ... | ... | ... |

> 包括数据库、缓存、消息队列、第三方 HTTP/gRPC 服务等。

---

## 9. 配置概要

| 配置项 | 值 | Profile | 说明 |
|--------|-----|---------|------|
| server.port | 8080 | default | 服务端口 |
| spring.datasource.url | jdbc:mysql://*** | default | 数据库连接 |
| spring.datasource.password | *** | default | 数据库密码（已脱敏） |
| spring.data.redis.host | *** | default | Redis 地址 |
| {custom.config.key} | {value} | {profile} | {说明} |
| ... | ... | ... | ... |

> 敏感值（password / secret / key / token / api-key / credential）一律用 `***` 替代。
> 标注 profile（default / dev / prod / test）。

---

## 10. 编码约定

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
