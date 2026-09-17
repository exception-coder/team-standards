# 业务设计内容治理与接入

## 单一正文与可选接入

内容规范见[概设与详设契约](design-output-contract.md)，本文件只说明机器契约。复用 `.team-standards/design-baselines.json` 中的模块绑定；`content.functions` 仅存引用，不复制功能名称、流程或交付状态。状态只从概设功能全景表读取。

旧模块没有 `content` 时继续执行既有基线检查；status/discover 返回 `contentCoverage.mode: not-enrolled`，不得称为内容合格。渐进迁移使用 `mode: migrate`，登记 `migration.owner/due/reason`；盘点报告内容缺口，交付仍执行旧规则。补齐、具名审阅后切换 `enforce`。同文件双章节无须拆分；标题按绑定层级相对下移。

已在本切片起始基线启用 enforce 的模块，不能通过删除 content 或改成 migrate 绕过检查。回退需独立、有理由的治理变更，保留历史证据。

## 配置示例

下面是**字段示例**，路径、业务内容及证据必须来自项目。将 content 合入已有模块，不覆盖原 registry。完整业务正文另见[样衣使用工作区概设](examples/garment-sample-overview.md)。

```json
{
  "version": 1,
  "mode": "enforce",
  "functions": [{
    "id": "GS-001",
    "heading": "### GS-001 本人领借还",
    "requirement": {
      "path": "openspec/specs/sales-sample-access/spec.md",
      "heading": "### Requirement: 销售仅执行本人领借还"
    },
    "scenarios": [{
      "reference": {
        "path": "openspec/specs/sales-sample-access/spec.md",
        "heading": "#### Scenario: 领借及本人归还"
      },
      "verification": {
        "path": "docs/verification/sample-custody.md",
        "heading": "## 本人领借还回归"
      }
    }]
  }]
}
```

上例适用于详设绑定 `## 当前详设` 的同文件情形；独立详设绑定文档一级标题时功能标题为二级。Requirement 必须位于主规格或活动 change 的 specs，Scenario 必须实际嵌套在该 Requirement 下。一个功能可关联多个 Scenario；跨 Requirement 时在对应 scenario 上增加 requirement 引用，未填写时继承功能的默认 requirement。业务功能不必为迎合技术规格而拆散。

规划中/实现中的功能增加 `change: {path, heading}` 指向活动 change，并在对应详设正文标状态；其验证关联可暂缺。已验证/已上线的全部场景须有 `verification: {path, heading}`，已上线还须有 `release: {path, heading}`。机器只确认记录可追溯，记录中的运行环境、结论真实性和部署结果仍由审阅确认。接受与归档时同步引用主规格，历史目标留在归档 change。

迁移中的最小 content 是：

```json
{
  "version": 1,
  "mode": "migrate",
  "migration": {
    "owner": "项目实际责任人",
    "due": "下一次样衣独立切片交付前",
    "reason": "已绑定双章节；需盘点稳定功能编号、整理业务结构并补齐验收证据"
  },
  "functions": []
}
```

## 交付影响与具名审阅

原计划中增加 `functionImpacts`；复用既有 `scenarios` → `verificationIds` → `verifications` 链路，不再建第二套测试账本。每个受影响模块的切片 Scenario 都须归属某个功能。已有功能正文变化不能标 unchanged；updated 必须改变对应功能正文，日期及其它章节变化不算同步。

```json
{
  "functionImpacts": [{
    "module": "garment-sample",
    "id": "GS-001",
    "disposition": "updated",
    "reason": "调整本人借用期限，同步流程、校验和异常反馈",
    "scenarioIds": ["own-borrow-return"]
  }]
}
```

判定使用 added/updated/removed/unchanged。新增和删除编号与起始 Git 清单比较，必须逐项登记；删除/替代清理当前概设、详设中的旧编号，替代时填 `replacedBy`。删除的回归场景继续由计划关联，证明旧入口失效和消费者已迁移。当前两份正文之外的链接和业务含义仍需人工/Agent 具名审阅，不能宣称全仓自然语言引用已自动清理。

真实验证、同步正文并完成被引用文件中的审阅说明后运行已有 `snapshot`，取得 `contentFingerprints.<module>`；将摘要写回计划，避免随后修改同一证据文件使其立即失效。既有 `review.actor/type/reference` 保留，增加：

```json
{
  "content": [{
    "module": "garment-sample",
    "inputFingerprint": "替换为实际 snapshot.contentFingerprints 中的 64 位摘要",
    "result": "PASS",
    "reason": "说明已核对的业务目的、读者理解、规则与技术正确性，以及问题处理结果"
  }]
}
```

这是 `review` 的子字段。不得通过自动复制摘要伪造审阅。摘要覆盖模块绑定、概设、详设及其规格/验证/发布引用文件；任何相关变化后重新审阅。独立正文措辞调整不强制重跑未受影响代码测试，但必须刷新内容审阅。slice 的已验证场景证据须与功能索引引用同一记录，不能以历史证据替代当前验证。

## 检查阶段与边界

| 入口 | 行为 |
|---|---|
| init 的 plan/status、governance discover | 只读盘点结构与关联，显示 migrate/not-enrolled/enforce，内容质量始终注明需审阅 |
| bind / preflight | 验证配置及旧基线范围，允许目标正文尚未形成；不提前宣称内容检查通过 |
| snapshot | 读取代码与内容摘要，不执行测试、不产生审阅结论 |
| record / delivery / archive / CI | enforce 模块检查八章、九项、全景链接、功能影响、规格/证据、状态和具名内容审阅；复用旧范围、新鲜度、同步与归档检查 |

支持普通 ATX 标题、唯一精确标题、标准带首尾管道的八列表格、相对 Markdown 详设链接。围栏代码中的标题不计入正文。保持章节名字与顺序，功能九项不加数字前缀；绑定标题最大四级以容纳功能及其子章节。表格单元格暂不支持含管道的内容、HTML 表或动态渲染；超出支持范围应整理为普通 Markdown，不能静默漏检。

覆盖检查不执行语义推断，不能自动发现所有代码行为与文案的矛盾、虚构收益、隐含权限漏洞或未登记的业务变更。具名审阅必须判断影响声明是否真实，不把“格式齐全”称为“设计合格”。实际领导/产品阅读验收需记录真实参与者，Agent 自审不能代替。

## 升级兼容

4.3.0 保持 registry schemaVersion 1，新增可选 content v1；治理 policy/checker 升为 4，历史证据原样保留可查，但不冒充新策略 PASS。旧 session 使用原 session/change 重新 bind，保留代码起始基线和已有范围；复核计划后重新 record。未接入内容契约的模块无需拆文档或补九项才能继续旧治理。官方 OpenSpec 的同步、归档机制不变。

项目接入命令、warn 试点与 CI 接线沿用[基线接入指引](../../init-project-docs/references/design-baseline-adoption.md)。
