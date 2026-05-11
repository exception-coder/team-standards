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
| 即将创建任何 Markdown 文档；或编辑 `ai-docs/{project}/` / `docs/` 下任何文件 | `doc-index-required`（v1.20 起：用户目录知识库 `ai-docs/{project}/` 与项目 `docs/` 同等执行 Phase-A/B；仅 `work-log/` 日期型日志和索引文件本身豁免） |
| 设计文档或 Bug 文档已确认，准备开始写第一行代码 | `pre-implementation-code-orientation` |
| **开始编写任何业务代码前（Java / React / Vue / Flutter）** | `architecture-ddd-lite-fullstack`（默认分层规则） |
| **开始编写或修改任何源码前（任何语言：Java / TS / JS / Dart / Python / Kotlin / Go 等）** | `coding-standards-common`（通用 7 条铁律 + 注释三档；先于具体语言 skill） |
| **大改 git commit 之前**（>2 文件 或 >30 行 或 含新增/重命名/删除文件）；小改（≤2 文件 ∧ ≤30 行 ∧ 仅 `M` 修改）直接写 commit message 即可，hook 自动放行；git push 不门禁 | `git-commit-standards` |
| 编写或审查 Java 代码 | `java-coding-standards` |
| 生成或修改包含 Mermaid 图表的 Markdown 内容；或完成 Markdown 文件的结构性写入/重组（新增/删除/重命名 ##、### 章节，或章节移动/合并） | `markdown-writing-standards` |
| 重构/复写/迁移前需要理解现有业务逻辑 | `business-logic-orientation` |
| **即将 Write/Edit 任何描述后端表关系/ER/SQL/状态扭转/业务流程→表 CRUD 的 .md（无论路径，包括 `ai-docs/`、`work-log/`、`scenarios/`）**；用户问表关系、字段来源、业务怎么查、SQL 怎么写/完善、退款/账单/流水/分摊怎么算等表关系/SQL/状态/原子能力问题；AI 完成后端代码调查发现可复用事实或 SQL 查询逻辑；后端接口/服务开发前涉及表读写、SQL、状态判定、订单/退款/支付等业务逻辑；存在 `docs/knowledge-graph/backend/`；要求生成/更新后端知识图谱、全景 ER、SQL 归档或查询逻辑索引；**或同一会话同一技术主题（含子进程编排 / 并发 / 性能 / 资源争夺 / 外部依赖等非业务技术陷阱）用户反复疑问 ≥3 轮、出现回归性措辞（"为什么...还" / "怎么又..." / "上次说..." / "现在又卡了"）、修复后 ≥2 轮验证追问** | `backend-knowledge-graph-required` |
| **用户纠正了 AI 的编码写法（分层违规、命名错误等）** | `coding-violation-log` |
| **开始编写代码前（若项目存在 coding-violations.md）** | `coding-violation-log`（回顾模式） |
| **bug 修复 / 对齐云端 / 删冗余 / 任何源码改动** | `bugfix-coding-style`（源码只描述当前逻辑；禁变更日志注释；函数头不堆历史/设计摘要；复杂逻辑在对应代码块写短 WHY） |
| **写 korepos / korepos-refund 后端接口**（shelf endpoint / handler / service / DAO / request-response DTO，路径含 `lib/features/{module}/backend/`）；用户说「加接口 / 加 endpoint / 写 backend 服务 / 实现服务端 / 按 UI 对接手册实现接口」 | `korepos-backend-service` |
| 项目代码结构变更后需要同步文档 | `project-docs-update` |
| Flutter 代码架构违规检查 | `arch-lint` |
| **跨项目定位 / 排查 / 调用链追踪（涉及 ≥2 个 kpay POS 生态工程）** | `cross-project-locator`（查询模式） |
| **即将写同时提到 ≥2 个 kpay POS 工程名的 markdown（对照 / 流程 / 数据流）** | `cross-project-locator`（登记模式） |
| **PRD / 需求 / 设计 / 对话中出现 ≥1 个业务领域名词（订单 / 账单 / 退款 / 分摊 / 流水 / 快照 / 对账 等）且本项目术语表未登记**；用户与 AI 对同一名词使用了不同字面（「退货」vs「退款」、「分摊」vs「分配」）；AI 完成代码调查发现 ≥1 个业务术语 ↔ 代码命名映射；用户说「补术语 / 整理术语表 / 维护 glossary」；即将 Write/Edit 描述业务场景 / 业务流程 / 业务规则的 .md 含未登记术语 | `glossary-required` |
| **用户问反向影响类问题**（「加这个状态会破坏哪些旧逻辑」「这个字段哪里在用」「事件订阅清单」「这个 API 谁在调」「改这个会影响什么」）；AI 即将 Edit/Write 枚举定义 / 状态机 / DTO/Entity 字段定义 / 同步事件 payload / API endpoint 定义类源码；AI 完成 ≥1 项变更涉及枚举值 / 字段 / 事件 / API 的新增 / 修改 / 删除；项目存在 `docs/knowledge-graph/reverse-index/` 或用户目录候选池；用户说「建反向索引 / 扫反向影响 / 生成 reverse index / 冷启动反向索引」 | `reverse-index-required` |
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
| `design-doc-required` | `skills/design-doc-required/` | 编写代码前强制要求设计文档（新功能和 bug 修复均适用）；文档定位为方案/接口开发的简明编码依据，重点确认核心逻辑、关键规则、编码落点和风险点，避免复写项目全集资料；**三档模版分级**：（1）极简跳过（合法例外）—满足极简改动硬清单（≤2 文件 ∧ ≤30 行 ∧ 透传补漏/局部修正/dead code 清理等）时完全跳过文档，git commit body 承担变更说明；（2）轻量 `lightweight-template.md`—单接口自身流程/库表读写流程；（3）完整 `template.md`—超出轻量范围的方案/接口设计；图表遵循最小图原则，能一张图讲清就只画一张；**v1.20 起默认输出路径** `{USER_DOCUMENTS}/ai-docs/{project}/design/{需求名称}/{需求名称}-current.md`（无 `{agent}/`、无 `{YYYY-MM-DD}/`、文件名不带日期，由 `doc-index-required` Phase-A/B 管控）；Git 管理下项目正式文档默认维护稳定/current 文档，历史由 commit body 承担，版本快照仅用于重大基线、非 Git 文档或用户明确要求；完整模版自动生成 coding-summary，轻量/极简无需 coding.md | 设计文档、需求、方案、实现前、新功能、修复方案、实施方案、bug修复、极简跳过、透传补漏、轻量模版、接口级、简明扼要、核心逻辑、风险点、最小图、场景选图、current文档、Git历史、commit body 即变更说明、ai-docs、Phase-A、Phase-B |
| `architecture-ddd-lite-fullstack` | `skills/architecture-ddd-lite-fullstack/` | 编码前默认架构规则：DDD-lite 分层、Feature 模块化、单向依赖、原子能力沉淀；适配 Java Spring、React、Vue、Flutter；强制代码结构清晰、易维护、低耦合、高内聚，禁止 UI / Controller 直接写业务逻辑或访问 DB / HTTP；**新代码落点决策**（扩展现有功能时新代码必须放到新结构暴露 public 方法，旧文件只 +1 行调用，禁止在巨型方法 / 旧骨架文件里就地追加 N 行新逻辑）；**Service 业务动作扩展铁律——每个业务分支一个 focused service，任何新方法都不进 god service**：扩展既有 service 时不允许往多分支 god service（如 `OrderService` 同时承载 `refund`/`cancel`/`reject`）追加**任何** public 业务方法——新业务分支（`reverseCheckout`）→ 新建该分支的 focused service；同分支变种（`partialRefund`）→ 进该分支的 focused service（若分支仍散落在 god service 则新建并把既有方法+变种**一并迁过去**）；god service 最多保留 1 行 delegate 入口且禁止写任何业务逻辑；**跨分支编排**（同一回合调用 ≥2 个 focused service 时必须落到独立 `XxxOrchestrator` / `XxxSaga`，不进任一 focused service 内部，Controller 也不直接连续调用，O1-O4 触发条件：原子事务边界 / 顺序依赖 / 失败补偿 / 复合动作）；**横切关注点豁免**（日志/审计/权限/事务/metrics/缓存/限流走 AOP/拦截器/注解统一注入，focused service 内部不重复实现；`AuditAspect` / `LoggingInterceptor` 等横切实现类不算 god service）；**服务命名 taxonomy**（同一项目内 `XxxService` / `XxxUseCase` / `XxxCommandHandler` 三种叫法只选一种贯彻；Orchestrator / Saga 与 focused service 命名解耦；禁止 `XxxApplicationService` / `XxxManager` / `XxxHelper` 等模糊命名）；**聚合边界与事务一致性**（一个 `@Transactional` 只修改一个聚合根；跨聚合走 Domain Event / Saga；用 5 问判定 Refund 是 Order 聚合内动作还是独立聚合，模糊默认独立聚合） | DDD-lite、分层架构、Feature、原子能力、UseCase、Application、Domain、Repository、Infrastructure、结构清晰、易维护、低耦合、高内聚、前端、Flutter、Spring、新代码落点、strangler pattern、旧代码堆叠禁令、Service 业务动作扩展、新业务分支必拆、同分支变种必迁、反结账场景、partialRefund 场景、惯性追加禁令、focused sub-service、god service 零业务方法、1 行 delegate 入口、跨分支编排、Orchestrator、Saga、横切关注点豁免、AOP、拦截器、服务命名 taxonomy、CommandHandler、聚合边界、事务一致性、Domain Event、聚合 5 问 |
| `git-commit-standards` | `skills/git-commit-standards/` | commit 类型前缀；中文 body；基于 diff 分析；Author 署名；team-standards 自动 push 仍受宿主命令授权策略约束；**v1.18.1 起 hook 按改动大小判定**：`hooks/check-git-commit-skill.js` 看 staged diff，≤2 文件 ∧ ≤30 行 ∧ 仅 `M` 修改时放行（让模型自行写一句 commit message），其它情况未调用本 skill 时直接 exit 2 阻断；阈值可用 `TEAM_STANDARDS_TRIVIAL_FILES` / `TEAM_STANDARDS_TRIVIAL_LINES` 调整；git push 不门禁 | 提交、commit、git、分支、push、授权、hook、按改动大小放行 |
| `coding-standards-common` | `skills/coding-standards-common/` | **跨语言通用编码铁律 7 条 + 注释三档**：命名表意 / 函数原子（80 行硬阈值 + ≤4 参数 + ≤3 嵌套）/ 层次分明（单向依赖 + UI 禁直 SQL/HTTP）/ 零魔法值（DB 字段值与协议码强制枚举）/ **注释三档**（类 1-3 行 + 方法 1-2 行 + 核心块 1 行，禁变更日志 / 禁注释代码 / TODO 必带原因负责人）+ **§5.0 注释语言 = 当前会话沟通语言（沟通语言一票否决）**（用户用中文沟通即写中文注释，用户用英文即写英文；**无存量文件豁免**——不沿袭原文件语言，短期内单文件中英混杂可接受、待后续重构统一；唯一能覆盖默认的合法路径是用户在本会话明确要求特定语言）/ 异常不静默 / DRY rule of 3。任何源码 Edit/Write 前先满足本 skill 再走语言专属（java-coding-standards / korepos-backend-service 等） | 通用编码、跨语言、命名、函数原子、80 行、嵌套、层次分明、单向依赖、零魔法值、注释三档、注释语言、沟通语言、中文注释、英文注释、异常、DRY、rule of 3 |
| `java-coding-standards` | `skills/java-coding-standards/` | **阿里黄山版 Java 独占条款**（通用 7 条见 coding-standards-common）：Java 命名补充（POJO 布尔禁 is 前缀 / 接口方法禁 public）、Java 代码格式（大括号 / 120 字符）、Javadoc 语法、OOP（Integer == / BigDecimal / StringBuilder / @Override）、集合（Arrays.asList / Iterator / HashMap 容量 / entrySet）、并发（线程池 / SimpleDateFormat / ThreadLocal remove）、SLF4J 日志、关系库 SQL 规范、Java 安全（PreparedStatement） | Java、Javadoc、Integer 比较、BigDecimal、StringBuilder、HashMap 容量、SLF4J、SimpleDateFormat、ThreadLocal、@Override、阿里黄山版 |
| `doc-index-required` | `skills/doc-index-required/` | AI 生成 Markdown 默认写入用户 Documents 下的 `ai-docs/{project}/{type}/{topic}/{filename}`（无 `{agent}/`、无 `{YYYY-MM-DD}/`、文件名不带日期）；**v1.20 起用户目录知识库与项目 `docs/` 索引体系等同**，写文档前必须 Phase-A 读 INDEX 查重，写完必须 Phase-B 登记；`work-log/`（日期型日志）和 `knowledge-graph/`（自有 `00_index.md`）走自管模式；终版由用户自行上传或明确指定 `docs/` 路径后写入项目目录 | 文档、docs、写文档、索引、输出路径、用户目录、Documents、ai-docs、知识库、Phase-A、Phase-B、终版文档 |
| `backend-knowledge-graph-required` | `skills/backend-knowledge-graph-required/` | 后端单服务知识图谱 + **项目级技术难点图谱**（v1.21 扩展）：(1) 业务图谱按项目沉淀领域能力、原子能力、流程、表、全景 ER、SQL 查询逻辑、表关系、枚举、状态判定、API、外部依赖与代码坐标；(2) 技术难点图谱沉淀子进程编排、并发模型、性能瓶颈、资源争夺、外部依赖、JVM 进程生命周期、缓存键策略、超时回收等非业务技术陷阱；即将 Write/Edit 后端表关系/ER/SQL 文档必须先经本 skill；会话中提到业务、表、字段来源、SQL、DAO/Mapper 查询逻辑时必须自动归档 SQL 指纹到 `_sql_candidates.md`，整理时合并到 `09_sql_query_index.md` / `sql-queries/` / `02_data_model_map.md`；**长对话识别**——同一技术主题用户反复疑问 ≥3 轮 / 出现回归性措辞 / 修复后 ≥2 轮验证追问，自动追加 `分类: 技术难点` 候选记录，无需用户显式提醒；后端接口开发前回顾表逻辑索引、原子能力索引和 SQL 查询索引，优先复用已有表逻辑、SQL 和原子能力；编码后将 DAO/SQL、订单/退款/支付状态判定、金额聚合、表状态变更同步到正式图谱或用户目录候选池 | 后端、接口开发、知识图谱、单服务、全景ER、ER图、SQL归档、查询逻辑、SQL指纹、SQL索引、表逻辑、表关系、订单状态、部分退、退款判定、原子能力、DAO、Mapper、SQL、枚举、状态流转、候选沉淀、API、Service、技术难点、长对话识别、子进程、并发、性能、资源争夺、外部依赖、回归性措辞、反复疑问、验证追问 |
| `bug-doc-required` | `skills/bug-doc-required/` | 编写 bug 分析文档前强制规范章节结构；核心流程必须包含 3 类 Mermaid 图（时序图、流程图、泳道图）；根因必须用表格；**v1.20 起默认输出路径** `{USER_DOCUMENTS}/ai-docs/{project}/bug/{模块名}/{bug名称}/{bug名称}.md`（无 `{agent}/`、无 `{YYYY-MM-DD}/`、文件名不带日期；用户目录知识库与项目 `docs/bug/` 索引等同，必须执行 Phase-A/B）；模块名必须与同根下 `design/{模块名}/` 完全一致，无对应 design 模块时退化为一级扁平 `bug/{bug名称}/`；目录与文件名使用**中文**命名 | bug、缺陷、问题分析、bug文档、OOM、异常、模块分组、中文命名、用户目录、Documents、ai-docs、Phase-A、Phase-B |
| `pre-implementation-code-orientation` | `skills/pre-implementation-code-orientation/` | 实施前从 bug/设计文档的代码坐标表精准 Read 关键文件，禁止重新扫描 | 实施前、开始写代码、修复前、开发前、代码定位 |
| `dev-log` | `skills/dev-log/` | team-standards 决策型变更日志：仅记录新增/删除 Skill、触发时机或核心行为变化、规则方向反转、跨 Skill 链路变化、重大团队原则沉淀；普通小改、措辞同步、版本号递增默认由 git commit body 记录，不再写 dev-log | 开发日志、决策记录、重大规则、触发链路、规则方向反转、skill 修改、发版记录 |
| `init-project-docs` | `skills/init-project-docs/` | 渐进式构建项目知识图谱：Phase 1 核心文档（概要+架构+约束）→ Phase 2 映射文档（模块+数据模型+API+前后端映射+开发参考）→ Phase 3 流程与术语（业务流程+术语表+重构计划+变更记录）→ Phase 4 模块深度文档+技能卡；支持自动/确认两种模式 | 初始化项目文档、生成知识图谱、分析项目能力、生成项目概要、架构分析、init project docs、knowledge graph |
| `generate-project-profile` | `skills/generate-project-profile/` | 生成 AI Agent 消费的项目画像（project-profile.md）：10 维度结构化 Markdown，可独立向量化分片；覆盖项目概述、技术栈、结构、架构、数据模型、Service 能力、API 接口、外部依赖、配置、编码约定 | 项目画像、project profile、代码感知、扫描项目、AI 上下文、generate profile |
| `coding-violation-log` | `skills/coding-violation-log/` | 用户纠正编码错误时自动登记到 `docs/coding-violations.md`；编码前自动回顾已登记的违规记录，防止重犯 | 编码违规、纠正、分层违规、依赖方向、命名错误、规范错误、coding violation |
| `bugfix-coding-style` | `skills/bugfix-coding-style/` | **v1.17 起方向反转**：禁止把变更历史写进源码内（`[BUGFIX]`/`[DEPRECATED]`/`[ADDED]`/日期标记/PR 引用/注释保留旧代码全部禁止）；源码只描述当前正确逻辑，过气逻辑和变更原因归 git log / commit message，bug 文档 / 设计文档只沉淀长期业务事实；函数/类 doc comment 只写当前职责、输入输出语义、不变式和误用风险，禁止堆旧实现复盘、实现步骤流水、未来版本计划；复杂逻辑在对应代码块附近写 1-2 行 WHY 注释；适用于所有源码改动（不限联调期），遇到旧 `[DEPRECATED]` / `[ADDED]` 标记可在改同段代码时顺手清理 | bug修复、对齐云端、删冗余、补缺漏、源码注释、变更日志禁令、当前逻辑、函数头注释、短注释、WHY 注释、bugfix style |
| `project-docs-update` | `skills/project-docs-update/` | 知识图谱持续维护：检测代码结构变更（新增 Controller/Service/模块/数据表/API）与 docs/ 文档的差异，生成差异报告并执行更新；支持自动/确认模式 | 更新项目文档、同步知识图谱、文档过时、update project docs、sync knowledge graph |
| `arch-lint` | `skills/arch-lint/` | Flutter 架构违规检测：5 条规则（presentation 层禁 SQL/HTTP、domain 层禁技术框架、金额禁 double、DAO 不可被 presentation 直接调用）；全量检查 + 轻量自动检查两种模式 | 架构检查、arch lint、检测违规、分层违规、Flutter 架构 |
| `markdown-writing-standards` | `skills/markdown-writing-standards/` | Markdown 编写规范：Mermaid 图表语法（致命错误清单、各图类型骨架、自检清单）、表格、代码块、标题结构、目录结构复核（TOC Review — 分类混杂/重复/层级断层/交叉引用失效/快速导航判断） | Mermaid、mermaid、图表、流程图、时序图、mindmap、状态图、markdown、表格规范、目录结构、TOC、章节重构、目录复核 |
| `business-logic-orientation` | `skills/business-logic-orientation/` | 重构/复写/迁移前业务逻辑现状梳理：按场景维度产出 3 图（时序图/流程图/泳道图）+ 知识图谱 + 核心代码索引 + AI 速查索引；后端附加表操作矩阵和状态扭转明细；**v1.20 起默认输出路径** `{USER_DOCUMENTS}/ai-docs/{project}/orientation/{模块名}/{模块名}-现状梳理.md`（不带日期，始终更新最新现状），由 `doc-index-required` Phase-A/B 管控 | 现状梳理、业务逻辑、重构前分析、知识图谱、逻辑梳理、场景分析、调用链分析、AI索引、orientation |
| `cross-project-locator` | `skills/cross-project-locator/` | kpay POS 生态跨项目业务拓扑定位与登记：查询模式（按业务域/工程名路由到 `kpay-pos-topology/` 下 mapping 或 flows）+ 登记模式（拦截跨项目 markdown 的错误落盘位置，强制写入 `kpay-pos-topology/`）；路由入口是 `kpay-pos-topology/CLAUDE.md` § 查找索引表 | 跨项目、调用链、链路、定位、追踪、end-to-end、前后端追踪、korepos、bff、order-manage、接口对照、映射 |
| `glossary-required` | `skills/glossary-required/` | 业务术语会话级强制登记：日常对话 / PRD / 设计 / bug 文档中出现 ≥1 个业务领域名词（订单 / 账单 / 退款 / 分摊 / 流水 / 快照 / 对账等）且本项目术语表未登记时必须候选追加；用户与 AI 同义词错位（「退货」vs「退款」/「分摊」vs「分配」）必须主动对齐到规范术语；候选池 `{USER_DOCUMENTS}/ai-docs/{project}/glossary/_candidates.md`、正式版 `docs/knowledge-graph/glossary.md`；模板为精简五栏（中文名 / 英文标识 / 一行定义 / 同义词 / 关联代码坐标）；与 `init-project-docs/templates/07_glossary.md` 分工 — init 负责批量初始化完整版，本 skill 负责日常对话级增量；不收录通用编程概念（线程 / 缓存 / 事务，归 backend-knowledge-graph）和跨项目同名异叫法（归 cross-project-locator） | 业务术语、glossary、术语表、领域名词、同义词、口语化、规范术语、PRD 对齐、术语映射、退款 vs 退货、分摊 vs 分配、术语候选池 |
| `reverse-index-required` | `skills/reverse-index-required/` | 反向影响索引强制维护（4 类）：states.md（枚举 / 状态值 → 所有判断点 + 业务语义 + 新增态时是否需补判断）、fields.md（字段 → 读 / 写点 + 同步报文是否包含 + 改名风险）、events.md（同步事件 → 订阅场景 + 报文字段 + 消费方 + 接入清单）、apis.md（API → 调用方 + 入参 / 出参变更协同清单）；冷启动用 `node hooks/scan-reverse-index.js` 一次扫描产出 states.md 初版（V1 支持 Java / Dart / TS 枚举 + EnumName.VALUE 引用 + SQL 字面量候选；不识别 case 裸值 / 反射 / 配置文件，需人工补）；其余 3 类需人工填充；增量维护规则：每次变更枚举 / 字段 / 事件 / API 同回合必须回写反向索引；候选池 `{USER_DOCUMENTS}/ai-docs/{project}/knowledge-graph/reverse-index/`、正式版 `docs/knowledge-graph/reverse-index/`；与 `backend-knowledge-graph-required` 互补（正向 vs 反向）；与 `cross-project-locator` 边界（单服务内 vs 跨项目调用方） | 反向索引、reverse index、影响面分析、新增状态、状态判断点、字段读写、同步事件订阅、API 调用方、影响面、冷启动扫描、scan-reverse-index、新增态需补判断、case 漏补、变更冲击、回归性影响 |
| `daily-work-log` | `skills/daily-work-log/` | 业务项目每日工作日志：每次 Edit/Write 业务源码后写入 `{USER_DOCUMENTS}/ai-docs/{project}/work-log/{YYYY-MM-DD}.md`（用户文档目录、个人工时记录，不入项目仓），按 🐛 Bug 修复 / ✨ 功能开发 分两区；同 bug 多次修复合并同条目、同功能多轮迭代合并同条目；一行一条修改明细、带时间戳、动词开头；预估工时累计叠加（基础估值表 + 叠加项）；写入前必须 Read 当天日志合并现有条目；会话结束前若有未登记改动强制回补；默认路径与 `bug-doc-required` / `design-doc-required` 对齐于用户文档目录，不再写项目 `docs/`；仅当用户明确指定项目路径时才落项目目录；与 dev-log 分工：dev-log 作用于 team-standards 仓库、daily-work-log 作用于业务项目 | 工作日志、每日日志、工时、记录、work-log、daily-log、日报、登记、用户目录、Documents |
| `korepos-backend-service` | `skills/korepos-backend-service/` | korepos / korepos-refund 后端接口编写规范：目录结构（`endpoint / registry / dto / service / dao`，禁止新代码用 `application/data/domain` 老骨架）+ BackendInfra 门面边界（Service / DAO 内禁 `ref.read`，依赖通过构造器注入）+ **门面新旧分离原则**（`BackendInfra` 仅承载「旧实现防腐过渡」字段，注释清一色写「独立服务化：xxx 后改成 RPC」演进终点是字段被清空；从 0 写的「backend 内部基础设施」如云端 HTTP 客户端 / WS 推送 / 设备协议必须建独立子门面 + 平级 provider 注入，禁止挂在 `BackendInfra` 上让新旧混淆）+ UI 层泄漏拦截（不得 import 同 feature 的 `presentation / application / data / domain` 或其它 feature 非 backend 层）+ **DTO 注解强制约束（v1.22 起）**（`features/{module}/common/models/(request\|response)/*.dart` 下的 wire DTO 必须用 `@JsonSerializable(explicitToJson: true)`，禁止 `@freezed`；理由：项目无全局 `explicit_to_json`，freezed 默认 toJson 不递归会让 service 内部 Map 风格读 / 改嵌套子项时 cast 失败爆 `_TypeError`；wire DTO 不需要 freezed 的不可变 / copyWith / == 三件套；唯一例外是 sealed class / union types / pattern matching，需在文件头加 `// FREEZED-EXCEPTION:` 标记；`hooks/check-dto-annotation.js` PreToolUse Write/Edit/MultiEdit 阻断违规、不带 explicitToJson 的裸 `@JsonSerializable()` 也阻断）+ **DTO 字段类型强制约束（v1.22.1 起）**（Request / Response / Data 块所有字段必须声明唯一确定类型 — `String` / `int` / `double` / `bool` / 强类型子 DTO / 强类型 List / 强类型 Map；禁止用 `Object?` / `dynamic` / `Map<String, dynamic>` / `List<Map<String, dynamic>>` 容忍多分支不同形态；多形态融合一律在 service 层归一后再写入 DTO 固定类型字段；嵌套结构必须建强类型子 DTO，可空用 `Type?` 而非 `Object?`；典型反例：`calculate_refund_price_response.dart` 顶层金额 `Object?` + 嵌套块 `Map<String, dynamic>`；唯一例外是字段语义本身就是"任意 JSON"的扩展位/raw payload，需在 dartdoc 写明）+ **一接口一 service 粒度规则**（每个 service 文件对应 1 个 endpoint，类内单一 public 方法 = handler 转发方法名，跨接口复用沉到 `service/{purpose}_orchestrator.dart`，service 之间禁止互相 import；命名 `{module}_{action}_service.dart`，存量 1:N 文件保持不动）+ **外部调用前的边界兜底校验**（service 调云端 HTTP / 跨子门面 / POS 硬件协议的金额/数量/配额等业务数值，必须用 DB 实读值做边界校验，不信任入参或前序内存对象；校验抽 `_assertXxxWithinBound` 私有方法；金额比较加 ±0.005 浮点容差）+ **Service 禁裸 SQL / DAO 唯一容器**（service / orchestrator / handler / registry / internal 等任何文件均不得出现 `customSelect` / `select(table)` / `update(table)` / `delete(table)` / `into(table).insert` / `_db.batch` 等 drift 调用；`db.transaction()` 是 service 唯一例外但事务体内只能调 DAO 方法；SQL 一律封装到 `backend/dao/` 或 `common/backend_infra/daos/` 下原子方法）+ **最佳实践活范本**（以 `/confirm/refund/transaction` 链路 5 文件 — endpoint / request / response / service / DAO 调用 — 作为新接口的"参照拷贝"样板，注明 backendv2/dto 路径属历史遗留不得复制）+ **跨 feature 业务原子能力层**（`common/backend_infra/services/` 沉淀 ≥2 feature 共享的业务计算 / 组合查询；强制维护 `INDEX.md` 索引；写新 service 主流程前必查索引，已有则注入复用、禁止复制粘贴；命名不带 feature 前缀；与 daos 对偶但允许跨表组合 + 业务规则计算）+ **路径合规预检（第零步，必先于扫存量违规）**（编辑 backend 代码前必须先核对每个新建文件的目标路径是否符合 skill 当前规范：Request/Response DTO 必须落 `features/{module}/common/models/{request,response}/` 而非 `backend/dto/`；路由枚举必须落 `common/enums/endpoints/`；业务枚举必须落 `common/enums/business/`；**目录已存在不构成豁免**——禁止以"模块内一致性"为由把新 DTO 追加到已存在的 `backend/dto/`，禁止把新枚举值追加到已存在的 `backend/endpoint/{module}_endpoint.dart`；遇到错误推理（"目录存在算追加不算新增"/"skill 举例只有 refund/backendv2 我的模块不适用"）立即停下回到合规路径；预检不通过先调整路径再进入扫存量违规）+ **编辑 backend 代码前的违规自检前置**（即将 Edit/Write `lib/features/{module}/backend/` 或 `lib/common/backend_infra/` 下任何 .dart 文件时，必须先 grep 目标文件 + 同模块同层文件的存量违规 — 裸 SQL / 单方法 ≥80 行 / DB 字段值裸数字 / 裸 Exception，汇报清单后等用户三选一处置（暂留 / 顺手修 / 单独立项），未汇报直接动代码 = 流程违反）+ **Service 长方法必拆 `_xxxStep` 私有方法**（>80 行强制按业务步骤拆，主方法只做编排+事务+日志；与 internal/ 和 backend_infra/services/ 形成拆分梯度，禁止越级升级）+ **DB 字段值与枚举绑定**（任何与 DB 字段比较 / 过滤 / 写入 / 读取后判断的数字常量必须用枚举类引用，禁止 `item_type=1` / `state=3` 等裸数字字面量；新建枚举走 Step 1.5；违规登记 coding-violations.md）+ 8 步编写顺序 + 自检清单 + 常见红线 | 后端接口、backend、shelf、endpoint、handler、service、dao、加接口、写 backend 服务、实现服务端、UI 对接手册、一接口一 service、orchestrator、粒度、ACL 防腐蚀、门面新旧分离、独立子门面、BackendInfra 旧实现包装、新实现 port、capability port、健壮性、边界兜底、金额校验、DB 实读、Service 禁裸 SQL、DAO 唯一容器、customSelect 禁令、最佳实践活范本、跨feature 原子能力、backend_infra/services、INDEX 索引、原子能力沉淀、违规自检前置、长方法拆 step、80 行硬阈值、私有 step 方法、DB 字段值枚举绑定、魔法数字硬规则、路径合规预检、第零步、common/models 路径、common/enums/endpoints 路径、目录已存在不豁免、反 anti-pattern、模块内一致性 ≠ 历史缺陷豁免、DTO 字段类型强制、Object 禁令、dynamic 禁令、Map<String,dynamic> 禁令、多形态归一在 service、强类型子 DTO、可空用 Type? |

