# 开发任务自动维护概设与详设

## 执行责任

已授权新增、修改业务模块的任务自动执行本流程；不等待用户提出“初始化设计”“创建绑定”，不要求用户填写 JSON。普通开发请求已包含必要设计与绑定维护。纯咨询/只读调查只发现和阅读，不调用写入入口；显式范围限制优先。

Agent 负责模块识别、事实核对、业务写作、内容审阅及修复；确定性脚本负责候选发现、任务起点、安全合并和检查。脚本不从文件名猜业务结论，也不生成空模板冒充设计。项目入口只声明采用关系及特有路径，不能把复制整段规则作为本流程启动条件。

## 从请求到开发

1. **保存起点。** 第一次写入项目文档/配置/源码前，复用当前任务 session 调用下方 prepare；读取项目入口、文档索引、既有绑定、主规格及新鲜实现事实。尚无 Git HEAD 时先按项目既有初始化约定处理，不擅自初始化仓库、创建提交或编造基线。普通只读 discover 不写项目或个人状态。
2. **识别业务模块。** 从需求、项目边界和实际文件确定模块范围及责任。候选包含长期 Markdown 的真实标题和入口位置，但不自动认定权威；结合入口引用、主规格和代码核实。存在多份候选时优先确认现行权威，能消除歧义就继续，只有实质归属歧义阻塞任务时询问。
3. **沿用需求驱动。** 启用 OpenSpec 时按现有生命周期匹配/创建 change，维护目标、差异、决策及任务；未启用时复用稳定设计，不自动初始化 OpenSpec。已有空配置或 CLI 故障仍按原准出规则处理，不能通过 local 模式旁路。
4. **形成真实设计。** 有绑定、有正文就原位更新；有正文、无绑定就复用；两者都无时依据需求、规格和事实补建。概设八章、功能详设九项沿用内容契约。新模块尚未交付时长期正文明确规划中/实现中并关联目标，只有已接受且已验证切片才能成为当前能力。存量缺口只补本次影响，余项记录责任、节点和具体内容。
5. **自动维护索引。** Agent 确认实际文件/标题后调用 upsert。缺少 registry 自动创建，已有 registry 仅合并目标模块，保留其它模块、扩展字段和历史配置。命名参数足以创建基本绑定；功能索引由 Agent 根据实际规格/证据形成，内部可以用临时 JSON 传递，不让用户编写候选文件。现有同文件双章节保持兼容。
6. **实施前绑定。** OpenSpec 治理使用与 prepare 相同的 session。plan.files 必须包含本任务新建或修改的 registry 及可执行输入。prepare/upsert 记录允许治理 bind 接纳本任务补建的正文和绑定，但不豁免业务源码提前写入。先 bind，再实施业务代码。

概设/详设内容依据 [内容契约](design-output-contract.md)，绑定字段和内容索引依据 [内容治理协议](design-content-governance.md)。不会因模块 JSON 缺失而要求用户先初始化；正文归属和事实不明则只阻断依赖该事实的部分。

## 实际内部入口

以下命令由 Agent 解析插件真实安装位置和项目路径后执行。用户只需描述开发需求。

```powershell
$design = Join-Path $plugin 'skills/init-project-docs/scripts/design-baseline.js'
# 咨询或盘点：只读，不建立准备状态。
node $design discover --root $project --module $module
# 已授权开发：首次项目写入之前保存任务起点，后续沿用同一 session。
node $design prepare --root $project --session $session --module $module
# Agent 已完成相关正文、核对实际标题；下面变量取项目真实值。
node $design upsert --root $project --session $session --module $module `
  --scope $moduleScope --capability $capability --owner $owner `
  --overview $overviewPath --overview-heading $overviewHeading `
  --detailed $detailedPath --detailed-heading $detailedHeading `
  --code-version $codeScope --migration-reason $actualGap --migration-due $completionMilestone
```

