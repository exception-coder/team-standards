---
name: change-readiness
description: "Use before implementing a requirement, feature, refactor, concrete solution, architecture change, or source-code modification. Automatically routes OpenSpec-enabled projects through a matching or newly created change, keeps its artifacts current, reviews risk, and resolves precise implementation coordinates."
---

# 变更实施就绪门禁

## 核心规则

在修改源码前确认目标、风险、设计依据和实施坐标。项目已启用 OpenSpec 时，本 Skill 自动匹配或创建相关 change，并在实施期间维护其 artifacts；不要求开发者记忆 OpenSpec 命令，也不创建平行设计正文。

<HARD-GATE>
除极简改动外，没有已确认的设计依据时不得开始实现。已启用 OpenSpec 的项目必须使用相关 change；不得因“没有相关 change”、artifacts 不完整或 CLI 暂时不可用而静默降级。只有项目未启用 OpenSpec，或用户明确批准本次兼容降级时，才可使用稳定设计文档；仅兼容模式的完整设计要求对应 `-coding.md` 编码摘要。
</HARD-GATE>

## 上下文路由

按以下顺序确定唯一设计载体：

1. 读取项目 `AGENTS.md`、项目知识索引及任务约束。
2. 若存在包含真实 `context` 的 `openspec/config.yaml`，进入强制 `openspec` 模式，并读取 [references/openspec-lifecycle.md](references/openspec-lifecycle.md)。先用 OpenSpec 的结构化状态接口匹配相关活动 change；没有则自动创建，歧义且无法从需求消除时才请求用户选择。
3. 在 `openspec` 模式中，按活动 schema 创建或更新 planning artifacts，把团队风险、架构、SQL、安全和验证要求补入同一 change；实现过程中同步任务证据与新发现，完成后执行验证、规格同步和归档判定。
4. 项目只有空 `openspec/config.yaml` 时视为“未完成接入”，先修复接入或明确阻断原因，不把旧设计文档当作自动旁路。项目没有 `openspec/config.yaml` 时才默认进入 `legacy` 兼容模式；已启用项目的降级必须得到用户对本次变更的明确批准并公开回显。
5. Graphify 只用于定位当前实现。依赖查询结果前比较图谱清单、Git HEAD 和工作区改动；图谱过期时先按已安装 Graphify 能力刷新，或用 `git diff`、`rg` 和定向源码读取补齐当前事实。

OpenSpec 的结构校验通过只证明 artifacts 合法，不证明代码、DDL、数据库或发布制品符合规格；这些仍由项目验证命令和相应质量门禁证明。

## 渐进读取

- 用户给出具体方案、现有代码或要求照某路径实施时，先读取 [references/solution-review.md](references/solution-review.md)，分离目标与候选方案并审视生产风险。
- 需要判断档位、模板类型或合法例外时，读取 [references/classification.md](references/classification.md)。
- 项目启用 OpenSpec，或需要匹配、创建、更新、验证、同步、归档 change 时，读取 [references/openspec-lifecycle.md](references/openspec-lifecycle.md)。
- 需要查找、新建、更新设计文档或生成编码摘要时，读取 [references/document-workflow.md](references/document-workflow.md)。
- 设计依据确认、准备修改第一行源码前，读取 [references/code-orientation.md](references/code-orientation.md)，提取精确文件、符号、调用方和约束。
- 只有任务涉及具体文档模板时，读取同目录的 `lightweight-template.md`、`template.md`、`template-tech.md`、`api-template.md` 或 `coding-template.md`。
- 设计中需要 Mermaid 图或需要判断应画哪类图时，读取 [rules/mermaid-requirements.md](rules/mermaid-requirements.md)，并叠加 `markdown-writing-standards` 的语法规则。

## 执行流程

1. 若用户给出具体解法或参考实现，先审视目标、证据、替代方案和生产风险；结论可以接受、调整或拒绝该方案。
2. 执行上下文路由，确定使用 OpenSpec change 或 legacy 设计文档，禁止同时维护两套正文；OpenSpec 已启用时 M/L 档不得选择 legacy。
3. 从项目 `AGENTS.md`/README 获取规则入口；当前实现按需查询新鲜 Graphify，目标行为查询 OpenSpec，业务语义查询 Domain Knowledge。兼容旧项目时可读取已有 `00_project_overview.md`，但不得要求新建或刷新该文档树。
4. 按 `references/classification.md` 判定极简、轻量或完整档位，并向用户回显结论和理由。
5. 极简档可以不新建 change，但必须回显为何不改变可观察行为或契约；OpenSpec 模式自动匹配或创建 change，完成 planning artifacts 并严格校验后再实现；legacy 模式查找或创建稳定设计文档。
6. legacy 轻量档读取稳定文档即可，完整档还要读取或生成 `-coding.md`。
7. 设计依据没有未决高风险决策时，用户的实施请求即构成继续授权；存在业务选择、破坏性迁移或范围歧义时才暂停确认。随后结合新鲜 Graphify 或定向源码读取执行代码定位，回显精确修改坐标、影响符号、调用方和约束，再开始实施。
8. OpenSpec 模式实施期间持续维护同一 change；结束前检查任务证据、严格校验和实现一致性。未满足归档条件时保持 change 活动并回显剩余项，禁止伪造完成状态。

## 输出约定

默认设计文档位于 `{USER_DOCUMENTS}/ai-docs/{project}/design/{需求名}/`；用户明确指定项目路径时才写入项目 `docs/design/`。Git 管理下始终更新 `-current.md`，仅重大基线、非 Git 场景或用户明确要求时创建快照。

开始实现前回显：已读取的设计文档、核心规则、涉及类和关键约束。

## 红线

- 不得用“任务简单”替代档位清单判断。
- 不得为日常迭代创建连续 `v1/v2/v3` 文件。
- 不得把完整设计的 coding 摘要视为可选。
- 不得把接口契约、状态机、字段或跨服务变更降为极简档。
- 不得在 OpenSpec 已启用时用无关活动 change 或历史 `docs/design` 为当前实现背书。
- 不得自己复制实现 `propose/update/apply/verify/sync/archive`；优先复用项目中 OpenSpec 生成的 Skill，缺失时使用官方 agent-compatible CLI 接口完成同等协议。
