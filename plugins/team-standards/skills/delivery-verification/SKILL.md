---
name: delivery-verification
description: "Guide proportionate verification and honest delivery reporting after changes. Use project-native checks or explicitly adopted tooling; missing governance records do not prevent a progress or final response."
---

# 交付验证引导

帮助 Agent 选择能证明当前改动有效的检查，并清楚说明实际结果。插件不注册 Stop 验证门禁，不要求每次任务获得 Forge PASS、记录治理 JSON 或执行固定的 phase=all。

## 工作方法

1. 根据本轮实际改动和相关依赖选择验证范围，保护他人的未提交内容。优先复用项目现有测试、构建和检查命令。
2. 执行与风险相称的验证。只改说明通常检查链接与事实；局部代码运行相关测试和必要构建；影响共享运行库、装配或无法界定范围时扩大回归。不能仅因调用了本 Skill 就要求全仓测试。
3. 检查失败时分析原因并修复已授权范围内的问题。相同环境或工具错误没有新线索时停止重复尝试，记录缺口和恢复方法，继续可完成的工作。
4. 验证后只有相关输入改变才重跑受影响检查；无关修改、提交或单纯补充说明不自动废弃已有结果。
5. 同步受影响文档并遵从项目提交约定。回复中说明改了什么、做了哪些验证、结果及尚未验证的内容；失败、受阻或未完成也可以正常结束会话并报告真实状态。

## 结果含义

- 测试通过只证明被执行场景，构建通过不代表业务验收或已上线。
- 未运行、环境不可用、测试失败分别说明，不伪造 PASS，也不把缺少机器登记当成代码不合格。
- 不要求为简单修改另建验证报告、审阅文档或证据账本；命令输出、现有测试及提交说明可承载适当证据。
- 无法验证时可以交付已完成部分及具体限制，但不能声称全部验收通过。是否提交、合并或部署按用户授权及项目规则判断。

## 可选集成

只有项目明确采用 Forge、状态契约或兼容治理时，才读取相应配置与 [执行适配协议](../change-readiness/references/execution-adapter.md)、[治理检查器协议](../change-readiness/references/governance-checker.md)。工具存在不自动触发绑定、record、preflight 或 delivery；独立 CI/宿主门禁仍由项目负责。

设计维护继续按 [change-readiness](../change-readiness/SKILL.md) 的影响范围进行；文档归属见 [markdown-writing-standards](../markdown-writing-standards/SKILL.md)。这些引导不授予部署、归档或外部写入权限。
