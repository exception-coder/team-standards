---
name: init-project-docs
description: 当用户要求"初始化项目文档"、"分析项目能力"、"生成项目文档"时触发。分析 service/controller/mapper 层，在项目 docs/ 目录下生成两份标准文档。
---

# 项目文档初始化

## 触发场景

用户说以下任意一种时，**必须**调用本 skill：
- 初始化项目文档
- 分析项目能力
- 生成项目概要/架构分析
- 生成开发参考文档
- init project docs / analyze project

---

## 执行流程

```mermaid
flowchart TD
    A([收到初始化项目文档指令]) --> B[探索项目目录结构]
    B --> C[读取 controller 层 - 获取对外 API 清单]
    C --> D[读取 service 接口层 - 获取业务能力清单]
    D --> E[读取 mapper/dao 层 - 获取数据访问能力]
    E --> F[读取 entity/model - 获取核心领域模型]
    F --> G[读取 pom.xml / build.gradle - 获取技术栈]
    G --> G2[读取 component 层 - 获取可复用组件能力]
    G2 --> G3[读取 stream/listener 层 - 获取异步事件处理]
    G3 --> G4[读取 configuration/interceptor 层 - 获取横切关注点]
    G4 --> H{docs/ 目录是否存在?}
    H -->|否| I[创建 docs/ 目录]
    H -->|是| J[检查是否已有文档]
    I --> K[生成 project-overview.md]
    J --> K
    K --> L[生成 architecture-analysis.md]
    L --> L2[生成 development-reference.md]
    L2 --> M[输出文档路径告知用户]
```

---

## 输出文档规范

### 文档 1：project-overview.md（项目概要）

存放路径：`docs/project-overview.md`

包含章节（参考 `overview-template.md`）：
1. **项目定位** — 一句话描述服务职责
2. **技术栈** — 语言、框架、中间件版本
3. **业务能力概述** — 按业务域分组列出能力（3-5 个主域）
4. **核心业务流程图** — Mermaid flowchart，覆盖主链路（2-4 条）
5. **外部服务依赖** — 表格：服务名 | 用途
6. **消息事件** — 表格：事件名 | 说明
7. **API 接口一览** — 按 Controller 分组，表格：方法 | 路径 | 说明

### 文档 2：architecture-analysis.md（架构能力分析）

存放路径：`docs/architecture-analysis.md`

包含章节（参考 `architecture-template.md`）：
1. **分层架构总览** — Mermaid 架构图，展示 Controller→Service→Mapper→DB 关系
2. **Controller 层（API 层）** — 每个 Controller 的职责 + 端点列表
3. **Service 层（业务逻辑层）** — 每个 Service 接口的业务职责 + 核心方法签名
4. **Mapper/DAO 层（数据访问层）** — 主要数据实体 + 关键查询能力
5. **领域模型** — 核心实体关系图（Mermaid ER 图）
6. **组件层（Component）** — 核心计算/通信组件及职责（如有）
7. **状态机** — 核心实体的状态流转（Mermaid stateDiagram）

### 文档 3：development-reference.md（开发参考手册）

存放路径：`docs/development-reference.md`

**定位**：面向开发者的实战手册，回答"新需求代码怎么写、写在哪"。前两份文档侧重"读懂项目"，本文档侧重"指导编码"。

包含章节（参考 `development-reference-template.md`）：
1. **业务域全景** — 按域（3-9 个）列出能力边界、API 数量、职责范围（负责/不负责）
2. **新增需求决策指南** — 代码放哪层的决策表、语言选择规则、冲突检查清单
3. **Controller 端点全表** — 按域分组的完整端点清单，标注加锁/特殊机制
4. **Service 能力矩阵** — 核心 Service 的依赖注入、方法数、职责描述；Service 间依赖关系图
5. **Component 组件能力** — 每个组件的职责、关键方法、适用场景；标注已停用组件及替代方案
6. **数据模型与 Mapper** — 核心表关系图、Mapper XML 复杂度分级、查询放置规则
7. **异步事件与消息流** — Stream 消费者清单、事件触发场景、状态机流转、锁策略
8. **外部服务依赖** — Feign 客户端清单、封装组件、熔断超时配置
9. **横切关注点** — 分布式锁枚举、审计字段自动填充、线程池配置、请求上下文传播
10. **常见开发场景速查** — 5-10 个高频场景的分步操作指南（新增接口/支付方式/退款规则/自动化任务/外部调用/数据表/状态流转等）

---

## Mermaid 语法强制规范

> 来源：team-standards Mermaid 规范（见 MEMORY.md）

- 节点/边标签含 `=`、`,`、`/`、`<`、`>`、`(`、`)`、`[`、`]`、`:` 时**必须加引号**
- `<` `>` 改用文字（如：大于、小于、请求体、响应体）
- 不使用 emoji
- `classDiagram` 方法名不含中文

---

## 文档质量标准

- **AI 友好**：每份文档开头有"快速索引"，让 AI 读一次就能定位关键信息
- **业务优先**：先写业务能力和流程，后写技术细节
- **可维护**：文档头部注明"基于 service 层自动分析生成，如有结构调整请同步更新"
- **简洁**：表格优先，避免大段叙述；每个 Service 职责用 1-2 句话概括

---

## 注意事项

1. 探索阶段优先读 **service 接口文件**（`I*.java`），不读 `impl`，避免无效 token 消耗
2. 若项目使用 Kotlin + Java 混合，两个目录都要探索
3. mapper/DAO 层只需列出实体名和关键查询方法，不需要列出所有 CRUD
4. 生成完成后，**不需要**更新 `design-doc-required` 流程（本 skill 属于分析类，非开发类）
5. **development-reference 需要深度分析**：与前两份文档不同，此文档需要读取 Service impl、Component 实现、Stream handler、Configuration 类的实际代码，以获取依赖注入关系、锁策略、事件触发点等实战信息
6. development-reference 的"常见开发场景速查"章节应根据项目实际业务域定制，不要照搬模板中的示例场景
