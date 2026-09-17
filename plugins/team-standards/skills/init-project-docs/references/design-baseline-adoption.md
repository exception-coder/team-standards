# AI 原生项目适配：当前设计基线

普通开发任务由[自动设计维护流程](../../change-readiness/references/automatic-design-maintenance.md)在内部完成准备、业务写作和绑定合并，不要求用户提供候选 JSON。下方 --bindings 流程保留为显式接入/旧流程兼容入口；其“不覆盖已有清单”不限制新 upsert 对已确认模块的安全合并。

## 输入与授权范围

适配 Agent 先读取项目 AGENTS、现有索引、主规格、活动 change 和套件 [正式协议](../../change-readiness/references/current-design-baseline.md)。本指引只接入项目实际路径与验证入口，不要求项目重新设计协议。套件升级不代表项目已接入；仅 status 请求不授权 apply，不改业务代码、不部署、不自动同步/归档历史 changes。

## 固定工具与只读盘点

在 PowerShell 设置项目根与已安装的固定版本插件根。路径由实际安装结果确定，不能编辑插件缓存：

```powershell
$project = (Get-Location).Path
$plugin = 'C:/path/to/team-standards/plugins/team-standards'
$initializer = Join-Path $plugin 'skills/init-project-docs/init-ai-structure.mjs'
$governance = Join-Path $plugin 'scripts/openspec-governance.js'
node $initializer status --root $project --baselines --json
node $governance discover --repo $project
node $governance doctor --repo $project
```

status 缺失/缺口返回 2，未接入只报告，不创建文档。doctor 显示 CLI 和宿主状态；UNVERIFIED 不是失败触发测试的替代品。Linux/macOS 使用相同 Node 脚本，shell 变量语法自行适配；本版实测平台见源码交付记录。

1. 识别实际受管目录、稳定模块、capability 和维护责任；核对共享代码与删除/迁移路径。
2. 读取已有概设/详设/交接章节，结合源码与真实测试判断是否能复用。不要按文件名猜覆盖，也不要先生成目录树。
3. 将缺口登记为 gap 和具体责任/计划，分阶段整理；不能自动将全部 changes 同步进主规格。
4. 在项目已忽略的临时目录（或系统临时目录）准备 bindings.json，格式完全使用正式协议示例。长期唯一映射始终是 `.team-standards/design-baselines.json`，临时候选不作为另一份维护入口。

## 计划与应用

```powershell
$candidate = Join-Path ([IO.Path]::GetTempPath()) 'team-standards-bindings.json'
node $initializer plan --root $project --baselines --bindings $candidate --json
node $initializer apply --root $project --baselines --bindings $candidate --json
node $initializer status --root $project --baselines --json
```

plan 列出 create/preserved/needs-bindings、复用模块、缺口及 CLI/CI/Hook 接线状态。明确接入授权后 apply 仅创建缺失清单；已有绑定和所有正文按字节保留，重复运行无差异。升级候选不同会报告 proposedDifference，由 Agent 审阅后原位合并必要字段，不覆盖项目配置、编码或历史证据。脚本不修改 package.json、工作流或全局 Hook；下列接线由适配 Agent 合入项目既有验证入口，实际检查后再报告已启用。

## 真实增量试点

先核对原目标、验收边界与阶段，独立新目标通过项目官方 OpenSpec Skill/CLI 新建 change；会话恢复和原目标修正沿用原绑定。使用官方 schema 返回的实际工件路径，准备正式 plan，不猜任务编号。

```powershell
$session = 'project-trial-01'
$change = 'actual-change-id'
$plan = Join-Path ([IO.Path]::GetTempPath()) 'team-standards-review.json'
$env:TEAM_STANDARDS_GOVERNANCE_SESSION = $session
$env:TEAM_STANDARDS_OPENSPEC_GOVERNANCE_HOOK = 'warn'
node $governance bind --repo $project --session $session --change $change --plan $plan
node $governance check --repo $project --session $session --phase preflight
node $governance snapshot --repo $project --session $session
# 实施当前切片，执行项目真实验证；将验证时指纹与原始结果引用填入 plan。
# 同步受影响长期正文和可独立接受的主规格；未完成目标保留在 change。
node $governance record --repo $project --session $session --plan $plan --phase delivery
node $governance check --repo $project --session $session --phase delivery
```

无宿主 session ID 时使用以上显式环境变量，恢复任务沿用同值。S 类省略 `--change`，按协议填写 smallChange 和 small 任务映射。不要用 S 类声明掩盖接口/状态改变。

通过后将实现、受影响正文与可复现证据按项目提交规范一起提交。完整 change 未完成时保持活动；归档前再核对全部任务、主规格、设计晋升和已有授权，使用官方 OpenSpec 同步/归档工具。

## CI 与宿主分别接线

CI 固定套件版本和真实 CLI 版本；检出干净 head，确保 base 可取得。将下列命令接入项目已有 CI job，并按项目权限配置分支保护：

