# 已有规格找回与防重复

## 工作流

在新建 Capability 或撰写 Delta 前，将需求拆为独立原子项，保留原文与稳定 externalId。先查询正式 `openspec/specs` 的 Requirement/Scenario，再核对活动 changes；Graphify 只补充实现坐标，检查其新鲜度，不把代码事实当作已接受行为。

已安装的项目 resolver 提供结构化结果时，复用它的候选、原文、证据和内容版本。Forge MCP 使用 `resolve_specs` → Agent 审阅 → `confirm_spec_resolution` → 写入返回草稿 → 官方 OpenSpec 严格校验 → `check_change_readiness`。工具不可用时可用正式规格与 Graphify 定向检索完成同等审阅，不能绕过已启用的 block Hook，也不能将手工审阅冒充机器 PASS。

- 改变既有 Requirement 的可观察行为：`MODIFIED`，保留原标题和稳定 ID，提交完整正文与适用 Scenario。
- 在已有 Capability 下新增独立规则：`ADDED`，不新建同义能力。
- 撤销既有行为：`REMOVED`，说明原因和迁移。
- 现有能力均不能承载且边界独立：`NEW_CAPABILITY`，明确具名决策及依据。
- 恢复既有规则、纯实现或样式调整：`NO_SPEC_CHANGE`，保留具体理由和适用原 Requirement；不创建空 Delta。
- 多候选接近、跨域不清或目标未决：保持未确认；结合已有授权消歧，确有业务歧义再询问用户。不得将 Agent 决策伪装人工批准。

词法/图谱排序分数不等于语义置信度。Agent 对 Top-K 的业务审阅负责，解析服务校验身份、版本、分类、完整 Delta 与重复。相同输入复用解析；新增需求重新解析，正式规格更新或分支变化重新核对，不复用旧 PASS。

## 薄 Hook 契约

`check-spec-resolution.js` 只调用宿主配置的 JSON CLI，不内置检索、分类或规格合并。配置：

- `FORGE_SPEC_RESOLUTION_CLI`：项目提供的编译后 Node CLI 绝对路径。
- `FORGE_OPENSPEC_CHANGE`：本会话明确绑定的活动 change。
- `TEAM_STANDARDS_SPEC_RESOLUTION_HOOK=warn|block|off`：默认 warn；试点验收后启用 block。
- `TEAM_STANDARDS_SPEC_RESOLUTION_FAILURE=warn`：显式允许连接故障告警放行；默认遵从 mode。诊断保留在 stderr，并复用本地 hook-events.jsonl 记录规则码和 warn/block；日志写入失败显式提示，不声称已有集中审计。

写前分发器传递 project/changeId/operation/files；提交前检查规格状态。归档后的 PostToolUse 调用 `refresh_spec_index`，不执行 archive、不自动批准旧记录。命令识别只覆盖可识别的 git commit/openspec archive，不能保证任意 Shell、副进程或所有宿主都被拦截。stdout 必须返回机器 JSON，超时、非法响应、配置缺失在 block 模式拒绝。

规划 Markdown 保持可编辑，方便修复门禁缺口。代码范围与 Tasks 的语义一致性仍由原治理流程审阅；本 Hook 不声称自动验证所有实现范围。宿主是否加载 Hook、Forge CLI 路径和失败策略必须分别实测；不因插件注册就声称已经强制执行。
