---
name: architecture-ddd-lite-fullstack
description: "Use before writing or reviewing business code in Java, Go, Python, React, or Vue to choose layers, feature boundaries, reusable capabilities, and one-way dependencies."
---

# DDD-lite 全栈架构方法

## 目标

让业务规则位于稳定、可验证的边界内，保持职责清楚和依赖可控。沿用项目已确认的架构；下面的分层是参考，不要求简单用例建立空层或接口。按[工程原则](../change-readiness/references/engineering-principles.md)控制本次改动范围。

## 渐进读取

- 需要判断层职责、feature 结构、聚合或事务边界时，读取 [references/layers-and-boundaries.md](references/layers-and-boundaries.md)。
- 根据技术栈，只读取 [references/framework-rules.md](references/framework-rules.md) 中对应章节。
- 扩展既有 Service、Controller、Page、Widget，新增跨 feature 调用，目标目录混放多个职责簇，或目标文件已呈现多职责、巨型文件、跨分支编排迹象时，需要结构判断时读取 [rules/structure-quality-gates.md](rules/structure-quality-gates.md)。该文件提供语义分包、服务拆分和公共边界的判断依据。

## 基本依赖方向

```text
presentation -> application -> domain
infrastructure -> domain
```

Domain 不依赖 UI、Controller、数据库实现、HTTP 客户端或框架适配器。

## 实施判断

1. 确定改动属于哪个 feature，避免按纯技术类型向全局目录堆放业务代码。
   检查目标层内是否已有多个稳定职责簇；有则按语义分包，单一职责簇保持扁平。
2. 将输入适配留在 presentation，将用例编排留在 application，将业务不变量留在 domain。
3. Repository 在 domain 定义端口，在 infrastructure 提供实现；Go 按消费方在 application/domain 定义小接口，见 framework-rules 的 Go 章节。
4. 分支规则独立变化、依赖不同或妨碍验证时考虑提取函数、服务或策略；同一用例的简单分支可以保留。
5. 跨聚合或跨服务操作明确事务边界、失败补偿、幂等和可观测性。
6. 复用已有原子能力；不存在时以清晰业务动作命名新增能力。

### 函数级业务场景分流

按职责、依赖与变化原因判断是否拆分，不按分支数量建立 Service；详细判定见 `rules/structure-quality-gates.md`。

### 服务命名 taxonomy

名称应表达业务动作和职责边界，避免无边界的 `Manager`、`Helper` 或 `CommonService`；具体语言形式结合项目约定。

## 架构红线

- Controller、Page、Widget 不直接编写业务规则或持久化流程。
- Domain 不引用框架 DTO、ORM 实现或基础设施客户端。
- 不以 `Util`、`CommonService`、`Manager` 掩盖不清晰职责。
- 不为了形式完整创建没有行为的层或空抽象。
- 不在一个 Service 中混合互不相关的业务动作。
- 模块依赖遵守项目已声明的架构边界；不因模块名含 tool 就强制抽取平台或 SPI。
- 跨 feature 使用项目明确公开的契约，不引用明确私有的内部实现；公开入口不限定为 `public-api` 文件名。
- `common` 只接收稳定、无业务归属的运行时能力，不因“多个地方会用”就收纳业务 feature。

## 可执行门禁

- Skill 帮助判断语义边界；需要固化已确认的项目约束时，优先复用 ArchUnit、Maven Enforcer、ESLint 或已有 CI，不为通用建议另建门禁。
- `check-architecture-boundaries` 按有限路径约定发现风险，默认 warn；项目确认适用后可显式 block，off 可关闭。文件体积提醒不证明多职责。
- 命中或未命中均不能证明设计正确；结合项目边界、业务不变量与实际验证判断。

## 输出

说明与本次判断有关的落点、依赖或事务风险及验证即可，不要求逐项生成报告。
