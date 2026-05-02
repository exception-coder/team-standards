---
name: backend-knowledge-graph-required
description: "Use BEFORE answering any backend single-service question about table relationships / state transitions / business judgments / atomic capabilities, AND BEFORE Write/Edit any .md describing such content (even outside docs/, e.g. ai-docs/, scenarios/). MUST invoke (BLOCKING) when: (1) about to Write/Edit a markdown whose content describes backend table relationships, ER diagrams, state transitions, business flow → DB CRUD, or data modeling — including files under ai-docs/, work-log/, scenarios/, NOT only under docs/; (2) user asks 'X 与 Y 是 1:1 还是 1:N', '改这个动哪些表', '字段从哪来', '退款/账单/流水/分摊怎么算', '是新建快照还是引用原表', or any single-service backend table-relation / state / atomic-capability question — even if framed as investigation, not implementation; (3) finished investigating backend code (own project OR another project as subject) and discovered ≥1 reusable fact about table relations / state machines / atomic capabilities — must auto-append to candidate pool; (4) user asks to initialize, generate, organize, read or update backend knowledge graphs; (5) project has docs/knowledge-graph/backend/; (6) code changes affect APIs, services, DAOs/Mappers/SQL, database tables, enums, state transitions, order/refund/payment status judgment, transactions, MQ/events, or external dependencies. Knowledge graph ownership = the investigated backend service, NOT current cwd — investigating project B from project A puts the graph under B's namespace, do NOT reroute to cross-project-locator just because cwd differs. Scope: backend single service (Java / backend-service style); cross-project topology → cross-project-locator."
---

# 后端单服务知识图谱

## 定位

本 skill 负责 **后端单服务业务视角** 的知识图谱，尤其是接口开发中反复使用的 **表逻辑关系、状态判定规则、业务流程读写顺序、可复用原子函数**。

目标是让 AI 在后端接口开发前先理解：

- 这个服务有哪些领域能力、原子能力、编排能力
- 哪些 API、Service、Repository、Mapper 是入口
- 涉及哪些表、表关系、枚举、状态机、事务边界、外部依赖
- 一个业务流程如何读写表、调用能力、流转状态、判定业务结果
- 订单部分退、订单业务状态判定、可退金额/可退商品等链式规则是否已有沉淀
- 当前需求是否应该复用已有原子能力，而不是重新写一遍 SQL / 判定逻辑

不处理前端 UI 或跨项目全局拓扑。跨项目链路仍交给 `cross-project-locator`。

## BLOCKING 强触发清单（写前 / 答前拦截）

下列任一场景命中即必须**第一时间**调起本 skill，先做候选沉淀路由判定，再继续答题或落盘。错过这些时机就是流程违反。

| 触发场景 | 命中信号 | 必做动作 |
|---|---|---|
| **Write/Edit 一份描述后端表关系 / ER / 状态扭转 / 业务流程 → 表 CRUD 的 .md**（无论路径，包括 `ai-docs/`、`work-log/`、`scenarios/` 而不仅 `docs/`） | 文档主体含表名 + 关联键 + state/字段判定 + 数据流箭头 | 先按本 skill 决定归属命名空间和模板，再 Write |
| **用户问询表关系类问题** | "X 与 Y 是 1:1 还是 1:N"、"改这个动哪些表"、"字段从哪来"、"退款/账单/流水/分摊怎么算"、"是新建快照还是引用原表"、"哪个状态会变" | 答题同时把事实追加到候选沉淀池 |
| **AI 已完成后端代码调查并发现 ≥1 条可复用事实**（含跨项目"以另一服务为调查对象"的场景） | 调查报告里出现具体表/Service/Mapper/枚举/状态值 | 调查结论给用户的同一回合，必须将事实候选追加到被调查项目命名空间下的候选池 |
| 用户主动要求 | "建知识图谱"、"整理图谱"、"更新图谱"、"归档" | 先读候选池 + 现有正式图谱 + 代码证据，再写正式图谱 |
| 项目已有正式图谱 | 存在 `docs/knowledge-graph/backend/` | 编码前必先回顾相关卡片，编码后必同步回写 |
| 后端代码变更 | 新增/修改 API、Service、DAO、SQL、表、枚举、状态机、事务边界、MQ、外部依赖 | 同步更新对应卡片或候选池 |

