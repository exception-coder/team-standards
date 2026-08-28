---
name: backend-evidence
description: "Use for backend changes or analysis involving DDL, SQL, data relations, states, fields, events, APIs, domain invariants, reverse impact, runtime evidence, or query performance. Keeps Graphify implementation facts, OpenSpec behavior, and database/runtime truth distinct."
---

# 后端证据治理

## 触发范围

用于单服务的 DDL、表关系、SQL、状态流转、领域不变量、反向影响、查询性能和运行证据。Graphify 负责当前实现定位，OpenSpec 负责行为契约；本 Skill 负责验证两者不能证明的数据与业务事实。跨项目调用链、纯前端状态和通用编程知识不归本 Skill。

## 渐进读取

- 编写、修改或评审 SQL、Mapper、DAO、Repository，或排查字段歧义、表列不存在、动态 SQL、结果映射和旧制品问题时，读取 [references/sql-correctness-gate.md](references/sql-correctness-gate.md)。
- 编写或评审统计、筛选、分页、批量遍历或循环数据访问逻辑时，读取 [references/query-performance-gate.md](references/query-performance-gate.md)。
- 订单、库存、审核、取消、退货、调拨、占用等对象状态或关联发生变化，且规格缺失或与证据冲突时，读取 [references/domain-spec-mining.md](references/domain-spec-mining.md)。

## 核心流程

1. 先确定实际调查的服务和任务边界，不以当前工作目录猜测归属。
2. OpenSpec `specs/` 是已接受行为契约，活动 `changes/` 是拟议行为；本 Skill 不再维护同义行为规格。
3. Graphify 是可再生的当前实现和反向影响定位层。查询状态、字段、事件、API、读写点或调用者时先使用新鲜图谱，过期时刷新或用 `git diff`、`rg` 和定向源码读取补齐。
4. DDL、真实数据库、SQL、日志和执行计划是数据与运行事实；不得用 OpenSpec 期望或 Graphify 推断代替验证。
5. 影响分析只形成当前任务的证据清单；拟议行为和协同项写入相关 OpenSpec change，不生成长期手工反向索引。
6. 已确认且跨变更稳定的业务语义、不变量和术语进入 domain knowledge；DDL、迁移、Mapper 契约测试和运行记录保留在其权威系统，不复制为知识图谱卡片。
7. 状态密集业务还要给出对象终态、不变量、失败与下一动作闭环；证据冲突时进入领域规格候选流程，不允许把实现现状直接提升为业务真理。

## 硬规则

- 涉及数据库读写的项目必须有可追溯 DDL 基线；没有 DDL 时只登记已验证事实，不臆造字段或约束。
- SQL 必须标注用途、参数、表关系、过滤条件和结果语义。
- 多数据源查询必须限定实体字段，禁止通配投影；动态 SQL 必须由项目使用匹配版本的真实数据库与 Mapper 契约测试验证。通用 Hook 命中不等于数据库验证通过。
- 命中无界聚合、应用层过滤分页、全候选批次遍历或 N+1 时，必须在落码前告警、估算最坏调用数、比较优化方案并取得与风险相称的执行计划或计时证据；证据缺失时标记“性能未验证”。
- 状态流转必须记录进入条件、决策点、写入点和失败行为。
- 新接口开发前通过 Graphify 和定向源码确认是否已有可复用能力；实现后用项目测试和 OpenSpec tasks 记录验证结果。

## 禁止创建平行事实库

- 不维护 `docs/knowledge-graph/reverse-index/`、`ai-docs/.../reverse-index/` 或同类手工代码索引。
- 不为 Entity、Service、Controller、流程、枚举或调用关系建立 Graphify 之外的全量卡片。
- 不把 OpenSpec 已拥有的行为正文复制到知识卡，也不把 DDL 或日志复制成长期业务规格。
- 只有用户明确要求独立审计报告时才生成一次性证据文档，并标注来源提交、工作区覆盖范围和有效期。

## 输出

输出应区分“已验证事实”“基于证据的推断”和“待确认候选”，并给出对应代码、DDL、SQL 或日志证据位置。
