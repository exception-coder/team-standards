# team-standards 插件开发规范

> 每次操作 skill 前必须阅读本文件，根据索引分析后再决策。

---

## Skill 主动触发规范

**Skill 必须主动触发，不等用户显式调用。** Claude 在以下场景必须自动识别并第一时间调用对应 Skill：

| 用户意图 | 必须第一时间调用 |
|---------|----------------|
| 用户提出具体想法/方案并要求实施，或要求按某个方案、回复、目录策略、架构路径、现有代码直接改 | `solution-review-required` |
| 提出任何新需求、重构计划、技术方案讨论、可行性分析 | `design-doc-required` |
| **请求修改/编写代码（含「根据文档改代码」「帮我改一下」等）** | `design-doc-required` |
| 报告 Bug、描述异常、请求分析问题根因 | `bug-doc-required` |
| 即将创建任何 Markdown 文档；或编辑 `docs/` 下任何文件 | `doc-index-required`（默认用户目录输出；仅用户指定 `docs/` 时更新索引） |
| 设计文档或 Bug 文档已确认，准备开始写第一行代码 | `pre-implementation-code-orientation` |
| **开始编写任何业务代码前（Java / React / Vue / Flutter）** | `architecture-ddd-lite-fullstack`（默认分层规则） |
| 执行 git commit 或生成提交信息 | `git-commit-standards` |
| 编写或审查 Java 代码 | `java-coding-standards` |
| 生成或修改包含 Mermaid 图表的 Markdown 内容；或完成 Markdown 文件的结构性写入/重组（新增/删除/重命名 ##、### 章节，或章节移动/合并） | `markdown-writing-standards` |
| 重构/复写/迁移前需要理解现有业务逻辑 | `business-logic-orientation` |
| Java 后端单服务需求分析前存在 `docs/knowledge-graph/backend/`，或要求生成/更新后端知识图谱，或会话中反复提及后端业务事实需要候选沉淀 | `backend-knowledge-graph-required` |
| **用户纠正了 AI 的编码写法（分层违规、命名错误等）** | `coding-violation-log` |
| **开始编写代码前（若项目存在 coding-violations.md）** | `coding-violation-log`（回顾模式） |
| **bug 修复 / 对齐云端 / 删冗余 / 任何源码改动** | `bugfix-coding-style`（禁变更日志注释；逻辑说明上提方法 doc） |
| **写 korepos / korepos-refund 后端接口**（shelf endpoint / handler / service / DAO / request-response DTO，路径含 `lib/features/{module}/backend/`）；用户说「加接口 / 加 endpoint / 写 backend 服务 / 实现服务端 / 按 UI 对接手册实现接口」 | `korepos-backend-service` |
| 项目代码结构变更后需要同步文档 | `project-docs-update` |
| Flutter 代码架构违规检查 | `arch-lint` |
| **跨项目定位 / 排查 / 调用链追踪（涉及 ≥2 个 kpay POS 生态工程）** | `cross-project-locator`（查询模式） |
| **即将写同时提到 ≥2 个 kpay POS 工程名的 markdown（对照 / 流程 / 数据流）** | `cross-project-locator`（登记模式） |
| 本次会话对 team-standards 做了决策型变更（新增/删除 Skill、触发时机或核心行为变化、规则方向反转、跨 Skill 链路变化、重大团队原则沉淀） | `dev-log`（会话结束前；普通小改只写 commit body） |
| **当前 git 仓库就是 team-standards 插件源码仓库，且插件自身变更完成后工作区存在未提交变更** | `git-commit-standards`（自动 stage / commit / push） |
| **业务项目源码有 Edit/Write 改动，或用户说「记一下工作日志」「记录一下」** | `daily-work-log` |
| **会话结束前若本会话有业务项目源码改动未登记** | `daily-work-log`（强制回补） |

**核心原则：** 触发时机是用户表达意图的那一刻，而不是开始动手的那一刻。收到需求就触发 `design-doc-required`，不要等到真的要写代码时才触发。

