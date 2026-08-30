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
5. 用户要求完成/关闭该变更，或项目明确配置自动归档策略，且任务、验证、同步条件全部满足时，使用 OpenSpec 的 archive Skill 或 `openspec archive <name> --yes --json`。归档命令负责更新主 specs 和保留审计轨迹。
6. 尚不满足归档条件时保持 change 活动，回显未完成任务、验证问题和下一动作。

## 降级与失败处理

- 没有 `openspec/config.yaml`：使用 legacy 设计流程。
- 配置只有空模板、CLI 不可用、change 无法创建或 schema 无法解析：明确阻断并说明修复动作，不静默降级。
- 用户明确批准当前变更使用 legacy：回显批准范围和原因，只对本次变更生效；不得将一次批准固化为项目默认。
- OpenSpec 生成 Skill 缺失但 CLI 正常：继续使用 CLI 协议，不因此降级。
- CLI 与项目生成 Skill 版本漂移：运行项目级 `openspec update` 前先报告将产生的文件变化；更新工具集不是普通需求实施的隐式副作用。
