---
name: change-readiness
description: "Use before implementing a requirement, feature, refactor or source-code change. Find sufficient evidence, identify the control point, submit impact assessments to Forge when available, and maintain only affected specifications and designs."
---

# 变更实施准备

## 职责与认知原则

Agent 阅读证据、判断业务影响、编写规格与设计并实施；本 Skill 提供方法。Forge 管上下文候选、执行状态、分支与写入策略及确定性检查。调用和兼容方式见[执行适配协议](references/execution-adapter.md)，不在 Skill 中复制 Forge 状态机或规则码算法。

- 修改前取得最小充分上下文：执行路径、真实控制点和修改位置明确，关键未知已解决。
- 仓库与工具证据优先；区分事实和推断，不猜接口、结构、配置、DDL 或既有行为。
- 上下文充分就实施；不要因为寻求额外信心继续全仓搜索。
- 保持满足需求的最小范围；新证据改变范围时重新提交影响判断。

<HARD-GATE>
没有足够的行为和影响依据时先补定向探索。Agent 的分类是具名判断，不是人工批准；工具返回的 PASS 也不证明业务语义正确。执行采用当前项目的治理后端与适用策略，不能靠换会话、手改状态或另开分支绕过拒绝。
</HARD-GATE>

## 操作流程

1. **理解目标。** 区分咨询与已授权实施，继承已有授权。咨询只读，不创建 change、设计、绑定或提交。具体方案先按[方案审视](references/solution-review.md)核对目标、依据与取舍。
2. **获取上下文。** 读取项目入口；可用时调用 `session_init` 和 `resolve_execution_context`。将返回结果当候选，阅读正式规格、活动 change、受影响设计和源码。缺失/过期图谱用定向检索补证据，不把未命中当新能力。
3. **定位控制点。** 按[代码定位方法](references/code-orientation.md)核实入口、调用链、条件和相关测试。执行路径清晰且无关键未知时停止探索。
4. **提交影响判断。** 按[影响判定方法](references/impact-routing.md)分别判断行为、概设、详设与验证影响。Forge 可用时用精确文件范围 `discover_execution → assess_execution`，消费返回的策略与恢复建议；分支、写入归属和要求的验证类别以 Forge 决策为准。
5. **维护必要工件。** 行为保持不创建空 Change；行为变化先[找回既有规格](references/existing-spec-resolution.md)，按[OpenSpec 生命周期](references/openspec-lifecycle.md)复用或创建目标增量。设计只维护受影响层次和章节，采用[自动设计维护](references/automatic-design-maintenance.md)与[当前设计基线](references/current-design-baseline.md)，不补齐无关历史欠账，不要求用户填写 JSON。
6. **实施与验证。** 检查实施就绪后修改。发现范围、契约或机制变化时重新判断；实际验证方法归 [delivery-verification](../delivery-verification/SKILL.md)。未知、未运行和失败不得写成通过。
7. **交付当前任务。** 同步受影响[文档](../markdown-writing-standards/SKILL.md#作业交付时同步文档)，按 [git-commit-standards](../git-commit-standards/SKILL.md)完成原子提交。Forge 执行由 `finish_execution` 核对后释放写入权；Stop 事件仅检查，不自动完成、部署或归档。

## 按需方法与兼容

以下细则仅在相应任务需要时加载。Forge 已返回策略时不再用本地经验表独立裁决一次；未接入 Forge 的项目保留既有方法和明确的项目约束，不能伪造机器 PASS。

- 风险描述与兼容档位：[classification](references/classification.md)。风险决定验证深度，不直接决定文档数量。
- 文档发现和命名：[document-workflow](references/document-workflow.md)。优先原位复用唯一正文，不为流程新建 coding 摘要或个人索引。
- 概设/详设表达：编写、精简和评审时使用 [clear-design-docs](../clear-design-docs/SKILL.md)，检查通俗用词、对象关系图、字段中文说明及语义保持。结构和生命周期仍归下述内容契约。
- 概设/详设写作：[内容契约](references/design-output-contract.md)；历史绑定和内容检查：[内容治理](references/design-content-governance.md)。规划、实现、验证与上线分别记录。
- 既有项目的绑定、视图和审阅证据：[兼容治理检查器](references/governance-checker.md)。仅在 Forge 要求兼容设计检查或项目使用旧治理时加载，不并行维护第二套执行状态。
- 状态、迁移、筛选与按钮条件变化：[状态契约](references/state-contract.md)，复用现有检查器与登记，不猜数据库事实。
- 确需模板时选择适用的[轻量](lightweight-template.md)、[标准](template.md)、[技术](template-tech.md)或 [API](api-template.md)模板，不照抄全部字段。
- 需要图表时读取 [Mermaid 使用要求](rules/mermaid-requirements.md)，格式归文档规范。

实施前简短说明控制点、修改目的及必须保持的约束；无需另建定位报告。阶段切换不重复审批，只有阻塞实施的业务歧义或具体授权缺口才询问。