**兜底规则：** 若 Claude 即将对源码文件（`.java`、`.dart`、`.ts`、`.py`、`.kt` 等）执行 Edit/Write 操作，但当前会话尚未完成 `design-doc-required` 检查，必须立即停止并先触发该 skill。不存在「任务太简单可以跳过」的例外（Bug 修复、纯重构等合法例外在 skill 内部判断）。

**team-standards 收尾规则（仅限本插件源码仓库）：** 只有当当前 git 仓库就是 `team-standards` / `kpay-team-standards` 插件源码仓库，且变更对象是 `skills/`、`hooks/`、`.claude-plugin/`、`.codex-plugin/`、`AGENTS.md`、`CLAUDE.md`、`README.md`、`docs/skill-flow*`、`docs/dev-log/` 等插件自身文件时，才允许自动执行 `git status`、`git add -A`、`git commit`、`git push` 和插件版本号递增。业务项目即使安装了本 plugin，也绝不触发该自动收尾；业务项目提交仍按普通 `git-commit-standards` 流程等待用户确认。

---

## Skill 索引

| Skill 名称 | 目录 | 覆盖范围 | 关键词 |
|-----------|------|---------|--------|
| `solution-review-required` | `skills/solution-review-required/` | 用户提出具体方案或要求照某个想法、回复、目录策略、架构路径、现有代码实施时，先分离真实目标与候选方案，评估现有代码是否值得参考，识别风险、替代方案和更优建议，再决定是否实施；防止 AI 盲目照做、迎合用户或扩散低质量旧结构 | 方案审视、更优建议、想法、实施方案、不要盲从、反迎合、现有代码质量、代码惯性、风险评估、替代方案 |
| `design-doc-required` | `skills/design-doc-required/` | 编写代码前强制要求设计文档（新功能和 bug 修复均适用）；**模版分级**（轻量 `lightweight-template.md` 用于单接口/库表读写流程；完整 `template.md` 用于跨服务/新增表/复杂事务等）；硬清单兜底滥用；bug 修复简化版模板；文档存储结构；完整模版自动生成 coding-summary，轻量模版无需 coding.md | 设计文档、需求、方案、实现前、新功能、修复方案、实施方案、bug修复、轻量模版、接口级 |
| `architecture-ddd-lite-fullstack` | `skills/architecture-ddd-lite-fullstack/` | 编码前默认架构规则：DDD-lite 分层、Feature 模块化、单向依赖、原子能力沉淀；适配 Java Spring、React、Vue、Flutter；强制代码结构清晰、易维护、低耦合、高内聚，禁止 UI / Controller 直接写业务逻辑或访问 DB / HTTP | DDD-lite、分层架构、Feature、原子能力、UseCase、Application、Domain、Repository、Infrastructure、结构清晰、易维护、低耦合、高内聚、前端、Flutter、Spring |
| `git-commit-standards` | `skills/git-commit-standards/` | commit 类型前缀；中文 body；基于 diff 分析；Author 署名；team-standards 自动 push 仍受宿主命令授权策略约束 | 提交、commit、git、分支、push、授权 |
| `java-coding-standards` | `skills/java-coding-standards/` | 阿里巴巴黄山版 Java 规范：命名、格式、注释、OOP、集合、并发、异常、日志、数据库、安全 | Java、代码规范、命名、注释、异常、线程 |
| `doc-index-required` | `skills/doc-index-required/` | AI 生成 Markdown 默认写入用户 Documents 下的 `ai-docs/{project}/`；终版由用户自行上传，或用户明确指定 `docs/` 路径后才读取/更新索引 | 文档、docs、写文档、索引、输出路径、用户目录、Documents、终版文档 |
| `backend-knowledge-graph-required` | `skills/backend-knowledge-graph-required/` | Java 后端单服务知识图谱：按项目沉淀领域能力、原子能力、流程、表、枚举、API、外部依赖与代码坐标；需求分析前优先读取图谱；会话中反复提及的后端业务事实自动进入用户目录候选池，确认或代码验证后才更新正式图谱 | Java后端、知识图谱、单服务、候选沉淀、领域能力、原子能力、表、枚举、状态流转、ER图、API、Service |
| `bug-doc-required` | `skills/bug-doc-required/` | 编写 bug 分析文档前强制规范章节结构；核心流程必须包含 3 类 Mermaid 图（时序图、流程图、泳道图）；根因必须用表格；**默认输出路径走用户文档目录** `{USER_DOCUMENTS}/ai-docs/{project}/{agent}/{YYYY-MM-DD}/`，与 `design-doc-required` / `doc-index-required` 对齐，不直接写项目 `docs/bug/`；仅当用户明确指定项目内路径或要求"上传终版"时才进入 `docs/bug/` 并按模块分组（对齐 `docs/design/{模块名}/`，三级结构 `docs/bug/{模块名}/{bug名称}/{bug名称}.md`）；目录与文件名使用**中文**命名 | bug、缺陷、问题分析、bug文档、OOM、异常、模块分组、中文命名、用户目录、Documents、终版文档 |
| `pre-implementation-code-orientation` | `skills/pre-implementation-code-orientation/` | 实施前从 bug/设计文档的代码坐标表精准 Read 关键文件，禁止重新扫描 | 实施前、开始写代码、修复前、开发前、代码定位 |
| `dev-log` | `skills/dev-log/` | team-standards 决策型变更日志：仅记录新增/删除 Skill、触发时机或核心行为变化、规则方向反转、跨 Skill 链路变化、重大团队原则沉淀；普通小改、措辞同步、版本号递增默认由 git commit body 记录，不再写 dev-log | 开发日志、决策记录、重大规则、触发链路、规则方向反转、skill 修改、发版记录 |
| `init-project-docs` | `skills/init-project-docs/` | 渐进式构建项目知识图谱：Phase 1 核心文档（概要+架构+约束）→ Phase 2 映射文档（模块+数据模型+API+前后端映射+开发参考）→ Phase 3 流程与术语（业务流程+术语表+重构计划+变更记录）→ Phase 4 模块深度文档+技能卡；支持自动/确认两种模式 | 初始化项目文档、生成知识图谱、分析项目能力、生成项目概要、架构分析、init project docs、knowledge graph |
| `generate-project-profile` | `skills/generate-project-profile/` | 生成 AI Agent 消费的项目画像（project-profile.md）：10 维度结构化 Markdown，可独立向量化分片；覆盖项目概述、技术栈、结构、架构、数据模型、Service 能力、API 接口、外部依赖、配置、编码约定 | 项目画像、project profile、代码感知、扫描项目、AI 上下文、generate profile |
| `coding-violation-log` | `skills/coding-violation-log/` | 用户纠正编码错误时自动登记到 `docs/coding-violations.md`；编码前自动回顾已登记的违规记录，防止重犯 | 编码违规、纠正、分层违规、依赖方向、命名错误、规范错误、coding violation |
| `bugfix-coding-style` | `skills/bugfix-coding-style/` | **v1.17 起方向反转**：禁止把变更历史写进源码内（`[BUGFIX]`/`[DEPRECATED]`/`[ADDED]`/日期标记/PR 引用/注释保留旧代码全部禁止）；变更原因归 git log / commit message / bug 文档；代码内只保留对当下读者有价值的 WHY 注释，且优先上提到方法 / 类 doc comment；适用于所有源码改动（不限联调期），遇到旧 `[DEPRECATED]` / `[ADDED]` 标记可在改同段代码时顺手清理 | bug修复、对齐云端、删冗余、补缺漏、源码注释、变更日志禁令、方法 doc、WHY 注释、bugfix style |
| `project-docs-update` | `skills/project-docs-update/` | 知识图谱持续维护：检测代码结构变更（新增 Controller/Service/模块/数据表/API）与 docs/ 文档的差异，生成差异报告并执行更新；支持自动/确认模式 | 更新项目文档、同步知识图谱、文档过时、update project docs、sync knowledge graph |
| `arch-lint` | `skills/arch-lint/` | Flutter 架构违规检测：5 条规则（presentation 层禁 SQL/HTTP、domain 层禁技术框架、金额禁 double、DAO 不可被 presentation 直接调用）；全量检查 + 轻量自动检查两种模式 | 架构检查、arch lint、检测违规、分层违规、Flutter 架构 |
| `markdown-writing-standards` | `skills/markdown-writing-standards/` | Markdown 编写规范：Mermaid 图表语法（致命错误清单、各图类型骨架、自检清单）、表格、代码块、标题结构、目录结构复核（TOC Review — 分类混杂/重复/层级断层/交叉引用失效/快速导航判断） | Mermaid、mermaid、图表、流程图、时序图、mindmap、状态图、markdown、表格规范、目录结构、TOC、章节重构、目录复核 |
| `business-logic-orientation` | `skills/business-logic-orientation/` | 重构/复写/迁移前业务逻辑现状梳理：按场景维度产出 3 图（时序图/流程图/泳道图）+ 知识图谱 + 核心代码索引 + AI 速查索引；后端附加表操作矩阵和状态扭转明细 | 现状梳理、业务逻辑、重构前分析、知识图谱、逻辑梳理、场景分析、调用链分析、AI索引 |
| `cross-project-locator` | `skills/cross-project-locator/` | kpay POS 生态跨项目业务拓扑定位与登记：查询模式（按业务域/工程名路由到 `kpay-pos-topology/` 下 mapping 或 flows）+ 登记模式（拦截跨项目 markdown 的错误落盘位置，强制写入 `kpay-pos-topology/`）；路由入口是 `kpay-pos-topology/CLAUDE.md` § 查找索引表 | 跨项目、调用链、链路、定位、追踪、end-to-end、前后端追踪、korepos、bff、order-manage、接口对照、映射 |
| `daily-work-log` | `skills/daily-work-log/` | 业务项目每日工作日志：每次 Edit/Write 业务源码后写入 `{USER_DOCUMENTS}/ai-docs/{project}/work-log/{YYYY-MM-DD}.md`（用户文档目录、个人工时记录，不入项目仓），按 🐛 Bug 修复 / ✨ 功能开发 分两区；同 bug 多次修复合并同条目、同功能多轮迭代合并同条目；一行一条修改明细、带时间戳、动词开头；预估工时累计叠加（基础估值表 + 叠加项）；写入前必须 Read 当天日志合并现有条目；会话结束前若有未登记改动强制回补；默认路径与 `bug-doc-required` / `design-doc-required` 对齐于用户文档目录，不再写项目 `docs/`；仅当用户明确指定项目路径时才落项目目录；与 dev-log 分工：dev-log 作用于 team-standards 仓库、daily-work-log 作用于业务项目 | 工作日志、每日日志、工时、记录、work-log、daily-log、日报、登记、用户目录、Documents |
| `korepos-backend-service` | `skills/korepos-backend-service/` | korepos / korepos-refund 后端接口编写规范：目录结构（`endpoint / registry / dto / service / dao`，禁止新代码用 `application/data/domain` 老骨架）+ BackendInfra 门面边界（Service / DAO 内禁 `ref.read`，依赖通过构造器注入）+ **门面新旧分离原则**（`BackendInfra` 仅承载「旧实现防腐过渡」字段，注释清一色写「独立服务化：xxx 后改成 RPC」演进终点是字段被清空；从 0 写的「backend 内部基础设施」如云端 HTTP 客户端 / WS 推送 / 设备协议必须建独立子门面 + 平级 provider 注入，禁止挂在 `BackendInfra` 上让新旧混淆）+ UI 层泄漏拦截（不得 import 同 feature 的 `presentation / application / data / domain` 或其它 feature 非 backend 层）+ DTO 自闭环（freezed 副本，不复用 domain 模型）+ **一接口一 service 粒度规则**（每个 service 文件对应 1 个 endpoint，类内单一 public 方法 = handler 转发方法名，跨接口复用沉到 `service/{purpose}_orchestrator.dart`，service 之间禁止互相 import；命名 `{module}_{action}_service.dart`，存量 1:N 文件保持不动）+ **外部调用前的边界兜底校验**（service 调云端 HTTP / 跨子门面 / POS 硬件协议的金额/数量/配额等业务数值，必须用 DB 实读值做边界校验，不信任入参或前序内存对象；校验抽 `_assertXxxWithinBound` 私有方法；金额比较加 ±0.005 浮点容差）+ 8 步编写顺序 + 自检清单 + 常见红线 | 后端接口、backend、shelf、endpoint、handler、service、dao、加接口、写 backend 服务、实现服务端、UI 对接手册、一接口一 service、orchestrator、粒度、ACL 防腐蚀、门面新旧分离、独立子门面、BackendInfra 旧实现包装、新实现 port、capability port、健壮性、边界兜底、金额校验、DB 实读 |

