---
name: design-doc-required
description: "You MUST invoke this skill the instant a user presents any new requirement, feature request, refactoring plan, asks you to analyze/evaluate/discuss implementation feasibility, OR requests any code modification/implementation — even if they only ask for analysis, architecture discussion, feasibility study, or say 'just help me change the code'. Do NOT wait until code-writing begins. Trigger phrases include: 'I have a requirement', 'I need to refactor', 'analyze whether X is feasible', 'how should we implement', 'I want to add/change/build', 'help me design', 'let's discuss the approach', 'help me modify the code', 'change the code based on this document', 'implement according to the doc', 'update this feature', '帮我修改代码', '根据文档改代码', '按文档实现', '帮我改一下', '修改这个功能', '帮我写代码', '改一下代码', '阅读文档帮我改'. ALSO trigger when: (1) the user provides or references a document and asks you to make code changes based on it, (2) you are about to call Edit/Write on any source code file (.java, .dart, .ts, .py, .kt, etc.) and this skill has not yet been invoked in the current conversation. Invoke this skill BEFORE any analysis, planning, architecture discussion, or code."
---

# 开发前设计文档强制检查

## 核心原则

**禁止在没有设计文档的情况下分析方案、讨论架构或编写任何实现代码。**

这不是建议，是强制要求。无论任务看起来多简单，也无论用户是要求「分析」还是「实现」，都必须先完成设计文档检查。

**所有设计文档中的架构图、流程图、模块关系图必须使用 Mermaid 语法绘制，禁止使用 ASCII art 或纯文本框图。**

<HARD-GATE>
Do NOT analyze implementation approaches, discuss architecture, propose solutions, evaluate feasibility, or write any code until the design document check below is complete. This applies even when the user only asks for analysis or architectural discussion — design doc check comes FIRST, before any response about implementation.

Do NOT write any implementation code (Edit/Write .java, .ts, .py, etc.) until BOTH the design document AND the corresponding coding summary document (-coding.md) have been created and confirmed. The coding document is NOT optional — it is the second mandatory gate before any code change.
</HARD-GATE>

---

## Step 0：知识图谱上下文预热

**在执行设计文档检查之前，先加载项目知识图谱上下文，避免后续全量扫码。**

```mermaid
flowchart TD
    S0(["收到开发任务"]) --> S0A{"docs/00_project_overview.md 存在?"}
    S0A -->|"是"| S0B["读取 00_project_overview.md\n获取项目全局索引"]
    S0A -->|"否"| S0SKIP["跳过预热\n兼容无知识图谱的项目"]
    S0B --> S0C["根据 AI 上下文路由表\n按任务类型加载必读文档"]
    S0C --> S0D["将上下文带入后续流程"]
    S0D --> MAIN(["进入设计文档检查"])
    S0SKIP --> MAIN
```

### 执行规则

1. 检查项目 `docs/00_project_overview.md` 是否存在
2. **若存在**：
   - 读取该文件（约 3KB），获取项目概要 + 文档导航 + AI 上下文路由表
   - 根据路由表中的「按任务类型加载」，读取当前任务对应的**必读文档**（通常 2-3 份）
   - **按需文档不在此时加载**，留到实施阶段碰到具体问题时再读
3. **若不存在**：跳过本步骤，直接进入设计文档检查（兼容没有知识图谱的项目）

### 任务类型判断

| 用户意图 | 任务类型 | 路由表对应行 |
|---|---|---|
| 新增功能、新建接口 | 新功能开发 | `01_architecture` + `02_module_map` + `05_api_map` |
| 修复 Bug、处理异常 | Bug 修复 | `08_constraints` + `modules/{模块}` |
| 重构、迁移、优化架构 | 重构/迁移 | `08_constraints` + `09_refactor_plan` + `skills/{tech}` |
| 修改接口入参出参 | 接口变更 | `05_api_map` + `06_frontend_backend_mapping` |
| 加表、改字段 | 数据库变更 | `04_data_model_map` + `08_constraints` |

> **注意**：Step 0 只负责加载上下文，不替代后续的设计文档检查。预热完成后，正常进入下方流程。

---

## 执行流程

