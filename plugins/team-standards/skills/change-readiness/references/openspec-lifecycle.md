# OpenSpec 自动生命周期

## 目标与边界

本参考把开发者的自然语言需求自动路由到 OpenSpec，不要求开发者手工发起命令。它只编排 OpenSpec 官方 Skill 和 CLI，不复制 artifact schema、模板、同步算法或归档实现。

OpenSpec 配置存在且包含真实 `context` 时：

| 档位 | OpenSpec 要求 |
|---|---|
| S | 不改变可观察行为、接口、状态、字段、事件或跨模块契约时，可以不新建 change；必须回显判断依据 |
| M | 必须匹配或创建 change，并在实现前完成活动 schema 要求的 planning artifacts |
| L | 必须匹配或创建 change，补齐完整风险、影响、验证与回滚依据后才能实现 |

## 能力选择

优先使用项目由 OpenSpec 生成的 `openspec-*` Skill。Codex 属于 Skills-only 集成，具体入口名由项目安装结果决定，不得假设 `/opsx:*` 一定存在。

生成 Skill 缺失或当前宿主无法调用时，使用 OpenSpec 的 agent-compatible CLI：

```text
openspec list --json
openspec show <change> --type change --json
openspec status --change <change> --json
openspec instructions <artifact|apply|archive> --change <change> --json
openspec new change <change> --json
openspec validate <change> --strict --json --no-interactive
```

不得根据熟悉的 `proposal/specs/design/tasks` 名称硬编码自定义 schema。artifact ID、依赖、状态和真实输出路径以 `status`、`instructions` 返回为准。

## 自动匹配或创建

1. 运行 `openspec list --json` 获取活动 changes。
2. 依据需求目标、受影响 capability 和变更边界筛选候选；对候选运行 `show` 与 `status`，不得只按最近更新时间选择。
3. 恰好一个候选匹配时，公开回显 `Using change: <name>`，并记录本次读取的状态和 artifact 路径。
4. 多个候选仍无法消歧时，列出候选目标与状态，请用户选择；禁止静默合并两个 change。
5. 没有候选时，生成语义明确的 kebab-case 名称并运行 `openspec new change <name> --json`，随后按 schema 顺序读取 `instructions` 创建所有 ready artifacts。
6. planning 完成后运行严格校验；校验失败、artifact 被阻塞或存在未决业务选择时不得开始实现。

查重同时读取相关主规格、活动 changes，必要时追溯归档。主规格已覆盖的需求先核对实现缺失或偏离，不重复添加同名 Requirement。有需要解释的取舍时写入现有 proposal，不强制查重章节，恢复会话优先沿用原绑定。

## 文档推进与阶段准出

| 阶段 | 最小内容及位置 | 准出条件 |
|---|---|---|
| 澄清与查重 | proposal：目标、范围、非目标、候选与选择理由 | 归属明确，依赖的关键业务歧义已解决 |
| 行为规格 | delta specs：Requirement 与正常、异常、边界 Scenario | 行为可观察，预期结果可判定 |
| 概设与详设 | design：适用设计视图、取舍、风险与长期正文映射 | 当前实施切片的关键设计已复核 |
| 实施拆分 | tasks：场景、设计章节、文件范围、依赖与验证方式 | 每项任务有完成依据，先后依赖明确 |
| 实施与验证 | tasks 引用实际结果、偏差及原始验证证据 | 当前交付范围通过验证，规格与设计一致 |
| 同步与归档 | 主规格、长期设计、索引与同步证据 | 满足完整 change 的验收、同步、冲突检查与授权条件 |

阶段名称是团队管理语义，不是 CLI 内置状态；工件路径、依赖仍以活动 schema 为准。每个适用 Scenario 引用设计章节、任务与验证位置。按独立且已获授权的切片推进，未决事项只阻塞依赖它的工作，不要求远期无关任务提前完成。

概设与详设遵循 [设计输出契约](design-output-contract.md)；需要绑定、检查或记录证据时读取 [治理检查器协议](governance-checker.md)。记录复用现有工件与原始测试/CI 结果，机器文件只做结构化索引，不要求额外 validation.md。

## 评审、变更与交接

需求负责人确认业务目标与验收含义，设计/实施负责人维护方案，验证负责人提供结果，交付负责人核对同步与归档。允许兼任，但 Agent 自审必须标为 Agent，不得伪装独立审阅或人工批准。