---

## 辅助资源

| 文件 | 所属 Skill | 用途 |
|------|-----------|------|
| `skills/solution-review-required/SKILL.md` | solution-review-required | 用户提出具体方案并要求实施前的目标/方案分离、现有代码质量评估、风险识别与更优建议规则 |
| `skills/backend-knowledge-graph-required/SKILL.md` | backend-knowledge-graph-required | Java 后端单服务知识图谱的生成、读取、更新与会话沉淀规则 |
| `skills/design-doc-required/template.md` | design-doc-required | 18 节完整设计文档模板（跨服务/新增表/复杂事务场景） |
| `skills/design-doc-required/coding-template.md` | design-doc-required | 7 节精简编码摘要模板（仅完整模版需要） |
| `skills/design-doc-required/lightweight-template.md` | design-doc-required | 7 节接口级轻量模版（单接口库表读写流程；无需配套 coding.md） |
| `hooks/check-design-doc.cmd` | 可选 Hook | 设计文档校验脚本 — Windows（默认禁用） |
| `hooks/check-design-doc.sh` | 可选 Hook | 设计文档校验脚本 — macOS/Linux（默认禁用） |
| `skills/bug-doc-required/template.md` | bug-doc-required | bug 分析文档标准模板（6 节） |
| `skills/init-project-docs/overview-template.md` | init-project-docs | 项目概要文档模板（7 章节） |
| `skills/init-project-docs/architecture-template.md` | init-project-docs | 架构能力分析文档模板（7 章节） |
| `skills/init-project-docs/templates/00_project_overview.md` | init-project-docs | 知识图谱 AI 入口模板 |
| `skills/init-project-docs/templates/01_architecture_overview.md` | init-project-docs | 架构总览模板（多技术栈） |
| `skills/init-project-docs/templates/02_module_map.md` | init-project-docs | 模块地图模板 |
| `skills/init-project-docs/templates/03_business_flow_map.md` | init-project-docs | 业务流程地图模板 |
| `skills/init-project-docs/templates/04_data_model_map.md` | init-project-docs | 数据模型总表模板 |
| `skills/init-project-docs/templates/05_api_map.md` | init-project-docs | API 接口总表模板 |
| `skills/init-project-docs/templates/06_frontend_backend_mapping.md` | init-project-docs | 前后端映射表模板 |
| `skills/init-project-docs/templates/07_glossary.md` | init-project-docs | 业务术语表模板 |
| `skills/init-project-docs/templates/08_constraints_and_rules.md` | init-project-docs | 架构约束与红线模板 |
| `skills/init-project-docs/templates/09_refactor_plan.md` | init-project-docs | 重构路线图模板 |
| `skills/init-project-docs/templates/10_change_log.md` | init-project-docs | 变更记录 ADR 模板 |
| `skills/init-project-docs/templates/module_template.md` | init-project-docs | 模块深度文档模板（10 节） |
| `skills/init-project-docs/templates/flutter_skill.md` | init-project-docs | Flutter 技能卡模板 |
| `skills/init-project-docs/templates/vue_skill.md` | init-project-docs | Vue 技能卡模板 |
| `skills/init-project-docs/templates/springcloud_skill.md` | init-project-docs | Spring Cloud 技能卡模板 |
| `skills/markdown-writing-standards/mermaid-syntax-ref.md` | markdown-writing-standards | Mermaid 各图类型语法速查手册 |
| `skills/business-logic-orientation/template.md` | business-logic-orientation | 业务逻辑梳理文档模板（7+5 章节） |
| `skills/business-logic-orientation/ai-ref-template.md` | business-logic-orientation | AI 速查索引模板（7 章节，紧凑结构） |
| `skills/generate-project-profile/template.md` | generate-project-profile | 项目画像 10 维度 Markdown 模板 |

