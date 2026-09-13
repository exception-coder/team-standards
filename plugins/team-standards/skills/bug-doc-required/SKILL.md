---
name: bug-doc-required
description: "Use to investigate reported bugs, errors, timeouts, or unexpected behavior; perform an authorized fix; or write a requested incident analysis. Requires diagnostic evidence and regression results, while keeping separate reports optional for simple bugs."
---

# Bug 调查与修复

保留 `bug-doc-required` 调用名以兼容既有入口。目标是用证据解释并解决问题；独立 Bug 文档不是每次任务的交付物。

## 最小证据闭环

每次调查或修复都要回答以下问题，简单问题可以直接在会话、测试和提交正文中表达，不要求固定章节、表格或图：

1. **现象与预期：** 哪个输入、环境或操作触发了什么异常？预期行为来自用户、已接受规格还是权威实现？
2. **诊断证据：** 用最小复现、失败测试、日志、数据或调用路径区分事实与假设；不能复现时说明已知条件、缺口和下一步，不能把猜测写成确定根因。
3. **因果解释：** 哪个条件导致行为偏离预期？证据如何支持该原因，是否仍有未排除解释？优先进行能区分假设的最小检查，不用堆补丁代替诊断。
4. **处置与结果：** 仅调查时给出结论和下一步；已授权修复时说明最小修改、真实回归结果及剩余风险。没有修复或未执行验证时，不宣称问题已解决。

## 按风险选择记录载体

- **简单、局部、一次性问题：** 默认不新建 Bug 报告、不建 bug 目录和索引、不画图。修复证据由回归测试与 commit 正文承载，会话说明结果；只调查且没有文件改动时无需 commit。
- **跨模块、反复出现、难以复现，或涉及金额、权限、数据丢失、生产事故的问题：** 保留可供后续接手的持久分析，包括证据、未决假设、影响和验证结果；仍不要求另建一份文档。
- **载体优先级：** 用户或项目指定的位置 → 已有相关 OpenSpec change / 共享问题记录 → 已有项目文档。优先补充同一载体并引用测试与代码，不复制成 Issue、change、Bug 报告三份正文。外部 Issue 的写入须已有授权；没有时先使用项目内载体。
- **确需独立报告时：** 用户明确要求，或复杂问题没有合适载体，才按项目文档约定创建；项目未约定时使用 `docs/bug/` 下一个稳定主题文件，不强制多层目录、中文文件名或与 design 目录同名。个人笔记路径仅在用户或项目指定时采用。
- 只有实际新建或结构性修改 Markdown 时才执行 [文档查重与索引流程](../markdown-writing-standards/SKILL.md)。图只在解释并发、状态或跨系统链路更清楚时使用；按需参考 [简短分析模板](template.md)，可合并和删减段落。

## 调查与实施路由

1. 读取相关项目规则与已接受行为；代码事实优先查询新鲜 Graphify，缺失或过期时用定向读取和 diff 补齐。只加载与当前问题有关的内容，不扫描整库或抄录完整类清单。
2. 涉及 SQL、状态、数据关系或运行证据时使用 backend-evidence；对齐上游或云端时先确认权威来源和真实差异。
3. 只问原因时先调查；用户要求修复时读取 [最小修复与回归约束](references/repair-rules.md)，按 [change-readiness](../change-readiness/SKILL.md) 判断实施风险和设计依据。Bug 模式不绕过已启用项目的 OpenSpec 要求，也不额外复制一套 Bug 设计文档；符合极简条件时走其已有简化路径。
4. 修复后按 [delivery-verification](../delivery-verification/SKILL.md) 验证当前改动；文档检查与自动提交按 [git-commit-standards](../git-commit-standards/SKILL.md) 执行。同步受影响文档不等于每个 Bug 都新建文档。

## 完成标准

- 调查任务：证据、结论或未决假设、下一步清楚，持久记录仅在上述风险或用户要求触发时产生。
- 修复任务：因果依据明确，修改聚焦当前问题，适用回归已执行，受影响说明已同步，本次改动已按提交规范处理。
- 失败、环境不可用或证据不足时说明实际状态；不能靠填齐模板、勾选任务或编造测试结果宣称完成。