```mermaid
flowchart TD
    A(["收到开发任务\n（Step 0 预热完成后）"]) --> B["在当前项目中查找设计文档"]
    B --> C{"文档存在且已填写完整?"}
    C -->|"是"| LIGHT{"改动通过\n第四·五步硬清单?"}
    LIGHT -->|"是"| LIGHT_LOG["在最新 v 文档末尾\n追加调整流水行"]
    LIGHT_LOG --> Z(["开始实现代码"])
    LIGHT -->|"否"| D["读取并引用文档内容"]
    D --> E["通知用户引用了哪份文档"]
    E --> CODING_BR{"现有文档是\n轻量模版?"}
    CODING_BR -->|"是"| Z
    CODING_BR -->|"否"| CODING{"coding 文档存在?"}
    CODING -->|"是"| CODING_READ["读取 coding 文档"]
    CODING -->|"否"| CODING_GEN["按 coding-template.md 生成"]
    CODING_GEN --> CODING_READ
    CODING_READ --> Z
    C -->|"否"| F["询问用户设计文档路径或名称"]
    F --> G{"用户能提供文档?"}
    G -->|"是"| D
    G -->|"否"| IDX_A["调用 doc-index-required Phase-A\n读取索引 + 分析内容边界"]
    IDX_A --> BELONG["目录归属分析\n扫描已有设计目录\n判断是否属于某个父架构的子模块"]
    BELONG --> BELONG_Q{"属于某个已有架构的子模块?"}
    BELONG_Q -->|"是"| NEST["确定父目录\n强制创建子目录: docs/design/父需求/子模块/\n文件必须放入子目录，禁止放在父目录"]
    BELONG_Q -->|"否"| FLAT["创建顶层目录\n路径: docs/design/需求名称/"]
    NEST --> WEIGHT{"第一·七步\n模版分级选择"}
    FLAT --> WEIGHT
    WEIGHT -->|"轻量\n通过准入清单"| H_LIGHT["引导用户创建轻量文档\n输出 lightweight-template.md"]
    WEIGHT -->|"完整\n任一升级触发条件命中"| H_HEAVY["引导用户创建完整文档\n输出 template.md"]
    H_LIGHT --> J_LIGHT["等待用户确认文档已填写"]
    H_HEAVY --> J_HEAVY["等待用户确认文档已填写"]
    J_LIGHT --> IDX_B["调用 doc-index-required Phase-B\n更新 docs/design/INDEX.md"]
    J_HEAVY --> IDX_B
    IDX_B --> POST_WEIGHT{"刚创建的是\n轻量模版?"}
    POST_WEIGHT -->|"是"| Z
    POST_WEIGHT -->|"否"| CODING
```

---

## 文档目录结构规范

正式实施设计文档统一存放在项目 `docs/design/` 目录下，支持**扁平目录**和**层级嵌套**两种组织方式。

> **输出路径边界：** `docs/design/` 只放团队共享、已确认要作为编码依据的正式设计文档。AI 在确认前生成的方案草稿、代码扫描笔记、对照分析、个人备忘默认写入 `.ai-docs/{agent}/{YYYY-MM-DD}/`，并按 `doc-index-required` 的“文档输出路径判定”规则处理，禁止直接塞进 `docs/design/` 影响团队成员。

```
docs/design/
  {需求名称}/                              ← 顶层需求目录
    {需求名称}-{YYYYMMDD}-v{N}.md          ← 首个版本
    {需求名称}-{YYYYMMDD}-v{N}.md          ← 更新版本（新建文件，不覆盖旧版本）
    {子模块名称}/                           ← 子模块目录（当本需求是更大架构的一部分时）
      {子模块名称}-{YYYYMMDD}-v{N}.md
```

**示例：**
```
docs/design/
  通用智能体架构/                            ← 顶层架构设计
    通用智能体架构-20260404-v1.md
    多平台模型路由层/                         ← 子模块，归属于通用智能体架构
      多平台模型路由层-20260331-v1.md
      多平台模型路由层-20260331-v1-coding.md
      多平台模型路由层-current.md
  用户权限管理/                              ← 独立需求
    用户权限管理-20260330-v1.md
    用户权限管理-20260330-v1-coding.md
```

### 目录层级规则

| 规则 | 说明 |
|------|------|
| **独立需求** | 直接在 `docs/design/` 下创建顶层目录 |
| **子模块/子功能** | 如果本需求属于某个已有架构设计的一部分，**必须创建独立子目录**（`docs/design/{父需求}/{子模块名}/`），**禁止**将子模块文件直接放在父需求目录下与父文档混在一起 |
| **最大嵌套深度** | 不超过 2 层（`docs/design/{父需求}/{子模块}/`），避免目录过深 |
| **归属判断标准** | 见下方「目录归属分析」步骤 |

### 命名规则

| 部分 | 规则 | 示例 |
|------|------|------|
| 需求名称 | 与需求/功能名一致，禁止缩写 | `用户权限管理` |
| 日期 | `YYYYMMDD` 格式，为文档**创建或本次修订**的日期 | `20260330` |
| 版本号 | `v` + 数字，从 `v1` 开始，每次实质性变更递增 | `v1`、`v2` |

### 版本更新原则

