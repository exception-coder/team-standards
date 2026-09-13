# OpenSpec 治理检查器协议

## 1. 能力与接入边界

入口为插件根下 `scripts/openspec-governance.js`，Node 18+；本地真实 CLI 集成验证使用 OpenSpec 1.13.0 与当前 Node。CLI 只读状态与工件路径来自 [官方 agent contract](https://github.com/Fission-AI/OpenSpec/blob/main/docs/agent-contract.md)，不硬编码 proposal/design/tasks 的 schema 依赖。

本地状态存入用户 `.local/share/team-standards/governance`，可用 `TEAM_STANDARDS_GOVERNANCE_DATA` 指向宿主可写目录。仓库证据为当前 change 的 `governance-evidence.json`。无需项目治理配置文件；引用的业务文档仍由项目自行维护。

Hook 默认 `warn` 试运行，保留原 change-readiness 与 delivery-verification 行为。项目试点验证后，在启动会话前设置 `TEAM_STANDARDS_OPENSPEC_GOVERNANCE_HOOK=block`，OpenSpec 分支使用共享检查；`off` 只关闭新增检查，不关闭原门禁。既有批准的单次 legacy 降级仍按原规则执行，不能伪称启用强制治理。S 档在试运行阶段沿用原分流；当前 block 检查面向已绑定 change 的任务，尚无无 change 的结构化 S 豁免入口，不将其宣传为全档位接入完成。

---

## 2. 命令与输出

下列 `<plugin>`、`<repo>` 和文件名是运行时参数，替换为实际路径。`--session` 使用宿主当前 session ID；宿主不暴露 ID 时，由当前任务固定 `TEAM_STANDARDS_GOVERNANCE_SESSION`，恢复时沿用。

```text
node <plugin>/scripts/openspec-governance.js discover --repo <repo>
node <plugin>/scripts/openspec-governance.js doctor --repo <repo>
node <plugin>/scripts/openspec-governance.js bind --repo <repo> --session <session> --change <change> --plan <review.json>
node <plugin>/scripts/openspec-governance.js check --repo <repo> --session <session> --phase preflight
node <plugin>/scripts/openspec-governance.js snapshot --repo <repo> --session <session>
node <plugin>/scripts/openspec-governance.js record --repo <repo> --session <session> --plan <review.json> --phase delivery
node <plugin>/scripts/openspec-governance.js check --repo <repo> --session <session> --phase delivery
node <plugin>/scripts/openspec-governance.js check --repo <repo> --session <session> --phase archive
```

`bind` 调用官方 status/apply/严格校验，检查 planning 与具名设计审阅。`review.json` 是可放插件临时数据目录的输入，不是必需项目配置或第二份正文。工件变化后更新同一输入再 bind，保留原基线和累计重试数，不允许换 change 或缩小范围排除已修改文件。

`record` 在实际验证后显式写入证据；不会运行测试、编造审阅或自动勾选 tasks。它重新读取 CLI 和正文，核验当前切片 tasks 已完成并计算内容指纹。`check` 无文件写入副作用，不运行构建、模型、同步或归档；archive 只检查整 change 的任务、同步与晋升证据，执行动作仍交官方工具与当前授权。

实际审阅与验证时保存 `snapshot.inputFingerprint`，分别填入 review 和每项 verifications 的同名字段；record 会与当前输入比较。snapshot 自身只读文件，不能声称执行过测试。相关代码修改后旧指纹不再匹配，必须重新审阅与验证，不能仅重复 record 来刷新通过状态。

标准输出始终为一个 JSON 对象，包含 `schemaVersion/policyVersion/checkerVersion/status/findings`；finding 含 `rule/message`。PASS 与 NOT_APPLICABLE 退出 0，NEEDS_WORK/CONTEXT_REQUIRED 退出 2，CHECK_ERROR 退出 1。结构与新鲜度 PASS 不等于独立语义认证。

机器结构见 [治理结果与证据 Schema](../../../hooks/contracts/openspec-governance.v1.schema.json)，运行检查器同时校验引用正文、作用域、任务与指纹等跨字段关系；Schema 合法本身不表示这些检查通过。

---

## 3. 审阅输入

路径必须是 Git 根内相对路径。设计、场景与审阅引用的标题必须含 `#` 并唯一定位非空章节；验证可直接引用非空原始结果文件。下表定义 `review.json`；数组成员均需实值，不使用示例占位数据记录交付。

| 字段 | 内容 |
|---|---|
| files | 精确文件路径数组，覆盖本次新增、删除及重命名两端 |
| taskIds | 当前切片在 CLI apply 返回中的真实任务 ID，不能猜测为 Markdown 编号 |
| views | 每项含 id、files、disposition、reason；非 not-applicable 项必须有 reference |
| scenarios | 每项含唯一 id、files、taskIds、reference、verificationIds |
| review | type 为 agent/human/independent，actor 为实际执行者，result 为 PASS，reference 复用被审阅的现有设计或审阅正文，不另建报告 |
| dedup | 可选；需要保留选择理由时填写 query、decision，reference 可省略 |
| handoff | 暂停或转交时按需提供 stage、nextTask、blockers，reference 可省略；存在阻塞仍不能交付 |
| verifications | 每项含唯一 id、实际 command/人工操作、environment、result 与 reference；record 要求 PASS |

`reference` 为 `{ "path": "相对文档路径", "heading": "## 实际唯一标题" }`。视图 id 包括 implementation、contracts、data、workflow、async、runtime、architecture、ui；每个文件至少覆盖 implementation。检查器按路径给出额外候选视图，审阅者按实际差异补全影响并集。disposition 为 updated/already-covered/not-applicable，所有状态都要具体理由；not-applicable 不需要正文引用，其余状态保留标题定位。不能用“不适用”掩盖实际影响，具名审阅仍须核实内容。验证 reference 可仅有 path，直接引用原始日志或 JSON（上限 4 MiB）；引用内容纳入新鲜度检查，不验证日志所声称的执行真实性。CI 使用的结果文件须进入待验收提交，不把本地忽略日志冒充可复现的 CI 证据。

归档记录在相同输入中增加 `sync`（status 为 synced/not-applicable、reason、reference、targets 引用数组）和 `promotion`（按视图 id、disposition、reason、reference）。无需晋升的视图只记录理由，不需要 reference；实际更新或已有覆盖仍引用正文。先由官方工具同步主规格并更新受影响的长期设计，再以 `record --phase archive` 记录结果；sync 不是自动合并命令。

---

## 4. 基线、并发与新鲜度

绑定保存真实仓库/worktree、分支、初始 HEAD、初始可执行脏文件指纹和精确范围。开始前已脏且与任务重叠的文件返回 DIRTY_OWNERSHIP；其它初始改动保留，发生变化则返回 MIXED_CHANGES。当前实现保守拒绝混合归属，未提供自动 hunk 拆分；可先使用独立 worktree 分离任务。

已提交改动仍按起始基线检查，工作区干净不等于任务无变化。新增未绑定可执行文件触发 SCOPE_GAP。代码、工件、正文引用变化触发 CODE_STALE/ARTIFACTS_STALE/REVIEW_STALE；单纯更新时间不能抵扣失效。现阶段按文件或引用章节失效，不声称精确理解语义依赖。

锁与原子替换保护绑定和证据。同一 change 的并发任务不能静默覆盖同一证据文件，应先合并交付范围；遗留锁需确认无活动写入后处理，不自动删除不明锁。不同会话的绑定隔离，不按最近修改时间挑选 change。

每文件读取上限 4 MiB、每次指纹最多 1000 文件、单个外部命令超时 5 秒；超限或解析失败明确报错。当前只支持工件与证据处于同一真实 Git 根，外部 store 或跨仓 planning 返回路径范围缺口，不默默复制到本仓库。多仓库分别绑定。

---

## 5. Stop、CI 与验收

Stop 只检查本会话已有绑定，不拦截普通未绑定对话。block 模式最多两次要求补齐，更新文件或重新 bind 不重置次数；预算耗尽输出“仍未完成”，停止自动循环，独立检查及 CI 仍失败。宿主协议采用 [Claude Stop JSON 契约](https://code.claude.com/docs/en/hooks#stop-and-subagentstop)，其它宿主必须单独验证，不能推定同样生效。

CI 将插件固定版本置于执行器，干净检出待验收 head，并提供本次 base/head：

```text
node <plugin>/scripts/openspec-governance.js check --repo <repo> --base <commit> --head <commit> --evidence openspec/changes/<change>/governance-evidence.json --phase delivery
```

CI 不依赖本地会话缓存；检查输入必须全部处于目标提交。单次 CI 命令覆盖一个 change，出现其它未覆盖可执行变化会失败；多 change 聚合交付仍需后续扩展，不能忽略额外变化。分支保护由目标仓库配置，提供命令和自身测试不代表远端门禁已启用。

已提供临时 Git 仓库、JSON 命令和 Hook 适配测试，真实 OpenSpec 测试通过 `OPENSPEC_TEST_CLI` 指向固定版本 CLI。doctor 仅报告本地能力并将宿主状态标为 UNVERIFIED；Hook 信任、事件注册、业务试点、Linux/macOS 宿主触发和外部 store 支持均须取得实际证据后再升级支持声明。

## 6. 策略版本与升级

3.4.0 使用 schemaVersion 1、policyVersion 2、checkerVersion 2。旧计划字段仍可读取，但旧绑定和交付证据不会被静默视为新策略 PASS。更新计划后对同一 session/change 重新 bind：保留起始基线、脏文件归属、已有范围和重试数，清除已交付标记；未知版本拒绝迁移。复核适用内容与真实验证后重新 record，CI 必须固定匹配的插件版本。不要通过删除状态或换会话绕过基线。
