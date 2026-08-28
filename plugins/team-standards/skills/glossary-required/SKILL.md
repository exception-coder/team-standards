---
name: glossary-required
description: "Use when business-domain terms are missing, ambiguous, inconsistent with code names, or explicitly need glossary maintenance; routes terminology through domain knowledge and verifies code mappings with Graphify."
---

# 业务术语对齐

## 核心职责

把需求、讨论和代码中的业务词对齐到同一概念。Domain knowledge 的 `term` 条目是经确认术语的唯一长期来源；Graphify 只验证当前代码命名和坐标；OpenSpec 记录当前变更尚未确认的术语决定。本 Skill 不维护独立 glossary 候选池或项目内第二份术语表。

## 触发边界

- 用户和代码对同一概念使用不同名称。
- 同一词可能表示不同业务对象、动作或状态。
- PRD、OpenSpec、Bug 或业务梳理文档需要定义新术语。
- 用户明确要求查找、补充或统一术语。

通用技术词不触发。跨项目同名异义先分别确认各项目术语，再由项目拓扑或共享契约建立映射。

## 执行流程

1. 确定被讨论的项目、模块和业务语境，不能只按当前目录名猜测。
2. 查询配置的 domain knowledge，优先读取对应项目和模块的 `type: term` 条目，并检查同义词、稳定性和来源。
3. 术语涉及类、表、字段、枚举或接口名称时，用新鲜 Graphify 查询验证当前代码映射；图谱过期时用定向源码补证。
4. 已有稳定条目时采用规范术语，并在首次出现处说明用户用词与规范术语的映射。
5. 条目缺失或证据冲突时，将其标为“待确认术语”，在相关 OpenSpec change 中记录当前决策影响；不要直接改写稳定知识。
6. 只有业务 owner 确认且证据可追溯后，才按 domain knowledge 的维护流程新增或更新 `term` 条目。

## 最小输出

```text
用户用词：...
规范术语：... / 待确认
同义词或旧称：...
业务定义：...
代码映射：...
证据：domain knowledge / OpenSpec / Graphify / 源码坐标
冲突或待确认项：...
```

## 降级规则

Domain knowledge 不可用时，只在当前回答或相关 OpenSpec change 中保留待确认项，并明确未完成长期登记。不得因此创建 `docs/knowledge-graph/glossary.md`、`ai-docs/.../glossary/_candidates.md` 或其它平行术语库。

## 红线

- 不以代码命名自动决定业务规范名；代码只是一类证据。
- 不把用户口语未经确认地升级为正式术语。
- 不把 Graphify 推断当作业务定义。
- 不复制 domain knowledge 已有术语正文。
- 不因术语问题扩大修改业务源码。
