---
name: business-logic-orientation
description: "Use to understand existing business logic before refactoring, rewriting, migration, or regression review, or when aligning ambiguous business terminology or explicitly documenting current logic. Prefers Graphify and accepted OpenSpec specs over rebuilding parallel code indexes."
---

# 业务逻辑现状理解

目标：重构、复写、迁移或回归审查前，理解当前业务实际怎样运行及哪些行为需要保持。共同准则与证据分工见[工程宪法](../change-readiness/references/engineering-principles.md)。

## 判断准则

- 从项目入口确定业务边界和权威来源；Graphify 定位入口、依赖与读写链路，检查其对当前 HEAD 和工作区的覆盖，缺口用定向源码、DDL、测试或运行证据补齐。
- 分开说明当前实现、已接受规则、活动变更和推断。业务术语、状态语义及失败行为需要对应证据，调用关系本身不足以证明。
- 围绕本次问题还原主要路径与关键消费者，不生成平行代码索引。长期基线只有实际接手或迁移需要时才保存。

## 必要约束与完成边界

独立现状分析默认不写源码、不刷新图谱产物、不创建实施 change；作为已授权修复或重构的前置工作时，证据充分后继续原任务。结论应能定位依据，并说明行为冲突、覆盖缺口及其影响。

## 精炼反例

- 活动 change 写“支持退货”就认为系统已支持：核对当前实现和执行证据。
- 图谱显示调用关系，就把注释中的规则当事实：追到真实条件、写入和失败路径。
- 解释一个接口先生成全仓实体卡片：只还原回答问题所需的链路。

## 按需参考

- 需要持久现状基线：[文档工作流](references/orientation-document-workflow.md)。
- 术语歧义或命名映射：[术语模式](references/terminology.md)。
- 状态消费者：[状态契约](../change-readiness/references/state-contract.md)，核对写入、策略、查询、展示、迁移和测试。
- 异常调查用 [bug-doc-required](../bug-doc-required/SKILL.md)，数据事实用 [backend-evidence](../backend-evidence/SKILL.md)；从问题补对象和口径时用[业务本体建模](../business-ontology-modeling/SKILL.md)。
