---
name: bug-doc-required
description: "Use to investigate reported bugs, errors, timeouts, or unexpected behavior; perform an authorized fix; or write a requested incident analysis. Requires diagnostic evidence and regression results, while keeping separate reports optional for simple bugs."
---

# Bug 调查与修复

目标：用证据解释异常，并在已授权范围恢复预期行为。共同准则见[工程宪法](../change-readiness/references/engineering-principles.md)；保留原调用名以兼容既有入口。

## 判断准则

- 现象要能对应输入、环境、操作和预期来源；用最小复现、失败测试、日志或数据区分事实与假设。
- 诊断优先选择能区分候选原因的检查。不能复现时说明已知条件及缺口，猜测不能写成确定根因。
- 修复针对导致偏差的条件，回归保护原失败及相关边界；证据或验证不足时明确实际完成程度。
- 简单局部问题由会话、测试和提交正文承载；跨模块、反复发生、难复现或高风险问题保留可接手的持久分析，优先更新已有记录。

## 必要约束与完成边界

只问原因时调查到证据与结论即可；已授权修复时连续推进至适用回归和交付。修复依据与设计影响用[变更引导](../change-readiness/SKILL.md)，验证用[交付验证](../delivery-verification/SKILL.md)；Bug 身份不豁免项目已采用的行为契约。

独立报告仅在用户要求或复杂问题缺少合适载体时创建；沿用项目位置，未约定时用 `docs/bug/` 稳定主题文件。外部 Issue 写入遵守已有授权。

## 精炼反例

- 加了空值判断就宣布根因解决：证明空值从哪里来及为何违背预期。
- 一次接口参数拼错也新建报告、索引和流程图：保留复现与回归证据即可。
- 只调查原因时顺手改生产配置：超出调查范围。

## 按需参考

- 实施修复：[最小修复与回归约束](references/repair-rules.md)。
- SQL、状态或数据问题：[后端证据](../backend-evidence/SKILL.md)。
- 需要独立分析报告：[简短模板](template.md)；实际写文档时用[文档规范](../markdown-writing-standards/SKILL.md)，提交用[提交规范](../git-commit-standards/SKILL.md)。
