---
name: delivery-verification
description: "Use after executable project changes and before declaring completion. Prefer forge_verify when available, require current PASS evidence, and drive a bounded repair-and-reverify loop."
---

# 真实交付验证门禁

## 核心规则

源码、构建配置、SQL、Migration、API 契约、测试或基础设施配置发生变化后，在最终回复前验证当前工作区。MCP 注册只表示工具可用；本 Skill 负责完成前调用和结果裁决。

<HARD-GATE>
存在可执行改动时，最近一次相关修改之后必须有针对当前工作区的验证证据。`forge_verify` 可用时必须以 `phase=all` 调用；只有结构化 `status=PASSED` 且必需 Checker、Verifier 确实出现在执行列表中，才可声明 Done。验证后再次修改会使旧证据失效。
</HARD-GATE>

## 执行流程

1. 将当前会话编辑记录与 `git status --short` 求交集，确认本轮可执行改动；不接管会话开始前的用户改动，也不把纯文档改动当成 Runtime 触发条件。
2. 检查 Agent 工具列表；存在 `forge_verify` 时调用：

   ```json
   {"project":"当前项目绝对路径","phase":"all"}
   ```

3. MCP 不可用时，使用项目 `AGENTS.md` 明确声明的 Forge CLI；项目未声明 Forge 时按下方变更分级选择项目原生构建、测试和专项验证，并明确说明降级证据。
4. 读取 `status`、`staticStatus`、`runtimeStatus`、`issues`、`executedCheckers` 和 `executedVerifiers`。未执行的检查器不得报告为通过。
5. `FAILED` 时按 `issues` 修复最小必要范围，然后重新验证。最多进行 3 轮自动修复；第三轮仍失败时停止，保留真实失败证据并向用户报告阻断。
6. 验证之后发生任何相关编辑，返回第 1 步。只有最新工作区的 PASS 可以放行。
7. OpenSpec 项目同时按 change-readiness 的 [治理检查器协议](../change-readiness/references/governance-checker.md) 记录本切片的验证、设计视图和 Scenario 映射，再检查 delivery。完成当前任务不等于整个 change 可归档；记录命令不执行验证，不能用 record 代替前述真实检查。
8. 按 [文档同步规则](../markdown-writing-standards/SKILL.md#作业交付时同步文档) 更新受影响文档并核对引用；若改变验证输入，重新验证。通过后进入 [git-commit-standards](../git-commit-standards/SKILL.md) 自动提交当前逻辑单元，再推进下一单元，报告单元、验证与提交号对应关系。部分提交不得依赖未提交改动的测试结果，快照验证边界见提交 Skill。纯文档任务通过文档检查后也进入提交流程，不伪造 Runtime 验证。

## 本地验证按影响选择

以下分级用于项目原生验证，不覆盖 Forge 的 `phase=all`、项目明确门禁或 CI 全量检查。按实际行为和依赖选择，不能仅以扩展名或行数分档；混合变更取各类检查的并集。

| 改动 | 本地最低验证 |
|---|---|
| 纯说明、措辞 | 受影响链接、结构、事实和生成入口同步；不运行无关 Runtime 测试 |
| Skill 指令、触发或工作流 | 上述检查 + Skill 结构/引用校验 + 正常、豁免、失败场景逐项审视；Markdown 中的可执行指令不能当纯说明 |
| 单个 Hook/脚本或业务模块 | 受影响单元测试与必要集成/构建，覆盖改动行为及相邻依赖 |
| Skill 增删、资源移动或安装元数据 | 引用/数量/版本检查 + 受影响打包安装测试 |
| 共享运行库、调度、依赖、构建/CI 契约或影响无法确定 | 项目完整相关回归；不能以“文档多”缩小可执行改动影响 |

验证后只因新的相关改动、失败或未解决疑点扩大/重跑；无关文档措辞不使已验证源码的证据自动失效，项目内容指纹门禁另有约定时遵从。CI 保留完整回归，本地选择及未执行项在交付说明中如实简述，不另建验证报告，不把场景审视当运行测试。

## 环境与安全边界

- `.forge/verify.yml` 是项目 Runtime 场景和环境引用的事实来源；团队 Skill 不内置业务 URL、数据库或凭据。
- 凭据只通过环境变量或项目既有 Secret 机制提供，不写入 transcript、报告或仓库。
- Runtime 环境不可用属于真实失败，不得改写成 PASS；应区分产品缺陷、环境故障和配置缺失。
- 不自动扩大权限、不启动未获授权的外部环境、不执行破坏性 SQL。

## 完成输出

最终回复至少说明：

- 使用了 MCP、Forge CLI 还是项目原生降级验证。
- Static 与 Runtime 的真实状态。
- 实际执行的 Checker 和 Verifier。
- 未执行项、环境缺口或残余失败。

## 红线

- 不把“编译通过”替代真实 Runtime 场景。
- 不因 MCP 已注册就声称验证已执行。
- 不在验证失败后跳过修复循环直接 Done。
- 不无限修复；达到轮次上限后必须停止并交付失败观察。
- 不接受发生在最后一次相关修改之前的验证证据。

## 状态契约闭环

状态相关改动按 [状态契约治理协议](../change-readiness/references/state-contract.md) 执行已登记模块的真实命令并检查新鲜证据。STATIC_PASS 不等于业务 PASS；核对测试实际依赖与构建产物，旧 JAR、缺失环境或过期图谱不得冒充当前验证。已接入项目由共享治理入口检查，未接入模块明确披露。
