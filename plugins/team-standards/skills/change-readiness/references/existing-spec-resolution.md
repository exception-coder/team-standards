# 已有规格找回与防重复

## 工作流

前置入口为[按影响判定](impact-routing.md)：Forge `discover_execution → assess_execution` 无需 changeId。行为保持走无需 Change 的执行；只有行为变化才进入下面 Delta 链路。绑定执行的会话使用 `check_execution_readiness`，其优先于旧的 change-only 路由，提交前还要求真实、未过期的适用验证。

在新建 Capability 或撰写 Delta 前，将需求拆为独立原子项，保留原文与稳定 externalId。先查询正式 `openspec/specs` 的 Requirement/Scenario，再核对活动 changes；Graphify 只补充实现坐标，检查其新鲜度，不把代码事实当作已接受行为。

已安装的项目 resolver 提供结构化结果时，复用它的候选、原文、证据和内容版本。Forge MCP 使用可选 `intake_spec_requirements` 拆分并审阅原文追踪 → `resolve_specs` → Agent 审阅 → `confirm_spec_resolution` → 写入返回草稿 → 官方 OpenSpec 严格校验 → `check_change_readiness`。resolve 传真实宿主 sessionId，confirm 传 implementationFiles 项目相对路径。工具不可用时可用正式规格与 Graphify 定向检索完成同等审阅，不能绕过已启用的 block Hook，也不能将手工审阅冒充机器 PASS。

- 改变既有 Requirement 的可观察行为：`MODIFIED`，保留原标题和稳定 ID，提交完整正文与适用 Scenario。
- 在已有 Capability 下新增独立规则：`ADDED`，不新建同义能力。
- 撤销既有行为：`REMOVED`，说明原因和迁移。
- 现有能力均不能承载且边界独立：`NEW_CAPABILITY`，明确具名决策及依据。
- 恢复既有规则、纯实现或样式调整：`NO_SPEC_CHANGE`，保留具体理由和适用原 Requirement；不创建空 Delta。
- 多候选接近、跨域不清或目标未决：保持未确认；结合已有授权消歧，确有业务歧义再询问用户。不得将 Agent 决策伪装人工批准。

词法/图谱排序分数不等于语义置信度。Agent 对 Top-K 的业务审阅负责，解析服务校验身份、版本、分类、完整 Delta 与重复。相同输入复用解析；新增需求重新解析，正式规格更新或分支变化重新核对，不复用旧 PASS。

模型默认 4 秒超时，可显式调整 timeoutMs；失败返回候选与原因。AUTO_DRAFT 只代表已通过确定性证据和阈值检查的草稿，不代表批准；新增能力与歧义必须确认。Graphify VERIFIED_SOURCES 仅验证本次来源文件，不证明全图完整。`get_spec_resolution_metrics` 提供确认与纠正样本，空分母为 null；不能把测试样本或 Agent 一致率写成生产准确率。

## 薄 Hook 契约

`check-spec-resolution.js` 只调用宿主配置的 JSON CLI，不内置检索、分类或规格合并。配置：

- `FORGE_SPEC_RESOLUTION_CLI`：项目提供的编译后 Node CLI 绝对路径。
- `FORGE_OPENSPEC_CHANGE`：本会话明确绑定的活动 change。
- `TEAM_STANDARDS_SPEC_RESOLUTION_HOOK=warn|block|off`：默认 warn；试点验收后启用 block。
- `TEAM_STANDARDS_SPEC_RESOLUTION_FAILURE=warn`：显式允许连接故障告警放行；默认遵从 mode。诊断保留在 stderr，并复用本地 hook-events.jsonl 记录规则码和 warn/block；日志写入失败显式提示，不声称已有集中审计。

环境变量可覆盖本机自动发现：Forge 安装器将 CLI 注册到用户目录 `.kai-toolbox/forge-spec-resolution.json`；Hook 根据 payload.session_id 读取项目内会话路由，由 Forge 校验 branch/change。无绑定时显式失败，不猜唯一活动 change。安装器不重启服务。

写前分发器传递 project/changeId/operation/files；提交前由 Forge 读取暂存区并检查 implementationFiles。覆盖 Write/Edit/MultiEdit/apply_patch 以及可识别的 Bash/exec_command 提交。归档后的 PostToolUse 调用 `refresh_spec_index`，不执行 archive、不自动批准旧记录。不能保证任意 Shell、副进程或所有宿主都被拦截。stdout 必须返回机器 JSON，超时、非法响应、配置缺失在 block 模式拒绝。

规划 Markdown 保持可编辑，方便修复门禁缺口。代码范围与 Tasks 的语义一致性仍由原治理流程审阅；本 Hook 不声称自动验证所有实现范围。宿主是否加载 Hook、Forge CLI 路径和失败策略必须分别实测；不因插件注册就声称已经强制执行。