> **常见误判反例（已发生过的踩坑）**：
> - ❌ "用户只是问云端逻辑，没让我建图谱，所以不用触发" → **错**，问询场景必触发并候选沉淀
> - ❌ "本地工程没有 `docs/knowledge-graph/backend/`，所以 skill 不适用" → **错**，没有就先写候选池
> - ❌ "主目录是 A，调查的是 B 云端，应该交给 cross-project-locator" → **错**，单服务图谱归属 = 被调查的那个服务，与 cwd 无关
> - ❌ "我直接 Write 一份图谱文档就行了" → **错**，写前必经本 skill 决定归属和模板

## 调查对象与图谱归属路由

**核心规则：图谱归属永远 = 被调查的后端单服务项目，与当前主工作目录无关。**

| 主目录 | 调查对象 | 图谱归属命名空间 |
|---|---|---|
| 本服务自身 | 本服务自身 | 本服务 |
| 项目 A（前端 / 调用方） | 项目 B（云端单服务） | **项目 B** |
| 项目 A（前端） | 同时跨 A+B | A 的归 A、B 的归 B；**纯跨项目链路（A 调 B 的对照映射、调用链）走 `cross-project-locator`** |

候选池默认路径（被调查项目命名空间下）：

```text
{USER_DOCUMENTS}/ai-docs/{被调查项目}/knowledge-graph/_candidates.md
{USER_DOCUMENTS}/ai-docs/{被调查项目}/knowledge-graph/scenarios/{场景}.md
{USER_DOCUMENTS}/ai-docs/{被调查项目}/knowledge-graph/00_index.md
```

正式图谱路径（用户明确要求"上传终版到项目内"才走）：

```text
{被调查项目根目录}/docs/knowledge-graph/backend/...
```

**判定本 skill vs `cross-project-locator` 的边界**：
- 描述对象是**单一后端服务内部**的表 / 状态 / 能力 → 本 skill
- 描述对象是**两个工程之间**的接口对照、调用链、数据流方向 → `cross-project-locator`
- 同一会话可能两个 skill 都触发：先用本 skill 沉淀各自服务内部图谱，再用 `cross-project-locator` 登记服务间链路

## 核心原则

**后端接口开发不是只写接口文档，还必须沉淀表逻辑知识。**

凡是本次开发涉及 DAO/Mapper/SQL、表状态、订单/退款/支付等业务判定、事务、锁、幂等或跨表组合查询，AI 必须把这些关系纳入后端知识图谱闭环：

```text
编码前：先回顾表逻辑图谱 + 原子能力索引
编码中：优先复用已有原子能力 / DAO 原子查询
编码后：把新增或变更的表读写、状态变化、判定逻辑同步回图谱
```

如果项目尚无正式图谱，也不能让事实散落在会话里。必须写入用户目录候选池，至少沉淀“表逻辑候选记录”，后续确认或代码验证后再整理进正式图谱。

## 推荐目录（渐进式三层骨架）

**核心理念：第一份图谱只要 1 份场景卡 + 1 份扁平索引就算建立。** 不要求 8 文件齐全才叫图谱——通过多个细小场景小卡渐进汇总成全景，是这套图谱的设计目标。

### Tier 1 — 起步（必须，最小可用）

新建图谱时只需要这两个文件即可投入使用：

```text
{命名空间根}/knowledge-graph/
  00_index.md                        # 扁平索引：每个场景一行 + 关键词反查表
  scenarios/{业务场景}.md            # 一图一表的场景小卡（一图一表是底线）
  _candidates.md                     # 候选沉淀池（未代码验证的会话事实）
```

