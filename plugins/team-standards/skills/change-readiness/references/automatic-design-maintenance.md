# 开发任务自动维护概设与详设

## 执行责任

先按[影响判定](impact-routing.md)决定受影响设计层次。只有概设或详设确需维护时执行本流程；源码修改、任务规模、风险档位和历史文档缺失本身不触发补建。开发授权包含必要维护，不要求用户填写 JSON；只维护受影响层次和章节。纯咨询只读。

Agent 负责模块识别、事实核对、业务写作、内容审阅及修复；确定性脚本负责候选发现、任务起点、安全合并和检查。脚本不从文件名猜业务结论，也不生成空模板冒充设计。项目入口只声明采用关系及特有路径，不能把复制整段规则作为本流程启动条件。

## 从请求到开发

1. **保存起点。** 第一次写入项目文档/配置/源码前，复用当前任务 session 调用下方 prepare；读取项目入口、文档索引、既有绑定、主规格及新鲜实现事实。尚无 Git HEAD 时先按项目既有初始化约定处理，不擅自初始化仓库、创建提交或编造基线。普通只读 discover 不写项目或个人状态。
2. **识别业务模块。** 从需求、项目边界和实际文件确定模块范围及责任。候选包含长期 Markdown 的真实标题和入口位置，但不自动认定权威；结合入口引用、主规格和代码核实。存在多份候选时优先确认现行权威，能消除歧义就继续，只有实质归属歧义阻塞任务时询问。
3. **沿用需求驱动。** 行为变化时按现有生命周期匹配/创建 change；行为保持的内部重构可以只维护设计。未启用时复用稳定设计，不自动初始化 OpenSpec，不为绑定字段创建空 change。
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
# 同一真实会话的已验证切片提交后，显式声明该次提交实际触及的每个文件。
node $design resume --root $project --session $session --change $change --file $committedFile
# 仅限旧会话已有 prepare、但从未成功 bind 的恢复：先完成当前切片计划的具名审阅和真实验证。
node $design recover --root $project --session $session --change $change --plan $reviewedPlan `
  --file $committedFile --owned-file $changeOwnedFile
# 真实 Forge writer 已有未提交改动且缺少绑定：审阅当前计划，不要求任务完成或新提交。
$governance = Join-Path $plugin 'scripts/openspec-governance.js'
node $governance snapshot --repo $project --session $session --change $change --plan $reviewedPlan --phase preflight
# 将本次实际审阅的 snapshot.inputFingerprint 写入 plan.review.inputFingerprint。
node $design recover-writer --root $project --session $session --change $change --plan $reviewedPlan `
  --owned-file $writerOwnedFile
# Agent 已完成相关正文、核对实际标题；下面变量取项目真实值。
node $design upsert --root $project --session $session --module $module `
  --scope $moduleScope --capability $capability --owner $owner `
  --overview $overviewPath --overview-heading $overviewHeading `
  --detailed $detailedPath --detailed-heading $detailedHeading `
  --code-version $codeScope --migration-reason $actualGap --migration-due $completionMilestone
