# Skill 链路全景图

4.11.0 起，change-readiness 与 delivery-verification 默认提供开发和验证引导。插件不再注册 SessionStart、规格/就绪写前检查及交付 Stop 检查；缺少绑定、指纹、治理 JSON 或 Forge PASS 不单独阻止作业。真实失败与未验证项仍如实报告，项目独立配置的 CI、权限和 Forge 门禁由项目决定。

已授权业务开发按实际影响维护设计；明确采用绑定治理的项目使用[设计发现、补建、绑定、同步与验证](../plugins/team-standards/skills/change-readiness/references/automatic-design-maintenance.md)。Agent 负责真实内容，内部入口安全合并绑定；纯咨询只读，普通开发不因插件存在而初始化治理。

概设按业务读者组织八章，详设按稳定功能编号组织九项；固定结构按影响裁剪深度，规划、实现、验证与上线分开。业务内容治理沿用既有绑定与生命周期，可选 content v1 渐进接入；机器检查结构、关联与新鲜度，具名审阅判断业务表达及设计正确性。详见[内容契约与完整样衣示例](../plugins/team-standards/skills/change-readiness/references/design-output-contract.md)。

模块当前概设/详设与活动 change 分别维护已实现基线和独立目标增量。每次功能变更核对影响，已验证切片交付前同步相关当前章节；模块绑定、指纹和接入统一采用 [当前设计基线协议](../plugins/team-standards/skills/change-readiness/references/current-design-baseline.md)，不把整模块追加到永久 change，也不把规划或代码完成写成生产部署。

本文件将任务链路映射到实际源码：每一步读哪些规则、哪些入口会执行、结果落在哪里。它是源码导航，不是另一套运行时路由器；执行规则以各 Skill 的 `SKILL.md` 为准。

生产 Web UI 的页面层级、信息密度、移动首屏、容器与滚动审查由 `frontend-excellence` 的[企业 UI 失败模式和 Eval](../plugins/team-standards/skills/frontend-excellence/references/enterprise-ui-failure-patterns.md)承接；业务图表与 NO CHART 由 `business-visualization-advisor` 判定。历史提交提供案例，不构成已部署机械 Gate 的证据。

