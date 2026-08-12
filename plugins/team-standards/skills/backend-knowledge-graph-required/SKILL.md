---
name: backend-knowledge-graph-required
description: "Use for single-service backend questions or Markdown about table relations, ER, SQL, state transitions, atomic capabilities, and recurring project-level technical pitfalls."
---

# 后端知识图谱门禁

## 触发范围

用于单服务的表关系、ER、SQL、状态流转、业务流程到 CRUD、原子能力和可复用技术陷阱。跨项目调用链不归本 Skill；纯前端状态和通用编程知识也不归本 Skill。

## 渐进读取

- 需要确定图谱归属、目录层级或读取顺序时，读取 [references/storage-and-routing.md](references/storage-and-routing.md)。
- 需要进行接口开发闭环、候选沉淀或 SQL 归档时，读取 [references/update-workflow.md](references/update-workflow.md)。
- 需要创建或更新正式表、SQL、原子能力、能力、流程、枚举卡片时，读取 [rules/card-templates.md](rules/card-templates.md) 中对应模板。

## 核心流程

1. 以实际调查的服务为图谱归属，不以当前工作目录推断。
2. 优先读取 `00_index.md`，再按问题读取场景、表、SQL、状态或技术难点卡片。
3. 回答或编码时优先复用已登记原子能力和 SQL；内容不足时先调查代码、DDL 和调用链。
4. 新发现的可复用事实先进入候选池，验证后合并进正式卡片。
5. 修改后同步索引、引用和场景入口，不复制同一事实到多个文件。

## 硬规则

- 涉及数据库读写的项目必须有可追溯 DDL 基线；没有 DDL 时只登记已验证事实，不臆造字段或约束。
- SQL 必须标注用途、参数、表关系、过滤条件和结果语义。
- 状态流转必须记录进入条件、决策点、写入点和失败行为。
- 新接口开发前确认是否已有可复用原子能力；开发后回写新增事实。

## 输出

输出应区分“已验证事实”“基于证据的推断”和“待确认候选”，并给出对应代码、DDL、SQL 或日志证据位置。