---

## 辅助资源

| 文件 | 所属 Skill | 用途 |
|------|-----------|------|
| `skills/solution-review-required/SKILL.md` | solution-review-required | 用户提出具体方案并要求实施前的目标/方案分离、现有代码质量评估、风险识别与更优建议规则 |
| `skills/backend-knowledge-graph-required/SKILL.md` | backend-knowledge-graph-required | 后端单服务知识图谱的生成、读取、表逻辑回顾、原子能力复用、更新与会话沉淀规则 |
| `skills/design-doc-required/template.md` | design-doc-required | 8 节方案/接口设计文档模板（核心逻辑、编码落点、风险点，超出轻量范围时使用） |
| `skills/design-doc-required/coding-template.md` | design-doc-required | 7 节精简编码摘要模板（仅完整模版需要） |
| `skills/design-doc-required/lightweight-template.md` | design-doc-required | 7 节接口级轻量模版（单接口自身流程 / 库表读写流程；无需配套 coding.md） |
| `hooks/check-design-doc.cmd` | 可选 Hook | 设计文档校验脚本 — Windows（默认禁用） |
| `hooks/check-design-doc.sh` | 可选 Hook | 设计文档校验脚本 — macOS/Linux（默认禁用） |
| `hooks/check-git-commit-skill.js` | git-commit-standards | git commit 前按 staged diff 大小判定的拦截脚本 — Node 跨平台（**默认启用**，小改放行 / 大改强制 skill；git push 不拦截） |
| `hooks/check-dto-annotation.js` | korepos-backend-service | wire DTO 注解校验脚本 — Node 跨平台（**默认启用**，PreToolUse Write/Edit/MultiEdit 拦截 `lib/features/*/common/models/(request\|response)/*.dart` 下的 `@freezed` 与裸 `@JsonSerializable()`；例外：文件头加 `// FREEZED-EXCEPTION:` 标记；环境变量 `TEAM_STANDARDS_DTO_HOOK=off` 临时禁用） |
| `hooks/scan-reverse-index.js` | reverse-index-required | 反向索引冷启动扫描器 — Node 跨平台（**默认未注册到 hooks.json,手工运行**），扫描 Java / Dart / TS 源码,识别 enum 定义 + `EnumName.VALUE` 引用 + SQL 字面量候选,产出 `states.md`,fields/events/apis 输出存根；用法 `node hooks/scan-reverse-index.js --project=. --output=./docs/knowledge-graph/reverse-index/`；输出选 `--output=user-candidates` 走用户文档目录候选池 |
| `skills/glossary-required/template.md` | glossary-required | 业务术语正表模板（精简五栏 + 业务域分类 + 同义词反向索引） |
| `skills/reverse-index-required/templates/states.md` | reverse-index-required | 状态/枚举反向索引模板（每枚举一 H2 + 判断点表格） |
| `skills/reverse-index-required/templates/fields.md` | reverse-index-required | 字段读写点反向索引模板（每表一 H2 + 读 / 写 / 同步报文列） |
| `skills/reverse-index-required/templates/events.md` | reverse-index-required | 同步事件订阅反向索引模板（事件 → 订阅场景 / 报文字段 / 消费方 / 接入清单） |
| `skills/reverse-index-required/templates/apis.md` | reverse-index-required | API 调用方反向索引模板（API → 调用方 / 契约 / 变更影响速查） |
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
| `skills/korepos-backend-service/README.md` | korepos-backend-service | skill 入口 / 5 分钟概览：skill 自身结构 + backend_infra 结构 + 接口落盘 5 处改动 + `/confirm/refund/transaction` 标准样板逐文件展开 + 红线快速回顾 + 路径速查 |
| `skills/korepos-backend-service/templates/init-verification-endpoint.md` | korepos-backend-service | 初始化 ping 验证端点模板（需求未定时起步用，common+backend 7 文件骨架） |
| `skills/korepos-backend-service/templates/ui-contract-template.md` | korepos-backend-service | UI 对接手册模板（前端契约文档，8 节结构） |
| `skills/korepos-backend-service/templates/test-service-smoke-template.md` | korepos-backend-service | service smoke test 模板（Step 9 联调辅助） |

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