---

## 操作前决策流程

收到扩展或调整需求时，按以下顺序判断：

```
新需求进来
    │
    ├─ 关键词匹配已有 Skill？
    │       ├─ 是 → 在该 Skill 的 SKILL.md 中扩展内容
    │       └─ 否 ↓
    │
    ├─ 与多个已有 Skill 强相关？
    │       ├─ 是 → 评估是否合并，或在最相关的 Skill 中新增章节
    │       └─ 否 ↓
    │
    └─ 完全独立的规范领域？
            └─ 是 → 在 skills/ 下新建目录，创建 SKILL.md
```

---

## Skill 文件规范

### 目录结构
```
skills/
└── {skill-name}/           # kebab-case，与 frontmatter name 一致
    ├── SKILL.md            # 必须
    └── {辅助模板}.md       # 可选，由 SKILL.md 引用
```

### SKILL.md frontmatter 格式
```yaml
---
name: skill-name            # 唯一标识，kebab-case
description: 触发时机描述   # 明确说明何时 MUST 调用
---
```

---

## 维护规则

**每次新增或修改 Skill 后，必须同步更新本文件的 Skill 索引表：**
- 新增 Skill → 在索引表中追加一行，补充辅助资源表（如有）
- 修改 Skill 覆盖范围 → 更新对应行的「覆盖范围」和「关键词」列
- 删除 Skill → 从索引表和辅助资源表中移除对应行
- 新增辅助模板文件 → 在辅助资源表中追加

