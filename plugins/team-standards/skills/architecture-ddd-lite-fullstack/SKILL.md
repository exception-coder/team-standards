---
name: architecture-ddd-lite-fullstack
description: "Use before writing or reviewing business code in Java, Python, Dart, React, or Vue to choose layers, feature boundaries, reusable capabilities, and one-way dependencies."
---

# DDD-lite 全栈架构约束

## 目标

让业务规则位于稳定、可测试的边界内，保持 feature 内高内聚、层间单向依赖，并防止 Controller、Page、Widget 或基础设施对象承载业务逻辑。

## 渐进读取

- 需要判断层职责、feature 结构、聚合或事务边界时，读取 [references/layers-and-boundaries.md](references/layers-and-boundaries.md)。
- 根据技术栈，只读取 [references/framework-rules.md](references/framework-rules.md) 中对应章节。

## 基本依赖方向

```text
presentation -> application -> domain
infrastructure -> domain
```

Domain 不依赖 UI、Controller、数据库实现、HTTP 客户端或框架适配器。

## 实施判断

1. 确定改动属于哪个 feature，避免按纯技术类型向全局目录堆放业务代码。
2. 将输入适配留在 presentation，将用例编排留在 application，将业务不变量留在 domain。
3. Repository 在 domain 定义端口，在 infrastructure 提供实现。
4. 一个业务分支差异明显时拆成 focused service 或策略，不在单函数堆叠多场景条件。
5. 跨聚合或跨服务操作明确事务边界、失败补偿、幂等和可观测性。
6. 复用已有原子能力；不存在时以清晰业务动作命名新增能力。

### 函数级业务场景分流

不同业务场景的规则或失败行为明显不同时，拆成 focused function/service，由用例层选择；详细判定见 `references/layers-and-boundaries.md`。

### 服务命名 taxonomy

名称应表达业务动作和职责边界，避免无边界的 `Manager`、`Helper` 或 `CommonService`；具体语言形式结合项目约定。

## 架构红线

- Controller、Page、Widget 不直接编写业务规则或持久化流程。
- Domain 不引用框架 DTO、ORM 实现或基础设施客户端。
- 不以 `Util`、`CommonService`、`Manager` 掩盖不清晰职责。
- 不为了形式完整创建没有行为的层或空抽象。
- 不在一个 Service 中混合互不相关的业务动作。

## 输出

实施或评审时说明：目标 feature、落点层、复用能力、聚合/事务边界、依赖方向和验证方式。
