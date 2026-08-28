---
name: planning-evidence-discovery
description: "Use when exploring an initial PRD idea, generating an initialization specification, performing value analysis, or estimating effort where evidence may span a primary project and related refactor, migration, dependency, or integration projects. Requires deterministic project-scope resolution, relationship-driven evidence queries, a persisted planning-evidence-trace-v2 ledger, and a server-side completion gate."
---

# 跨项目规划证据探索

把初步想法转成有证据的初始化规格。由 Agent 决定查什么，由平台确定项目关系、真实路径、工具执行和完成性；不得用提示词或模型自述替代真实调用。

## 渐进读取

- 调用项目前先完整读取 [references/tool-contracts.md](references/tool-contracts.md)。
- 平台实现、校验或展示证据轨迹时读取 [references/planning-evidence-trace-v2.schema.json](references/planning-evidence-trace-v2.schema.json)。

## 硬门禁

1. 第一个证据动作必须调用 `resolve_project_evidence_scope(project)`。
2. 项目 key、路径、关系、角色和来源可用性只能采用 resolver 返回值，不得自行搜索后反推或硬编码。
3. 只有真实工具调用结果可以进入证据账本；不得把模型生成的摘要标成 `HIT`。
4. 完成性以 Forge 持久化账本和服务端门禁为准，不以最终回答中的文字清单为准。
5. 最多执行三轮探索。第三轮后仍有缺口时输出不完整规格和残余缺口，不得继续循环。
6. resolver、统一查询或持久化能力不可用时，停止证据探索并报告平台能力缺口；不得退化为猜路径或伪造 trace。

## 执行流程

### 1. 解析范围

调用 `resolve_project_evidence_scope`，取得主项目和所有关联项目。先验证返回值包含：

- `projectKey` 与规范化 `projectPath`
- `relation` 与 `projectRole`
- 各证据来源的可用性
- 平台分配的 scope 或 trace 关联标识

解析失败时保留工具错误并停止，不自行用目录扫描补全关系。

### 2. 制定探索计划

按以下规则生成逐项目、逐来源的查询矩阵：

| 关系 | 项目角色 | 查询规则 |
|---|---|---|
| `PRIMARY` | `CURRENT_IMPLEMENTATION` | 必查当前领域知识、Graphify 和源码；DDL、路由、拓扑按需求适用性判断 |
| `REFACTORS` | `LEGACY_SOURCE` | 必查领域知识、Graphify、DDL 和源码；有 URL 时查路由；跨项目关系查拓扑 |
| `MIGRATES_FROM` | `MIGRATION_SOURCE` | 必查领域知识、DDL、迁移相关源码或 Graphify；有 URL 时查路由 |
| `DEPENDS_ON` | `DEPENDENCY` | 仅在需求涉及该依赖提供的模块、接口、数据或能力时查询，否则写明跳过原因 |
| `INTEGRATES_WITH` | `INTEGRATION_PARTNER` | 涉及接口、单据、事件、数据同步或一致性时必查接口源码、路由和跨项目拓扑 |

每个计划项写明 `queryReason`。不要因为来源显示不可用就省略必查项；让平台记录 `SOURCE_MISSING`。

### 3. 执行并登记证据

逐项调用 `query_project_evidence`，只传 resolver 返回的项目坐标。`sourceType` 仅允许：

- `DOMAIN_KNOWLEDGE`
- `GRAPHIFY`
- `DDL`
- `ROUTE_MAP`
- `SOURCE`
- `CROSS_PROJECT_TOPOLOGY`

把工具返回的 ledger entry 原样保留，再从证据正文提取规格事实。工具失败时允许根据可读错误修正参数后在下一轮重试，但不得覆写前一次失败记录。

### 4. 分栏综合

初始化规格必须至少分成：

- 新项目当前实现
- 遗留或迁移来源已有能力
- 集成或普通依赖能力
- 可直接复用部分
- 需要迁移、适配或重构部分
- 证据冲突与业务 `OPEN`

证据不存在只表示“本次来源未命中或不可用”，不得改写为“项目不存在该能力”。能由证据确认的问题不得转成用户问题；只有业务取舍进入 `OPEN`。

### 5. 完成性门禁和补查

每轮结束调用 Forge 完成性门禁。若返回未执行的必查项：

1. 按门禁缺口生成下一轮计划。
2. 只补查缺失或失败且可重试的项。
3. 保留所有历史调用，不覆盖失败或无命中记录。
4. 第三轮后停止，并把未完成项写入规格限制。

`NO_HIT`、`SOURCE_MISSING` 和 `EXECUTION_ERROR` 不等于“未执行”；完成性门禁应区分“已查但无证据”和“根本没查”。

## 输出契约

最终交付必须包含：

1. `traceId`、完成状态、执行轮次和残余缺口。
2. 按项目角色分栏的事实与推断。
3. 可复用、迁移、重构和新增工作的分类。
4. 证据冲突和真正需要业务决策的 `OPEN`。
5. 可由页面展示的 `planning-evidence-trace-v2` 引用，不在正文伪造工具轨迹。

价值分析和工时评估必须引用同一 `traceId`。若输入没有可复用 trace，先执行本流程，不得重新走单项目固定查询。

## 与现有 Skill 的边界

- Graphify 负责查询指定代码图谱，不解析项目依赖。
- `project-domain-knowledge` 负责领域知识与 DDL 的项目内继承适配，不是全局项目关系权威源。
- 跨项目调用链由实际业务项目或共享拓扑仓维护，本 Skill 不替代其契约所有权。
- `backend-evidence` 的领域规格模式负责从证据生成对象、状态和不变量候选；本 Skill 先确定跨项目证据范围并提供输入。

## 禁止行为

- 将 Yoooni、KPay 或任何项目路径写死进本 Skill。
- 先查固定四类来源，再让 Agent 对预拼上下文做摘要。
- 把旧项目实现描述为新项目当前事实。
- 因为 `NO_HIT` 就断言业务能力不存在。
- 用手写 JSON 冒充平台持久化轨迹。
- 第四次进入 ReAct 补查。
