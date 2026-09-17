# 自动设计维护交付记录

## 目标与实际结果

版本 4.4.0 将“识别模块 → 查找权威设计 → 补建/更新 → 建立绑定 → 实施同步 → 验证交付”纳入现有开发 Skill。用户不再需要单独提出初始化设计或编写候选 JSON。Agent 负责事实、业务写作与审阅，脚本只发现候选、保存起点和安全合并；不会自动生成空模板或推断业务收益。

核心入口为 [自动维护协议](../../plugins/team-standards/skills/change-readiness/references/automatic-design-maintenance.md)及 [design-baseline.js](../../plugins/team-standards/skills/init-project-docs/scripts/design-baseline.js)。change-readiness 触发 prepare/upsert，init-project-docs 提供内部能力，delivery-verification 核对交付。项目 Agent 入口只需声明采用及项目特有约束，不复制通用规则，不写死版本号。

prepare 不重置同 session 的起点；upsert 合并单模块并保留其它配置，不改正文。已有脏文件、并行 registry 修改、准备后文档变化、源码提前写入、停用模块自动恢复均有明确拒绝和修复路径。初次治理 bind 可以接纳本任务准备的设计与配置，不把它们误认作他人改动；业务源码仍在 bind 后修改。

## OpenSpec 与兼容

已启用 OpenSpec 的项目仍用官方 change 工件驱动本次目标，模块当前设计只接受已验证切片；不复制整个模块设计，也不自动归档。新模块预建的长期正文标明规划/实现状态，验证后同步正文、功能索引和证据。

未启用 OpenSpec 的项目不自动初始化它。content.specMode: local 可引用已有设计中的规则与直接下级验收章节；已有 OpenSpec 配置时不能使用该旁路。legacy 非 S 类交付仍由原生验证、设计检查和具名审阅承担，不能声称执行了 OpenSpec bind/record。

旧 --baselines/--bindings 初始化入口继续兼容且保留原来的不覆盖行为；新的 Agent upsert 承担已确认模块的定向合并。内容缺口保留 migrate 及责任/节点；新模块必须在交付前完成适用要求，存量只补本次影响，不强制重写全模块。

## 八项验收覆盖

| 场景 | 证据 |
|---|---|
| 空白模块 | 当前 Agent 隔离试点：无设计/无绑定，写作、自动建绑定、实现与交付完整执行；准备集成回归 |
| 有设计无 JSON | 定向测试发现并复用同文件双章节，原正文逐字节保持 |
| 有绑定的功能修改 | 原内容治理回归、正文/证据失效检查；upsert 定向更新且保留其它模块 |
| 存量残缺 | 自动迁移集成验证完成当前切片并通过交付；migrate 仍保留实际缺口，不冒充严格内容 PASS |
| 新增/删除/替代 | 既有功能影响与引用回归继续通过，自动准备接入同一交付链路 |
| 并行工作区 | 初始脏文档、初始配置改动、并行 registry、文档陈旧和提前源码拒绝测试 |
| 纯咨询 | discover 不写项目或个人状态，未绑定项目正常返回候选与缺口 |
| 插件升级/重复接入 | 同 session 保留起点；下一任务 upsert 返回 unchanged，Git 工作区干净，历史证据保留；停用模块不自动复活 |

## 当前 Agent 实际试点

执行者为 Codex `/root`，使用开发源码入口，在 Windows / Node 24.16.0 / OpenSpec 1.6.0 的隔离 Git 项目中执行。试点需求是“借期必须为 1 至 7 天整数，其它输入拒绝”；不是 Yoooni One 的新增业务需求。该项目预先启用 OpenSpec 作为测试环境，不把测试环境设置计为业务任务自动初始化行为。

1. prepare 返回无绑定、无设计候选，保存干净起点。
2. 当前 Agent 使用官方 CLI 建立独立 change，按真实需求编写八章概设、九项详设；长期正文先标规划中。
3. 内部 upsert 自动建立真实绑定与功能索引；用户没有提供候选 JSON。官方 strict validate 通过。
4. 治理 bind 后才写函数与测试；原生测试 2/2 通过，覆盖两端边界、内部值和非法类型/数值。
5. 原位同步正文为已验证，保持未上线；更新规格/验证关联。代码测试和配置检查分别记录范围及摘要，具名 Agent 审阅明确不等于人工批准。
6. record/delivery 通过，提交后显式 base/head 的 CI 通过；导出 Git bundle，再克隆到另一目录，独立 CI 复验通过。
7. 下一任务重新 prepare/upsert 返回 unchanged，文档/绑定不重复生成，Git 工作区保持干净。

原始过程保留失败与修正：首次计划误用了 Markdown 展示编号 1.1，读取官方 instructions 返回的真实 task ID 1 后修正；这不是业务代码失败。提交后试点发现旧 CI 将计划数组顺序与排序摘要直接比较，造成多文件 CI_INPUTS 误报；现统一 Git 版本摘要顺序，新增提交后回归并复验通过。

- [完整 Agent 命令记录](evidence/automatic-design-agent-transcript.json)：实际输出及失败修正均保留。
- [可克隆的试点 Git 包](evidence/automatic-design-pilot.bundle)：包含需求、概设/详设、绑定、函数、测试、OpenSpec 工件和交付证据。
- 试点起始提交：`17eee25b5132c96d230c373ae2d0c590b16cd4cd`。
- 试点交付提交：`2ba2a749fbf3207d085bef0d56c899acceaf0706`。

复现时从 bundle 克隆到临时目录，用当前套件执行：

```powershell
node $governance check --repo $pilot `
  --base 17eee25b5132c96d230c373ae2d0c590b16cd4cd `
  --head 2ba2a749fbf3207d085bef0d56c899acceaf0706 `
  --evidence openspec/changes/add-loan-policy/governance-evidence.json --phase delivery
```

## 验证与边界

完整回归 229/229 PASS，无失败或跳过，含真实 OpenSpec CLI 及隔离插件安装：[完整输出](evidence/automatic-design-full.txt)。试点发现 CI 顺序问题后，提交/CI/自动准备定向回归 3/3 PASS：[最终 CI 回归](evidence/automatic-design-final-ci.txt)。最终准备流程回归 10/10 PASS，覆盖停用模块保护：[准备回归](evidence/automatic-design-final-preparation.txt)。

本次证明当前 Agent 能按更新后的流程实际完成任务，且脚本/治理链路可复验。**没有证明每个宿主的每次普通请求都自动加载 Skill**；宿主触发率、写前/Stop 事件及阻断仍须真实宿主验收。Agent 指令不是物理隔离，未接线项目不得宣称 CI/Hook 已强制执行。Yoooni One 未修改、未部署，未执行真实业务项目阅读验收。

## 升级与回退

存量迁移最终集成回归 1/1 PASS：[迁移回归](evidence/automatic-design-final-migration.txt)。

registry schemaVersion 保持 1，准备状态单独 version 1，治理 policy/checker 为 5。旧绑定和证据保留，既有 session 按原方式重新 bind 后核验并 record；新准备阶段必须发生在本任务项目写入前，不能事后认领旧改动。不要删除状态、换 session 或降低 enforce 来绕过归属。

旧模式仍可显式使用。回退固定旧插件与其匹配证据，不覆盖业务正文；新增 local 内容模式需保持匹配检查器，不能让旧版静默当作已支持。不会自动部署、归档或开启宿主 block。