```powershell
$base = 'actual-base-commit'
$head = 'actual-head-commit'
$evidence = "openspec/changes/$change/governance-evidence.json"
node $governance check --repo $project --base $base --head $head --evidence $evidence --phase delivery
```

证据 base 必须与 bind 起始基线一致；CI 无需个人会话缓存。S 类 evidence 用 record 返回路径。多 change 混合提交不支持单条命令聚合，不能忽略其它可执行变化；拆成可独立交付基线，或保持明确未支持状态。

warn 试点应故意制造一次缺口，确认宿主真实写前/Stop 事件调用了共享检查；CLI 成功或模拟 payload 测试不能证明宿主已接线。恢复后验证成功，再由项目明确启用 block。Codex/Claude/Linux/macOS 各自记录真实触发情况；未执行组合保持 UNVERIFIED，并使用显式 CLI。off/warn 不称为强制门禁。

## 常见诊断与升级回退

| 诊断 | 处理 |
|---|---|
| MODULE_UNBOUND / MODULE_AMBIGUOUS | 补齐真实归属；共享多模块全部明确 shared，勿删除 managed 来隐藏 |
| BASELINE_MISSING / BASELINE_HEADING / BASELINE_EMPTY | 复用或整理真实当前正文；存量 gap 只能先规划，严格交付前补齐 |
| BASELINE_NO_CHANGE | 核对是否已覆盖；updated 必须有相关正文差异，不能刷新日期 |
| BASELINE_UNVERIFIED / BASELINE_SYNC | 审阅已实现切片和行为接受范围；未实现目标不能晋升 |
| BASELINE_CONFLICT / MODULE_MIGRATION | 补依赖、顺序、旧新路径及消费者；合并后重新验证 |
| VERSION_MISMATCH / BASELINE_VERSION | 固定匹配版本；旧策略同会话重新 bind 后核验并 record，未知版本先迁移 |
| DIRTY_BASELINE_OWNERSHIP | 当前正文在任务开始前已修改；先分离到独立工作树，不能占用他人差异 |
| CODE_STALE / REVIEW_STALE / VERIFICATION_INPUTS_STALE | 仅重新核对受影响输入；保留仍有效的无关运行验证 |
| CI_SCOPE_GAP / PATH_SCOPE / INPUT_LIMIT | 按公开支持范围拆分交付或修正路径，不跳过额外变化 |

回退时固定先前套件版本，并使用该版本对应的证据；新模块清单和项目正文保留。撤销接线须按项目变更流程回退具体提交，不能删除审阅/验证历史或借换 session 重置起始基线。

## 项目交回结果

报告绑定覆盖、基线缺口、实际验证命令与结果、CLI/CI/宿主真实启用状态、warn/block 策略及试点提交。Yoooni One 下一阶段再整理样衣已验收基线，把独立新目标留给独立 change；本套件开发不替业务项目执行这些步骤。


## 4.3 业务内容盘点与渐进迁移

先只读盘点原概设/详设的目标读者、章节、功能编号、状态及规格/证据关联，确认权威正文与重复历史。保留已有同文件双章节和历史链接，先列出缺口，不自动全量重写或移动文档。依据[内容契约](../../change-readiness/references/design-output-contract.md)和[完整样衣示例](../../change-readiness/references/examples/garment-sample-overview.md)核对业务阅读结构。

未接入模块显示 not-enrolled，不能回报内容已合格。准备迁移时向已有模块登记 content version 1、mode migrate、migration.owner/due/reason；具体字段见[内容治理协议](../../change-readiness/references/design-content-governance.md)。每次独立切片补齐受影响业务功能，余下缺口仍保留计划；完成全模块结构、关联和具名审阅后改 enforce。原 initializer apply 只创建缺失绑定，不覆盖已有清单；已有项目应审阅差异后定向修改 registry，再用 status 复核，不能指望 --bindings 自动覆盖旧文件。

执行沿用上面的真实路径变量：

```powershell
node $initializer status --root $project --baselines --json
node $governance discover --repo $project
# 完成实际文档同步及验证后，使用既有 session 获取内容审阅摘要。
node $governance snapshot --repo $project --session $session
# 将真实具名审阅写入 plan.review.content，功能影响写入 functionImpacts。
node $governance record --repo $project --session $session --plan $plan --phase delivery
node $governance check --repo $project --session $session --phase delivery
```

Yoooni One 试点先固定已提交来源，避免占用并行工作区改动；整理样衣概设首页及功能详设，逐一确认状态与证据，再邀请领导/产品/研发/测试按各自问题阅读验收。完成一次新增功能的独立 change → 已验证切片 → 当前正文同步，检查无重复正文、旧描述或失效引用。套件示例与自动测试不等于业务试点已验收，更不自动授予业务代码或部署权限。

策略/检查器现为 5；旧 session 同名重新 bind 后 record，保留起始基线及历史证据。内容检查报 CONTENT_* 时修正真实缺口，不通过改标题、删功能索引或降级 enforce 规避。
