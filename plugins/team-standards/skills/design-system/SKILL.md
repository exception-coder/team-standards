---
name: design-system
description: "Use for design-system initialization, profile binding, visual consistency review, or explicit visual preference learning. Reuse existing project design assets; initialize a registry only when requested or required by the project."
---

# 设计系统与视觉治理

目标：界面有一致且适合当前任务的视觉语言，设计偏好有明确来源和作用域。共同准则见[工程宪法](../change-readiness/references/engineering-principles.md)。

## 判断准则

- 以项目组件、tokens、批准页面和明确偏好为依据；成熟区域复用和组合，新区域按任务范围探索。
- Registry/Profile 用于已选择该机制的项目，普通页面工作直接使用已有设计资产。
- 接受与拒绝保留原因和适用场景；候选模式出现频繁不等于可晋升为团队硬规则。
- 视觉一致性与业务信息设计分工：指标、口径和选图归[业务可视化](../business-visualization-advisor/SKILL.md)，页面实现及浏览器验证归[前端质量](../frontend-excellence/SKILL.md)。

## 必要约束与完成边界

重大规则晋升需有明确确认；单次偏好不扩散成跨项目要求。报告复用资产、必要偏离及验证结果，持续变化的设计知识存于项目约定位置。

## 精炼反例

- 缺少个人 Registry 就停止页面修改：使用项目资产。
- 用户喜欢一次圆角卡片，就将全部项目改为卡片：保留偏好作用域。
- 为修配色重新定义业务指标：只处理视觉影响。

## 按需模式

- 实施与一致性评审：[review-mode](references/review-mode.md)。
- 明确要求初始化/绑定：[bootstrap](references/bootstrap.md)；已配置 Registry 时用[resolver](references/resolver.md)。
- 用户明确表达接受、拒绝或比较：[偏好证据](references/evidence-capture.md)。
- 请求归纳或整理已有证据：[模式归纳](references/pattern-mining.md)。