每张场景小卡至少包含：

- 一句话总述
- 一张关系图（mermaid，遵守 `markdown-writing-standards`）
- 表/字段速查表（每张表 1-2 行）
- 核心规则（图里看不出的语义，每条带代码坐标）
- 已知疑点（如有）
- 与其他场景的交叉引用（如有）

`00_index.md` 至少包含：

```markdown
| 场景 | 主表 | 一句话 | 关键词 | 文件 |
|---|---|---|---|---|
| 退款数据模型 | refund_bill / pos_transaction / order_item / order_item_payment_allocate | 1 bill + N tx + 新建 item 快照 + 按 tx 比例分摊 | 退款 / 账单 / 流水 / 分摊 / 部分退 | scenarios/退款数据模型.md |
```

### Tier 2 — 成熟（≥3 个场景后再细分，按需新增）

当已有 ≥3 张场景小卡，且发现表 / 枚举 / 流程 / 原子能力被多个场景共享时，再单独建以下卡片：

```text
{命名空间根}/knowledge-graph/
  tables/{table-name}.md             # 高频被多场景引用的表
  enums/{enum-name}.md               # 高频枚举字典
  flows/{flow-name}.md               # 跨多场景的业务流程
  atomic-capabilities/{cap}.md       # 被多接口复用的原子能力
  07_table_logic_index.md            # 表逻辑反查索引（场景多了再建）
  08_atomic_capability_index.md      # 原子能力索引（能力多了再建）
```

### Tier 3 — 全景（≥10 个场景或正式发版前再建，可选）

仅在图谱规模足够大、需要给 AI 做"先读图谱再读代码"门控时再补：

```text
{命名空间根}/knowledge-graph/
  00_backend_service_profile.md      # 服务画像
  01_domain_capability_map.md        # 领域能力地图
  02_data_model_map.md               # 数据模型总览
  03_enum_dictionary.md              # 枚举总字典
  04_api_entrypoints.md              # API 入口总表
  05_external_dependencies.md        # 外部依赖
  06_business_flow_index.md          # 流程总索引
```

### 命名空间路径选择

| 阶段 | 命名空间根 | 何时使用 |
|---|---|---|
| 候选 / 草稿 | `{USER_DOCUMENTS}/ai-docs/{被调查项目}/knowledge-graph/` | 默认；AI 起草、未确认、未代码验证 |
| 正式 | `{被调查项目根目录}/docs/knowledge-graph/backend/` | 用户明确要求"上传终版到项目内"才走，遵循 `doc-index-required` |

**入门门槛兜底**：项目尚未有任何图谱时，本 skill 第一次落盘只产出 Tier 1 的 3 个文件即可（`00_index.md` + 1 张 `scenarios/{xxx}.md` + `_candidates.md`），不要一次性铺满 Tier 3。

## 后端接口开发强制闭环

### 编码前：表逻辑回顾

开始分析或实现后端接口前，只要本次涉及数据库读写、状态判定、订单/退款/支付等业务对象，必须先按顺序回顾：

1. `07_table_logic_index.md`：按业务对象/场景反查表关系和判定规则
2. `08_atomic_capability_index.md`：按业务关键词反查可复用原子能力
3. 命中的 `table-logic/{scenario}.md`
4. 命中的 `atomic-capabilities/{capability}.md`
5. 相关 `tables/{table-name}.md`、`flows/{flow-name}.md`、`enums/{enum-name}.md`
6. 最后才读 DAO/Mapper/Service 代码

若上述文件不存在，应在设计/编码过程中创建用户目录候选记录，不得因为“还没建图谱”就跳过沉淀。

### 编码中：原子能力复用

写后端 Service / Handler / UseCase 主流程时，必须主动判断：