- **禁止在原有文档上直接修改后保存**（会丢失历史）
- 需求有实质性变更时：复制最新版本文件 → 修改日期和版本号 → 填写新内容
- 微小错别字/格式修正可在原文件修改，不需要新建版本

---

## 步骤详解

### 第一步：查找设计文档

在当前项目 `docs/design/` 目录下按以下优先级查找：

1. 询问用户本次开发对应的**需求名称**
2. 在 `docs/design/{需求名称}/` 目录下查找版本号最大（日期最新）的 `.md` 文件
3. 若顶层未找到，**递归搜索子目录**（如 `docs/design/{父需求}/{需求名称}/`）
4. 若目录不存在，则认为文档缺失，进入第一·五步（目录归属分析）后再进入第三步

### 第一·五步：目录归属分析

文档缺失需要新建时，**在创建目录前必须先分析目录归属**：

1. **扫描 `docs/design/` 下所有已有目录**（读取 `docs/design/INDEX.md` 获取各需求摘要）
2. **判断本次需求是否属于某个已有架构/系统设计的子模块**，判断依据：

| 判断维度 | 归属为子模块的信号 | 保持独立的信号 |
|---------|------------------|--------------|
| **功能依赖** | 本需求实现的功能是已有架构的组成部分 | 本需求可独立运行，无父架构 |
| **接口引用** | 本需求实现的接口定义在已有架构文档中 | 本需求自定义全部接口 |
| **文档提及** | 已有架构文档的「功能范围」或「后续扩展」明确提到本需求 | 无任何文档提及 |
| **模块归属** | 本需求的代码位于已有架构相同的 Maven 模块内 | 本需求位于独立模块 |

3. **判定结果处理**：
   - **属于子模块** → 目录路径为 `docs/design/{父需求}/{子模块名}/`，告知用户归属原因
   - **独立需求** → 目录路径为 `docs/design/{需求名称}/`
   - **不确定** → 列出候选父目录及判断理由，让用户决定

> **示例：** 新建「多平台模型路由层」设计文档时，扫描发现「通用智能体架构」的功能范围和后续扩展章节明确提到了模型路由，且代码位于同一个 `llm-domain` 模块 → 判定为子模块 → 建议路径 `docs/design/通用智能体架构/多平台模型路由层/`

### 第一·七步：模版分级选择（轻量 vs 完整）

**目录确定后、输出模版前，必须先决定本次用「轻量模版」还是「完整模版」。** 直接用完整模版处理小接口、或用轻量模版偷懒做大改造，都属于流程错位。

#### 模版定位

| 模版 | 文件 | 适用场景 | 配套 coding.md |
|------|------|---------|----------------|
| **轻量** | `lightweight-template.md` | 单接口的库表读写流程描述、已有架构内的接口新增/调整、入参出参微调 | **不需要**（时序图 + 规则表已涵盖） |
| **完整** | `template.md` | 跨服务/跨模块协作、新增数据库表、新增对外契约、复杂事务/分布式锁、状态机重设计 | **需要**，按 `coding-template.md` 生成 |

#### 准入硬清单（命中**所有**项才允许走轻量分支）

只要任意一项 ❌，立即升级到完整模版。**严禁口头判定「差不多就走轻量」。**

- [ ] **不**新增数据库表
- [ ] **不**新增字段（仅读取现有字段）或字段变更属于纯枚举值扩充
- [ ] **不**新增对外服务契约入口（HTTP 路径 / Feign 方法）
- [ ] **不**改既有对外接口的入参/出参语义（字段重命名、含义变化）
- [ ] **不**跨服务、不跨模块协作（只在当前模块内）
- [ ] **不**引入新的中间件/消息队列/分布式锁/补偿事务
- [ ] **不**新增 ≥3 个类（顶多 1-2 个新类）
- [ ] **不**重新设计实体状态机（在已有状态机内增减状态算扩充，不算重设计）
- [ ] 改动核心可由「时序图 + 库表过滤规则表 + 失败行为表」完整描述

#### 判定边界示例

✅ 走轻量：
- 给「获取可退商品」接口加一个 `includeMergeTable` 入参，控制是否聚合联台兄弟订单
- 把订单查询的 `WHERE` 条件多加一个过滤项，剔除某种特殊状态
- 在已有 Service 加一个查询方法，本质是按新条件读现有表

❌ 必须用完整模版：
- 新建「积分账户」表 + 配套接口（**新增表**）
- 把「订单创建」从同步改为消息异步推送（**引入消息队列**）
- 引入分布式锁防止重复退款（**新增分布式锁**）
- 设计三方对账的全新接口契约（**新增对外契约**）

#### 决策动作

