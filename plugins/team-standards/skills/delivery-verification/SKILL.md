---
name: delivery-verification
description: "Guide proportionate verification and honest delivery reporting after changes. Use project-native checks or explicitly adopted tooling; missing governance records do not prevent a progress or final response."
---

# 交付验证引导

目标：用适当的实际检查证明当前改动，并准确说明结果与限制。共同准则见[工程宪法](../change-readiness/references/engineering-principles.md)。

## 执行范围与证据复用

- 按行为、依赖和必要消费者选择检查。说明改动查事实与链接，局部代码查相关行为，共享协议、装配、安全和迁移覆盖对应风险及消费者；全仓验证需要实际影响依据或项目明确要求。
- 优先复用项目构建、测试、标签、profile 与过滤器；区分依赖构建、测试源码编译、环境准备和用例执行。Maven/JUnit 的执行过滤不能保证只编译所选测试。
- 执行前核对脚本和生命周期，构建已覆盖的检查计入证据。有效证据须对应当前代码、测试、配置、依赖和相关环境；这些输入未变且范围匹配即可复用，提交、归档、轮次不自动触发重验。
- 准备成本高时先明确需要保护的风险及承接阶段；不能用缩小命令掩盖必要消费者，也不因根配置变更自动全仓回归。
- 失败先定位工具链、源码、制品或环境原因。相同错误无新线索时停止盲重试，记录缺口与恢复路径，继续可完成工作。

## 必要约束与完成边界

没有测试、全部跳过、环境失效或只有静态阅读不算执行通过。构建失败时分别记录已通过子检查和失败阶段，单例通过不代表宿主完整资源与装配通过。

并行或混合改动可能影响输入时核对准确快照，必要时隔离验证；不借用他人的未提交内容证明本次交付。测试资产与可变状态隔离见[测试资产](../coding-standards-common/references/testing-assets.md)。

插件不注册 Stop 验证门禁，不要求固定 `phase=all` 或 Forge PASS。已明确采用 Forge/CI 的项目按[执行适配](../change-readiness/references/execution-adapter.md)和[治理检查器](../change-readiness/references/governance-checker.md)处理实际证据协议；指纹失效本身不等于全仓测试。

## 精炼反例

- 根 POM 登记独立 Starter 后追加业务前端全套回归：验证新模块、必要依赖及实际装配影响。
- HTTP 契约变更只跑被改文件：补对应状态码、校验、SDK 兼容与消费者风险。
- 每次 Commit 再跑一次相同检查：复用范围匹配且输入未变的结果。
- 编译通过就说业务已上线：分别说明实现、验证及发布状态。

结果报告实际变更、检查、结果和未验证项；受影响设计与文档分别用[变更引导](../change-readiness/SKILL.md)和[文档规范](../markdown-writing-standards/SKILL.md)。证据足以支撑本次结论即结束验证，提交按项目约定处理。