| 问题 | 正确动作 |
|------|----------|
| 已有表逻辑图谱说明了该判定 | 按图谱回到代码坐标复用，不重新发明规则 |
| 已有原子能力覆盖该计算/查询 | 注入/调用原子能力，禁止复制 SQL 或业务计算 |
| 只有 DAO 原子查询，没有业务原子能力 | 优先复用 DAO；若本次组合逻辑会被多接口复用，沉淀新原子能力 |
| 发现旧代码有重复判定 | 本次改动范围允许时抽出原子函数；否则登记“待抽取原子能力”候选 |

典型原子能力包括但不限于：

- 按订单计算可退金额
- 判定订单是否部分退 / 全退 / 不可退
- 聚合订单商品退款状态
- 按支付流水查原支付记录
- 判定订单业务状态展示码
- 按表组合判断是否允许取消、退款、补单、重试

### 编码后：图谱回写

后端源码改动完成后，只要命中以下任一项，必须更新正式图谱或候选池：

- 新增/修改 SQL、DAO、Mapper、Repository
- 新增/修改表过滤条件、join 关系、聚合逻辑
- 新增/修改订单/退款/支付等业务状态判定
- 新增/修改枚举值、状态流转、字段含义
- 新增/修改事务边界、锁、幂等、补偿
- 新增可复用原子能力，或发现应抽取但暂未抽取的重复逻辑

回写最少包含：

```text
- 本次接口 / 能力名称
- 涉及表与读写动作
- 表之间业务关系
- 状态字段变化或判定规则
- 可复用原子能力 / DAO 方法
- 代码坐标
- 对后续新增接口的支持判断
```

## 候选沉淀池

为避免会话中的业务事实遗漏，后端知识图谱采用“两段式沉淀”：

```text
会话提及 / 代码分析发现
  → 自动记录到候选沉淀池
  → 用户确认或证据校验
  → 整理进入正式知识图谱
```

候选沉淀池默认写入用户目录被调查项目命名空间下，不写项目 `docs/`：

```text
{USER_DOCUMENTS}/ai-docs/{被调查项目}/knowledge-graph/_candidates.md
```

> 说明：v1.18.7 起候选池路径精简为 `_candidates.md`（按被调查项目而非按日期/agent 分），便于跨日期跨会话累积同主题事实并最终归并到 scenarios 卡。旧版 `{agent}/{YYYY-MM-DD}/backend-kg-candidates.md` 路径仅作向后兼容，不再推荐新增。

**自动追加规则（强制）**：

AI 在会话中只要回答了任何关于后端表关系 / 业务判定 / 状态扭转 / 字段语义的问题，**即便用户没要求"建图谱"**，回答的同一回合内必须自动追加 1 条候选记录到 `_candidates.md`。这是本 skill 的最低收口动作——错过即流程违反。

候选池用于防遗漏，正式图谱用于可信引用。二者职责必须分开。

每条候选记录最少格式：

```markdown
## YYYY-MM-DD HH:MM | {场景关键词}
- 事实：{一句话业务事实}
- 涉及：{表/枚举/状态字段}
- 来源：{代码坐标 or 用户描述 or 设计文档 or 调查报告}
- 可信度：待确认 / 已确认 / 已代码验证
- 后续动作：{待用户确认 / 待代码核验 / 可整理入正式 scenarios 卡}
```

## 分析前读取顺序

分析后端需求前，按图谱所在层级读取（命名空间 = 草稿 `ai-docs/{项目}/knowledge-graph/` 或 正式 `docs/knowledge-graph/backend/`）：

**Tier 1 起步阶段**（仅有 `00_index.md` + `scenarios/` + `_candidates.md`）：

1. `00_index.md`：按关键词反查命中的场景小卡
2. 命中的 `scenarios/{业务场景}.md`
3. `_candidates.md`：扫一遍候选池，看本次主题是否已有未确认事实
4. 最后再读代码文件

**Tier 2/3 成熟阶段**（已有细分卡片）按以下顺序：

