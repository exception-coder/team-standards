---
name: markdown-writing-standards
description: "Use when delivering suite or project updates to synchronize affected documentation, and when creating or structurally editing Markdown. Covers documentation impact, deduplication, Markdown/Mermaid validation, and existing navigation maintenance."
---

# Markdown 编写规范

目标：文档内容准确、入口可发现、格式可阅读，维护同一主题的唯一权威正文。共同准则见[工程宪法](../change-readiness/references/engineering-principles.md)。

## 判断准则

- 从项目入口或已有索引找到所属文档，优先原位更新；现状基线与活动变更分别记录当前能力和目标增量。
- 只维护受影响的正文与已有导航。当前文档需要反映真实行为，提交说明与开发日志不能代替。
- 有生成来源时修改来源并重新生成；版本、路径、命令、数量、用法及语言版本按实际影响同步。
- 新文档的归属与历史重复内容处理见[最小维护规则](references/document-index-workflow.md)；纯措辞调整无需额外设计流程。

## 作业交付时同步文档

套件或项目改动在同一交付单元内核对文档影响，更新相关 README、规则入口、流程、索引与示例。跨仓分别维护组件和总览，总览只保留摘要与权威链接；非 Git 产物说明实际保存位置。

无文档影响时说明理由即可。交付前核对事实、标题、链接、命令和格式，再按[提交规范](../git-commit-standards/SKILL.md)处理本次范围。

## 必要约束与完成边界

标题层级连续，围栏闭合，表格列数一致，链接可达。修改 Mermaid 前读取[格式细则](references/markdown-format.md)的相关章节并验证；静态结构检查不能冒充实际渲染或内容正确性审读。

当前设计维护见[基线协议](../change-readiness/references/current-design-baseline.md)，概设详设表达用[清晰设计文档](../clear-design-docs/SKILL.md)，通用润色用[人话](../plain-writing/SKILL.md)。

## 精炼反例

- 功能行为变了，只在 dev-log 写一条：同步实际使用说明。
- 新增一篇文档就逐层新建 INDEX：维护需要的现有入口。
- 更新日期而不修正失效内容：原位修正文。
- Mermaid 围栏闭合就称图可渲染：执行对应校验，未渲染如实说明。
