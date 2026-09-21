# Forge 执行适配协议

本文件只维护 Agent 调用方法与插件适配边界。组织策略和执行状态归 Forge；整体组件职责的唯一权威为关联 Forge 仓库 `docs/ai-coding-architecture.md`。

## 一次任务的调用方法

| 阶段 | 入口 | Agent 的工作 |
|---|---|---|
| 会话进入/恢复 | `session_init(project, sessionId)` | 读取能力、策略版本、执行和写入归属；此调用只读 |
| 候选探索 | `resolve_execution_context(project, sessionId, request, files?)` | 阅读候选原文与源码；files 可缺省，不要求先知道修改文件 |
| 影响判断 | `discover_execution` → `assess_execution` | 提供精确范围、具名判断和真实引用；taskId 仅引用已有任务 |
| 写入/提交/结束检查 | `check_execution_event`，或原 `check_execution_readiness` | 消费规则码与恢复建议，不读写 Forge 内部 JSON |
| 实际验证 | `run_execution_verification` | 提供具体断言命令和输入，审阅覆盖范围与失败 |
| 原子提交后结束 | `finish_execution` | 释放当前执行写入权；不代替任务语义审阅或部署 |

sessionId 使用宿主真实标识；SDK/stdio 可以由宿主覆盖传入身份。会话没有 execution 是正常状态，纯咨询不创建执行、设计或 Change。新会话不能据此认领原会话写入权。当前 taskId 不另建任务账本，不覆盖 OpenSpec 顺序或宿主编排状态。

上下文充分由 Agent 判断；执行获准由 Forge 校验。`BOUND` 仅表示上下文仍绑定，不表示验证通过；验证指纹 `CURRENT` 也不表示所有检查通过。能力配置、工具可调用、操作授权和宿主强制覆盖分别成立。

## 维护入口

| 要修改什么 | 唯一修改入口 |
|---|---|
| 如何调查、判断影响和编写设计 | 相应 Skill 与 references |
| 分支条件、验证类别、执行状态和生命周期路由 | Forge `execution/` 模块 |
| 宿主写入载荷、事件和返回格式 | 插件 Hook 与已有 `change-input.js` |
| CLI 发现、超时、响应协议校验 | 插件 `hooks/forge/client.js` |
| 旧 Forge runtime 的私有文件兼容 | `hooks/forge/legacy-v1.js`，只修兼容缺陷，不增加新策略 |
| 历史设计绑定、具名审阅与证据 | 现有 governance 检查器，按 Forge 返回要求调用 |

## 协议与升级

新版 Forge 安装器写入用户 runtime 的 `protocolVersion: 2`；插件据此调用 `session_init` 和 `check_execution_event`。显式 CLI 覆盖时同时设置 `FORGE_EXECUTION_PROTOCOL=2`。保留 `FORGE_SPEC_RESOLUTION_CLI` 变量和旧 CLI 路径，避免无必要的安装迁移。

v2 返回 `allowed/code/enforcement/legacyGovernanceRequired`。Forge 已绑定执行的拒绝使用 block，旧规格流程按传入的 warn/block 模式；插件仅映射结果。连接失败时无法判断绑定归属，v2 默认失败关闭；显式 `TEAM_STANDARDS_SPEC_RESOLUTION_FAILURE=warn` 可保留诊断放行，此时没有故障阻断保证。`off` 保持原显式关闭语义。

v1 runtime 保留旧适配器和状态布局；不调用不存在的新工具，也不自动升级历史 PASS。Forge 返回明确的兼容设计检查要求时才进入旧检查器；v2 不通过猜测文件存在来决定治理路径。协议不匹配报升级错误，不偷偷回退到另一套治理。

SessionStart 注册只证明适配器存在。支持该事件的宿主可注入上下文；不支持或没有触发证据的宿主，由 Agent 显式调用 `session_init`。启动失败只报告未知能力，写前仍需独立门禁。Stop 是检查事件，不能解释为任务完成或自动释放写入权。

本轮不迁移旧状态、不修改用户全局 Agent 入口、不启用默认 block、不自动归档。自动依赖调度、跨会话任务接管、夜间设计整合和完整能力目录仍不在当前实现范围。