1. `00_index.md` → `00_backend_service_profile.md`（如有）
2. `01_domain_capability_map.md`、`06_business_flow_index.md`（如有）
3. `07_table_logic_index.md`、`08_atomic_capability_index.md`（如有）
4. 命中的 `scenarios/{场景}.md`
5. 命中的 `table-logic/{scenario}.md`、`atomic-capabilities/{capability}.md`
6. 命中的 `capabilities/{capability}.md`、`flows/{flow}.md`
7. 相关 `tables/{table}.md`、`enums/{enum}.md`
8. `04_api_entrypoints.md`、`05_external_dependencies.md`（如有）
9. `_candidates.md`
10. 最后再读代码文件

不得在已有图谱可定位时直接全量扫描代码。即使图谱只有 Tier 1，也要先读 `00_index.md` 和命中的场景小卡。

## 能力分层

后端能力必须区分三类：

| 类型 | 定义 | 示例 |
|------|------|------|
| 原子能力 | 可复用的最小业务能力 | 生成订单号、校验商品、计算价格、锁库存 |
| 领域能力 | 围绕一个业务对象完成一项完整动作 | 创建订单、取消订单、支付订单 |
| 编排能力 | 跨多个领域能力/外部依赖的流程编排 | 下单履约流程、支付后出单流程、退款流程 |

能力卡必须写清能力类型，禁止把所有 Service 方法都叫“原子能力”。

## 文档卡片要求

### 表逻辑总索引

`07_table_logic_index.md` 至少包含：

```text
- 按业务对象索引：订单 / 退款 / 支付 / 库存 / 会员等
- 按场景索引：部分退、全退、取消、支付成功、补偿重试等
- 每个场景涉及的主表、关联表、状态字段、核心判定、对应 table-logic 卡片
- 常用问题反查：改了什么表、哪些状态会变、是否支持新增接口、应该复用哪个原子能力
```

推荐表格：

```markdown
| 业务对象 | 场景 | 主表 | 关联表 | 状态/金额字段 | 核心判定 | 图谱卡 | 可复用能力 |
|---|---|---|---|---|---|---|---|
| 订单 | 部分退判定 | order | refund_order / order_item | order_status / refund_status / refund_amount | 已退金额 < 可退金额且存在未退商品 | table-logic/order-refund.md | calculateRefundableAmount |
```

### 原子能力索引

`08_atomic_capability_index.md` 至少包含：

```text
- 原子能力名称
- 业务关键词
- 入参 / 出参
- 读写表
- 状态/金额/枚举规则
- 代码坐标
- 被哪些 API / Service 复用
- 新接口复用建议
```

推荐表格：

```markdown
| 能力 | 关键词 | 入参 | 出参 | 涉及表 | 代码坐标 | 复用入口 |
|---|---|---|---|---|---|---|
| 计算订单可退金额 | 退款 / 可退 / 部分退 | orderId | amount | order / refund_order / order_item | XxxService#calculateRefundableAmount | 退款申请 / 退款预览 |
```

### 表逻辑卡

`table-logic/{business-object-or-scenario}.md` 至少包含：

```text
- 场景名称
- 业务问题：这张卡回答什么问题
- 涉及表关系：主表、关联表、join/关联字段
- 核心判定矩阵：条件 → 业务含义 → 结果
- 状态变化矩阵：表.字段 原值 → 新值 → 触发动作 → 代码坐标
- 金额/数量聚合规则：字段来源、加减方向、过滤条件
- 可复用原子能力：Service/DAO/Mapper 方法
- 新接口支持判断：现有表/能力是否支持，缺口是什么
- 代码坐标与证据：SQL、DAO、枚举、设计文档、测试
```

推荐结构：

```markdown
标题：订单部分退表逻辑

回答的问题：
- 如何判断订单是未退、部分退、全退？
- 新增退款相关接口时应该复用哪些表和原子能力？

表关系：
| 表 | 角色 | 关联字段 | 说明 |
|---|---|---|---|

判定矩阵：
| 条件 | 业务含义 | 判定结果 | 代码坐标 |
|---|---|---|---|

状态变化矩阵：
| 动作 | 表 | 字段 | 变化 | 触发条件 | 代码坐标 |
|---|---|---|---|---|---|

原子能力：
| 能力 | 方法 | 说明 |
|---|---|---|
```

