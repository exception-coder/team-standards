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

### 同一会话切换 change 的兼容设计绑定

治理 CLI、设计准备 CLI 和 Hook 在 Forge v2 下通过 `session_init` 读取真实会话的当前写入执行，按项目、真实会话、change 选择设计准备及证据绑定。旧单会话记录仅在 change 相同时复用；其他 change 的基线与证据保留，不伪造新 session、不删除旧记录、不复用其他规格的 PASS。显式 `--change` 与当前执行不一致时返回 `GOVERNANCE_CHANGE_MISMATCH`。

自动推进遇到绑定缺失或 `SCOPE_GAP`，先核对 Runtime change 与写入执行，再审阅当前 task 的实际文件、相关设计和既有计划。归属明确时主动准备当前 change、更新计划并 bind，执行必要的设计检查后继续；已有本地测试仅在输入指纹仍有效时复用。不得为消除范围错误盲目扩大到全仓，也不得把实际设计缺口当作绑定错误跳过。

真实 writer 已有未提交改动、任务未完成且缺兼容绑定时，使用 [recover-writer 开发恢复](automatic-design-maintenance.md#真实-writer-的开发恢复)：实时核对身份、精确文件范围与当前设计审阅，恢复后重新 bind/preflight。不要要求先提交或先完成 task 才恢复开发绑定。已提交且已验证的切片仍使用 resume，缺绑定但已有当前交付证据的旧状态可用 recover。Runtime 已进入 WAITING_USER 时，在用户授权恢复后使用宿主的原运行 resume 动作；进度上报的 HTTP 409 不等于新的代码或设计缺口。

已有兼容绑定但尚未交付时，使用 [resume-writer](automatic-design-maintenance.md#已有绑定的开发续接)，保留历史范围和旧记录，核验当前 writer 后续接开发。规范 governance-evidence.json 是输出，4.10.13 的 snapshot/record 按源输入计算指纹；旧自引用证据仍需实际审阅、验证关联和新 record，不能自动当作 PASS。