1. 对照硬清单逐项判定
2. **轻量分支**：输出 `lightweight-template.md`，告知用户填写要点 + 升级触发条件
3. **完整分支**：输出 `template.md`，进入第三步既有流程

> **决策必须显式告知用户：** 必须先回复"判定为【轻量/完整】模版，原因：xxx"，再输出模版。**不允许默默选择。**

---

### 第二步：文档存在时

**先识别文档类型**（看文件头部声明 / 目录结构）：

- **轻量文档**（基于 `lightweight-template.md`）：直接读取该文档作为编码依据，**不需要** coding.md
- **完整文档**（基于 `template.md`）：检查是否同时存在对应的编码摘要文档（`-coding.md`）

完整文档的 coding.md 处理：

- **存在 `-coding.md`**：优先读取编码摘要文档，以节省 token、降低幻觉风险
- **不存在 `-coding.md`**：读取完整文档，并在读取后**自动生成**对应的编码摘要文档

在开始编码前明确告知用户：

> "已读取编码摘要：`docs/design/{需求名称}/{文件名}-coding.md`
> 本次实现依据：
> - 核心业务规则：XXX
> - 涉及类（全类名）：XXX
> - 关键约束：XXX
> 如有不符，请告知我，我将引导你创建新版本文档后再继续。"

### 第三步：文档不存在时

**禁止直接开始编码。** 执行以下步骤：

1. 告知用户未找到对应需求的设计文档
2. 询问是否有已有文档需要手动指定路径
3. 若无文档，先执行 `doc-index-required` 的**文档输出路径判定**：
   - 正式实施设计文档 → 进入 `docs/design/` 并执行 Phase-A
   - 个人草稿/临时分析 → 写入 `.ai-docs/{agent}/{YYYY-MM-DD}/`，不更新 docs 索引，且不得作为最终编码门禁依据
4. 正式文档分支下，**立即调用 `doc-index-required` Phase-A**（前置阶段），完成以下两项：
   - 读取 `docs/INDEX.md` 与 `docs/design/INDEX.md`，确认内容边界（是否已有重叠文档）
   - 分析结果告知用户后，进入文档创建引导
5. **执行第一·五步目录归属分析 + 第一·七步模版分级选择**
6. 按对应模版引导用户创建：

---

#### 轻量分支引导（命中第一·七步轻量准入清单）

> **本次改动判定为【轻量级】，按接口级模版处理。**
>
> 请按以下步骤操作：
> 1. 创建目录（根据第一·五步归属分析结果）：
>    - **独立需求** → `docs/design/{需求名称}/`
>    - **子模块** → `docs/design/{父需求}/{子模块名}/`
> 2. 创建文件：`{需求名称}-{今日日期}-v1.md`
> 3. 参考 `lightweight-template.md`，至少完成以下章节：
>    - 第 1 节：代码入口（先写"待实现"也可以）
>    - 第 2 节：接口契约（核心入参/出参）
>    - 第 3 节：时序图（库表读写顺序，必填 Mermaid sequenceDiagram）
>    - 第 4 节：关键过滤/写入规则
>    - 第 5 节：失败行为
> 4. 填写完毕后告知我文件路径，我将读取后开始实现
> 5. **本分支无需生成 `-coding.md`**

模板文件位于：`skills/design-doc-required/lightweight-template.md`

---

#### 完整分支引导（命中第一·七步任一升级触发条件）

> **本次改动判定为【完整级】，按完整模版处理。**
>
> 请按以下步骤操作：
> 1. 创建目录（根据第一·五步归属分析结果）：
>    - **独立需求** → `docs/design/{需求名称}/`
>    - **子模块** → `docs/design/{父需求}/{子模块名}/`（**禁止**将子模块文件直接放在父目录下）
> 2. 创建文件：`{需求名称}-{今日日期}-v1.md`
> 3. 参考模板填写内容（至少完成以下章节）：
>    - 第 2 节：背景与目标
>    - 第 4 节：业务流程设计
>    - 第 5 节：接口设计（如涉及接口变更）
>    - 第 8 节：核心业务规则
> 4. 填写完毕后告知我文件路径，我将读取后开始实现

模板文件位于：`skills/design-doc-required/template.md`（安装后路径由 `$CLAUDE_PLUGIN_ROOT` 指定）

### 第三·五步：文档写完后更新索引

用户确认设计文档填写完毕后，**调用 `doc-index-required` Phase-B**（后置阶段），将新文档登记到 `docs/design/INDEX.md`（含摘要和大纲）。若 `docs/INDEX.md` 中尚无 `design/` 条目，一并追加。

---

### 第四步：生成编码摘要文档（编码前第二道门禁）

