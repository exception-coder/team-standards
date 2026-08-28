---
name: change-readiness
description: "Use before implementing a requirement, feature, refactor, concrete solution, architecture change, or source-code modification. Selects the OpenSpec or compatibility design basis, reviews risk, and resolves precise implementation coordinates."
---

# 变更实施就绪门禁

## 核心规则

在修改源码前确认目标、风险、设计依据和实施坐标。项目已启用 OpenSpec 时，相关 change 是首选载体；本 Skill 只做方案审视、档位判断和实施准备，不创建平行设计正文。

<HARD-GATE>
除极简改动外，没有已确认的设计依据时不得开始实现。设计依据可以是通过审查的 OpenSpec change，或兼容模式下的稳定设计文档；仅兼容模式的完整设计要求对应 `-coding.md` 编码摘要。
</HARD-GATE>

## 上下文路由

按以下顺序确定唯一设计载体：

1. 读取项目 `AGENTS.md`、项目知识索引及任务约束。
2. 若存在 `openspec/config.yaml`，检查配置是否包含真实项目上下文，并通过 OpenSpec CLI 定位相关活动 change、状态和 apply 上下文。
3. 相关 change 存在且 proposal、specs、design、tasks 可读取时，进入 `openspec` 模式：把团队风险、架构、SQL、安全和验证要求审查或补入这些 artifacts，不创建另一套 `design/` 文档或 `-coding.md`。
4. OpenSpec 仅初始化了空模板、没有相关 change、artifacts 不完整或 CLI 不可用时，明确说明降级原因，进入 `legacy` 兼容模式。
5. Graphify 只用于定位当前实现。依赖查询结果前比较图谱清单、Git HEAD 和工作区改动；图谱过期时先按已安装 Graphify 能力刷新，或用 `git diff`、`rg` 和定向源码读取补齐当前事实。

OpenSpec 的结构校验通过只证明 artifacts 合法，不证明代码、DDL、数据库或发布制品符合规格；这些仍由项目验证命令和相应质量门禁证明。

## 渐进读取

- 用户给出具体方案、现有代码或要求照某路径实施时，先读取 [references/solution-review.md](references/solution-review.md)，分离目标与候选方案并审视生产风险。
- 需要判断档位、模板类型或合法例外时，读取 [references/classification.md](references/classification.md)。
- 需要查找、新建、更新设计文档或生成编码摘要时，读取 [references/document-workflow.md](references/document-workflow.md)。
- 设计依据确认、准备修改第一行源码前，读取 [references/code-orientation.md](references/code-orientation.md)，提取精确文件、符号、调用方和约束。
- 只有任务涉及具体文档模板时，读取同目录的 `lightweight-template.md`、`template.md`、`template-tech.md`、`api-template.md` 或 `coding-template.md`。
- 设计中需要 Mermaid 图或需要判断应画哪类图时，读取 [rules/mermaid-requirements.md](rules/mermaid-requirements.md)，并叠加 `markdown-writing-standards` 的语法规则。

## 执行流程

1. 若用户给出具体解法或参考实现，先审视目标、证据、替代方案和生产风险；结论可以接受、调整或拒绝该方案。
2. 执行上下文路由，确定使用 OpenSpec change 或 legacy 设计文档，禁止同时维护两套正文。
3. 从项目 `AGENTS.md`/README 获取规则入口；当前实现按需查询新鲜 Graphify，目标行为查询 OpenSpec，业务语义查询 Domain Knowledge。兼容旧项目时可读取已有 `00_project_overview.md`，但不得要求新建或刷新该文档树。
4. 按 `references/classification.md` 判定极简、轻量或完整档位，并向用户回显结论和理由。
5. 极简档直接进入实现；OpenSpec 模式审查并按需更新对应 artifacts；legacy 模式查找或创建稳定设计文档。
6. legacy 轻量档读取稳定文档即可，完整档还要读取或生成 `-coding.md`。
7. 用户确认设计依据后，结合新鲜 Graphify 结果或定向源码读取执行代码定位，回显精确修改坐标、影响符号、调用方和不可违反的约束，再开始实施。

## 输出约定

默认设计文档位于 `{USER_DOCUMENTS}/ai-docs/{project}/design/{需求名}/`；用户明确指定项目路径时才写入项目 `docs/design/`。Git 管理下始终更新 `-current.md`，仅重大基线、非 Git 场景或用户明确要求时创建快照。

开始实现前回显：已读取的设计文档、核心规则、涉及类和关键约束。

## 红线

- 不得用“任务简单”替代档位清单判断。
- 不得为日常迭代创建连续 `v1/v2/v3` 文件。
- 不得把完整设计的 coding 摘要视为可选。
- 不得把接口契约、状态机、字段或跨服务变更降为极简档。
