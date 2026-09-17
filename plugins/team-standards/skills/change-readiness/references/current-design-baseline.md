# 当前设计基线与独立增量

## 职责与实施规则

当前概设描述已实现模块边界、职责、数据所有权、上下游、核心流程与运行约束；当前详设描述已实现接口、状态、权限、事务、异常和兼容规则。OpenSpec 主规格描述已接受行为，活动 change 只承载本次目标、差异、取舍、任务与证据，归档 change/ADR 保留历史理由。当前基线与独立增量职责不同，不属于禁止维护的同主题重复正文；不得复制完整旧设计、用变更日志代替现状，或把目标写成已实现能力。

每次功能变更都检查当前设计影响。规划时读当前概设、详设和主规格；目标变化写入 change，登记拟影响章节。实施偏差先修订目标，再按真实实现维护当前正文。已验证且可独立验收的切片，在交付前同步受影响章节和可独立接受的行为，不等待整个 change 完成。尚不可接受的内部切片只能说明已实现但未开放范围，完整能力继续留在目标侧。归档复核全量验收、同步与授权，不重新生成整套文档。

复用旧 change 时核对原目标、验收边界和阶段。同模块仅是检索线索；可独立审阅、验证、交付的新目标创建独立 change，引用前序即可。澄清、修复、验收遗漏沿用原 change 并使相关证据失效；会话恢复沿用绑定。不能为关闭旧 change 伪造不相关尾项完成，不用年龄、章节数或任务数作为硬拆分阈值。

概设/详设可为同一文件的两个唯一章节。文件名不证明内容有效；绑定前读取正文。模块边界/数据所有权/核心流程变化检查概设及相关详设，接口/字段/状态/权限/事务/异常变化检查详设及行为规格。纯样式、措辞或恢复已接受行为可以已有覆盖/不适用，写具体理由，不强制改两份文档。

原位更新受影响正文，移除已失效陈述并维护必要导航；备选与历史留在 change/ADR。声明代码基线及交付差异范围，生产部署另引用真实发布证据；不要求把文件最终提交哈希写入自身。日期不是新鲜度证据。

## 单一绑定协议

权威文件为仓库内 `.team-standards/design-baselines.json`，结构见 [design-baselines.v1.schema.json](../../../hooks/contracts/design-baselines.v1.schema.json)。人的模块索引只链接此文件，不手工维护另一份路径映射。

```json
{
  "schemaVersion": 1,
  "managed": ["src/"],
  "modules": [
    {
      "id": "orders",
      "scopes": ["src/orders/", "src/shared/pricing.js"],
      "capabilities": ["order-management"],
      "owner": "订单模块维护组",
      "status": "active",
      "shared": true,
      "codeVersion": "主分支已验证实现；生产状态见发布记录",
      "overview": {"path": "docs/design/orders.md", "heading": "## 当前概设"},
      "detailed": {"path": "docs/design/orders.md", "heading": "## 当前详设"}
    },
    {
      "id": "pricing",
      "scopes": ["src/pricing/", "src/shared/pricing.js"],
      "capabilities": ["pricing"],
      "owner": "计价维护组",
      "status": "gap",
      "shared": true,
      "plan": "warn 试点期间核对现有计价文档，下一次严格交付前补齐两种视图"
    }
  ]
}
```

`managed` 与 `scopes` 只接受仓库相对精确文件或以 `/` 结尾的目录前缀，不支持 glob、绝对路径、反斜线或 `..`。稳定模块 ID 唯一，capabilities 为项目 OpenSpec capability 标识；`owner` 是维护责任，不等于审阅身份。重叠范围必须在所有归属模块显式 `shared:true`，交付覆盖全部模块。共享模块也可独占共享代码，但审阅须补齐实际消费者，不把路径映射当语义分析。

`active` 必须有代码范围和两种视图。`gap` 是存量治理计划，必须有 owner/plan，可进入 preflight，但不能通过严格 delivery。新增模块首次交付必须补齐基线。`retired` 必须说明删除/迁移计划，可用 `replacedBy` 指向仍登记的模块；保留旧代码范围以核对删除、重命名和消费者。不允许通过缩小 managed/scopes 隐藏起始基线上的归属。

当前章节解析支持 UTF-8 Markdown；接入器保留既有字节，不批量转码其他编码。引用是 `{path, heading}`，heading 包含 Markdown `##` 等层级标记且在文件中唯一，正文至少 20 字符。禁止以 `openspec/changes/` 下的文件作为当前基线。同文件两种章节合法；内容正确性和视图是否真的完整仍由具名审阅确认。

## 复用治理记录

在 [现有审阅输入](governance-checker.md) 增加 `baselines`，不另建证据账本。每个受影响 active 模块填写 overview、detailed 两项；每项复用 disposition/reason/reference。交付时 implemented 必须为 true，codeVersion 说明已验证代码范围；这只是可追责声明，不是机器自动证明部署。

