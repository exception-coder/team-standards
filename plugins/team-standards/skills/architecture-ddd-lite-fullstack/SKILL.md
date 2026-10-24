---
name: architecture-ddd-lite-fullstack
description: "Use before writing or reviewing business code in Java, Go, Python, React, or Vue to choose layers, feature boundaries, reusable capabilities, and one-way dependencies."
---

# DDD-lite 全栈架构方法

目标：业务规则有稳定归属，依赖、事务和公开边界可解释、可验证。共同准则见[工程宪法](../change-readiness/references/engineering-principles.md)；沿用项目已确认架构，分层用于分离职责。

## 判断准则

- presentation 负责输入与展示，application 编排用例，domain 保护业务不变量；基础设施实现依赖领域端口。Domain 不依赖 UI、框架 DTO、ORM 实现或基础设施客户端。
- 按稳定业务职责组织 feature；层内出现不同职责簇时语义分包，单一职责保持扁平。拆函数、服务或策略的依据是变化原因、依赖与可验证性。
- Repository 端口通常归 domain；Go 接口按消费方在 application/domain 定义。跨 feature 只调用项目公开契约，公开入口不限定文件名。
- 跨聚合或服务的操作明确事务、重复执行、失败补偿与可观察结果。`common` 只容纳稳定且无业务归属的运行时能力。

## 必要约束与完成边界

Controller、Page、Widget 不承载业务规则或持久化流程；同一 Service 不混合无关业务动作。落点、依赖和事务安排足以支持本次实现与验证即可。

结构规则需固化时复用项目原生架构工具。`check-architecture-boundaries` 默认 warn，项目可显式 block/off；路径命中和文件大小只提供线索。

## 精炼反例

- 简单用例也新建空 Domain、Repository 接口：没有需要隔离的职责，不增加空层。
- 两个 feature 都要用订单规则就移入 common：复用订单领域的公开能力。
- 一个函数出现三个分支就拆三个 Service：先看规则是否独立变化。

## 按需参考

- 层职责、聚合与事务：[层与边界](references/layers-and-boundaries.md)。
- 技术栈差异：[框架规则](references/framework-rules.md)，只读当前语言章节。
- 多职责文件、跨 feature 调用或混杂目录：[结构质量规则](rules/structure-quality-gates.md)。
