---
name: change-readiness
description: "Guide implementation preparation: understand the existing behavior, identify affected code and maintain relevant specifications and designs without requiring governance bindings or tool-specific approval."
---

# 变更实施引导

目标：在已授权任务内取得足够实施依据，维护受影响的行为和设计后推进交付。共同准则见[工程宪法](references/engineering-principles.md)。

规格深度统一由项目优先的 `openspec-auto` 判断。复用当前任务的 L1/L2/L3 与理由，本 Skill 只补实施依据和设计影响，不重复分类或初始化。项目自有更严格流程继续适用。

## 判断准则

- 明确当前目标和已确认约束，定位入口、关键条件、依赖与测试；Graphify 或工具不可用时用定向源码补齐。
- 规格、概设和详设分别按实际影响维护。已有设计原位更新，缺失只补本次所需部分；行为保持不建空 change。
- L3 或项目明确要求 OpenSpec 时按现有生命周期维护增量；设计中的目标与已验证能力分别记录。

## 必要约束与完成边界

插件不注册就绪写前、提交前或 Stop 门禁；缺少绑定、治理 JSON、Forge PASS 或历史设计不单独阻止实施。关键业务歧义、权限不足或无法保护已有改动时只暂停受影响操作。

入口、预期变化及关键风险有依据即可实施；用[交付验证](../delivery-verification/SKILL.md)核实结果并同步受影响说明。

## 精炼反例

- 修改一个校验条件先补全模块全部历史设计：只维护受影响规则。
- 插件里有 Forge 工具就先创建治理绑定：核对项目是否明确采用。
- 为保持行为的重构编造需求变更：记录影响和回归依据即可。

## 按需参考

- 目标或方案未定：[悟道](../architecture-reasoning/SKILL.md)及[方案审视](references/solution-review.md)。
- 代码定位：[code-orientation](references/code-orientation.md)；风险：[classification](references/classification.md)。
- 设计影响：[impact-routing](references/impact-routing.md)；查找：[document-workflow](references/document-workflow.md)；表达：[clear-design-docs](../clear-design-docs/SKILL.md)与[图示](rules/mermaid-requirements.md)；结构：[design-output-contract](references/design-output-contract.md)。
- 已采用 OpenSpec：[生命周期](references/openspec-lifecycle.md)；已登记状态：[状态契约](references/state-contract.md)。
- 明确采用绑定治理：[设计维护](references/automatic-design-maintenance.md)、[当前基线](references/current-design-baseline.md)、[检查器](references/governance-checker.md)；已采用 Forge：[执行适配](references/execution-adapter.md)。这些可选协议不扩散为普通任务的准入条件。