**每次修改 Skill 后,必须同步更新 `docs/skill-flow.md` 本体(链路图 / Skill 总览 / FAQ):**

| 变更程度 | 操作 |
|---|---|
| 轻微(措辞调整、新增红色警告、补充说明) | 直接更新 `skill-flow.md` 中对应行或节点文字 |
| 较大(链路结构调整、skill 新增/删除、触发条件根本性变化) | 直接更新 `skill-flow.md`(链路图节点 + Skill 总览表 + FAQ) |

**判断标准**:链路图的节点或连线发生变化 = 较大变更;只有文字描述变化 = 轻微变更。**判断结果只用于决定是否同时调 dev-log 记录长期决策背景,不触发任何文件式变更档(快照 / 头部 changelog 段都不建)。**

**为什么 skill-flow.md 不留任何文件式变更档(v21.1 / v21.2 规则反转)**:`skill-flow.md` 在 git 仓库内,任何变更摘要 + 历史版本都已由 git log + commit body + `git show` 提供:
- v21.1 删除 `docs/skill-flow-{YYYYMMDD}-v{N}.md` 快照
- v21.2 删除 skill-flow.md 头部 blockquote 中累加的「变更摘要 vN」段

每次改动的"为什么"写到 git commit body;长期决策背景写到 `docs/dev-log/`(由 dev-log skill 控制门槛)。同一原则 v18.2 已应用于设计文档(current.md + git log)。需要查某历史版本:`git log --follow docs/skill-flow.md` 找 commit → `git show <sha>:docs/skill-flow.md`。

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
4. `docs/skill-flow.md` 已同步（直接更新,不再建文件式快照）
5. README.md 的「包含的 Skills」表已同步（如有新增 Skill）
