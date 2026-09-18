---
name: change-readiness
description: "Use before implementing a requirement, feature, refactor, concrete solution, architecture change, or source-code modification. Assess behavior, design and verification impacts independently; reuse existing OpenSpec and Graphify evidence, update only affected artifacts, and keep related tasks on their assigned shared branch."
---

# 变更实施就绪门禁

## 自动设计维护

先执行[按影响判定](references/impact-routing.md)，分别决定规格、概设、详设和验证。仅受影响设计进入[自动设计维护流程](references/automatic-design-maintenance.md)，复用正文并维护必要绑定；不能因业务源码修改或旧文档缺失就补齐整个模块。无需设计变化时保留依据即可，不创建额外文档。

## 核心规则

在修改源码前确认目标、风险、既有行为和实施坐标。先探索现有 OpenSpec、设计及 Graphify，再决定是否需要 change；只在行为变化时匹配或创建，实施期间维护受影响 artifacts。

<HARD-GATE>
没有足够的行为和影响依据时先补探索。行为改变必须使用相关规格增量；行为保持且有证据时，即使项目启用 OpenSpec 或风险较高，也允许无需 Change 的执行。架构/机制变化分别维护适用概设/详设；无需变化不生成空文档。CLI 故障不能豁免本来需要的规格增量。
</HARD-GATE>

## 意图与阶段边界

先判断用户是否要求实施，并继承当前任务已有授权。仅咨询方案、审查代码或评估迁移时，可读取方案审视参考，但不执行创建 change、修改项目或提交步骤；专业事实按问题对象路由。用户要求“按方案改”“优化一下”且范围明确时属于实施，不要求固定授权口令。

演进包含功能、纯重构与性能优化。纯重构先核对可观察行为、契约、状态、数据与依赖，用相关回归及必要的特征测试支持行为保持；不是自动免规格理由，也不强制新增 PRD/AST 工具。风险和既有 OpenSpec 简化规则保持独立。阶段转换或 M/L 档本身不触发再次审批，只有具体未决选择或授权缺口才补充确认。

## 上下文路由

按以下顺序确定唯一设计载体：

1. 读取项目 `AGENTS.md`、项目知识索引及任务约束。
2. 若存在 `openspec/config.yaml`，先检索正式规格及活动 changes；按影响判定需要规格增量后才进入 [OpenSpec 生命周期](references/openspec-lifecycle.md)。优先复用匹配 change，无匹配才创建，实质歧义才询问。
3. 在 `openspec` 模式中，按活动 schema 创建或更新 planning artifacts，把团队风险、架构、SQL、安全和验证要求补入同一 change；实现过程中同步任务证据与新发现，完成后执行验证、规格同步和归档判定。
4. 空配置或 CLI 故障如实报告，只阻断依赖它的规格操作。未启用项目复用稳定规则/设计；行为保持无需 change 属于正常分流，不是兼容降级，不需要重复审批。
5. Graphify 只用于定位当前实现。依赖查询结果前比较图谱清单、Git HEAD 和工作区改动；图谱过期时先按已安装 Graphify 能力刷新，或用 `git diff`、`rg` 和定向源码读取补齐当前事实。

OpenSpec 的结构校验通过只证明 artifacts 合法，不证明代码、DDL、数据库或发布制品符合规格；这些仍由项目验证命令和相应质量门禁证明。

## 渐进读取

已有功能变更、批量需求或准备创建 Capability/Delta 时，先执行[已有规格找回与防重复](references/existing-spec-resolution.md)，逐项定位 Requirement 与证据，再决定新增、修改、移除或无需规格变更。

功能迭代、模块设计影响、独立目标匹配或切片交付时，读取 [当前设计基线与独立增量](references/current-design-baseline.md)。先读模块当前概设/详设与主规格，再核对原目标、验收边界和阶段；可独立交付的新目标新建 change，原目标修正/恢复沿用。规划目标留在 change，已验证切片交付前同步受影响当前正文。