### 原子能力卡

`atomic-capabilities/{capability-name}.md` 至少包含：

```text
- 能力名称
- 业务语义
- 入参 / 出参
- 读取表 / 写入表
- 依赖枚举 / 状态字段
- 过滤条件
- 事务要求
- 复用入口
- 禁止重复实现的位置
- 代码坐标
```

### 能力卡

`capabilities/{capability-name}.md` 至少包含：

```text
- 能力名称
- 能力类型：原子能力 / 领域能力 / 编排能力
- 业务目标
- 入口 API / Service / UseCase
- 调用的原子能力
- 涉及表
- 涉及枚举
- 状态流转
- 事务边界
- 幂等规则
- 外部依赖
- 失败与补偿
- 代码坐标
```

### 流程卡

`flows/{flow-name}.md` 至少包含：

```text
- 流程目标
- 触发入口
- Mermaid 时序图
- 表读写顺序
- 能力调用链
- 枚举/状态变化
- 外部系统调用
- 异常分支
- 日志与观测关键字
```

### 表卡

`tables/{table-name}.md` 至少包含：

```text
- 表职责
- 主键 / 唯一键 / 关键索引
- 核心字段业务含义
- 状态字段解释
- 金额 / 数量 / 业务状态字段的计算来源
- 读它的能力
- 写它的能力
- 与其它表关系
- 参与的业务场景与 table-logic 卡片
- Mermaid ER 图
- 数据一致性约束
```

### 枚举卡

`enums/{enum-name}.md` 至少包含：

```text
- 枚举类路径
- 数据库存储值
- 中文业务含义
- 可进入条件
- 可流转目标
- 禁止流转
- 前端展示含义（如已知）
- 历史兼容值（如存在）
```

## 会话沉淀规则

用户在会话中经常提到的内容**必须自动记录到候选沉淀池**，但**不能无条件自动写入正式知识图谱**。按以下规则处理：

| 场景 | 处理 |
|------|------|
| 用户明确说“记入知识图谱 / 更新知识图谱 / 归档到后端图谱” | 先检索候选池 + 现有正式图谱，再整理更新正式图谱 |
| 本次后端代码变更新增/修改 API、Service、DAO/Mapper/SQL、表、枚举、状态流转、MQ、外部依赖 | 必须更新相关图谱卡片或候选池 |
| 本次后端代码涉及订单/退款/支付等表逻辑判定 | 必须更新 `07_table_logic_index.md` / `table-logic/` / `08_atomic_capability_index.md` 中至少一处 |
| 会话中反复出现同一后端业务事实，但尚未代码验证 | 自动追加到候选沉淀池，默认写用户目录，不进正式图谱 |
| 事实来自代码、DDL、枚举类、接口契约、已确认设计文档 | 可作为正式图谱依据；更新前仍需合并候选池同主题内容 |
| 只是猜测、临时讨论、未确认方案 | 可记录为“待确认假设”，禁止写入正式图谱 |

正式图谱条目必须能追溯到至少一个来源：代码坐标、表结构、枚举类、接口契约、设计文档或用户明确确认。

候选沉淀池每条记录至少包含：

```text
- 记录时间
- 服务/模块
- 会话事实
- 关联能力/流程/表/枚举
- 可信度：待确认 / 已确认 / 已代码验证
- 来源：用户描述 / 代码坐标 / DDL / 枚举类 / API 契约
- 后续动作：待用户确认 / 待代码核验 / 可整理入正式图谱
```

当用户后续要求“整理知识图谱 / 更新正式图谱 / 归档”时，必须先读取：

1. 用户目录中的 `backend-kg-candidates.md`
2. 项目内 `docs/knowledge-graph/backend/` 现有正式图谱
3. 命中主题的代码、DDL、枚举或 API 契约

