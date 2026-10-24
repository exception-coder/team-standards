---
name: backend-evidence
description: "Use for backend changes or analysis involving DDL, SQL, data relations, states, fields, events, APIs, domain invariants, reverse impact, runtime evidence, or query performance. Keeps Graphify implementation facts, OpenSpec behavior, and database/runtime truth distinct."
---

# 后端证据

目标：用真实数据与运行证据核实单服务的 SQL、状态、不变量和查询性能。共同准则及证据分工见[工程宪法](../change-readiness/references/engineering-principles.md)。

## 判断准则

- 明确所属服务、受影响对象和消费者；新鲜 Graphify 定位读写点及反向影响，定向源码补齐覆盖缺口。新接口先核对现有能力。
- DDL、数据库、Mapper、日志与执行计划分别证明结构、映射和运行事实。行为规格与实现有冲突时保留差异，不能由现状直接推导应有业务规则。
- 状态变化核对进入条件、决策点、写入点、终态、不变量、失败与下一动作；稳定业务语义进入已有领域知识，当前影响证据留在任务中。

## 必要约束

- 数据库读写有可追溯 DDL 基线；缺失时只记录已验证事实。SQL 说明用途、参数、表关系、过滤及结果语义。
- 多数据源查询限定实体字段并显式投影，结果映射与真实数据库一致；动态 SQL 使用匹配版本的数据库及 Mapper 契约测试验证。
- 出现无界聚合、N+1、应用层过滤分页或全候选遍历时，落码前说明风险、估算最坏调用数并比较改进路径；取得相称的执行计划或计时证据，缺失则标记性能未验证。

## 精炼反例

- 图谱连到了库存表就认定库存规则成立：核对写入、约束和真实状态。
- 分页查 20 条再过滤，翻批次凑页：核实全集语义及最坏查询成本。
- SQL Hook 通过就称兼容 Oracle：核对实际版本、标识符、动态 SQL 与映射。

## 按需参考与交付

- SQL/Mapper/DAO/Repository：[SQL 正确性](references/sql-correctness-gate.md)。
- 统计、筛选、分页与批量访问：[查询性能](references/query-performance-gate.md)。
- 状态规格缺失或冲突：[领域规格候选](references/domain-spec-mining.md)。
- 已登记业务状态：[状态契约](../change-readiness/references/state-contract.md)，验证 writer/policy/query/migration 等价关系。

交付能定位的事实、推断与未确认候选。实现关系按需查询，沿用已有知识与证据载体；独立审计报告按请求生成并注明版本、范围及有效边界。
