# team-standards 插件开发规范

以最小复杂度，持续交付可靠、可维护的软件。项目约定优先；共同准则见[工程宪法](plugins/team-standards/skills/change-readiness/references/engineering-principles.md)。本文件约束套件维护，业务项目不需要复制本入口。

## 最短执行路径

- 按当前意图选择一个主 Skill 推进；必要专项只补缺口，不串行重走各自的准备、分析和验收。已读且仍适用的规则复用，不遍历下方全部入口或递归读取所有链接。
- 已授权开发复用项目优先的 openspec-auto 判断：L1 直接实施验证，L2 简短计划，L3 使用项目 OpenSpec；高风险仍强制 L3。规格、设计与验证各按实际影响维护，不另填 S/M/L 表或新建空 change。
- 先确定目标文件；无依赖的搜索、读取在工具支持时批量执行，控制输出范围。已有证据充分即实施；仅输入、风险或目标变化时补查，不为提高主观信心重复扫描。
- 复用同一任务的判断、定位和有效验证；必要进度更新合并表达，不因 Skill 切换再次汇报。最终说明改动、实际验证和未完成项；不重复陈述未变的分级或“无文档影响”。
- 安全、权限、业务不变量及项目要求的验证保留。根据当前输入与影响选择相关测试，不因提交或轮次切换重跑；输入改变时补受影响检查。
- 插件不注册 SessionStart、就绪写前或交付 Stop 门禁；绑定、治理 JSON、Forge PASS 缺失不单独阻止作业。项目明确采用的 CI、宿主权限与治理协议继续生效。
- 文档按现有归属原位更新；设计表达、图件与交接细则在对应 Skill 按需读。完整能力与流程导航见 [skill-flow](docs/skill-flow.md)，不在本入口重复维护资源目录。

### Forge 架构套件联动维护

本节仅约束套件源码维护，不将 Forge 项目路径写进通用插件。涉及 Forge 联动的组件职责、规格/概设详设触发、上下文或证据流、任务分支策略、MCP/Hook 门禁及验证交付生命周期发生重大变化时，必须在同次作业中同步关联 Forge 仓库的 `docs/ai-coding-architecture.md`，包括受影响正文、流程图和能力边界，并分别提交关联仓改动。该文件是整体协作说明的唯一权威载体；具体触发与豁免遵从其“维护契约”，不复制另一份套件总架构。

普通修复、措辞或不改变联动契约的内部调整，在提交正文说明无架构影响即可。关联 Forge 仓库不可访问时明确待同步项，不宣称整套交付完成；无需用户重复提出更新文档，不额外授予重启或发布权限。

## 意图、授权与风险

按“目标意图 → 已有授权与具体操作副作用 → 影响风险 → 主 Skill → 必要阶段与交付”判断。四类意图用于理解结果，不直接授予权限、不直接指定 S/M/L，也不要求用户做四选一。

| 意图 | 目标与主入口 |
|---|---|
| 修复 Repair | 恢复预期行为，进入 bug-doc-required；区分只调查与已授权修复 |
| 演进 Evolve | 功能、纯重构、性能提升及规则维护；实施前进入 change-readiness，纯文档编辑直接使用文档规范 |
| 接入 Bootstrap | init-project-docs 的状态检查、初始化、配置或刷新；status 不自动升级为 init |

- 结合当前请求、上下文和已有授权理解目标，不以单个关键词决定实施。“评估是否迁移”不自动创建实施 change；“查明并修复”已包含调查和修复授权，证据与实施依据充分后连续推进。
- 按具体操作的副作用、可逆性、目标环境与数据范围判断边界。只读查询也可能有生产负载或敏感信息风险；Shell 既能查询也能修改，READ/WRITE/EXECUTE 标签不能替代操作判断。
- 风险独立评估。探查不默认 S，修复不默认可写或免规格，接入不自动获得业务代码、部署或外部写入授权。已有明确授权持续有效；仅对超出范围、尚未授权的破坏性操作、未决业务选择或无法消除的歧义补充确认，不因 M/L 或阶段切换重复审批。
- 纯重构以可观察行为、接口、状态、数据与依赖事实判断；使用相关回归或必要的特征测试验证，不凭自称免门禁，也不一律增加 PRD 或 AST 检查。OpenSpec 与风险简化路径仍按 change-readiness 执行。
- 探查默认直接交付答案与证据，不改项目、不创建实施 artifacts。用户要求文档或确有长期复用价值时在授权范围内维护唯一载体；不为分类结果新建报告。特定平台已有证据账本协议仍遵守，不复制另一份报告。
- 提交、日志、文档同步和验证是交付动作；用户单独请求时直接进入对应 Skill。混合任务按证据推进阶段，完成当前授权范围即可交付，不强行进入后续实施。
- 这些是 Agent 路由义务，不是物理隔离。Hook 受宿主与工具覆盖限制；真实访问限制由宿主权限、凭据和沙箱落实，不能声称仅拦 Edit/Write 就阻止了所有副作用。

## 主动触发表

此表用于按意图选择能力，不要求每次 Edit/Write 重读全部规范。已有依据充分时直接实施，辅助 Skill 仅在遇到对应问题时展开。