--scope、--capability 可重复；合并范围只增加不静默删除。已绑定模块未传的字段原样保留。新绑定尚未具备完整内容索引时使用 migrate 并写真实缺口；Agent 完成索引后以 `--content <Agent生成的临时索引文件>` 传入 content 对象。新模块必须在本次交付前补齐适用内容、关联和审阅，不可把 migrate 当永久豁免。功能索引不复制业务正文。

准备状态保存在治理用户数据目录，和 session 绑定分开命名；重复 prepare 保留起始 HEAD 与已有脏文件，不重置归属。upsert 不写正文、不创建 OpenSpec、不修改 Hook/CI。原 initializer 的 --baselines/--bindings 兼容入口保留，供旧流程使用；新自动开发流程无需用户另外调用它。

## 实施、同步与交付

Agent 在实现过程中维护本次目标与发现；独立切片完成真实验证后更新功能全景、对应详设、接受的规格和证据关联，再以相同 session upsert 更新受影响模块的索引与代码范围。已有严格模块不能降级为 migrate。

交付前由 delivery-verification 核对：本次新增/更新/删除功能是否都处理、正文与规格及实际结果是否一致、剩余缺口是否真实。使用 snapshot 获取完成审阅时的内容摘要，记录具名审阅，再 record/check。归档时复核完整性，不能把独立切片完成当作整个 change 自动归档。

存量 migrate 模块保留既有基线交付检查；本次受影响内容必须由 Agent 完成并具名审阅，旧模块的全量结构缺口继续报告，不宣称严格内容检查已通过。补齐整个模块后再启用 enforce。不能为一次局部修改无差别改写旧模块。

未启用 OpenSpec 的项目可使用 `content.specMode: local`，把 requirement/scenario 引用指向已有稳定设计中的规则与直接下级验收章节；未交付目标的 change 引用指向本地目标设计。不要为了字段名称创建一套假 OpenSpec。原生构建/测试仍负责实际验证；非 S 类 legacy 没有 OpenSpec bind/record 链路，使用设计盘点与具名内容审阅如实交付，不声称执行了 OpenSpec 门禁。

## 冲突、失败与恢复

| 诊断 | Agent 应执行的修复 |
|---|---|
| 缺少设计/绑定 | 依据事实补建正文，内部调用 upsert；不转交用户填写 JSON |
| DESIGN_DIRTY_DOCUMENT / DESIGN_DIRTY_REGISTRY | 保留任务开始前的修改，使用隔离工作树或与实际所有者解决归属，不换 session 认领 |
| DESIGN_REGISTRY_CONCURRENT / DESIGN_DOCUMENT_STALE | 停止覆盖，重新读取并核对其它任务差异；可确认本任务正文时重新 upsert，跨任务绑定冲突先分离处理 |
| DESIGN_EARLY_CODE | 先分离提前产生的源码；不能把 prepare 当作跳过治理 bind 的许可 |
| DESIGN_PREPARATION_STALE / DESIGN_INITIAL_CHANGED | 原起点或他人初始改动发生变化，保留现场重新确定任务边界；不删除记录规避 |
| DESIGN_SCAN_LIMIT | 使用项目索引/定向源码人工核实归属；超限发现不声称完整扫描，补建设计仍可由 Agent 进行 |
| 文档归属/业务事实仍有关键歧义 | 仅询问阻塞问题；其它独立部分继续推进 |

无需再次询问可逆的必要设计维护是否获准；部署、归档、生产操作和宿主阻断仍按原授权边界。安装更新不自动改写业务项目。插件升级保留旧绑定与证据，策略变化按同 session 重新绑定说明处理，不在项目入口写死插件版本。

## 自动化证据边界

单元/集成测试证明脚本和治理衔接；Agent 实际操作试点证明本次能够按流程完成。宿主是否在每个真实开发请求中加载 Skill，需要独立触发验收，不能由脚本 PASS 推定。项目若要求不可绕过的交付约束，应实际接入 CLI/CI/Hook；此流程不自动开启宿主 block。
