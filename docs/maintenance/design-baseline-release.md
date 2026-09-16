# 4.2.0 当前设计基线交付记录

## 版本、来源与支持范围

目标版本 4.2.0；源码提交以本文件所在发布提交的 Git 历史为准，避免自写最终哈希递归。开发起点 `3d4bfb5`，依据 2026-09-16 的《team-standards 开发交接：当前设计基线与独立增量治理》。源仓当时已有 policy/checker 2、bind/check/record、阶段检查、视图、范围及指纹；新增能力沿用这些机制。

运行最低 Node 18；本轮实测 Windows、Node 24.16.0、OpenSpec 1.6.0。Linux/macOS 和其他 Node/OpenSpec 版本未在本轮实测。Claude 风格 Hook 适配器由模拟事件运行测试覆盖，Codex/Claude 桌面真实宿主触发未验证；不因安装或 CLI PASS 宣称已强制保护。项目 CI/分支保护尚未接线，本轮只验证干净 Git checkout 下的 CI 命令。

安装升级沿用 [README 安装入口](../../README.md#安装)，不要直接修改缓存；发布后从既有插件市场更新并重新加载。需要可复现 CLI/CI 时使用本发布提交的独立 checkout（Node 脚本无新增第三方依赖），将 plugin 变量指向 `plugins/team-standards`；用 `git log -1 --format=%H -- docs/maintenance/design-baseline-release.md` 获取相应提交。新安装不会自动开启 block、安装全局 Hook 或接入业务项目。

## 交付内容及职责

| 范围 | 最终职责 |
|---|---|
| change-readiness、生命周期、设计输出与文档工作流 | 当前基线/独立增量分工，原目标与验收边界匹配，切片交付同步 |
| markdown-writing-standards、delivery-verification | 受影响正文原位维护与真实验证；相关输入分别失效 |
| hooks/governance/baselines.js | 单一模块映射、章节、共享/迁移范围、基线更新与冲突诊断 |
| evidence.js、service.js、storage.js、治理 CLI | 在原记录中检查基线，policy/checker 3，S 类路径与验证子集 |
| design-baselines.v1.schema.json、openspec-governance.v1.schema.json | 正式模块绑定及扩展审阅输入契约 |
| init-project-docs、init-ai-structure.mjs | 只读 status/plan、显式 apply、幂等保留及项目适配 |
| governance.test.js | Git 范围、指纹、CLI、模拟 Hook、接入和迁移回归 |

完整最小绑定、同文件章节复用、多模块共享、字段及路径约束见 [正式协议与示例](../../plugins/team-standards/skills/change-readiness/references/current-design-baseline.md)。可执行的发现、计划、应用、切片检查、CI 命令及项目 Agent 步骤见 [AI 原生项目适配指引](../../plugins/team-standards/skills/init-project-docs/references/design-baseline-adoption.md)。未另建初始化器或 OpenSpec 同步/归档引擎。

## 验收矩阵与证据性质

审阅身份：Codex 主任务 Agent，自审；未进行独立专家或人工验收。规则语义场景固定输入及预期如下；机器测试仅证明结构、范围、引用与指纹，不能证明业务描述真实。原始结果见 [完整回归](evidence/design-baseline-full.txt) 与 [最终治理复验](evidence/design-baseline-final-governance.txt)。

| 编号 | 固定输入与预期 | 本轮结果/证据 |
|---|---|---|
| A1 | 同订单模块原 change 为重试修复，新请求为独立导出；应新建 change 并引用前序 | Agent 规则审阅通过；dedup 要求原目标/验收/阶段，机器不做语义判定 |
| A2 | 原重试 change 补遗漏验收或仅恢复会话；应沿用并使相关证据失效 | Agent 规则审阅通过；原有 migration、bind 和 stale 测试通过 |
| A3 | 只改返回细节；详设 updated、概设 already-covered | 自动化通过，不要求形式化修改两个文件 |
| A4 | 恢复已接受行为/纯样式且理由明确；允许 S 类无 change | 自动化通过；两文件/30 行边界与具名审阅保留 |
| A5 | 受管代码无模块、正文或显式 gap | 自动化通过：缺口诊断，gap 只可 preflight，delivery 拒绝 |
| A6 | 只刷新日期、空标题 | 自动化通过：BASELINE_NO_CHANGE；语义相关性仍需审阅 |
| A7 | 目标尚未实现，implemented=false | 自动化拒绝；Agent 核对规划继续留在 change，布尔声明不能替代业务核验 |
| A8 | task 1.1 完成，1.2 待办 | 自动化通过切片 delivery、拒绝整 change archive |
| A9 | 同一长期文件两个章节；误绑活动 change | 自动化分别通过/拒绝 |
| A10 | 重命名两端、共享多模块、移除旧 managed 归属 | 自动化覆盖 scope、shared/歧义和迁移拒绝；实际消费者仍由内容审阅补齐 |
| A11 | 两个 change 修改同 Requirement/已有记录的当前章节 | 确定性扫描与明确顺序；Requirement 冲突自动化通过；未 record 的章节意图依赖审阅 |
| A12 | 审阅后代码变动、已提交 diff、他人脏文件 | 自动化 stale、CI base/head 与脏归属测试通过 |
| A13 | 当前正文措辞改变而代码输入未变 | 自动化保留运行指纹；子集不得漏场景输入，文档仍须复核 |
| A14 | status/plan、首次 apply、重复 apply、不同升级候选 | 自动化与实际 Node CLI 通过；保留已有字节，报告候选差异 |
| A15 | 旧 policy 1/2 或未知 99 | 自动化保留原基线迁移；旧 PASS 不直接晋升，未知版本拒绝 |
| A16 | 真 OpenSpec CLI、干净 Git CI、模拟 Hook warn/block | CLI/CI/模拟事件已执行；真实桌面宿主、远端 CI/分支保护未验证 |
| A17 | 主分支已实现但生产未部署 | Agent 规则审阅通过：codeVersion 只描述代码，生产必须另引发布证据 |
| A18 | 外部 store、多 change CI、过大范围 | 原有路径/范围拒绝与新增上限测试；不支持项明确报错，不能静默漏检 |

## 策略、升级与恢复

默认未接入模块清单的项目保留原治理行为，discover 返回 not-enrolled；不声称已验证当前基线。接入后 CLI 缺口退出 2，执行错误退出 1；Hook 默认 warn 不阻断，off/warn 不是 PASS。项目实际试点后显式启用 block，存量 gap 不可永久绕过严格交付。

从 policy/checker 2 升到 3，原 session/change 重新 bind 保留起始 Git base、累计范围、初始他人改动和重试预算，清除旧交付标记；重新审阅及必要验证后 record。输入未变的真实运行证据可复用，不因 record 声称重新执行。回退使用旧套件与匹配旧策略证据，保留项目正文、模块清单及历史；不删除绑定来逃避范围检查。

限制：每次最多 1000 指纹文件、单文件 4 MiB、单外部命令 5 秒、100 个活动 change 冲突扫描、50000 文件接入盘点。远程制品解析与外部 store 不支持，原始验证结果须可随 Git 提交获取。单次 CI 只支持一个 change 的完整比较范围；多 change 聚合需分开交付基线，不按时间覆盖。

套件完成与项目完成分别报告。本轮没有修改 Yoooni One；下一阶段由项目 Agent 执行适配指引、整理样衣已验收基线，并迁出独立目标，不能自动归档全部旧 change。

## 最终验证记录

在独立 detached worktree 中，仅复制本次改动，排除既有 onboard-workflow.md 和未跟踪 plugin.json。原生验证结果：

- `npm run test:full --prefix plugins/team-standards/hooks`：197/197，通过；0 失败、0 跳过，约 135 秒。包含真实 OpenSpec CLI、干净 Git CI、原接入器回归及 Codex CLI 隔离市场安装。
- 最后增加起始正文脏归属保护与显式 session Hook 模式测试后，`node --test plugins/team-standards/hooks/tests/governance.test.js`：34/34，通过；0 失败、0 跳过，约 127 秒。此为受影响范围复验，未重复无关全量测试。
- `node --test scripts/tests/workspace-maintenance.test.mjs`：9/9，通过。
- `sync-agents.js --check`、`check-cross-refs.js`、`check-version-sync.js`、`audit-skills.js --warnings --ci` 和 `git diff --check` 通过；版本 4.2.0、16 个 Skill、0 审计警告。
- Python jsonschema 4.26.0 验证两个 Draft 2020-12 schema，并校验 S 类空 OpenSpec artifacts、验证子集及模块绑定样例，通过。该工具仅用于维护验证，不新增运行依赖。

真实 OpenSpec 测试通过 `OPENSPEC_TEST_CLI` 指向本机 1.6.0 的 `bin/openspec.js` 启用；原始日志保留全部结果。工具 API 测试中的“PASS”不等于人工验收或真实桌面宿主触发。未修改安装缓存、业务项目或远端 CI 配置。
