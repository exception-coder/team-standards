---
name: business-logic-orientation
description: "Use to understand existing business logic before refactoring, rewriting, migration, or regression review, or when aligning ambiguous business terminology or explicitly documenting current logic. Prefers Graphify and accepted OpenSpec specs over rebuilding parallel code indexes."
---

# 业务逻辑现状理解

## 核心原则

重构、复写或迁移前必须先理解现状，但默认不生成新的梳理文档或 AI 速查索引。

## 探查边界

独立现状理解或审查请求默认只分析，不自动改源码、刷新图谱文件或创建实施 change；当前证据不足时定向读取并说明缺口。若它是已授权重构或修复的前置阶段，证据充分后继续原任务，不重复请求实施授权。查询生产系统的负载、数据范围与权限单独评估，只读不代表低风险。

异常调查优先 bug-doc-required；跨项目价值与工作量评估优先读取项目声明的关系与证据来源；缺少平台时在已知范围分析并说明缺口；专业审查按对象选择规则。本 Skill 不把所有 Explore 请求收为同一执行流程。

## 上下文优先级

1. 读取项目 `AGENTS.md` 和项目知识索引，确认业务边界及权威来源。
2. 若存在 Graphify，按当前安装 Skill 的查询流程定位入口、调用链、依赖和数据访问；使用前检查图谱是否覆盖当前 HEAD 与工作区改动。
3. 读取 OpenSpec `specs/` 中已接受行为及相关活动 change；不得把目标行为当成当前实现事实。
4. 用定向源码、DDL、SQL、测试或运行证据核实 Graphify 无法证明的业务语义、状态不变量和失败行为。
5. 将输出区分为“当前实现事实”“已接受行为”“活动变更”和“待确认推断”。

普通分析直接输出结论和证据位置，不复制 Graphify 节点或 OpenSpec 正文。只有用户明确要求沉淀现状文档、项目没有可复用知识入口，或重构需要长期基线时，才读取 [references/orientation-document-workflow.md](references/orientation-document-workflow.md)，并叠加 `markdown-writing-standards` 的唯一归属与必要链接检查。

## 边界

- 本 Skill 不替代 `change-readiness` 的变更设计，也不实现 Graphify 查询算法。
- Graphify 过期或缺失时可以用确定性扫描降级，但必须说明覆盖缺口。
- 业务规则、术语和状态语义需要权威文档、运行证据或人工确认；不得仅凭图谱关系晋升为真相。

## 状态契约闭环

梳理状态消费者时，读取 [状态契约治理协议](../change-readiness/references/state-contract.md)。优先复用已登记的状态契约及只读 Graphify 关联视图，逐项核对写入、策略、查询、展示、迁移和测试；不新建第二份手工状态字典。

## 术语模式

业务术语歧义或命名映射需要核对时读取 [terminology.md](references/terminology.md)，复用权威知识源，不新建术语索引。