- 用户给出具体方案、现有代码或要求照某路径实施时，先读取 [references/solution-review.md](references/solution-review.md)，分离目标与候选方案并审视生产风险。
- 需要判断档位、模板类型或合法例外时，读取 [references/classification.md](references/classification.md)。
- 项目启用 OpenSpec，或需要匹配、创建、更新、验证、同步、归档 change 时，读取 [references/openspec-lifecycle.md](references/openspec-lifecycle.md)。
- 需要查找、新建或更新设计文档时，读取 [references/document-workflow.md](references/document-workflow.md)。
- 设计依据确认、准备修改第一行源码前，读取 [references/code-orientation.md](references/code-orientation.md)，提取精确文件、符号、调用方和约束。
- 只有任务涉及具体文档模板时，读取同目录的 `lightweight-template.md`、`template.md`、`template-tech.md`或 `api-template.md`；仅选取相关章节，不照抄整份模板。
- 设计中需要 Mermaid 图或需要判断应画哪类图时，读取 [rules/mermaid-requirements.md](rules/mermaid-requirements.md)，并叠加 `markdown-writing-standards` 的语法规则。

## 执行流程

1. 若用户给出具体解法或参考实现，先审视目标、证据、替代方案和生产风险；结论可以接受、调整或拒绝该方案。
2. 执行上下文路由与影响判定，选择无需文档变更、既有设计更新或 OpenSpec change；不按 M/L 档自动要求全部文档。
3. 从项目 `AGENTS.md`/README 获取规则入口；当前实现按需查询新鲜 Graphify，目标行为查询 OpenSpec，业务语义查询 Domain Knowledge。兼容旧项目时可读取已有 `00_project_overview.md`，但不得要求新建或刷新该文档树。
4. 按 `references/classification.md` 判定极简、轻量或完整档位，并向用户回显结论和理由。
5. 行为保持时引用证据并回显无需 change 的理由；行为变化时匹配或创建相关 change，按 schema 维护必要工件并严格校验。不得以“简单”为由忽略权限/状态/契约变化。
6. 仅设计受影响时维护对应正文与必要绑定；概设、详设独立按影响更新，不为旧模块补全历史欠账，不生成独立摘要。
7. 设计依据没有未决高风险决策时，用户的实施请求即构成继续授权；存在业务选择、破坏性迁移或范围歧义时才暂停确认。随后结合新鲜 Graphify 或定向源码读取执行代码定位，回显精确修改坐标、影响符号、调用方和约束，再开始实施。
8. OpenSpec 模式实施期间持续维护同一 change；结束前检查任务证据、严格校验和实现一致性。未满足归档条件时保持 change 活动并回显剩余项，禁止伪造完成状态。
9. 按生命周期参考的阶段准出规则维护规格、适用概设详设、评审意见及交接；试点启用治理检查器时，在首次源码写入前 bind 当前会话与切片，真实验证后 record，再执行 delivery/archive 检查。机器结果只证明结构、范围和新鲜度，不替代内容审阅。
10. 将 [文档同步](../markdown-writing-standards/SKILL.md#作业交付时同步文档) 纳入当前变更范围；先按逻辑目的与依赖拆分任务；每个可独立验证的单元完成后，按 [提交规范](../git-commit-standards/SKILL.md) 自动提交已验证的实现和受影响文档。完成当前切片即可提交，不为等待整个 change 归档而积压已完成作业。

## 输出约定

设计优先使用 OpenSpec 实际工件；未启用时复用已有设计，必要时新增仓内 `docs/design/{feature}.md`。用户或项目明确指定位置时遵从，不默认生成个人索引树、快照或多份摘要。

开始实现前回显：已读取的设计文档、核心规则、涉及类和关键约束。

## 红线

- 不得用“任务简单”替代档位清单判断。
- 不得为日常迭代创建连续 `v1/v2/v3` 文件。
- 不得为满足流程另建 `-coding.md`、AI 速查索引或平行设计正文。
- 不得把接口契约、状态机、字段或跨服务变更降为极简档。
- 不得在 OpenSpec 已启用时用无关活动 change 或历史 `docs/design` 为当前实现背书。
- 不得自己复制实现 `propose/update/apply/verify/sync/archive`；优先复用项目中 OpenSpec 生成的 Skill，缺失时使用官方 agent-compatible CLI 接口完成同等协议。

## 业务设计内容

维护模块概设/详设时读取[内容契约](references/design-output-contract.md)：概设面向领导、产品与技术负责人，详设按稳定功能编号组织。八章概设、九项功能详设保持结构，按影响裁剪深度；当前能力、计划和上线证据分开。机器覆盖检查与具名内容审阅分别成立，接入细节见[内容治理](references/design-content-governance.md)。

## 状态契约闭环

状态值、转换、迁移、状态筛选或按钮条件发生变化时，读取 [状态契约治理协议](references/state-contract.md)。复用项目权威 OpenSpec 状态契约，生成并核对消费者影响清单；已登记模块执行静态检查，不为通过检查缩小范围。