```json
{
  "baselines": [
    {
      "module": "orders",
      "id": "overview",
      "disposition": "already-covered",
      "reason": "仅修复已接受的重试行为，模块边界与数据所有权不变",
      "reference": {"path": "docs/design/orders.md", "heading": "## 当前概设"},
      "implemented": true,
      "codeVersion": "bind 保存的起始提交加本次已验证切片"
    },
    {
      "module": "orders",
      "id": "detailed",
      "disposition": "updated",
      "reason": "同步已实现的幂等重试与恢复规则",
      "reference": {"path": "docs/design/orders.md", "heading": "## 当前详设"},
      "implemented": true,
      "codeVersion": "bind 保存的起始提交加本次已验证切片"
    }
  ],
  "dedup": {
    "query": "主规格与活动 changes 的检索范围",
    "selection": "continue",
    "originalGoal": "恢复订单重试的已接受行为",
    "acceptanceBoundary": "原验收包含重试不重复写入",
    "stage": "implementation",
    "decision": "本次修正仍属于原目标，没有独立新增能力"
  },
  "sync": {
    "status": "not-applicable",
    "reason": "行为主规格已准确，本次恢复实现，不晋升新目标",
    "reference": {"path": "docs/design/orders.md", "heading": "## 当前详设"},
    "targets": []
  }
}
```

上例是补充字段，完整 plan 仍须提供 files/taskIds/views/scenarios/review/verifications。`dedup.selection` 为 new/continue/small，机器检查信息是否齐备，Agent 核对目标是否独立。活动 change 修改相同 Requirement 或已有交付记录的当前章节时，必须添加 `conflicts:[{change,order,reason}]`，说明依赖和合并次序；变更合并后重新核验，不能凭时间覆盖。尚未 record 的正文冲突由规划审阅发现，机器不声称能扫描未保存意图或外部 store。

`updated` 必须相对绑定起始提交存在正文变化，标题、空白、更新时间行不计入。`already-covered` 和 `not-applicable` 仍定位有效已绑定章节并说明理由，不要求无意义改正文。对纯样式的未接入项目，不强制创建模块清单；已接入项目照常登记影响判断。

新鲜度复用相关文件与引用章节指纹。`snapshot --files src/orders/service.js,src/orders/test.js` 支持验证子集，各 verification 的 `files` 声明实际覆盖输入，所有记录联合覆盖切片。省略 files 兼容全部 plan.files。只改文档措辞时复核正文和文档检查；代码输入不变的运行验证可复用，重新 record 不代表重新测试。review 仍覆盖完整切片输入。

## S 类、策略与边界

S 类可以省略 bind 的 `--change`，plan 增加 `smallChange:{reason,behaviorUnchanged:true}`，taskIds 与场景 taskIds 使用 `small`。仍要求真实具名审阅、视图、场景、验证；最多两文件、30 行，二进制改动拒绝。证据写到 `.team-standards/evidence/<session-hash>.json`，不创建 OpenSpec change。机器无法证明“行为不变”，审阅发现契约变化时使用正式 change。

CLI 始终报告真实诊断：PASS/NOT_APPLICABLE=0，缺口=2，执行错误=1。warn/off 只控制宿主 Hook 是否阻断，不把失败变成 PASS。默认 Hook warn；项目实际验证后显式设置 `TEAM_STANDARDS_OPENSPEC_GOVERNANCE_HOOK=block`。未配置宿主、CI 或分支保护仍是未启用强制门禁。

未接入模块清单的项目保持既有治理行为，discover 明确 not-enrolled；不能据此声称已检查设计基线。check/doctor/discover、接入 status/plan 只读；bind/record 与明确 apply 才写入。当前协议为 schemaVersion 1、policyVersion 4、checkerVersion 4。策略 1/2/3 绑定可在同一 session/change 重新 bind，保留原基线及脏文件归属，清除旧交付标记；旧证据必须重新核验并 record，未知版本拒绝。回退固定旧套件并恢复匹配旧策略证据，不删除项目正文或历史记录。

每次最多 1000 输入文件、每文件 4 MiB、Git/CLI 单命令 5 秒；冲突扫描最多 100 个活动 change，接入盘点最多 50000 文件。超限返回具体诊断；收窄真实交付单元或安排分阶段治理，不能缩小证据范围逃避检查。外部 store、远程 CI 制品解析不支持；证据与正文必须位于同一 Git 根并可随提交获取。单条 CI 命令仅验一个 change，多 change 聚合明确报范围缺口，需分开交付基线。

## 实践依据

2026-09-16 核对 [arc42 文档同步建议](https://faq.arc42.org/questions/H-3/) 与 [GitLab 文档工作流](https://docs.gitlab.com/development/documentation/workflow/)：按影响维护适量文档、明确责任并随代码交付。上述字段、阶段和门禁是本套件协议，不冒称这些框架规定统一格式。真实接入步骤见 [AI 原生项目适配指引](../../init-project-docs/references/design-baseline-adoption.md)。


## 业务阅读结构与稳定功能编号

概设面向领导、产品和技术负责人，详设按业务功能服务产品、研发和测试，固定八章/九项采用[内容契约](design-output-contract.md)。每模块默认一份概设、一份详设，现有同文件双章节保持兼容。功能编号稳定且不重复使用；全景表、功能详设、Requirement/Scenario 和验证证据沿该编号关联。

当前正文只描述已接受、已验证能力；功能尚在规划中/实现中时明确分区、状态与活动 change，不把目标语气当作现状。已验证不等于已上线，上线必须引实际发布证据。业务价值指标缺依据标待确认并明确责任，不编造提升比例。

新增/调整功能同步全景、对应正文及关联证据；删除/替代功能清理当前入口、旧描述和消费者引用，历史保留在 Git/change。已验证切片交付时更新，归档时复核完整性。机器结构 PASS 与具名内容审阅分别成立，不把指纹一致等同设计正确。

4.3.0 通过可选 content v1 渐进接入，配置、影响记录及审阅摘要见[内容治理协议](design-content-governance.md)。旧模块不强制迁移，明确列为 not-enrolled；迁移计划须含责任人、节点和缺口。原绑定、证据历史和同文件结构不删除。