> **本步仅适用于完整模版（基于 `template.md`）。** 轻量模版（基于 `lightweight-template.md`）不需要 coding.md，时序图 + 规则表已经覆盖编码所需信息，跳过本步直接进入实现。

**编码摘要文档是完整文档编码前的第二道强制门禁。** 设计文档确认后、第一行实现代码之前，必须确保 `-coding.md` 存在。若不存在，立即按 `coding-template.md` 生成。

> **禁止在 `-coding.md` 缺失的情况下开始编码（完整模版分支）。** 即使用户催促"直接写代码"，也必须先完成本步。

文件命名：`{需求名称}-{YYYYMMDD}-v{N}-coding.md`（与完整文档版本对应）

#### 设计文档 vs 编码文档的职责边界

| 内容 | 设计文档（template.md） | 编码文档（coding-template.md） |
|------|----------------------|---------------------------|
| 分层架构图 | 保留 | 不重复 |
| 类清单 + 变更类型 + 一句话职责 | 保留（一行一类） | 展开方法级操作说明 |
| 方法签名列表 | **不写** | 保留（全路径 + 签名 + 职责） |
| 方法职责详细说明 | **不写** | 保留 |
| 类调用关系图 | 保留（类级别方向） | 不重复 |
| 表操作矩阵 | 保留（入参→表→出参概要） | 展开字段级细节 |
| 实现伪代码 | **不写**——只放流程图 | 保留（完整实现代码） |

**原则：设计文档回答"哪些类、什么职责、怎么协作"，编码文档回答"每个方法怎么写"。**

#### 生成规则

从完整文档中提取以下内容填入编码文档：

- 变更记录 → 精简为一行摘要
- 第 6 节类清单 → 提取**全路径**填入「涉及类清单」，**补充方法签名和职责**（设计文档中没有方法级细节，需从业务流程和接口设计中推导）
- 第 5 节接口设计 → 提取入口接口契约和请求示例
- 第 8 节核心业务规则 → 原文提取
- 第 7/9 节数据库/事务 → 提取关键字段和约束
- 其余章节（背景、上线、风险等）**不纳入编码摘要**

**全路径要求：** 类设计中所有类必须使用完整路径（包路径或文件路径），禁止只写短类名，以便精准定位代码文件。

---

### 第四·五步：轻量修订流水（小修不新建版本）

**适用场景：** 设计文档已存在、本次改动属于该文档覆盖范围内的修正/对齐/删冗余，引入"新建 vN+1 + coding.md"的成本明显大于收益。这种情况**在最新版 v 文档末尾追加一行调整流水**即可，不新建版本号、不新建 coding.md。

#### 准入硬清单（必须全部 ✅ 才能走本分支）

只要任意一项 ❌，立即退回[第五步：新建 vN+1]。**严禁口头判定"差不多就走轻量"。**

- [ ] 设计文档已存在（`docs/design/{需求}/...{vN}.md` 或 `current.md`）
- [ ] 改动**不**新增对外接口、**不**修改入参/出参字段
- [ ] 改动**不**新增数据库表、**不**新增/重命名/删除字段
- [ ] 改动**不**新增类、**不**新增/删除/重命名公开方法
- [ ] 改动**不**改变方法签名（参数/返回值/异常）
- [ ] 改动**不**引入新的外部依赖（pub/maven/npm 等）
- [ ] 改动范围 ≤ 单文件、≤ 30 行净变更
- [ ] 改动性质属于以下**一种**：
  - 修正与上游/云端/规范的不一致（对齐）
  - 删除冗余、错误或被强制覆盖的逻辑
  - 修复明确的 bug 且不改变文档已声明的业务规则方向
  - 补充注释、日志、错误信息文案

> **判定边界示例：**
> ✅ 走轻量：删除 `_calculateRefundPriceRaw` 中强制覆盖 `selectedServices` 的 6 行 if 块（与云端 `calculateRefundPrice` 对齐）
> ❌ 必须新建版本：把 `selectedServices` 改成支持半选的全新数据结构（改了入参语义）
> ❌ 必须新建版本：从 `selectedServices` 派生出新的 `selectedServiceTypeFlag` 字段（新增字段）

#### 处理动作

1. 在最新版 v 文档末尾（或 `current.md` 末尾）追加 `## 调整流水` 章节（已存在则只追加表格行，不重复表头）
2. 表格固定列：

   ```markdown
   ## 调整流水

   | 日期 | 调整摘要 | 涉及文件:line | 原因 | Commit |
   |------|---------|--------------|------|--------|
   | 2026-04-25 | 移除 selectedServices 强制覆盖 | refund_price_service.dart:329-334 | 与云端 calculateRefundPrice 不一致，导致前端勾选服务费失效 | <hash> |
   ```

