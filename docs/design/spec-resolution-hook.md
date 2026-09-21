# Existing Spec Resolution Hook

## 设计与边界

新版 Hook 使用 Forge runtime protocol v2，通过 `hooks/forge/client.js` 传递 project、sessionId、生命周期事件、command 和文件范围；Forge `check_execution_event` 选择执行或旧规格治理，返回 allowed/code/enforcement/legacyGovernanceRequired。分支、范围、写入权和故障恢复语义归 Forge，Hook 不读取其内部 JSON。正式契约和操作步骤见[执行适配协议](../../plugins/team-standards/skills/change-readiness/references/execution-adapter.md)。

SessionStart 只读调用 `session_init`，返回能力与当前执行归属；该事件没有接线时由 Agent 主动调用。Stop 只检查，不释放执行。绑定执行拒绝为 block；未绑定旧规格流程按 mode；v2 连接失败默认 block，可显式 failure=warn，off 保留原语义。传输层不能从连接错误猜测任务没有绑定。

`hooks/forge/legacy-v1.js` 隔离原 runtime 的文件布局兼容。v1 不支持 Session Init；v2 协议错误不静默降级。原设计正文与审阅证据仍由旧治理检查器处理，Forge 实时返回无需兼容检查时才跳过。保留规划文档修复路径与原有交付门禁；任意 Shell 副作用不在完整覆盖声明内。

## 验收

覆盖可实施、未确认、配置缺失、超时、非法响应、非 OpenSpec、规划文档豁免和带空格路径。宿主命令以参数数组启动 Node，不拼接 Shell。原有文档及交付门禁不被替代。

4.6.0 补齐用户目录 runtime 发现、session_id 对应项目/分支/change 的路由、Codex freeform apply_patch 载荷与 exec_command 匹配。无 session 绑定保持明确失败，不回退到任意活动 change。源码范围仍由 Forge 确认清单检查；插件不复制该逻辑。新增载荷先适配到已有共享输入契约，不改变共享 adapter 或 Golden fixture。

验证：Hook 全量 239 项中 238 通过、1 跳过、0 失败；含隔离 Codex CLI 安装。真实临时 Git 项目调用新编译 Forge CLI，未确认返回 2，确认范围内返回 0，范围外返回 2。该证据不替代当前桌面任务中插件重载后的触发验收。