```

--scope、--capability 可重复；合并范围只增加不静默删除。已绑定模块未传的字段原样保留。新绑定尚未具备完整内容索引时使用 migrate 并写真实缺口；Agent 完成索引后以 `--content <Agent生成的临时索引文件>` 传入 content 对象。新模块必须在本次交付前补齐适用内容、关联和审阅，不可把 migrate 当永久豁免。功能索引不复制业务正文。

`resume` 只用于同一真实会话完成 `record → delivery → commit` 后继续下一切片。`--file` 可重复，须与从当前检查点到 HEAD 的每个线性提交所触及文件完全一致；脚本核对原绑定 change、交付证据新鲜度、文件归属、分支及其它任务初始脏文件，并保留原始起点和每次续接记录。成功后当前检查点推进到 HEAD，再按 `prepare → upsert → bind → 实施 → record → delivery` 执行下一切片。拒绝时保留原记录，不删除、不改写缓存，也不用新 session 认领旧改动。

`recover` 只用于原 session 有准备记录但没有兼容治理绑定的旧状态。`--file` 逐一声明从原检查点至 HEAD 的全部提交文件，包含其他任务文件；`--owned-file` 只声明本 change 拥有且经当前计划覆盖的文件。计划须通过 OpenSpec 当前任务、设计视图、Scenario、具名审阅和验证输入指纹的 delivery 检查，提交链须连续且无分支切换。恢复保留原始指纹与审计记录，将其他任务的未提交改动留在初始归属中；成功只建立当前检查点，再用相同 session 和计划运行 `bind → preflight → record → delivery`。它不补写历史 PASS、不完成任务、不归档，也不代替 Forge 宿主恢复自动监督。旧会话若无法取得覆盖当前输入的真实验证证据，应先完成验证，再调用恢复入口。

准备状态保存在治理用户数据目录，和 session 绑定分开命名；重复 prepare 保留起始 HEAD 与已有脏文件，不重置归属。起始脏文件指纹只在本次目标文档、绑定文件或执行输入进入检查范围时校验；无关文件变化不阻断当前模块。登记文件在起点已有其它模块改动时，upsert 对比起始 HEAD 的目标模块条目，仅允许目标条目未被他人修改的定向合并，并保留其它模块；目标模块已有改动或准备后登记文件再次变化仍拒绝覆盖。重复登记沿用本任务已确认的条目，不能据此认领其它模块。upsert 不写正文、不创建 OpenSpec、不修改 Hook/CI。原 initializer 的 --baselines/--bindings 兼容入口保留，供旧流程使用；新自动开发流程无需用户另外调用它。

### 真实 writer 的开发恢复

`recover-writer` 专用于已有准备记录、缺少兼容绑定且 Forge v2 仍确认原真实会话拥有当前 change 的活动 writer。缺少准备记录时先 prepare 保存当前现场；已有记录完整保留。显式 `snapshot --phase preflight --plan` 只读取当前计划输入，不建立绑定，也不代表执行过测试或审阅。

Agent 重新审阅当前设计与开发输入后，记录具名审阅及当前 inputFingerprint，再逐文件提供 `--owned-file`。认领范围须同时属于实时 writer 和审阅计划，并覆盖 writer 已有的已跟踪、暂存、未跟踪改动及当前任务。脚本通过公开 `session_init`、`inspect_execution_writer` 核对项目、会话、change、分支、HEAD、提交祖先、精确范围及并行 writer；不接受离线 writer JSON。HEAD 未变时不需要 `--file`；已变化时逐一声明连续提交所触及文件，拒绝无关提交和范围遗漏。其他任务脏文件保留在初始归属中，共享 registry 只核对涉及模块条目。

成功记录原始起点、原始指纹、writer 身份、恢复审阅、文件及暂存区摘要；再执行同 session/change 的 `bind → check --phase preflight`，绑定前重新核验实时归属与现场。失败不改原记录。此入口只恢复开发就绪，不要求任务已完成，不生成历史或当前 delivery PASS；交付仍要求实际验证、任务完成、record 和 delivery 检查。恢复后输入变化时重新审阅并恢复，不能只替换指纹冒充审阅。

计划 taskIds 沿用 OpenSpec apply 返回的 ID；Forge 的当前 task 可能是 checklist key（如 2.2），apply 则返回序号（如 6）。恢复根据当前任务描述中的编号建立唯一对应，错配或歧义拒绝，不改写 tasks 勾选状态。

Forge Runtime 的 `WAITING_USER` 与兼容绑定分别处理。按用户已授权的恢复意图，确认插件版本、绑定和 preflight 通过后，从宿主监督面板恢复原运行；API 使用当前运行版本的 resume 动作，409 时先读取最新状态，不能循环上报 CONTINUE 代替恢复。保持原任务与预算，不自动完成或归档；宿主新轮次应重新读取插件入口。

## 实施、同步与交付

Agent 在实现过程中维护本次目标与发现；独立切片完成真实验证后更新功能全景、对应详设、接受的规格和证据关联，再以相同 session upsert 更新受影响模块的索引与代码范围。已有严格模块不能降级为 migrate。

交付前由 delivery-verification 核对：本次新增/更新/删除功能是否都处理、正文与规格及实际结果是否一致、剩余缺口是否真实。使用 snapshot 获取完成审阅时的内容摘要，记录具名审阅，再 record/check。归档时复核完整性，不能把独立切片完成当作整个 change 自动归档。

存量 migrate 模块保留既有基线交付检查；本次受影响内容必须由 Agent 完成并具名审阅，旧模块的全量结构缺口继续报告，不宣称严格内容检查已通过。补齐整个模块后再启用 enforce。不能为一次局部修改无差别改写旧模块。

未启用 OpenSpec 的项目可使用 `content.specMode: local`，把 requirement/scenario 引用指向已有稳定设计中的规则与直接下级验收章节；未交付目标的 change 引用指向本地目标设计。不要为了字段名称创建一套假 OpenSpec。原生构建/测试仍负责实际验证；非 S 类 legacy 没有 OpenSpec bind/record 链路，使用设计盘点与具名内容审阅如实交付，不声称执行了 OpenSpec 门禁。

## 冲突、失败与恢复

| 诊断 | Agent 应执行的修复 |
|---|---|
| 缺少设计/绑定 | 依据事实补建正文，内部调用 upsert；不转交用户填写 JSON |
| DESIGN_DIRTY_DOCUMENT / DESIGN_DIRTY_REGISTRY | 保留任务开始前的修改，与实际所有者协调或顺序执行；未经宿主授权不自行建隔离工作树，不换 session 认领 |
| DESIGN_REGISTRY_CONCURRENT / DESIGN_DOCUMENT_STALE | 停止覆盖，重新读取并核对其它任务差异；可确认本任务正文时重新 upsert，跨任务绑定冲突先分离处理 |
| DESIGN_EARLY_CODE / DIRTY_OWNERSHIP | 先核对真实归属；已有合法 Forge writer 且缺绑定时走 recover-writer，其他情况分离改动 |
| DESIGN_PREPARATION_STALE / DESIGN_INITIAL_CHANGED | 正常提交后使用显式 resume 核验续接；换分支或初始改动归属变化时保留现场重新确定任务边界，不删除记录规避 |
| DESIGN_RECOVERY_INPUT / DESIGN_RECOVERY_OWNERSHIP / DESIGN_RECOVERY_STALE | 旧会话缺绑定时整理当前切片计划、提交文件清单及本 change 归属；重新审阅并运行覆盖当前输入的验证后才 recover 和 bind，失败保留原记录 |
| DESIGN_WRITER_REQUIRED / DESIGN_WRITER_IDENTITY / DESIGN_WRITER_SCOPE / DESIGN_WRITER_MIXED | 重读实时 execution，核对原 session/change、完整文件清单与其他 writer；拒绝时保留原记录，不通过新 session 或手改缓存接管 |
| DESIGN_SCAN_LIMIT | 使用项目索引/定向源码人工核实归属；超限发现不声称完整扫描，补建设计仍可由 Agent 进行 |
| 文档归属/业务事实仍有关键歧义 | 仅询问阻塞问题；其它独立部分继续推进 |

无需再次询问可逆的必要设计维护是否获准；部署、归档、生产操作和宿主阻断仍按原授权边界。安装更新不自动改写业务项目。插件升级保留旧绑定与证据，策略变化按同 session 重新绑定说明处理，不在项目入口写死插件版本。

## 自动化证据边界

单元/集成测试证明脚本和治理衔接；Agent 实际操作试点证明本次能够按流程完成。宿主是否在每个真实开发请求中加载 Skill，需要独立触发验收，不能由脚本 PASS 推定。项目若要求不可绕过的交付约束，应实际接入 CLI/CI/Hook；此流程不自动开启宿主 block。

活动 change 冲突检查不以 change 数量设门槛：遍历全部活动目录，只读取当前切片相关的 Requirement 文件与章节绑定证据。同一规格文件只读取一次；发现实际冲突仍需登记顺序与理由，不通过截断列表省略检查。