3. **不**新建 `vN+1.md`、**不**新建/更新 `-coding.md`
4. **跳过** `doc-index-required` Phase-B（INDEX 摘要无需更新）
5. 进入代码改动时**必须遵循 `bugfix-coding-style`**：先注释原错误代码（带 `[DEPRECATED YYYY-MM-DD]` 标记），再追加新代码，待用户确认后清理
6. commit 信息按 `git-commit-standards` 规范，并在 body 引用调整流水所在文档路径

#### 红线

| 想法 | 正确处理 |
|------|---------|
| "这次只改 5 行，但顺手删个无用方法" | 删方法即破清单第 4 项，必须走 vN+1 |
| "顺便把入参字段名规范一下" | 改入参字段即破清单第 2 项，必须走 vN+1 |
| "走轻量分支就不用记 dev-log 了" | dev-log 记录的是 team-standards 自身变更；项目内代码改动靠调整流水 + commit message |

---

### 第五步：需求变更时引导新建版本

若改动**未通过** [第四·五步硬清单]（任意一项 ❌），即视为需求变更，**禁止直接修改旧文档**，须引导：

> "检测到需求变更，请按规范新建版本文档：
> 复制 `{当前文件名}` → 重命名为 `{需求名称}-{今日日期}-v{N+1}.md` → 修改变更内容后告知我。"

---

### 第六步：修改设计文档后同步 coding 文档

> **本步仅适用于完整模版。** 轻量模版没有配套 coding.md，跳过本步。

**每次对完整设计文档进行实质性内容变更后（包括直接修改和新建版本），必须同步更新对应的 `-coding.md`。**

按以下映射关系更新对应章节：

| 设计文档变更内容 | 需同步更新 coding 文档的章节 |
|----------------|--------------------------|
| 接口清单增删或分类调整 | 第 2 节：接口契约 |
| 类清单增删 | 第 3 节：涉及类清单（同步增删类条目，补充方法签名） |
| 核心业务规则变更 | 第 1 节：核心业务规则 |
| 数据库字段/DDL/Mapper 变更 | 第 4 节：数据结构 |
| 约束、事务、边界说明变更 | 第 5 节：重要约束与边界 |

> **注意**：设计文档的类清单只有一句话职责，coding 文档需自行补充方法签名和详细操作说明。设计文档新增一个类时，coding 文档不只是复制一行，而要展开该类的方法级细节。

**变更记录必须同步追加一行**，与设计文档版本号保持一致。

若以上章节均未涉及，则跳过 coding 文档更新。

---

## Mermaid 图表强制要求

> **Mermaid 语法规范由 `markdown-writing-standards` Skill 统一管控。**
> 本章节只定义设计文档中「必须画哪些图」，具体「图怎么画不出错」请遵循 `markdown-writing-standards`。
> 生成 Mermaid 代码块前，**必须先调用 `markdown-writing-standards`** 进行语法自检。

### 必须包含的图表（按模版分级）

#### 完整模版（template.md）必备图表

| 图表类型 | 适用章节 | Mermaid 图类型 | 目的 |
|---------|---------|---------------|------|
| **功能模块总览图** | 第 3 节（功能范围） | `graph TD` | 一眼看清要开发几个功能、功能之间的关系 |
| **能力分解图** | 第 3 节（功能范围） | `mindmap` / `graph TD` | 每个功能模块的具体能力点拆解 |
| **业务流程图** | 第 4 节（业务流程设计） | `flowchart TD` | 正常流程、异常流程的完整链路 |
| **状态流转图** | 第 4 节（状态流转） | `stateDiagram-v2` | 实体状态变化（若有状态流转） |
| **类调用关系图** | 第 6.3 节（类调用关系） | `graph LR` / `sequenceDiagram` | 核心调用链路可视化（类级别，不标方法名） |
| **组件/接口依赖图** | 第 12 节（下游依赖） | `graph TD` | 系统间依赖关系 |

#### 轻量模版（lightweight-template.md）必备图表

| 图表类型 | 适用章节 | Mermaid 图类型 | 目的 |
|---------|---------|---------------|------|
| **库表读写时序图** | 第 3 节（时序图） | `sequenceDiagram` | 按顺序展示每一步对哪张表做了什么 + 业务含义注释 |

> 轻量模版不强制要求功能模块总览图、能力分解图、类调用关系图、依赖图。所有业务规则下沉到时序图 Note 与第 4 节规则表。

### 功能模块总览图要求

**每份设计文档的第 3 节必须包含一张功能模块总览图**，该图需要：

