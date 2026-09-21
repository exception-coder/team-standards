# Team Standards 后续优化交接说明

本文交接 Team Standards 当前能力、真实边界和下一阶段优化目标。接手人应以源码与实际宿主证据为准，继续完善现有流程，不另建一套平行治理体系。

## 2026-09-21 源码维护进展

本轮源码升级为 4.8.0：Forge 执行核心从规格解析拆为独立 `execution/`，增加只读 Session Init、Context Resolve 和统一生命周期决策；Team Standards 精简主 Skill 并以 v2 client 接入，v1 私有状态兼容隔离保留。当前接口与维护入口见[执行适配协议](../../plugins/team-standards/skills/change-readiness/references/execution-adapter.md)。

下方 4.7.1 表格保留为原交接基线，不代表本轮安装或运行状态。源码验证、插件安装、新会话加载、真实宿主触发与服务运行仍分别验收；H1/H2 等实际 Agent 场景不因新增单元测试或 Hook 注册自动勾选。任务调度、跨会话接管和设计夜间整合仍未实现。

## 快速导航

- **先了解现状** → [当前基线](#当前基线)、[已经完成的能力](#已经完成的能力)
- **直接开展优化** → [本轮建议目标](#本轮建议目标)、[建议实施顺序](#建议实施顺序)
- **核对交付质量** → [验收矩阵](#验收矩阵)、[必须提交的材料](#必须提交的材料)
- **避免错误扩展** → [职责与安全边界](#职责与安全边界)、[工作区和升级注意事项](#工作区和升级注意事项)
- **直接转交同事** → [可直接转发的任务说明](#可直接转发的任务说明)

---

## 当前基线

| 项目 | 当前状态 |
|---|---|
| 源码仓库 | `C:\Users\zhang\.kai-toolbox\team-tools\team-standards` |
| 当前分支 | `main` |
| 源码版本 | `4.7.1` |
| 当前提交 | `5e42a84d984c53b410e23903f7e96bdfcbf0ac65` |
| 4.4.0 自动设计起点 | `da2b119b960751efb744507e49705786cc950847` |
| 4.5.0 已有规格解析 | `4cafc2a` |
| 4.6.0 宿主会话与 Codex 适配 | `df33781` |
| 4.7.1 按影响执行与共享分支 | `5fbd092` |
| Forge 跨仓维护约定 | `5e42a84` |
| 远端 | GitHub `origin/main`、Gitee `gitee/main` |
| Claude Code 安装 | `4.7.1`，对应当前提交 |
| Codex 安装 | 缓存仍为 `4.4.0`；不得把源码 4.7.1 视为当前 Codex 会话已加载 |

权威入口：

- [开发主入口](../../CLAUDE.md)
- [套件总览](../../README.md)
- [按影响执行协议](../../plugins/team-standards/skills/change-readiness/references/impact-routing.md)
- [自动设计维护协议](../../plugins/team-standards/skills/change-readiness/references/automatic-design-maintenance.md)
- [已有规格解析协议](../../plugins/team-standards/skills/change-readiness/references/existing-spec-resolution.md)
- [治理检查器协议](../../plugins/team-standards/skills/change-readiness/references/governance-checker.md)
- [自动设计 4.4.0 试点记录](automatic-design-release.md)
- [规格解析 Hook 设计](../design/spec-resolution-hook.md)

---

## 已经完成的能力

### 自动维护概设和详设

普通业务开发请求已被定义为自动执行以下链路：识别模块、查找权威设计、补建或更新、建立绑定、实施同步和交付验证。用户无需另行提出“初始化设计”，也无需手写 `.team-standards/design-baselines.json`。

`change-readiness` 负责开发前判定和编排，`init-project-docs` 提供幂等发现、准备和绑定能力，`delivery-verification` 在完成前检查规格、设计、代码与验证证据的一致性。脚本只处理候选、状态和安全合并，业务正文仍由 Agent 基于真实需求、规格和实现编写。

### OpenSpec 与当前设计分工

OpenSpec change 承载本次目标、差异、决策、任务和证据；模块概设与详设维护长期当前设计。独立切片验证后才把对应能力同步为“已验证”，上线必须另有发布证据。未启用 OpenSpec 的项目保持兼容路径，不自动安装 OpenSpec。

### 已有规格找回

新增或修改行为前，流程先查找正式 Requirement 和活动 change，避免重复 Capability。复杂解析、版本、新鲜度和确认记录归 Forge；Team Standards 只提供工作流与薄 Hook，不复制 Forge 算法。

### 按影响维护

规格、概设、详设和验证已改为独立判定。恢复既有行为的 Bug、文案样式或等价重构不再机械创建空 change 或补写全部设计；新增、修改、删除可观察行为时才更新相应 Requirement、Scenario 和受影响设计章节。

### 执行与分支模型

相关任务默认复用分配分支，以原子提交隔离。共享工作区只允许一个写入会话；独立发布、高风险实验、冲突实现或明确并行需求才由宿主分配额外分支或工作树。Forge execution 负责范围、写入权和验证状态，插件消费结果。

---

## 本轮建议目标

下一阶段应优先完成“真实宿主闭环”，而不是继续增加规则数量。当前单元、集成、CLI 和隔离 Agent 试点已经证明核心组件可以工作，但尚未证明 Codex 与 Claude Code 在普通开发请求中稳定加载新版本 Skill、触发 Hook，并在真实项目中完成整个流程。

### 优先级一：真实宿主端到端验收

在隔离测试项目或明确授权的试点项目中，分别用新开的 Codex 和 Claude Code 会话验证：

1. 只给出普通业务需求，不点名 Skill、不要求初始化设计、不提供 JSON。
2. Agent 自动执行影响判定，查找已有 Requirement、设计和模块绑定。
3. 空白模块能形成真实设计与绑定；已有文档无 JSON 时原位复用，不产生重复正文。
4. 行为保持任务不创建空 change；行为变化任务正确复用或创建 change。
5. 实施前完成 Forge execution 或兼容治理绑定，写入范围准确。
6. 写前、提交前、Stop 等宿主事件是否真实触发要保留事件证据。
7. 验证通过后同步当前设计，原子提交后释放 execution；不自动部署或归档。
8. 故意制造一次范围外写入、过期设计或未确认规格，确认 warn/block 行为与配置一致。

### 优先级二：Codex 版本与触发可靠性

Codex 当前安装缓存仍是 4.4.0。先通过正式插件市场升级流程安装源码对应版本，在新任务中确认 Skill 根路径和 manifest 版本。禁止直接修改插件缓存来制造“已升级”假象。

验收需要区分：源码已发布、插件已安装、新会话已加载、Skill 被路由、Hook 被宿主调用、检查结果实际阻断。这六个状态不能合并成一个“已生效”。

### 优先级三：Forge 跨仓契约一致性

如果修改 Forge execution、已有规格解析、上下文或验证证据流，必须同步 Forge 仓库唯一权威的 `docs/ai-coding-architecture.md`，并分别提交两边改动。Team Standards 保留稳定工作流和适配边界，Forge 保留解析、状态、执行与审计实现。

### 优先级四：减少双轨治理复杂度

检查 4.7.1 的 Forge execution 与旧 OpenSpec governance 分流是否存在重复状态、重复错误码或相互矛盾的恢复建议。只有 Forge 实时确认 `NO_SPEC_CHANGE` 才能跳过 change-only 检查；行为变化仍保留完整 Delta 治理。优化时应收敛用户看到的诊断和恢复步骤，不删除仍用于兼容的旧证据链。

---

## 建议实施顺序

1. 从 `CLAUDE.md`、`README.md` 和上述协议恢复上下文，检查源码、安装版本和工作区状态。
2. 在 Forge 仓库找到 `docs/ai-coding-architecture.md` 及当前 execution 实现，核对两仓契约；只读阶段不要先改业务项目。
3. 写出 Codex、Claude Code 两套真实宿主验收计划，列明插件版本、session、事件、模式、项目、预期规则码和原始证据位置。
4. 先安装并确认当前源码版本，再开新会话执行端到端任务；旧会话不能作为新版加载证明。
5. 根据真实失败修复 Team Standards 或 Forge 责任范围内的问题。修改共享契约时先预览同步，再分别验证消费者。
6. 运行受影响专项测试，再运行完整 Hook 回归、文档引用、版本一致性和 Skill 审计。
7. 形成具名内容审阅和真实宿主证据，更新权威协议、架构说明和升级说明。
8. 使用原子提交分别提交关联仓库；按各仓授权决定 push、安装、服务重启和部署。

---

## 验收矩阵

| 编号 | 场景 | 必须观察到的结果 |
|---|---|---|
| H1 | Codex 新会话普通开发请求 | 自动进入影响判定；不要求用户补充初始化口令或 JSON |
| H2 | Claude Code 新会话普通开发请求 | 与 Codex 采用同一语义流程，保留宿主事件差异证据 |
| H3 | 空白模块 | 形成真实概设、详设、稳定功能编号、绑定和验收关联 |
| H4 | 已有设计无绑定 | 复用原文档并自动建立绑定，无重复正文 |
| H5 | 已有绑定功能修改 | 只同步受影响功能、规则与证据，不靠更新时间制造新鲜度 |
| H6 | 行为保持 Bug | 引用既有规则，不创建空 Delta；设计仅在机制变化时更新 |
| H7 | 新增或改变行为 | 找回既有 Requirement，正确使用 ADDED、MODIFIED、REMOVED 或具名 NEW_CAPABILITY |
| H8 | 规格歧义 | 保持未确认，只有阻塞业务实施的真实歧义才询问用户 |
| H9 | 范围外写入 | Forge execution 或对应 Hook 拒绝，并返回可执行恢复建议 |
| H10 | 并行写入 | 不覆盖他人脏文件，不通过换 session 或重建绑定认领差异 |
| H11 | 验证输入改变 | 旧验证失效，必须执行适用的新验证后才能完成 |
| H12 | 纯咨询和只读调查 | 不创建 change、设计、绑定或项目文件 |
| H13 | 插件升级 | 历史绑定和证据保持可追溯，不重复初始化或静默升级旧 PASS |
| H14 | warn、block、off | 实际行为与配置一致；注册存在不能替代宿主触发证据 |
| H15 | 未启用 OpenSpec 项目 | 保持兼容路径，不自动安装或伪造 OpenSpec 工件 |
| H16 | 交付完成 | 规格、设计、实现、验证和提交一致；部署、归档、push 仍遵守各自授权 |

至少 H1、H2、H3、H4、H6、H7、H9、H12、H14 必须有真实 Agent 和宿主事件记录，不能只用脚本单元测试代替。

---

## 必须提交的材料

- 更新后的 Skill、协议、Hook 或 Forge 适配代码，以及对应权威文档。
- Codex 与 Claude Code 的实际安装版本、加载路径、新会话标识和事件记录。
- 每个端到端场景的需求原文、Agent 决策、文件差异、规则码、验证命令与结果。
- 完整测试结果及失败修复记录；明确区分单元、集成、CLI、模拟 Hook 和真实宿主证据。
- 兼容与升级说明，包括旧绑定、旧 governance session、历史证据和回退策略。
- Forge 契约改变时，两仓对应提交及 `docs/ai-coding-architecture.md` 的同步说明。
- 已自动化、仍由 Agent 语义判断、依赖项目配置、依赖宿主接线的能力清单。

---

## 职责与安全边界

- 不用空模板、日期刷新、假 Requirement、假验证或自动编造收益满足检查。
- 机器检查证明结构、关联、范围和新鲜度，业务合理性仍需具名审阅。
- 不因历史文档残缺重写全模块；只补本次影响，其他缺口登记责任和完成安排。
- 不覆盖任务开始前已有改动，不把并行任务的正文或配置认领为当前任务成果。
- 不把 Skill 指令、Hook 注册或 CLI PASS 宣称为所有宿主已强制生效。
- 不自动部署、自动归档、自动启用 block、自动重启服务或修改业务项目。
- 不在项目 Agent 入口复制整套通用规则，也不写死插件版本；项目只声明采用 Team Standards 及特有路径和约束。
- 不将 Team Standards 变成 Forge、Graphify 或 OpenSpec 的实现副本。

---

## 工作区和升级注意事项

当前源码工作区已有两项非本交接任务产生的存量状态：

- `plugins/team-standards/skills/init-project-docs/references/onboard-workflow.md` 显示修改，当前没有实质 diff。
- `plugins/team-standards/plugin.json` 为未跟踪旧 sidecar，版本为 4.1.3，不属于三个正式 manifest。

接手人不得擅自删除、覆盖或纳入提交。正式版本以根 marketplace、Claude manifest 和 Codex manifest 三处一致为准。维护 `CLAUDE.md` 后应运行 `node scripts/sync-agents.js` 生成 `AGENTS.md`，不要直接编辑派生文件。

当前源版本 4.7.1 已安装到 Claude Code；Codex 仍需用正式 marketplace upgrade/add 流程更新，并在新任务中验证。安装成功只证明载荷进入缓存，不证明当前会话已重载。

---

## 可直接转发的任务说明

> 请基于附件继续优化 Team Standards。当前源码基线为 4.7.1，已完成自动概设／详设维护、已有 Requirement 找回、按影响独立判定和 Forge execution 分流。下一阶段优先完成真实 Codex 与 Claude Code 新会话端到端验收，重点证明普通开发请求无需点名 Skill、初始化设计或提供 JSON，即可自动完成规格与设计发现、必要维护、绑定、实施、真实验证和交付。
>
> 请先核对源码版本、宿主实际安装版本和 Forge 权威架构，再执行附件验收矩阵。根据真实宿主失败修复现有入口，优先复用 `change-readiness`、`init-project-docs`、`delivery-verification`、现有治理检查器和 Forge execution，不新增需要用户主动调用的平行 Skill。规格、概设、详设与验证继续按影响独立判断，行为保持不创建空 change，业务变化先找回既有 Requirement。
>
> 请保留旧绑定、历史证据、同文件概设／详设和未启用 OpenSpec 项目的兼容路径；保护已有未提交改动。不得以模拟测试证明宿主已触发，不得以字段齐全代替内容正确。若改变 Forge 联动契约，同步 Forge 仓库唯一权威的 `docs/ai-coding-architecture.md` 并分别提交两仓改动。
>
> 最终交付更新后的规则与实现、Codex／Claude Code 真实宿主记录、完整测试证据、兼容升级说明，以及已自动化和仍依赖项目或宿主接线的明确边界。不要修改未获授权的业务项目，不自动部署、归档、启用 block 或重启服务。
