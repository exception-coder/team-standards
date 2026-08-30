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

3. MCP 不可用时，使用项目 `AGENTS.md` 明确声明的 Forge CLI；项目未声明 Forge 时执行项目原生构建、测试和专项验证，并明确说明降级证据。
4. 读取 `status`、`staticStatus`、`runtimeStatus`、`issues`、`executedCheckers` 和 `executedVerifiers`。未执行的检查器不得报告为通过。
5. `FAILED` 时按 `issues` 修复最小必要范围，然后重新验证。最多进行 3 轮自动修复；第三轮仍失败时停止，保留真实失败证据并向用户报告阻断。
6. 验证之后发生任何相关编辑，返回第 1 步。只有最新工作区的 PASS 可以放行。

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