1. **列出所有要开发的功能模块**（矩形节点）
2. **标注模块间的依赖/调用关系**（带箭头的连线 + 关系说明）
3. **区分新建模块与复用/改造模块**（用不同样式，如 `stroke-dasharray: 5 5` = 已有模块）
4. **按分层或业务域分组**（用 `subgraph` 分区）

### Mermaid 图表分组（subgraph / box）规范

**所有 Mermaid 图表中，属于同一主题、同一系统、同一职责域的节点必须用 `subgraph` 包裹为同一个 BOX。** 这是大型项目中清晰展示模块边界和系统调用关系的关键。

**分组原则：**

| 图类型 | 分组维度 | 示例 |
|--------|---------|------|
| `flowchart` / `graph` | 按业务阶段、系统边界、职责层 | `subgraph Stage1["阶段一 前置查询"]` |
| `sequenceDiagram` | 用 `box` 包裹同一系统/层的参与者 | `box 本地数据层` 包裹 Repository + SQLite |
| `classDiagram` | 按包/模块分组 | `namespace Application` |

**flowchart/graph 分组规则：**

1. **同一业务阶段的模块必须放入同一 subgraph**（如"前置查询阶段"包裹所有查询接口）
2. **同一系统/服务的模块必须放入同一 subgraph**（如"外部服务"包裹 KPay API + POS 设备）
3. **subgraph 嵌套不超过 2 层**，避免视觉混乱
4. **subgraph 必须使用 `ID["显示名"]` 格式**，ID 用英文，显示名用中文

**sequenceDiagram 分组规则：**

1. **属于同一系统的参与者必须用 `box` 包裹**
2. 格式：`box rgba(颜色) 分组名称`，包裹 participant 声明
3. 典型分组：`前端层`、`业务编排层`、`数据层`、`外部服务`

```
正确:
  box rgb(212, 237, 218) 本地数据层
    participant REPO as RefundLocalRepository
    participant DB as SQLite
  end

  box rgb(248, 215, 218) 外部服务
    participant KPAY as KPay Cloud
    participant POS as POS Device
  end

错误:（参与者散列，无法看出谁属于哪个系统）
  participant REPO as RefundLocalRepository
  participant KPAY as KPay Cloud
  participant DB as SQLite
  participant POS as POS Device
```

### 能力分解图要求

**每个核心功能模块必须展示其具体能力点**，推荐使用 mindmap 或嵌套 graph。

### 检查清单

#### 完整模版检查清单

生成或审查完整设计文档时，必须逐项确认：

- [ ] 第 3 节包含**功能模块总览图**（mermaid graph），能一眼看出要开发几个功能
- [ ] 第 3 节包含**能力分解图**（mermaid mindmap/graph），能看到每个模块的能力点
- [ ] 第 4 节所有业务流程使用 **mermaid flowchart** 绘制，而非 ASCII art
- [ ] 第 4.3 节状态流转使用 **mermaid stateDiagram**（若有状态变化）
- [ ] 第 6.3 节类调用关系使用 **mermaid graph 或 sequenceDiagram**
- [ ] 第 12 节下游依赖使用 **mermaid graph**
- [ ] **所有图表中同一主题/系统/职责域的节点已用 `subgraph`（flowchart）或 `box`（sequenceDiagram）分组**
- [ ] 文档中无任何 ASCII 框图（`┌─┐`、`│`、`└─┘`、`→`、`↓` 等字符画）
- [ ] 所有 Mermaid 代码块已通过 `markdown-writing-standards` 自检清单

#### 轻量模版检查清单

生成或审查轻量设计文档时，必须逐项确认：

- [ ] 第 1 节代码入口已写明 Service / DAO 入口（编码前可写「待实现」）
- [ ] 第 3 节包含 **mermaid sequenceDiagram**，按真实顺序画出每一步的库表读写
- [ ] 时序图每条 SQL 后挂 `Note over DB`，说明字段 + 业务含义
- [ ] 第 4 节关键过滤/写入规则表已列出所有非显然的过滤条件
- [ ] 第 5 节失败行为表已覆盖入参校验 / 业务规则 / SQL 异常三类
- [ ] 文档中无任何 ASCII 框图
- [ ] Mermaid 代码块通过 `markdown-writing-standards` 自检清单

---

## 终版文档（current）

每个需求目录下可以同时存在两类文档：

| 文件名格式 | 用途 | 更新方式 |
|-----------|------|----------|
| `{需求名称}-{YYYYMMDD}-v{N}.md` | 变更快照，记录某次需求迭代的设计决策 | 禁止修改已有版本，变更时新建文件 |
| `{需求名称}-current.md` | 终版方案，反映当前代码的实际实现 | 随代码演进直接覆盖更新，无需保留历史 |

