---
name: markdown-writing-standards
description: "Use when delivering suite or project updates to synchronize affected documentation, and when creating or structurally editing Markdown. Covers documentation impact, deduplication, Markdown/Mermaid validation, and existing navigation maintenance."
---

# Markdown 编写规范

## 文档生命周期路由

创建或结构性修改项目文档、设计文档、Bug 文档或用户知识库 Markdown 时，先读取 [references/document-index-workflow.md](references/document-index-workflow.md)：优先更新唯一权威载体，写后只维护受影响的已有导航。不要求 Phase-A / Phase-B、个人目录索引或另建 INDEX.md。

## 作业交付时同步文档

AI 原生项目的文档是后续 Agent 与成员工作的输入。套件或项目更新必须在同次作业中核对文档影响；受影响内容与实现一起更新、验证和提交，不能留到用户追问，也不能仅以 commit body 或开发日志替代现行说明。

1. 开始时从仓库入口和现有索引确定权威文档；结束时对照本次 diff 与实际行为检查 README、已维护的语言版本、安装用法、配置、能力数量、版本、契约、规则和示例。只更新受影响段落；确无文档影响时在提交正文或交付说明中写明理由，不制造无意义改动。
2. Skill、Hook 或工作流变化：同步对应 Skill 正文和受影响的 README、Agent 入口、流程与索引。有生成来源时改来源并重新生成，不能直接修改派生产物；决策型变更与发布说明按项目已有维护约定记录，不强制创建日志。
3. 跨仓套件变更分别核对组件文档和套件总览；总览只保留必要摘要及权威链接，不复制规则正文。非 Git 的总览可同步更新，但必须说明未纳入提交，不能冒称版本化交付。
4. 更新已有权威文档，不为同一主题新建平行说明。必要的关联索引同步属于当前作业授权范围，直接执行；新增无关文档或改变知识归属才另行判断。
5. 核对标题、链接、命令实际路径、版本和能力描述；机器检查通过不等于描述正确。未执行、未接入、试运行的能力必须如实表达，不能写成已全面生效。
6. 文档同步完成后进入 [git-commit-standards](../git-commit-standards/SKILL.md) 自动本地提交；可执行改动的验证仍由 delivery-verification 负责。文档同步和自动提交是 Agent 执行义务，不宣称所有宿主都有强制 Hook。

## 按需读取格式细则

- 生成或修改 Mermaid 前，必须读取 [格式细则](references/markdown-format.md)，逐项排查其中的致命错误；不能仅凭结构检查宣称图表可渲染。
- 创建或结构性修改表格、代码块、标题导航时，读取同一参考中的对应章节；普通措辞更新不加载整份语法示例。
- 保持标题层级连续、围栏闭合、表格列数一致、链接可达；优先沿用已有格式。
- 文档同步只维护受影响事实，不复制规则正文，不为每次交付新增总结文档。