导航：[总流程](#总流程) · [节点与源码](#总图节点对应哪些源码) · [目录结构](#先分清四种目录) · [Skill 文件索引](#全部-skill-的规则文件索引) · [执行调用链](#真正执行程序的调用链) · [目标项目与外部服务](#目标项目与外部服务中的内容) · [修改入口速查](#想改某个行为时从哪里下手) · [路由场景](#易混淆请求的预期路由)

OpenSpec 文档推进由 change-readiness 的 [生命周期参考](../plugins/team-standards/skills/change-readiness/references/openspec-lifecycle.md) 统一维护阶段准出、评审回写、设计视图及续跑交接。delivery-verification 完成真实验证后，按 [治理检查器协议](../plugins/team-standards/skills/change-readiness/references/governance-checker.md) 记录并检查本切片；同步与归档继续调用官方 OpenSpec。旧治理适配器不再默认注册，需要时由项目自行接入。

整套组件、工程职责域及全部节点的输入输出见 [套件全景](suite-panorama.md)；本文保留任务路由和阶段规则。

21 个 Skill 的共同准则与证据分工统一引用[工程宪法](../plugins/team-standards/skills/change-readiness/references/engineering-principles.md)，入口保留专项判断、必要约束及精炼反例，参考承接具体格式和操作合同。功能名代替目标或方案未定时，由[悟道](../plugins/team-standards/skills/architecture-reasoning/SKILL.md)核实结果、约束与最小充分方案，再按实际影响推进。入口结构不是用户回复模板；[条件与反例](../plugins/team-standards/skills/architecture-reasoning/references/examples.md)用于校准判断。

## 执行适配源码导航

4.8.0 的运行时调用方法以[执行适配协议](../plugins/team-standards/skills/change-readiness/references/execution-adapter.md)为准。认知与任务方法留在 Skill，组织执行策略归 Forge，宿主 Hook 只适配事件与协议。纯咨询通过只读会话/候选查询结束，不创建执行绑定。

| 维护对象 | 源码入口 |
|---|---|
| 可选启动上下文 | `hooks/session-init.js` → Forge `session_init` |
| 候选探索 | Agent → Forge `resolve_execution_context`，定位后保存 discovery |
| 可选项目写前/提交前策略 | `hooks/check-spec-resolution.js` → `hooks/forge/client.js` → Forge `check_execution_event` |
| 可选项目 Stop 与兼容设计检查 | `hooks/check-openspec-governance.js` 消费 Forge 的 `legacyGovernanceRequired` |
| 旧 Forge runtime | `hooks/forge/legacy-v1.js`，不向新版分支继续复制状态读取 |

## 总流程

[可编辑 draw.io（两页）](diagrams/team-standards-execution.drawio)

图件验证：draw.io 31.5.3.0 原生导出两页 PNG，并逐页目视核对文字、图标和连线；XML 节点及引用检查通过。桌面自动化读取最小化窗口失败，尚未完成鼠标编辑抽查。

第一页面向任务推进，第二页展开全部 21 个 Skill 与实际 Hook。实线表示任务推进，虚线表示按需引用和风险反馈；箭头不表示每个节点都启动脚本。

![轻量执行主线](diagrams/team-standards-execution.png)

![按需能力与实际门禁](diagrams/team-standards-capabilities.png)

## 总图节点对应哪些源码

| 图节点 | 规则与实现 | 实际行为 |
|---|---|---|
| 01 用户目标 / 02 Agent 判断 | 项目 AGENTS、CLAUDE 及匹配 Skill | 复用当前上下文与授权；咨询审查交付结论，实施任务继续 |
| 03 自动分级 | [openspec-auto](../plugins/team-standards/skills/openspec-auto/SKILL.md) | 项目版本优先；选择 L1/L2/L3；仅 L3 或项目明确要求时进入完整 OpenSpec |
| 04 最小充分实施 | change-readiness、架构、语言、前端专项 Skill | 补查相关证据，按范围实施；初始化仅在明确请求时执行 |
| 05 相称验证 | delivery-verification、项目 SQL/API Gate 与测试 | 按真实风险验证，复用新鲜证据；风险扩大回到分级 |
| 06 交付 | markdown-writing-standards、git-commit-standards | 同步受影响说明，报告验证与缺口；提交和推送分别按授权 |
| 实际 Hook | [hooks.json](../plugins/team-standards/hooks/hooks.json) | 写前默认提醒、提交消息检查及用户消息信号；宿主必须真实接入才执行 |
| 可选执行增强 | Forge 与项目 CI/治理配置 | 保留已采用策略；插件存在本身不初始化治理 |

## 轻量与高效审查（2026-10-31）

本节记录 4.16.0 审查基线（23 个入口）；5.0.0 将其收敛为 21 个，独立设计评审与设计系统分别合入 clear-design-docs、frontend-excellence，复用分级与有效证据。5.0.1 补齐普通文档预筛选、公平基准及 Forge 启动适配源码；运行部署与业务验收仍分开记录。

**结论：4.16.0 核心规则符合工程宪法的方向，路由表述、宿主适配和写前开销仍需收敛。** 当时核查 23 个 Skill 主入口、实际注册 Hook、分级适配器及 Forge 对接说明。未穷尽全部参考文件，也未重验所有宿主；已有 Graphify 指纹与当前文件不一致，仅用于定位，结论以当前源码为据。

### 已落实的力度

- `openspec-auto` 自动决定规格深度：L1 直接实施，L2 必要计划，L3 项目完整 OpenSpec；权限、数据安全和破坏性变更强制 L3，风险扩大时沿原任务升级。验证范围独立按实际变更风险判断。
- 当时 23 个入口合计 856 行，参考按需读取。简单 Bug 无独立报告前置条件；架构不强制空层；验证允许复用输入未变的有效证据。
- `hooks/hooks.json` 未注册 SessionStart、Stop 和旧规格/设计绑定治理检查。六项写前检查默认提醒；提交检查保留消息格式与真实作者约束。已采用的项目权限、CI 和 Forge 策略仍需遵守。

### 剩余问题与最小调整

| 优先级 | 已核实的问题 | 对轻量执行的影响 | 建议与本次状态 |
|---|---|---|---|
| 优先收敛 | `CLAUDE.md` 仍有“行为变化复用或创建相关 change”的无条件表述；旧导航把 M/L 直接等同完整 OpenSpec | L2 可能被再次升级为重流程 | 以 openspec-auto 统一规格深度；本次纠正导航，5.0.0 已同步入口规范，L2 不因行为变化自动创建 change |
| 待部署验收 | Forge 启动适配源码与回归已完成；Codex/Claude 原生清单通过，Plan S 尚未部署 | 普通全局安装不等于 Forge 在运行服务已加载适配 | 经授权重启后核验实际入口；业务五场景由目标项目验收，详见 [适配状态](maintenance/openspec-auto.md) |
| 后续优化 | `hooks/write-guard-dispatcher.js` 对普通 Markdown 编辑也启动六个 Worker，之后各自过滤 | 无关检查仍有启动成本 | 5.0.1 普通说明文件预筛选；SQL、循环数据访问、混合补丁和未知类型保留检查，回归通过 |
| 后续修正 | `hooks/benchmarks/check-hook-performance.js` 用当前六项并发检查对比含已退役就绪检查的七项串行检查 | 性能比率无法公平表示同工作量改进 | 5.0.1 已改为相同六项与相同输入，移除机器负载相关的固定速度门槛；本机五轮中位数并发 171 ms、串行 575 ms，仅供观察 |
| 参考维护 | draw.io 参考仍写零起点页码；本机 31.5.3.0 明确要求从 1 起，提示 v27.0.2 前才从 0 起 | 照旧示例导出会失败 | 5.0.0 已修订版本边界；用页码 1、2 成功导出 |

写前测量：临时目录普通 README 编辑载荷，预热后各取 5 次；默认六 Worker 中位数 **148 ms**，六项关闭中位数 **95 ms**，差约 **53 ms**。这是本机 Node 子进程测量，包含启动成本，不代表 Forge 完整响应时间或性能承诺。

4.16.0 审查轮次只同步审查、导航和图件，未发布新插件版本、未修改运行时门禁，也未改变原项目的 session、writer、绑定或任务状态。旧会话恢复与提交快照问题不能据此视为已修复。

## 业务建模的条件链路

只有代码和数据库时，先按[反向建模流程](../plugins/team-standards/skills/business-ontology-modeling/references/code-and-database-discovery.md)复用Graphify和现有数据库工具，发现业务入口、表族和读写链，再提炼对象关系、状态、口径及候选问题。有明确问题时直接追踪其证据；知识库和设计可以在过程中形成。分别记录来源、接入、口径及答案覆盖，必要时复用现状理解和后端证据。

仅分析时交付结论，保存时将模板嵌入已有设计；已授权实施再进入`change-readiness`和项目实际OpenSpec/设计流程，按可用切片实现并用原问题回验。工具负责结构提取，Agent交叉解释语义，不新建解析或知识引擎。

用于业务Agent时，按[消费分工](../plugins/team-standards/skills/business-ontology-modeling/references/agent-consumption.md)把语义、参数Schema、领域事实与覆盖落回现有框架；多个运行时共用业务规则，接线逐个核实。MCP优先复用实际注册与导出，不因建模新建平台。

项目特有对象、表、阈值与权限仍由项目声明；[新品六问](../plugins/team-standards/skills/business-ontology-modeling/references/new-product-launch-example.md)仅作有版本边界的完整案例。源码纳入插件、打包分发和宿主实际发现分别验收。

## 前端设计的条件链路

业务对象与状态证据 → business-visualization-advisor 确定指标、洞察、选图和看板层次 → frontend-excellence 复用视觉资产、实施并做浏览器验收 → delivery-verification 汇总证据。前两者交接 Dashboard Spec 或简单图表决策，数值计算仍在项目可信计算层。优化统计总览/看板时，advisor 编码前明确四项业务目的，交付目的—指标—图表—行动映射及候选选图决策；没有改变图表先说明理由，交付区分信息架构与图表化改造，并按业务目的反向验收，至少证明一项决策、洞察、比较、定位或行动能力改善；仅样式变更不能宣称看板优化完成。登录阻断时尝试授权预览，替代预览不等于业务验收。图表评审可独立使用 advisor；普通页面与纯样式修改不强制走完整图表流程。

## 先分清四种目录

工作台布局实施通过 `frontend-excellence` 追踪 Shell → 页面 → 中间容器 → 面板的可用宽高及滚动归属；真实浏览器检查高屏、矮屏、窄屏、动态窗口变化和长短内容，再由 delivery-verification 汇总实际证据。细则只维护在 [可用视口契约](../plugins/team-standards/skills/frontend-excellence/references/quality-gates.md#workspace-viewport-contract)，不新增 Hook 或宣称已自动检测所有布局。

本文链接指向可维护的源码仓。安装后的宿主从插件安装目录/缓存读取载荷；缓存路径随宿主和版本变化，以当次加载路径为准，不直接修改缓存代替源码修复。推送源码不等于所有会话立即升级。

```text
team-tools/                              本机多仓工作区，本身不是 Git 仓库
├── team-standards/                       本文中的“本仓根”
│   ├── CLAUDE.md → AGENTS.md             入口规则及生成的 Codex 入口
│   ├── docs/skill-flow.md                当前链路与源码导航
│   ├── scripts/                         维护仓库、版本、同步和打包的脚本
│   └── plugins/team-standards/           分发给宿主的插件载荷根
│       ├── .claude-plugin/plugin.json   Claude 插件元数据
│       ├── .codex-plugin/plugin.json    Codex 插件元数据
│       ├── skills/<name>/                一个 Skill 的目录
│       │   ├── SKILL.md                  Agent 读取的主规则
│       │   ├── references/、rules/      按条件读取的细则，并非全部自动加载
│       │   ├── assets/                  模板、Schema 等资源
│       │   └── scripts/ 或 *.mjs        部分 Skill 的可执行辅助程序
│       ├── hooks/hooks.json             宿主事件与命令注册
│       ├── hooks/*.js                   写前、提交前、完成前检查
│       ├── hooks/governance/            OpenSpec 治理实现
│       ├── scripts/                     治理 CLI，不是根目录的维护 scripts
│       └── state-contract/              状态契约校验、影响与真实验证实现
├── project-coding-profiles/              编码画像及 encoding-guard
├── project-domain-knowledge/             知识内容与 MCP 引擎源码
├── cross-project-topology/               跨系统知识内容，复用上述引擎
└── yoooni-daily-plugin/                  SMB、周报与安装维护工具

<目标业务项目>/                          实际被分析/修改的代码仓，可在其他位置
├── AGENTS.md、项目本地 Skill             项目特例、命令和边界
├── 源码、测试、DDL、配置                  真正的业务实现与验证对象
├── openspec/                            已接入时的规格、活动 change 与归档
├── graphify-out/                        已生成的代码图谱
└── .forge/verify.yml                    已接入时的验证配置
```

只有部分 Skill 有 `references/`、`assets/` 或脚本，不能按照示意树假设每个目录都存在。目标项目也不要求用相同业务源码目录名。

## 全部 Skill 的规则文件索引

每行第一列可直接打开主入口；第二列列出当前实际存在的细则/辅助资源。先读 SKILL.md，再按其中条件读取具体文件，不按这张表逐项强制执行。

| Skill 主入口 | 下钻目录或主要文件 | 与程序的关系 |
|---|---|---|
| [openspec-auto](../plugins/team-standards/skills/openspec-auto/SKILL.md) | 独立规则与可选风险下限脚本；[宿主适配](maintenance/openspec-auto.md) | Agent 自动分级；项目优先去重需要启动器消费适配结果 |
| [architecture-ddd-lite-fullstack](../plugins/team-standards/skills/architecture-ddd-lite-fullstack/SKILL.md) | [references/](../plugins/team-standards/skills/architecture-ddd-lite-fullstack/references/)；[rules/](../plugins/team-standards/skills/architecture-ddd-lite-fullstack/rules/) | Agent 读取的规则；没有独立同名执行器 |
| [backend-evidence](../plugins/team-standards/skills/backend-evidence/SKILL.md) | [references/](../plugins/team-standards/skills/backend-evidence/references/) | 读取规则后查询代码、知识及运行证据 |
| [bug-doc-required](../plugins/team-standards/skills/bug-doc-required/SKILL.md) | [references/](../plugins/team-standards/skills/bug-doc-required/references/) | Agent 读取的规则；没有独立同名执行器 |
| [business-logic-orientation](../plugins/team-standards/skills/business-logic-orientation/SKILL.md) | [references/](../plugins/team-standards/skills/business-logic-orientation/references/) | Agent 读取的规则；没有独立同名执行器 |
| [business-ontology-modeling](../plugins/team-standards/skills/business-ontology-modeling/SKILL.md) | [模板](../plugins/team-standards/skills/business-ontology-modeling/assets/templates/)、[跨项目使用](../plugins/team-standards/skills/business-ontology-modeling/references/adoption.md)、[六问示例](../plugins/team-standards/skills/business-ontology-modeling/references/new-product-launch-example.md) | Agent按问题建模与核实可回答性；不绑定数据库、工具或本体运行引擎 |
| [change-readiness](../plugins/team-standards/skills/change-readiness/SKILL.md) | [references/](../plugins/team-standards/skills/change-readiness/references/)；[rules/](../plugins/team-standards/skills/change-readiness/rules/) | 规则编排；OpenSpec 与治理程序见下一节 |
| [clear-design-docs](../plugins/team-standards/skills/clear-design-docs/SKILL.md) | references/examples.md 与 references/review-mode.md | 编写、精简和独立评审；独立评审默认只读 |
| [architecture-reasoning（悟道）](../plugins/team-standards/skills/architecture-reasoning/SKILL.md) | 按需[条件与反例](../plugins/team-standards/skills/architecture-reasoning/references/examples.md)；共用工程宪法 | 需求求真与最小充分决策；不新增阶段、固定输出或技术阶梯 |
| [plain-writing（人话）](../plugins/team-standards/skills/plain-writing/SKILL.md) | 按需 [改写与失真反例](../plugins/team-standards/skills/plain-writing/references/examples.md) | 后置表达；保留决策与事实，不反向开启架构循环 |
| [architecture-diagram-design](../plugins/team-standards/skills/architecture-diagram-design/SKILL.md) | 视图与主线在入口；按需加载视觉语言、draw.io 操作、三套原生模板、自带图标对照和验收清单 | 统一信息提炼、形象表达、绘制与实际验收；不内置绘图引擎 |
| [coding-standards-common](../plugins/team-standards/skills/coding-standards-common/SKILL.md) | [references/](../plugins/team-standards/skills/coding-standards-common/references/) | Agent 读取的规则；没有独立同名执行器 |
| [delivery-verification](../plugins/team-standards/skills/delivery-verification/SKILL.md) | 直接阅读主入口；无上述下钻目录 | 读取规则后调用外部 Forge 或项目声明命令 |
| [business-visualization-advisor](../plugins/team-standards/skills/business-visualization-advisor/SKILL.md) | [选图规则](../plugins/team-standards/skills/business-visualization-advisor/references/visual-rules.md)、[Dashboard Spec](../plugins/team-standards/skills/business-visualization-advisor/references/dashboard-spec.md) | Agent 探索业务事实并设计指标/图表，不是运行时图表引擎 |
| [frontend-excellence](../plugins/team-standards/skills/frontend-excellence/SKILL.md) | [references/](../plugins/team-standards/skills/frontend-excellence/references/) | Agent 读取的规则；没有独立同名执行器 |
| [git-commit-standards](../plugins/team-standards/skills/git-commit-standards/SKILL.md) | [references/](../plugins/team-standards/skills/git-commit-standards/references/)；[scripts/](../plugins/team-standards/skills/git-commit-standards/scripts/) | scripts/build-commit-message.js 生成消息；Git 负责提交 |
| [init-project-docs](../plugins/team-standards/skills/init-project-docs/SKILL.md) | [references/](../plugins/team-standards/skills/init-project-docs/references/)；[assets/](../plugins/team-standards/skills/init-project-docs/assets/)；[init-ai-structure.mjs](../plugins/team-standards/skills/init-project-docs/init-ai-structure.mjs)；[onboard-pipeline.mjs](../plugins/team-standards/skills/init-project-docs/onboard-pipeline.mjs) | 同时含初始化和 onboarding 可执行入口 |
| [java-coding-standards](../plugins/team-standards/skills/java-coding-standards/SKILL.md) | 直接阅读主入口；无上述下钻目录 | Agent 读取的规则；没有独立同名执行器 |
| [go-coding-standards](../plugins/team-standards/skills/go-coding-standards/SKILL.md) | 直接阅读主入口；架构复用 DDD-lite 的 Go 章节 | Go 语言规则；没有独立 Go Hook |
| [llm-agent-coding-standards](../plugins/team-standards/skills/llm-agent-coding-standards/SKILL.md) | 直接阅读主入口；无上述下钻目录 | Agent 读取的规则；没有独立同名执行器 |
| [markdown-writing-standards](../plugins/team-standards/skills/markdown-writing-standards/SKILL.md) | [references/](../plugins/team-standards/skills/markdown-writing-standards/references/) | Agent 读取的规则；没有独立同名执行器 |

### 按模式找具体参考文件

| 要理解的环节 | 实际文件 |
|---|---|
| 方案审视 / 风险分档 / 代码定位 | [solution-review.md](../plugins/team-standards/skills/change-readiness/references/solution-review.md) / [classification.md](../plugins/team-standards/skills/change-readiness/references/classification.md) / [code-orientation.md](../plugins/team-standards/skills/change-readiness/references/code-orientation.md) |
| OpenSpec 生命周期与阶段检查 | [openspec-lifecycle.md](../plugins/team-standards/skills/change-readiness/references/openspec-lifecycle.md) / [governance-checker.md](../plugins/team-standards/skills/change-readiness/references/governance-checker.md) |
| Bug 最小修复与记录模板 | [repair-rules.md](../plugins/team-standards/skills/bug-doc-required/references/repair-rules.md) / [template.md](../plugins/team-standards/skills/bug-doc-required/template.md) |
| SQL 正确性 / 查询性能 / 领域规格候选 | [sql-correctness-gate.md](../plugins/team-standards/skills/backend-evidence/references/sql-correctness-gate.md) / [query-performance-gate.md](../plugins/team-standards/skills/backend-evidence/references/query-performance-gate.md) / [domain-spec-mining.md](../plugins/team-standards/skills/backend-evidence/references/domain-spec-mining.md) |
| 分层边界 / 结构质量 / 语义分包 | [layers-and-boundaries.md](../plugins/team-standards/skills/architecture-ddd-lite-fullstack/references/layers-and-boundaries.md) / [structure-quality-gates.md](../plugins/team-standards/skills/architecture-ddd-lite-fullstack/rules/structure-quality-gates.md) |
| UI 绑定解析（guardian 复用 bootstrap 的 resolver）/ 视觉评审 | [resolver.md](../plugins/team-standards/skills/frontend-excellence/references/resolver.md) / [review-workflow.md](../plugins/team-standards/skills/frontend-excellence/references/review-workflow.md) |
| 设计偏好 / 模式候选 | [evidence-capture.md](../plugins/team-standards/skills/frontend-excellence/references/evidence-capture.md) / [pattern-mining.md](../plugins/team-standards/skills/frontend-excellence/references/pattern-mining.md) |
| 初始化输出 / onboarding / 刷新 | [initialization-output.md](../plugins/team-standards/skills/init-project-docs/references/initialization-output.md) / [onboard-workflow.md](../plugins/team-standards/skills/init-project-docs/references/onboard-workflow.md) / [update-workflow.md](../plugins/team-standards/skills/init-project-docs/references/update-workflow.md) |
| 文档归属索引 / Markdown 格式 | [document-index-workflow.md](../plugins/team-standards/skills/markdown-writing-standards/references/document-index-workflow.md) / [markdown-format.md](../plugins/team-standards/skills/markdown-writing-standards/references/markdown-format.md) |

## 真正执行程序的调用链

### 宿主事件到 Hook

注册源是 [hooks/hooks.json](../plugins/team-standards/hooks/hooks.json)，各命令路径相对插件载荷根。宿主是否触发必须以实际支持和事件证据为准。

```mermaid
flowchart LR
    HOST["宿主工具或会话事件"] --> CONFIG["hooks/hooks.json"]
    CONFIG -->|"Write / Edit / MultiEdit / apply_patch"| DISPATCH["hooks/write-guard-dispatcher.js"]
    DISPATCH --> GUARDS["六个专项 check-*.js 检查器"]
    GUARDS --> INPUT["按需使用 hooks/change-input.js 解析输入"]
    CONFIG -->|"Bash / exec_command"| COMMIT["提交消息格式与作者检查"]
    CONFIG -->|"UserPromptSubmit"| SIGNAL["提示信号采集与版本提醒"]
```

- 写入分发清单在 [write-guard-dispatcher.js](../plugins/team-standards/hooks/write-guard-dispatcher.js)：保留架构、后端证据、注释、DDL、SQL 正确性与性能六项专项检查；移除规格解析和变更就绪的自动执行。
- Bash / exec_command 共用 [command-input.js](../plugins/team-standards/hooks/command-input.js) 解析命令与工作目录，由 [check-commit-no-ai-signature.js](../plugins/team-standards/hooks/check-commit-no-ai-signature.js) 校验消息；旧体量/Skill 调用门禁已退役。Hook 不执行 Git 命令，原子性与内容准确性仍由 Agent 判断。
- 插件不再注册 Stop 检查；历史交付与兼容治理脚本仅供项目显式接入。
- 提示事件入口是 [prompt-signal-capture.js](../plugins/team-standards/hooks/prompt-signal-capture.js) 与 [check-plugin-version-stale.js](../plugins/team-standards/hooks/check-plugin-version-stale.js)。事件与性能辅助分别见 [event-log.js](../plugins/team-standards/hooks/event-log.js)、[hook-metrics.js](../plugins/team-standards/hooks/hook-metrics.js)。

### OpenSpec 团队治理

规则入口为 change-readiness 的治理参考；以下才是其本仓实现：

```text
plugins/team-standards/scripts/openspec-governance.js  CLI 参数与 JSON 输出
  → hooks/governance/service.js                      discover/bind/record/check 等业务编排
    → openspec.js                                   官方 OpenSpec 接口适配
    → repository.js                                 仓库、配置与修改范围
    → evidence.js                                   证据计划校验
    → storage.js                                    安全路径、指纹、会话状态存取
    → state-contract/enrollment.js                  已登记状态模块检查

hooks/check-openspec-governance.js                    宿主事件入口
  → 同一个 hooks/governance/service.js               复用上述实现
```

可点开 [CLI](../plugins/team-standards/scripts/openspec-governance.js)、[service.js](../plugins/team-standards/hooks/governance/service.js)、[governance 目录](../plugins/team-standards/hooks/governance/)。绑定状态默认落在用户目录 `.local/share/team-standards/governance/` 下的仓库/会话哈希路径，可由 `TEAM_STANDARDS_GOVERNANCE_DATA` 指定。它不是 OpenSpec 规格正文，也不把 `record` 当作测试执行。官方 OpenSpec 引擎不在这个目录中。

### 状态契约执行

[plugins/team-standards/scripts/state-contract.js](../plugins/team-standards/scripts/state-contract.js) 提供 `check/impact/verify`，调用 [state-contract/](../plugins/team-standards/state-contract/) 内的实际模块：`check.js` 分析，`graph.js` 读取图谱候选，`verify.js` 执行契约登记的命令并检查证据，`schema.js`/`files.js` 处理结构与路径，`enrollment.js` 对接已登记模块。项目契约和命令配置归目标项目，详见 [接入协议](../plugins/team-standards/skills/change-readiness/references/state-contract.md)。

### 项目初始化与提交

- [init-ai-structure.mjs](../plugins/team-standards/skills/init-project-docs/init-ai-structure.mjs) 消费 [assets/project-ai-structure/](../plugins/team-standards/skills/init-project-docs/assets/project-ai-structure/) 中的基线资源；[onboard-pipeline.mjs](../plugins/team-standards/skills/init-project-docs/onboard-pipeline.mjs) 编排接入阶段。资源模板不是业务源码，实际目标目录由调用参数和项目约定确定。
- [build-commit-message.js](../plugins/team-standards/skills/git-commit-standards/scripts/build-commit-message.js) 校验并写出提交消息；随后才执行 `git commit -F`。它不替 Agent 决定哪些用户文件可以暂存。
- 根 [scripts/](../scripts/) 是维护这套插件的脚本，如 sync-agents、版本与引用检查、跨仓同步和 release-team-tools；不要与载荷内 `plugins/team-standards/scripts/` 的治理 CLI 混淆。维护调用职责见 [全景 H 域](suite-panorama.md#h套件运维与分发域)。

## 目标项目与外部服务中的内容

以下以 `team-tools/` 为路径起点；目录可能未安装、未构建或未接入，不能把源码路径当作可调用工具。

| 能力 | 源码/内容实际位置 | 当前链路怎么使用 |
|---|---|---|
| 业务知识 MCP | `project-domain-knowledge/src/server.ts`；查询实现在 `src/knowledge.ts`、`project-context.ts`、`consult-evidence.ts`、`spec-candidates.ts`；内容在 `knowledge/` | 构建后的 `dist/server.js` 作为 MCP 进程，Agent 调工具读业务知识 |
| 跨项目拓扑 MCP | `cross-project-topology/knowledge/` | 同一知识引擎配不同 DOMAIN_KB_DIR 启动第二实例，无独立同名 server 源码 |
| 编码保护 | `project-coding-profiles/plugins/project-coding-profiles/` 下的 `skills/encoding-guard/`、`hooks/`、`profiles/` | 按匹配画像保护目标文件；不在 team-standards 的 skills 目录内 |
| SMB 与团队周报 | `yoooni-daily-plugin/plugins/yoooni-daily-plugin/skills/` 下的两个 Skill | 独立日常请求加载；安装维护脚本另在该插件 `scripts/` |
| Graphify | 外部安装的 CLI/Skill；目标项目 `graphify-out/` | 查询当前代码图谱；本仓图谱只描述本仓，不等于业务项目图谱 |
| OpenSpec | 外部 CLI/项目生成能力；目标项目 `openspec/` | 官方生命周期操作读写项目规格；团队 reference 规定何时调用 |
| Forge 验证 | 外部 MCP/项目声明 CLI；目标项目 `.forge/verify.yml` 与环境 | 本仓 delivery Skill 定义调用规则，Forge 服务实现不在本仓 |

## 想改某个行为时从哪里下手

| 要改什么 | 优先改哪里 | 对应检查/注意事项 |
|---|---|---|
| 意图识别、授权和阶段推进 | CLAUDE.md + 相关 SKILL.md | 生成 AGENTS，同步本流程；不能只改图就认为规则已生效 |
| 某个 Skill 的触发或正文 | 对应 SKILL.md 的 description/正文 | Skill 结构、引用与场景审视；载荷变化按版本规则升版 |
| 某种规则细节 | 该 Skill 明确链接的 references/rules | 保持主入口可达，不新增无人读取的细则 |
| Hook 什么时候触发 | hooks/hooks.json | 宿主兼容/安装测试；声明 matcher 不代表所有宿主支持 |
| Hook 检查如何判定 | 对应 hooks/*.js，必要时 governance/ | 相关 hooks/tests/ 测试；不要只改 Skill 文案来改变程序判定 |
| 状态契约校验算法 | state-contract/ | hooks/tests/state-contract.test.js；区别静态分析和真实执行 |
| 初始化生成什么 | init-project-docs 的程序及 assets | hooks/tests/ai-structure-initializer.test.mjs 与 onboard-pipeline.test.mjs |
| 业务规则/跨系统关系 | 所属知识仓及其内容约定 | 更新目录/索引与实际 MCP 内容；不要写进通用 Skill 充当业务真相 |
| 业务代码、SQL、页面、测试 | 目标业务项目 | 按项目命令验证；修改 team-standards 不会自动修复业务系统 |
| 套件版本、同步、打包 | 根 scripts/、三个 manifest 及相关 README | 版本/同步/打包检查；更新源码后还需宿主更新插件才能使用新载荷 |

## 入口模式

| 主入口 | 模式 | 什么时候加载 |
|---|---|---|
| `change-readiness` | 方案审视 | 审视用户给出的解法；仅咨询时不创建实施 change |
| `change-readiness` | 风险分档与设计 | 已授权源码修改；风险与 OpenSpec 简化条件按本 Skill 执行 |
| `change-readiness` | 代码定位 | 设计依据确认后、修改第一行代码前 |
| `bug-doc-required` | 调查 | 用证据解释问题，不改源码；简单问题直接回复，不另建报告 |
| `bug-doc-required` | 修复 | 已授权修复：最小改动与回归；复杂或高风险问题复用持久记录 |
| `backend-evidence` | 数据与运行事实 | DDL、真实数据库、SQL、日志、执行计划和性能问题 |
| `backend-evidence` | 即时影响 | 修改状态、字段、事件或 API 前用新鲜 Graphify 查询；不回写手工索引 |
| `backend-evidence` | 领域规格 | 状态密集业务缺少不变量、终态或下一动作证据 |
| `markdown-writing-standards` | 文档同步 / 写前 / 写中 / 写后 | 套件或项目更新核对文档影响，唯一归属、结构与 Mermaid、必要已有链接 |
| `git-commit-standards` | 完成收尾 / 提交 | 文档和验证完成后自动提交本次范围；独立判断推送授权 |
| `init-project-docs` | structure / onboard / init / refresh / status / profile | 当前目录 Agent/Docs/OpenSpec 入口、Graphify 输入与 Git 共享边界、九阶段接入、增量刷新、状态或可选画像 |
| `delivery-verification` | completion | 可执行改动完成后、最终回复前调用 Forge 并检查最新 PASS 证据 |

---

## 作业完成闭环

本次作业完成前，按 [文档同步规则](../plugins/team-standards/skills/markdown-writing-standards/SKILL.md#作业交付时同步文档) 核对并更新受影响的说明、规则与索引；对最终输入完成适用验证后，按 [提交规范](../plugins/team-standards/skills/git-commit-standards/SKILL.md) 自动提交本次范围。纯文档作业执行文档检查后提交，不要求虚构 Runtime 证据。当前逻辑单元完成后执行验证与提交，再推进下一单元，不等待整个 OpenSpec change 归档。单元按业务目的与依赖划分，不按文件数或技术层；部分提交须核实待提交内容的验证，不借用无关未提交改动的 PASS。细则唯一归 git-commit-standards。

提交说明继续使用“改动／原因／结果”三段，但内容从已核对的本次行为写起：原来什么条件下有何问题、关键规则或技术路径怎样修正、改后怎样及验证到哪里。版本号、文件清单和测试 PASS 只是补充，现有提交 Hook 只检查格式，不保证读者能理解因果。

用户禁止提交、验证失败、归属混合等例外按提交规范处理并明确剩余项；push 独立判断授权。该闭环由 Agent 主动执行，现有 Hook 不保证覆盖全部宿主，也不证明文档语义正确。

---

## Graphify 与 OpenSpec 接入边界

Graphify、OpenSpec 和 Skill 分属不同层级，不建立三个并行主流程：

| 能力 | 唯一职责 | 不再重复承担 |
|---|---|---|
| Graphify | 从代码提取模块、符号、调用、依赖和数据访问等当前实现事实 | 不决定需求、不生成另一套设计流程、不把推断晋升为业务真相 |
| OpenSpec | 在项目内维护已接受行为规格、活动变更、任务和归档 | 不证明当前代码或数据库已经符合规格 |
| `team-standards` Skill | 识别用户意图，选择证据源，施加架构、编码、安全、SQL 和验证门禁 | 不复制 Graphify 图谱，不在 OpenSpec 之外生成平行规格 |

项目已启用 OpenSpec 时：

1. `openspec-auto` 判定为 L3 或项目明确要求完整规格时，由 `change-readiness` 匹配或创建 OpenSpec change，不再创建平行设计文档；实施中的需求修正和新发现通过官方 `update` 工作流回写同一 change。
2. `business-logic-orientation` 优先查询 Graphify 获取代码事实，只补充 Graphify 无法证明的业务语义与运行证据；除非用户明确要求或需要长期重构基线，否则不生成新的梳理文档和 AI 索引。
3. `backend-evidence` 使用 OpenSpec `specs/` 作为已接受行为契约，使用 Graphify 查询当前实现和影响，以 DDL、SQL、数据库和日志验证数据事实；不维护同义行为规格或手工代码索引。
4. `init-project-docs` 先以 structure 模式建立六层最小入口、`.graphifyignore` 和 Graphify Git 共享白名单，再由 init 编排真实 Graphify、OpenSpec 与领域证据；不复制图谱、规格或 00–10 文档树。
5. 项目声明的规划流程负责跨项目证据编排；Graphify 和 OpenSpec只是证据适配器，不替代项目关系权威源。

“已启用”不等于目录存在：`openspec/config.yaml` 必须包含真实项目上下文。需要完整 OpenSpec 且确认行为变化、没有相关 change 时才创建，受影响 artifacts 按 schema 补齐；行为保持不建空 change，生成 Skill 缺失但 CLI 正常时走 agent-compatible CLI；这些都不再触发静默 legacy。只有项目未启用 OpenSpec，或用户明确批准当前变更降级时，才使用兼容设计文档。

完成阶段复用 OpenSpec 官方能力：严格 validate 后执行 verify；需要提前合并 delta specs 时 sync；任务与验证满足条件后才 archive。OpenSpec 自身的 verify/archive warning 在团队门禁中不能替代阻断判断，项目测试、数据库和发布证据仍独立验证。

Graphify 查询也不天然代表当前工作区。消费图谱前比较其 manifest 或来源元数据与 Git HEAD、未提交文件版本；过期时先按已安装能力刷新，或用 `git diff`、`rg` 和定向源码读取补齐。OpenSpec 校验通过只证明 artifacts 结构合法，不能代替 DDL、数据库、测试和发布制品验证。

---

## S/M/L 影响分析

S/M/L 用于理解变更影响，不是第二次任务分级。规格深度统一由 openspec-auto 的 L1/L2/L3 决定；不得因这里出现 M 就强制创建 change。

[工程原则](../plugins/team-standards/skills/change-readiness/references/engineering-principles.md)约束默认流程：档位只决定深度，规格与设计独立按影响维护；不按文件数或行数要求完整工件、重新审批或全量验证。

```mermaid
flowchart LR
    CHANGE["变更请求"] --> RISK{"关键不变量、迁移或共享契约存在实质风险?"}
    RISK -->|"是"| LARGE["L：核实影响、失败恢复与必要消费者"]
    RISK -->|"否"| SIZE{"影响明确且现有验证能覆盖?"}
    SIZE -->|"是"| SMALL["S：极简判断、编码标准、定向验证"]
    SIZE -->|"否"| MEDIUM["M：维护受影响规则并验证相关行为"]
```

---

## 冲突规则

1. 同一 Skill 多次出现表示不同模式，不是重复触发。
2. Bug 链路中 `bug-doc-required` 管诊断证据和最小修复，`change-readiness` 管实施风险与代码坐标。简单 Bug 不以独立文档为前置条件；复杂问题优先复用已有 OpenSpec change、问题记录或项目文档，仅无合适载体且有沉淀必要时新建报告。代码定位消费会话证据与当前源码，日志默认由 Git 承载，需要独立日报时按问题主题归并，不反向要求补文档。
3. `coding-standards-common` 先于 Java 或 LLM 专属标准，专属标准只补充不替代。
4. 后端即时影响与领域规格属于 `backend-evidence`，跨项目契约仍由实际项目或拓扑仓维护。
5. 项目专属规范始终优先从项目内 Skill 或 `AGENTS.md` 读取；独立项目画像只是缺少入口时的可选导航，不承载规范正文。

---

## 收尾

| 变化 | 回写 |
|---|---|
| 套件或项目更新 | `markdown-writing-standards` 文档影响核对与同步 |
| Markdown 新建或重组 | `markdown-writing-standards` 检查受影响导航 |
| 状态、字段、事件、API 变化 | `backend-evidence` Graphify 即时影响查询；协同项写入 OpenSpec |
| 项目结构、API、数据访问变化 | `init-project-docs` refresh：更新 Graphify 本体，不生成 Markdown 镜像 |
| 可执行改动准备交付 | `delivery-verification`；原生检查或项目明确采用的工具，范围按风险选择 |
| 作业完成且有可提交改动 / 准备 commit | `git-commit-standards` 自动本地提交本次范围 |

## 状态契约治理扩展

change-readiness → backend-evidence / business-logic-orientation → delivery-verification 复用同一状态契约检查器。模块逐步登记，策略统一、业务链路测试与输入新鲜度共同防止状态漂移。详见 [状态契约治理协议](../plugins/team-standards/skills/change-readiness/references/state-contract.md)。

## 轻量交付

本地检查按 [delivery-verification 的影响分级](../plugins/team-standards/skills/delivery-verification/SKILL.md) 选择，Forge 与 CI 门禁保持原约束。Markdown 格式细则和提交示例由对应 Skill 按需加载。日常日志默认由 Git 承载，明确要求独立日报时按主题合并，不按文件数累加工时；正常自动提交仅报告提交结果，不重复展示完整正文。


套件维护复用 [README 的维护入口](../README.md#维护与验证)：快测只覆盖轻量契约，改动相关集成测试与完整 CI 继续执行；共享副本先预览再同步，消费者独立验证升版；发布前检查根总览元数据。当前独立意图入口见套件索引；架构路径和注释模式默认 warn，项目显式配置继续有效。


## 易混淆请求的预期路由

以下用于人工场景审视，不是关键词分类器或已运行的 Agent 准确率测试。

| 请求与上下文 | 主入口 / 阶段 | 边界与交付 |
|---|---|---|
| 为什么报错（没有既有修复授权） | bug-doc-required / 调查 | 证据与原因，不自动改码 |
| 查明原因并修复 | bug-doc-required / 调查 → 就绪 → 修复 → 验证 | 已授权范围连续推进，必要规格照常维护 |
| 上轮已要求修复，本轮补充报错日志 | 继续原修复任务 | 不把最新短句视作撤销已有授权 |
| 分析怎么重构 / 按方案重构 | 前者方案探查，后者 change-readiness / 纯重构 | 实施才进入设计生命周期，回归支持行为保持 |
| 为什么 SQL 慢 / 优化 SQL | 前者后端探查，后者演进；已知性能退化归修复 | 查询负载与数据访问风险独立评估 |
| 检查接入状态 / 初始化项目 | init-project-docs / status 或 init | status 不写入修复，init 仅改约定基线 |
| 查线上订单金额不一致 | bug-doc-required 调查 + backend-evidence | 不将只读等同低风险，不默认授权修数据 |
| 只更新 README / 提交已完成改动 | markdown-writing-standards / git-commit-standards | 直接进入专门动作，不新增需求生命周期 |
| 已授权修复但发现需删除生产数据 | 继续安全调查，补齐具体操作授权 | 修复授权不自动覆盖破坏性数据操作 |

## 最小证据链与产物去留

| 需要回答的问题 | 读取哪里 / 如何维护 | 不再默认产出 |
|---|---|---|
| 当前实现与影响是什么 | 新鲜 Graphify + 定向源码；见 business-logic-orientation | 现状双文档、ai-ref、手工调用索引 |
| 本次应该改什么、为何这样改 | change-readiness → OpenSpec 实际工件；未启用时复用一份仓内设计 | 独立 coding 摘要、API 摘要和并行设计正文 |
| 实际是否通过验证 | delivery-verification → 真实命令/CI/Forge/运行结果；治理文件引用其位置和输入指纹 | 为机器引用而转抄的 validation.md |
| 文档如何被找到 | markdown-writing-standards → 唯一归属和受影响的已有导航 | 个人目录 Phase-A/B、逐层 INDEX、编号文档树 |

不是所有知识都能由这三类工具恢复：业务术语、不变量、架构取舍、事故复盘和运行手册保留独有内容；已有历史文档不批量删除。长期文档仍在实现变化时同步。

实际源码：文档规则见上方 references 表；旧 `hooks/check-ai-doc-location.js` 仅兼容旧宿主调用，当前 dispatcher 不再加载。`hooks/governance/evidence.js` 接受可选 dedup/handoff、无需正文的不适用视图及原始验证文件；`service.js` 执行策略版本迁移、范围和新鲜度检查。升级步骤见 [治理协议](../plugins/team-standards/skills/change-readiness/references/governance-checker.md#6-策略版本与升级)。

## 项目知识候选链路与源码

项目接入后先消费已有 MCP 上下文，缺口或已授权初始化才进入探索。初始化以各项目 Graphify 导航，源码核验后起草候选；不把代码事实直接提升成业务规则。

| 环节 | 套件中的源码 | 输出与约束 |
|---|---|---|
| 模块候选 | `project-domain-knowledge/scripts/lib/module-bootstrap.mjs`、`graphify-input.mjs` | 模块节点、关联、源码指纹与覆盖缺口；图谱新鲜度未经证明为 unknown |
| 业务挖掘 | `project-domain-knowledge/scripts/spec-mining.mjs` | 现有候选与评审；accepted 当前证据版本仅晋升 draft |
| 拓扑候选 | `project-domain-knowledge/scripts/lib/topology-candidates.mjs` | 双方项目、环境、协议和契约唯一匹配；缺失/多义保留 unresolved |
| 证据核对 | `project-domain-knowledge/src/evidence-provenance.ts`、`scripts/evidence-check.mjs` | 捕获文件字节指纹变化为 stale；不改变业务 stability |
| 按任务消费 | `project-domain-knowledge/src/consult-evidence.ts`、`src/topology-candidates.ts` | MCP 返回有限摘要、缺口与新鲜度，Agent 只补查相关部分 |

格式与执行命令统一维护在 [知识引擎 README](../../project-domain-knowledge/README.md#项目图谱到候选知识的闭环)。文件指纹不涵盖新增文件和外部系统变化；Graphify 不可用允许模块扫描降级。CI、Semgrep、OTel 的各业务项目接入按需实施，不宣称已自动覆盖全部项目。

## Go 编码链路

Go 源码 → `coding-standards-common` + `go-coding-standards`；业务边界变更叠加 `architecture-ddd-lite-fullstack/references/framework-rules.md` 的 Go 章节。需求/修复仍复用原入口，SQL 复用 backend-evidence，交付使用项目 Go 工具链与 delivery-verification，最后同步文档和提交。包结构、接口归属和事务归 DDD-lite；错误、context、goroutine、资源释放与 Go 验证归 Go Skill。

## 4.0.0 模式与源码

| 通用入口 | 按需源码 | 职责 |
|---|---|---|
| [frontend-excellence：设计系统](../plugins/team-standards/skills/frontend-excellence/SKILL.md) | references/bootstrap.md、review-mode.md、review-workflow.md、evidence-capture.md、pattern-mining.md；assets/ 与 schema 保留 | 设计复用、初始化、评审和偏好；不强制创建 Registry |
| coding-standards-common | references/comment-maintenance.md、feedback.md | 显式清理和纠正，不创建计数式违规日志 |
| business-logic-orientation | references/terminology.md | 术语核对与已有知识源维护 |
| git-commit-standards | references/work-summary.md | 按需查询汇总，不自动写日报 |

Forge resolver、统一查询、trace-v2 和完成性协议仅在 [平台集成区](platform-integrations/planning-evidence-discovery/SKILL.md) 保留；只有实际平台接入才使用，不阻断一般跨项目分析。本仓决策流程见 [维护规则](maintenance/decision-log.md)。旧入口与迁移表以 README 的 4.0.0 章节为准。

## 已有规格解析

需求原子化 → 正式 Requirement/Scenario 召回 → Graphify 实现关联与新鲜度核对 → 具名语义决策 → 完整 Delta → 官方校验 → readiness。详见[协议](../plugins/team-standards/skills/change-readiness/references/existing-spec-resolution.md)。Hook 只在生命周期调用服务，未知语义保持未确认。

## 设计表达与结构的分工

编写概设详设时，由 change-readiness 的内容契约确定结构与生命周期，再使用 [clear-design-docs](../plugins/team-standards/skills/clear-design-docs/SKILL.md) 完成逐段试讲、关系图、字段说明与语义核对。绘制产品能力、领域能力或系统协作图时，叠加 [architecture-diagram-design](../plugins/team-standards/skills/architecture-diagram-design/SKILL.md) 按受众选择 L1/L2/L3，提炼问题、主角与阅读路径，再组织图形与配色；后续架构说明图默认继承已确认三套模板的形象化风格，区分主体、支撑和注释；draw.io 优先复用自带 iOS7 Icons，统一图标家族；以实际打开、图标改色/缩放、文字和端点抽查及轻量清单验收，逐笔画编辑仅按明确需求验证，具体格式沿用项目选择。独立评审概设、详设或技术方案由 [设计独立评审](../plugins/team-standards/skills/clear-design-docs/references/review-mode.md) 核实本期事实、矛盾、关键缺口和过度设计；获授权改写时使用同入口编写模式。未来规模和冷门场景默认提醒，不作为当前硬指标。markdown-writing-standards 检查格式和导航，delivery-verification 核对受影响设计的实际审读范围。纯设计咨询不自动实施；普通文字编辑不要求启动设计治理。

ER 表达按 clear-design-docs 核对模型对象、同表自关联及关联两端；逻辑对象与物理表分开，不以图中别名制造新表。

ER 图的关键字段和中文含义须留在对象框内，完整约束放字段表；按 clear-design-docs 检查字段密度、关联可追溯和真实渲染。

### 图件归属与命名（5.0.2）

架构图优先遵循用户和项目约定；无约定时项目级图放根 `docs/diagrams/`，中文项目使用中文业务文件名。迁移或改名同步源图、预览与已有引用，不自动整理全部历史图件或接入构建。细则唯一维护在[制图参考](../plugins/team-standards/skills/architecture-diagram-design/references/drawio.md#图件归属与命名)。