| 用户意图或动作 | 调用 Skill / 模式 |
|---|---|
| 功能名代替需求、方案取舍、阶段规划或担心过度设计 | `architecture-reasoning`（悟道）；分清目标、候选实现和约束，再判断最小充分方案；明确小改不加阶段 |
| 面向人的说明、去套话或要求说人话 | `plain-writing`（人话）；按载体改表达，保护事实和技术决策 |
| 跨项目规划或估算 | 使用项目声明的证据源；Forge 专属协议不在通用插件内 |
| 初始化设计系统、评审视觉一致性或记录明确视觉偏好 | `frontend-excellence` 的对应模式；已有设计资产优先 |
| 业务术语歧义 | `business-logic-orientation` 的术语模式 |
| 用户要求批量清理注释或纠正规范 | `coding-standards-common` 的对应模式 |
| 交接给其他系统、团队或 AI | `cross-system-handoff`；区分已完成与待办，末段总结交接目的、各方待办与完成标志；用户明确选择及项目规则优先 |
| 用户要求工作汇总 | `git-commit-standards` 的工作汇总模式 |
| 已授权实施的方案、需求、重构或源码修改 | 项目优先的 `openspec-auto` 分级；`change-readiness` 准备实施，不重复分类 |
| 只咨询方案可行性、审查或影响 | 按问题对象探查；不自动进入实施 |
| 报告 Bug、异常、超时、错误行为；或明确要求修复 | `bug-doc-required` |
| 重构、复写、迁移前理解现有业务 | `business-logic-orientation` |
| 从原始代码和数据库还原业务模型，或按业务问题补本体、关系、状态和口径 | `business-ontology-modeling`；优先复用Graphify及数据库工具，按需叠加现状理解、后端证据和变更准备 |
| 开始写业务代码 | `architecture-ddd-lite-fullstack` |
| 任何源码 Edit/Write | `coding-standards-common` |
| Java 源码 | `java-coding-standards` |
| Go 源码 | `go-coding-standards`；业务代码叠加 DDD-lite 的 Go 章节 |
| LLM SDK、Agent、Prompt、工具调用或结构化模型输出 | `llm-agent-coding-standards` |
| 页面复杂、不直观，或表单、审批、搜索、导航及移动交互优化 | `frontend-excellence` → 交互设计模式；先识别任务与决策，再选模式并复用关键路径验证 |
| 创建、重做或显著提升生产 Web 前端 | `frontend-excellence`；视觉一致性复用 `frontend-excellence` 的设计系统模式 |
| Web 业务图表、指标概览、管理看板创建、改造或选图评审 | `business-visualization-advisor`；先业务语义与信息设计，再视觉系统和前端实现；优化统计总览/看板时编码前形成目的—指标—图表—行动映射及选图清单，完成前反向验证业务改善 |
| 后端表、SQL、状态、字段、事件、API、领域闭环或查询性能 | `backend-evidence` |
| 编写或精简概设详设 | `clear-design-docs` 配合现有设计内容契约 |
| 项目过会、方案宣讲、汇总功能清单与设计供讨论 | `clear-design-docs` 的过会模式；按业务块配原型、对象本体与表模型、draw.io逻辑图/时序图，问题放在对应块下 |
| 设计数据库模型、结构、索引或数据演进 | [database-design](plugins/team-standards/skills/database-design/SKILL.md) |
| 解释技术原理，或设计模块、接口、流程与事务的业务实现 | [technical-implementation-design](plugins/team-standards/skills/technical-implementation-design/SKILL.md) |
| 根据需求、原型或页面制定交付计划，或按计划续接 | [page-delivery-plan](plugins/team-standards/skills/page-delivery-plan/SKILL.md)；维护功能编号、批次依赖、验收与当前进展 |
| 绘制、重绘或美化架构说明图，包括 draw.io/drawio | `architecture-diagram-design`；统一信息提炼、三级视图、视觉语言、原生模板与轻量验收；文档正文仍按 `clear-design-docs` |
| 独立评审概设、详设、技术方案或实施方案 | `clear-design-docs` 的独立评审模式；获授权改写时使用同入口编写模式 |
| 编写、精简、同步或发布项目文档，包括方案、过会稿、Quickstart 和交接 | `markdown-writing-standards` 先选文档类型和读者；区分技术原理、业务实现、过会决策与科普理念；出版物模式只辅助表达，不限制实现深度 |
| 初始化 AI 工程结构/AI 目录；初始化新项目、一键 onboard、接入新系统；或刷新上下文状态 | `init-project-docs` |
| 可执行改动完成、准备最终回复 | `delivery-verification` |
| 本次作业完成且有可提交改动；任何 git commit 或生成提交信息 | `git-commit-standards` |

图文技术方案复用[统一 TDD 表达](plugins/team-standards/skills/markdown-writing-standards/references/technical-design.md)：架构、流程与数据关系按需分图，短表和关键实现承接细节，图源按项目与载体选择，不新增日常文档门禁。

