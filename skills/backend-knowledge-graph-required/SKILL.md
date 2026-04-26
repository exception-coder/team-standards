---
name: backend-knowledge-graph-required
description: "Use for Java backend single-service business knowledge graphs. Trigger when the user asks to initialize, generate, organize, read, or update a backend service knowledge graph; when analyzing a Java backend requirement and the project has docs/knowledge-graph/backend/; when backend code changes affect APIs, services, domain capabilities, database tables, enums, state transitions, transactions, MQ/events, or external dependencies; or when the user says to record a confirmed backend business fact into the knowledge graph. Scope is Java backend single service only, not frontend, Flutter, or cross-project topology."
---

# Java 后端单服务知识图谱

## 定位

本 skill 只负责 **Java 后端单服务业务视角** 的知识图谱。目标是让 AI 在需求分析前先理解：

- 这个服务有哪些领域能力、原子能力、编排能力
- 哪些 API、Service、Repository、Mapper 是入口
- 涉及哪些表、枚举、状态机、事务边界、外部依赖
- 一个业务流程如何读写表、调用能力、流转状态

不处理前端、Flutter、移动端或跨项目全局拓扑。跨项目链路仍交给 `cross-project-locator`。

## 推荐目录

正式图谱默认位于项目内：

```text
docs/knowledge-graph/backend/
  00_backend_service_profile.md
  01_domain_capability_map.md
  02_data_model_map.md
  03_enum_dictionary.md
  04_api_entrypoints.md
  05_external_dependencies.md
  06_business_flow_index.md
  capabilities/{capability-name}.md
  flows/{flow-name}.md
  tables/{table-name}.md
  enums/{enum-name}.md
```

写入项目 `docs/` 前必须遵循 `doc-index-required`：默认先生成用户目录草稿；只有用户明确要求更新项目知识图谱时，才写入 `docs/knowledge-graph/backend/` 并更新索引。

## 分析前读取顺序

分析 Java 后端需求前，若存在 `docs/knowledge-graph/backend/`，按需读取：

1. `00_backend_service_profile.md`
2. `01_domain_capability_map.md`
3. `06_business_flow_index.md`
4. 命中的 `capabilities/{capability-name}.md`
5. 命中的 `flows/{flow-name}.md`
6. 相关 `tables/{table-name}.md`
7. 相关 `enums/{enum-name}.md`
8. `04_api_entrypoints.md` 与 `05_external_dependencies.md`
9. 最后再读代码文件

不得在已有图谱可定位时直接全量扫描代码。

## 能力分层

后端能力必须区分三类：

| 类型 | 定义 | 示例 |
|------|------|------|
| 原子能力 | 可复用的最小业务能力 | 生成订单号、校验商品、计算价格、锁库存 |
| 领域能力 | 围绕一个业务对象完成一项完整动作 | 创建订单、取消订单、支付订单 |
| 编排能力 | 跨多个领域能力/外部依赖的流程编排 | 下单履约流程、支付后出单流程、退款流程 |

能力卡必须写清能力类型，禁止把所有 Service 方法都叫“原子能力”。

## 文档卡片要求

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
- 读它的能力
- 写它的能力
- 与其它表关系
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

用户在会话中经常提到的内容**不会无条件自动写入正式知识图谱**。按以下规则处理：

| 场景 | 处理 |
|------|------|
| 用户明确说“记入知识图谱 / 更新知识图谱 / 归档到后端图谱” | 可更新正式图谱 |
| 本次后端代码变更新增/修改 API、Service、表、枚举、状态流转、MQ、外部依赖 | 必须提示并更新相关图谱卡片 |
| 会话中反复出现同一业务事实，但尚未代码验证 | 记录为“候选沉淀”，默认写用户目录草稿，不进正式图谱 |
| 事实来自代码、DDL、枚举类、接口契约、已确认设计文档 | 可作为正式图谱依据 |
| 只是猜测、临时讨论、未确认方案 | 禁止写入正式图谱 |

正式图谱条目必须能追溯到至少一个来源：代码坐标、表结构、枚举类、接口契约、设计文档或用户明确确认。

## 更新触发

后端源码出现以下变化时，应同步检查知识图谱：

- 新增/修改 Controller、Endpoint、Feign、DTO
- 新增/修改 Service、UseCase、Domain capability
- 新增/修改 Repository、Mapper、SQL、DAO
- 新增/修改数据库表、字段、索引
- 新增/修改枚举、状态机、状态流转
- 新增/修改 MQ topic、事件、定时任务、外部 HTTP/RPC 调用
- 修改事务、锁、幂等、补偿逻辑

若用户没有要求写项目 `docs/`，先在用户目录生成“知识图谱更新建议”；用户确认后再写正式图谱。

## 输出要求

执行后端知识图谱分析或更新时，必须回显：

```text
后端知识图谱：
- 项目：
- 命中能力：
- 读取图谱：
- 需更新图谱：
- 更新依据：
- 输出路径：
```

## 红线

| 错误想法 | 正确处理 |
|----------|----------|
| “用户提到了就写入图谱” | 先判断是否为已确认事实，未确认只进候选沉淀 |
| “一个 plugin 把所有端都做了” | 本 skill 只管 Java 后端单服务 |
| “先全量扫代码再说” | 有图谱先读图谱，再按代码坐标读文件 |
| “表字段照抄一遍就算图谱” | 必须写字段业务含义、读写能力和一致性约束 |
| “枚举值不用单独整理” | 后端需求分析必须显式读取相关枚举卡 |
| “跨项目链路也写这里” | 单服务只记录本服务视角；跨项目交给 `cross-project-locator` |
