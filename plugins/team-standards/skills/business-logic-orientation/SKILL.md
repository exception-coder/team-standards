---
name: business-logic-orientation
description: "Use to understand existing business logic before refactoring, rewriting, migration, or regression review, or when the user explicitly requests a logic-orientation document. Prefers Graphify and accepted OpenSpec specs over rebuilding parallel code indexes."
---

# 业务逻辑现状理解

## 核心原则

重构、复写或迁移前必须先理解现状，但默认不生成新的梳理文档或 AI 速查索引。

## 上下文优先级

1. 读取项目 `AGENTS.md` 和项目知识索引，确认业务边界及权威来源。
2. 若存在 Graphify，按当前安装 Skill 的查询流程定位入口、调用链、依赖和数据访问；使用前检查图谱是否覆盖当前 HEAD 与工作区改动。
3. 读取 OpenSpec `specs/` 中已接受行为及相关活动 change；不得把目标行为当成当前实现事实。
4. 用定向源码、DDL、SQL、测试或运行证据核实 Graphify 无法证明的业务语义、状态不变量和失败行为。
5. 将输出区分为“当前实现事实”“已接受行为”“活动变更”和“待确认推断”。

普通分析直接输出结论和证据位置，不复制 Graphify 节点或 OpenSpec 正文。只有用户明确要求沉淀现状文档、项目没有可复用知识入口，或重构需要长期基线时，才读取 [references/orientation-document-workflow.md](references/orientation-document-workflow.md)，并叠加 `markdown-writing-standards` 的写前查重与写后登记。

## 边界

- 本 Skill 不替代 `change-readiness` 的变更设计，也不实现 Graphify 查询算法。
- Graphify 过期或缺失时可以用确定性扫描降级，但必须说明覆盖缺口。
- 业务规则、术语和状态语义需要权威文档、运行证据或人工确认；不得仅凭图谱关系晋升为真相。
