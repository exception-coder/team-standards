---
name: design-system
description: "Use for design-system initialization, profile binding, visual consistency review, or explicit visual preference learning. Reuse existing project design assets; initialize a registry only when requested or required by the project."
---

# 设计系统与视觉治理

先读取项目已有组件、tokens、设计规范、批准的页面和明确偏好；这些足够支持任务时直接复用，不因缺少个人 Registry 阻断 UI 工作或创建第二套设计系统。

## 按需模式

- **实施与评审**：读取 [review-mode.md](references/review-mode.md)。成熟区域优先复用、扩展和组合；新区域允许有范围的探索。生产 Web 同时使用 frontend-excellence。
- **初始化与绑定**：用户要求或项目明确需要 Registry/Profile 时读取 [bootstrap.md](references/bootstrap.md)，按其中 schema 和模板建立最小资产；普通页面修改不自动初始化。
- **偏好记录**：用户明确接受、拒绝或比较设计时，读取 [evidence-capture.md](references/evidence-capture.md)；已有存储约定则保留最小证据，未配置时在当前任务说明，不自动创建全局 Registry。
- **模式归纳**：用户要求归纳或已有证据需要整理时，读取 [pattern-mining.md](references/pattern-mining.md)；候选不能因出现次数多就自动变成团队硬规则。

## 图表与看板协作

业务图表、指标概览与看板的指标选择、业务状态解释、选图和信息层次由 [business-visualization-advisor](../business-visualization-advisor/SKILL.md) 负责；本 Skill 复用视觉 tokens、语义色与组件，frontend-excellence 负责页面实现和真实浏览器验收。单纯配色或样式评审不自动重做指标设计。

## 共同边界

使用已配置 Registry 时读取 [resolver.md](references/resolver.md)，没有时以项目资产为准并说明证据来源。小文案、间距调整按影响验证，不强制完整视觉循环。保持批准/拒绝依据及偏好作用域，重大规则晋升需要明确确认；当前任务授权不因进入模式而重复申请。

报告复用资产、必要偏离、实际视觉验证和未确定项。Registry 存储约定只约束启用该机制的项目；Skill 不存放持续变化的设计知识。