专家意见记录来源、范围、问题、依据、接受/拒绝/延期结论、责任及复核结果。没有来源时标为待核实建议。改变业务行为先回写 proposal/delta specs，再更新设计、任务和验证；仅改变技术实现从 design 开始；实现或证据缺口落入现有 tasks，不删除验收条件来掩盖失败。

需求变化退回最早受影响阶段，沿依赖更新并使相关证据失效，无关有效证据继续复用。来源冲突时分别保留已接受规格、本次目标、领域知识及运行事实，由相应责任角色确定修复实现还是调整目标，不按文件时间静默覆盖。有效授权可复用，不在每阶段重复询问用户。

暂停保留原 change、有效证据、阻塞和恢复条件；取消或替代记录原因、残留代码/数据影响及接续 change，未实施目标不得晋升主规格，部分落地必须明确保留、回退或转交。关闭取消项不等于成功交付，不伪造已完成 tasks。

仅在暂停、转交或有恢复需求时记录交接，复用 tasks 的一处简短说明：change 与任务范围、仓库/分支/基线、当前阶段及准出缺口、有效规格/设计/验证引用、阻塞责任与恢复条件、下一项可执行任务和未执行的同步/归档动作。恢复时核验原绑定与证据新鲜度，不因为更换会话而另立需求。

若项目已提供 `openspec-propose`、`openspec-continue-change`、`openspec-ff-change` 或同等生成 Skill，优先交给它们创建 artifacts；CLI 仍用于读取结构化状态和验证结果。

## 实施与自动更新

开始编码前读取 `openspec instructions apply --change <name> --json`，以其中的任务、上下文和约束作为实施输入。

实施过程中发生以下任一情况时，先更新 change 再继续编码：

- 目标行为、范围、失败行为或验收条件发生变化；
- 新增接口、字段、状态、事件、依赖、迁移或跨模块影响；
- 实现发现与 proposal、spec、design 或 tasks 不一致；
- 用户追加、撤销或修正需求。

优先调用 `openspec-update-change` 维护既有 artifacts 的一致性。没有该 Skill 时，读取 `status` 返回的 `artifactPaths.<id>.existingOutputPaths` 与相应 instructions，只修改真实现有路径；不要向 glob 形式的 `resolvedOutputPath` 写文件。需要新增尚不存在的 artifact 时，按 schema 的 next-ready 指示继续创建。

任务只有在对应代码、测试或其它声明证据真实存在后才能勾选。实现修改不自动证明 task 完成，OpenSpec 校验也不替代项目测试、数据库、DDL、运行证据或发布制品验证。

## 完成、同步与归档

完成实现后按顺序执行：

1. 重新读取 `status`，确认 planning 完整且任务状态真实。
2. 运行 `openspec validate <name> --strict --json --no-interactive`。
3. 项目提供 `openspec-verify-change` 时调用它；否则按 completeness、correctness、coherence 三个维度执行等价审查并给出代码与测试证据。团队门禁把 CRITICAL 问题视为阻断，即使 OpenSpec 自身只提示。
4. 需要在归档前提前合并 delta specs 时调用 `openspec-sync-specs`；不要自行编写 spec 合并器。
   同步前重新读取主规格并核对基线；同一 Requirement 的并行 changes 先消除冲突，重复同步应无内容漂移。已有长期设计受影响时按已接受实现原位更新，维护必要链接，不能把 proposal/design/tasks 全文拼接进主规格。
5. 用户要求完成/关闭该变更，或项目明确配置自动归档策略，且任务、验证、同步条件全部满足时，使用 OpenSpec 的 archive Skill 或 `openspec archive <name> --yes --json`。归档命令负责更新主 specs 和保留审计轨迹。
6. 尚不满足归档条件时保持 change 活动，回显未完成任务、验证问题和下一动作。

## 降级与失败处理

- 没有 `openspec/config.yaml`：使用 legacy 设计流程。
- 配置只有空模板、CLI 不可用、change 无法创建或 schema 无法解析：明确阻断并说明修复动作，不静默降级。
- 用户明确批准当前变更使用 legacy：回显批准范围和原因，只对本次变更生效；不得将一次批准固化为项目默认。
- OpenSpec 生成 Skill 缺失但 CLI 正常：继续使用 CLI 协议，不因此降级。
- CLI 与项目生成 Skill 版本漂移：运行项目级 `openspec update` 前先报告将产生的文件变化；更新工具集不是普通需求实施的隐式副作用。