然后去重、合并、补证据，再写正式图谱。

## 更新触发

后端源码出现以下变化时，应同步检查知识图谱：

- 新增/修改 Controller、Endpoint、Feign、DTO
- 新增/修改 Service、UseCase、Domain capability
- 新增/修改 Repository、Mapper、SQL、DAO
- 新增/修改数据库表、字段、索引
- 新增/修改枚举、状态机、状态流转
- 新增/修改跨表判定逻辑、金额/数量聚合规则、订单/退款/支付状态展示规则
- 新增/修改可复用原子能力，或复制了已有表逻辑导致应该抽取复用
- 新增/修改 MQ topic、事件、定时任务、外部 HTTP/RPC 调用
- 修改事务、锁、幂等、补偿逻辑

若项目没有正式 `docs/knowledge-graph/backend/`，先在用户目录生成“知识图谱更新建议”和表逻辑候选池；用户确认后再写正式图谱。

若项目已有正式 `docs/knowledge-graph/backend/`，且本次代码变更已验证事实，应直接更新命中的正式卡片；不确定内容写入候选池。

## 新接口支持性判定

当用户询问或 AI 自己需要判断“新增接口是否支持”时，必须基于表逻辑图谱回答：

1. 现有表是否已有所需字段
2. 现有状态/枚举是否能表达新场景
3. 现有原子能力是否能复用
4. 是否需要新增表/字段/枚举/索引
5. 是否会破坏已有流程的判定矩阵
6. 需要补哪些图谱卡片

输出格式：

```text
后端表逻辑支持性：
- 结论：支持 / 部分支持 / 不支持
- 依据表：
- 依据状态/枚举：
- 可复用原子能力：
- 缺口：
- 需更新图谱：
```

## 多项目边界

多项目知识图谱不做单服务内部能力的重复整理，主要记录服务间关系：

- 调用方向：A 服务调用 B 服务
- 入口契约：HTTP/RPC/MQ/任务调度
- 关键业务对象：订单、退款、支付、库存等
- 数据归属：哪个服务负责哪类主数据
- 失败传播：超时、重试、补偿、幂等边界

跨项目链路交给 `cross-project-locator`。本 skill 只在单服务图谱中保留“外部依赖”视角，不把多个项目的内部表、枚举、原子能力混到一起。

## 输出要求

执行后端知识图谱分析或更新时，必须回显：

```text
后端知识图谱：
- 项目：
- 命中能力：
- 读取图谱：
- 命中表逻辑：
- 可复用原子能力：
- 需更新图谱：
- 更新依据：
- 输出路径：
```

## 红线

| 错误想法 | 正确处理 |
|----------|----------|
| “用户提到了就写入正式图谱” | 先自动进候选沉淀池，确认或代码验证后再整理入正式图谱 |
| “不自动记录，等用户以后想起来再说” | 错。会话中的后端业务事实应自动候选记录，防止遗漏 |
| “一个 plugin 把所有端都做了” | 本 skill 只管后端单服务，不管前端 UI 或跨项目全局拓扑 |
| “先全量扫代码再说” | 有图谱先读图谱，再按代码坐标读文件 |
| “表字段照抄一遍就算图谱” | 必须写字段业务含义、读写能力和一致性约束 |
| “订单部分退这类规则问过很多次但不用沉淀” | 错。反复出现的表逻辑、状态判定、金额聚合必须进入表逻辑候选池或正式图谱 |
| “写新接口时直接再查一遍 SQL” | 先查 `07_table_logic_index.md` 和 `08_atomic_capability_index.md`，已有能力直接复用 |
| “Service 里临时复制一段表判定最快” | 应优先复用原子能力；确需临时兼容时登记待抽取原子能力 |
| “枚举值不用单独整理” | 后端需求分析必须显式读取相关枚举卡 |
| “跨项目链路也写这里” | 单服务只记录本服务视角；跨项目交给 `cross-project-locator` |