明确初始化或维护知识图谱时，按[企业知识大纲](plugins/team-standards/skills/business-ontology-modeling/references/enterprise-knowledge-schema.md)统一八视图与上下文十项，项目两个引擎入口引用同一冻结版本；复用[标准知识图谱合同](plugins/team-standards/skills/business-ontology-modeling/references/knowledge-graph-output.md)，交付 RDF、证据基线、SHACL 与可读视图；普通初始化保持轻量，业务来源、结构化语义与派生图各自归属明确。

## 本仓维护

新增/移除 Skill 或改变核心规则时按 [决策记录](docs/maintenance/decision-log.md) 留下原因；此规则仅适用于套件维护。Forge 专属协议保留在 [平台集成区](docs/platform-integrations/planning-evidence-discovery/SKILL.md)，不作为通用插件能力加载。

## 插件维护规则

1. 新增、删除或改变 Skill 核心行为时，同步本文件、`README.md`、`docs/skill-flow.md` 和 `docs/dev-log/{YYYY-MM-DD}.md`。
2. `AGENTS.md` 由本文件生成；修改后运行 `node scripts/sync-agents.js`，不要直接编辑 `AGENTS.md`。
3. 破坏性删除或重命名递增 Major；三个 manifest 版本必须一致：marketplace、Claude plugin、Codex plugin。
4. 项目专属编码规范、URL 路由、模块脚手架、架构 lint 和跨项目生态拓扑不进入本插件。
5. 辅助细则放 `references/`，必要的可复用资产放 `templates/` 或 `assets/`；能够引用权威来源时不创建模板副本，只有用户意图级入口才建立独立 Skill。
   共同原则优先引用工程宪法；新增固定步骤、模板或强制措辞须说明所保护的具体契约或风险，不能把单个案例推广成所有任务的默认流程。
6. 每次套件更新按文档同步规则检查中文与英文 README、组件版本与数量、用法、流程和套件总览；受影响文档在同次作业中修正。完成验证后自动提交本次改动，不积压；明确禁止提交、无改动或验证失败等例外按提交 Skill 处理。

## 发版校验

本地按 [delivery-verification](plugins/team-standards/skills/delivery-verification/SKILL.md) 的变更影响表选择检查；CI 保留以下完整回归。Skill 指令不是纯说明，资源移动需安装测试，影响不明时扩大验证。

```bash
(cd plugins/team-standards/hooks && npm run test:full) && \
node scripts/sync-agents.js --check && \
node scripts/check-cross-refs.js && \
node scripts/check-version-sync.js && \
node scripts/audit-skills.js --warnings --ci
```


日常快测使用 `npm run test:fast --prefix plugins/team-standards/hooks`，仅检查轻量契约，不能替代变更相关集成测试。维护脚本回归使用 `node --test scripts/tests/workspace-maintenance.test.mjs`。临时输出只放仓库根 `.logs/`、`.tmp/` 或系统临时目录，不放插件载荷和工程顶层。

跨仓共享源与消费者路径唯一登记在 `scripts/shared-contracts.mjs`；先运行 `scripts/sync-shared-contracts.mjs --workspace <team-tools>` 预览，明确写入时加 `--write`，拒绝覆盖消费者未提交改动。消费者变更仍按自身运行载荷升版、验证和提交。维护根总览时先运行 `scripts/sync-workspace-overview.mjs --workspace <team-tools> --write`，再通过 `scripts/check-version-sync.js --workspace <team-tools>` 校验。详细边界以 README 维护章节为准。

## Existing Spec Resolution

已有功能变更在创建 Capability/Delta 前按[解析协议](plugins/team-standards/skills/change-readiness/references/existing-spec-resolution.md)找回 Requirement。薄 Hook 调用已配置的外部 resolver，不复制 Graphify 或规格分类算法；默认 warn，真实宿主验收后启用 block。

## 项目内知识维护

init-project-docs 将业务知识留在所属项目现有文档或 docs/domain，随实现提交；同主题只维护一个正文。新项目不依赖集中 Domain Knowledge，不要求全模块候选。cross-topology 只维护跨项目连接及来源引用。

## 业务知识自动维护

新增 `business-knowledge-maintenance`，见 [业务知识维护](plugins/team-standards/skills/business-knowledge-maintenance/SKILL.md)：仅在业务语义变化时维护项目内 Markdown + 轻量 YAML，保留可信度和来源。五类内容按需创建，已有正文原位更新；默认检索源码用定向搜索、LSP 和 Git，Graphify 可选。初始化默认整理现有业务知识，复用文档、从代码补缺并标待确认，交付一张 draw.io 全景图及同源预览；结构脚本只负责补入口。后续随业务语义变化原位维护正文与图，OpenSpec/Graphify 按需，RAG 索引可重建。

## 可选独立试点包

明确启用 Ponytail 试点时使用 [yoooni-ponytail](plugins/yoooni-ponytail/skills/yoooni-ponytail/SKILL.md)，引入上游原版核心并应用 Yoooni 边界。该包独立安装、任务内显式生效，不加入通用主动触发链；原版素材不作为第二个 Skill 注册。维护与试点见[包说明](plugins/yoooni-ponytail/README.md)。
