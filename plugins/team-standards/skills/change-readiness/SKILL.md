---
name: change-readiness
description: "Guide implementation preparation: understand the existing behavior, identify affected code and maintain relevant specifications and designs without requiring governance bindings or tool-specific approval."
---

# 变更实施引导

帮助 Agent 在已授权任务内找到足够依据后开始实施。普通开发不要求先调用 Forge、建立兼容治理绑定、填写 JSON 或取得机器 PASS；插件不注册相关写前、提交前或 Stop 门禁。

## 工作方法

1. **确认当前目标。** 区分咨询与实施，读取项目入口、相关源码和已有规格。只读咨询不自动创建设计、change 或绑定。
2. **定位影响。** 找到入口、关键条件、依赖和测试；只调查当前任务需要的信息。Graphify 或工具不可用时用定向源码读取补齐，避免等待工具状态。
3. **按影响维护设计。** 复用已有概设详设；缺失时根据确认的需求和实现事实补齐受影响部分。已采用 OpenSpec 的项目按其现有流程维护本次增量；不因插件存在就初始化 OpenSpec 或治理登记。行为保持不建空 change，局部修改不补齐整个模块历史欠账。
4. **开始实施。** 缺少设计文件、登记或检查器结果不单独阻止开发。仅当关键业务歧义、权限不足或无法安全保护已有改动时暂停受影响操作，继续可确认的工作。规划内容与已验证能力分开记录。
5. **验证并说明结果。** 使用 [delivery-verification](../delivery-verification/SKILL.md) 选择适用检查，更新受影响文档，按项目提交约定完成当前任务。报告实际结果、未验证项和下一步，不把缺少治理记录包装成业务失败。

## 按需参考

- 当前任务需要方案取舍或范围收敛时，先用 [architecture-reasoning（悟道）](../architecture-reasoning/SKILL.md) 核实问题、复杂度与升级条件；既定方案执行和普通小改不增加独立阶段。
- 代码定位：[code-orientation](references/code-orientation.md)；方案取舍：[solution-review](references/solution-review.md)。
- 需要时参考[风险判断](references/classification.md)、[文档查找](references/document-workflow.md)、[图示表达](rules/mermaid-requirements.md)；项目已登记状态契约时使用[状态契约](references/state-contract.md)。这些参考不增加默认机器门禁。
- 按影响维护：[impact-routing](references/impact-routing.md)；设计表达：[clear-design-docs](../clear-design-docs/SKILL.md)；设计内容：[design-output-contract](references/design-output-contract.md)。
- 已采用 OpenSpec 的项目：[openspec-lifecycle](references/openspec-lifecycle.md)。
- 用户要求或项目明确采用绑定治理时，才加载 [automatic-design-maintenance](references/automatic-design-maintenance.md)、[current-design-baseline](references/current-design-baseline.md) 和 [governance-checker](references/governance-checker.md)。这些可选协议中的绑定、指纹及恢复命令不扩散为普通任务的准入条件。
- 项目明确采用 Forge 时，按 [execution-adapter](references/execution-adapter.md) 使用其项目策略。工具可用或插件已安装不等于项目选择了硬门禁；项目自行设置的权限、CI 和执行约束仍按项目约定处理。

上述按需参考不覆盖本入口的默认引导边界。无需为了推进当前任务更换会话、删除历史状态或伪造检查结果。