**终版文档规则：**
- 无版本号、无日期前缀，命名固定为 `{需求名称}-current.md`
- 内容结构与完整设计文档模板一致，但头部注明「最后更新日期」
- 每次代码变更后同步更新，保证与代码一致
- 存在 `current.md` 时，AI 编码优先读取 `current.md`（而非历史版本快照）

**查找优先级（第一步查找文档时）：**
1. `{需求名称}-current.md`（终版，优先）
2. `{需求名称}-{YYYYMMDD}-v{N}-coding.md`（最新版本编码摘要）
3. `{需求名称}-{YYYYMMDD}-v{N}.md`（最新版本完整文档）

---

## 合法的例外情况

以下情况可以**完全跳过**设计文档检查（不需要文档、也不需要调整流水）：

- 单元测试补充
- 配置文件修改（非业务规则相关）
- 与设计文档完全无关的纯 Bug 修复（如修字符串拼写、import 排序）
- 代码重构（不改变业务逻辑、不改变文档已声明的边界）

**与"轻量修订流水"的区别：**

| 改动性质 | 处理方式 |
|---------|---------|
| 设计文档已存在，且改动会影响文档已描述的业务规则/边界 | **第四·五步：轻量修订流水**（追加流水行） |
| 设计文档不存在或改动引入新功能/接口/类/字段 | **第三/五步：新建文档或新建 vN+1** |
| 改动与任何设计文档都无业务关系 | **本节：合法例外**（完全跳过） |

**判断标准：** 是否会让设计文档与代码的描述失真。如有疑问，按"轻量修订流水"处理（最低成本的留痕）。

---

## 与其他 Skill 的协作关系

| Skill | 何时调用 |
|-------|---------|
| `markdown-writing-standards` | 生成或修改设计文档中的 Mermaid 图表时，必须先调用进行语法自检 |
| `doc-index-required` | **Phase-A**：文档不存在时，创建文档**前**必须调用（读索引 + 边界分析）；**Phase-B**：文档写完**后**再次调用（更新索引）。前后两次缺一不可 |
| `pre-implementation-code-orientation` | 设计文档确认完毕、开始写第一行实现代码前调用 |
| `dev-log` | 本次会话中对设计文档有实质性变更时，会话结束前调用 |

---

## 红色警告

以下想法出现时立即停止，回到文档检查流程：

| 理由 | 正确处理 |
|------|----------|
| "需求很简单，不需要设计文档" | 简单功能的文档也可以简单，但不能没有 |
| "用户让我快点做" | 先确认文档，再快速实现 |
| "我已经理解需求了" | 理解 ≠ 文档存在，仍须检查 |
| "只改一个方法" | 判断是否属于例外情况，否则仍须检查 |
| "直接建文件，不用查索引" | 必须先调用 doc-index-required Phase-A，禁止跳过 |
| "先把草稿也放到 docs/design 里" | 未确认要团队共享的草稿必须放 `.ai-docs/`，正式文档才进入 `docs/design/` |
| "doc-index-required 会自动触发" | 不会。必须在本流程中显式调用 Phase-A 和 Phase-B，不依赖自动识别 |
| "子功能文件放父目录就行" | 子模块必须创建独立子目录，禁止将文件直接放在父需求目录下 |
| "设计文档确认了，直接写代码" | 还差一步：必须确认 `-coding.md` 存在后才能编码 |
| "coding 文档内容简单，不用生成" | 无论多简单，coding 文档是编码前的第二道强制门禁，不可跳过 |
| "用户让我根据文档直接改代码" | 有文档 ≠ 已完成设计文档检查，仍须先触发本 skill 确认文档合规，再走 coding.md 门禁 |
| "用户只是让我帮忙改一下代码，不是新需求" | 任何源码 Edit/Write 操作都必须先过本 skill，由本 skill 判断是否属于合法例外 |
| "用户已经提供了分析文档，可以直接编码" | 分析/梳理文档 ≠ 设计文档，仍须检查 `docs/design/` 下是否有对应的设计文档和 coding.md |
| "看着不大就走轻量模版吧" | 必须按第一·七步硬清单逐项判定，不允许凭感觉。命中任一升级触发条件立即升级到完整模版 |
| "轻量模版可以省略时序图" | 时序图是轻量模版的核心载体，省略后等于没有设计文档。缺图直接退回让用户补全 |
| "轻量分支没 coding.md，顺手生成一个吧" | 轻量分支显式不需要 coding.md，多生成一份只会让 token 浪费 + 后续维护双份。绝对不要主动生成 |
| "改动里要新增表，但其它都不大，走轻量算了" | 新增表是硬清单第 1 项 ❌，必须升级到完整模版 |