不更新索引视为操作未完成。

---

**每次修改 Skill 后，必须同步更新 `docs/skill-flow.md`：**

| 变更程度 | 操作 |
|---|---|
| 轻微（措辞调整、新增红色警告、补充说明） | 直接更新 `skill-flow.md` 中对应行或节点文字 |
| 较大（链路结构调整、skill 新增/删除、触发条件根本性变化） | 同时创建 `docs/skill-flow-{YYYYMMDD}-v{N}.md` 作为版本快照，并在 `skill-flow.md` 头部 blockquote 中更新"最后更新"和"历史版本"字段 |

**判断标准**：链路图的节点或连线发生变化 = 较大变更；只有文字描述变化 = 轻微变更。

不更新 skill-flow.md 视为操作未完成。

---

## 发版规则（push 前必须执行）

**每次 push 前，必须先更新 `.claude-plugin/plugin.json` 中的 `version` 字段，否则团队成员执行 `/plugin update` 无法检测到变更。**

版本号遵循语义化版本（SemVer），按变更类型递增：

| 变更类型 | 递增位 | 示例 |
|---------|--------|------|
| 新增 Skill、新增模板文件 | Minor（中位） | `1.1.0` → `1.2.0` |
| 修复 Skill 内容、调整措辞、补充规则 | Patch（末位） | `1.2.0` → `1.2.1` |
| 不兼容的结构变更（目录重组、Skill 重命名） | Major（首位） | `1.2.0` → `2.0.0` |

**发版检查清单（每次 push 前逐项确认）：**
1. `.claude-plugin/plugin.json` 的 `version` 已按上表递增
2. `.claude-plugin/marketplace.json` 中对应插件的 `version` 已同步递增（两处必须一致，插件系统以 marketplace.json 为基准判断是否有更新）
3. 本文件 Skill 索引表已同步（新增/修改/删除）
4. `docs/skill-flow.md` 已同步（链路结构变化时同时创建版本快照）
5. README.md 的「包含的 Skills」表已同步（如有新增 Skill）
