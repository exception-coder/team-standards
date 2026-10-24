---
name: git-commit-standards
description: "Use before committing completed work or when querying, summarizing, or explicitly recording work history. Requires atomic logical commits, synchronized documentation, current validation, a three-part Chinese body, and a real Author; push authorization is separate."
---

# Git 提交规范

目标：每个提交是可理解、可验证、可说明恢复边界的完整逻辑变更。共同准则见[工程宪法](../change-readiness/references/engineering-principles.md)。

## 判断准则

- 按问题和依赖划分单元，每单元完成实施、验证与提交后继续；同一功能的前后端、迁移、测试和文档一起提交，独立问题不因同模块或同一天而合并。
- 任务开始记录工作区及暂存区基线，提交前审阅完整 staged diff；只暂存本次文件或可安全分离的片段。
- 验证证据须覆盖待提交快照与依赖。其他未提交改动可能影响结果时，使用普通临时快照等隔离验证；输入未变则复用有效证据。
- 提交正文解释原问题、关键做法与实际结果。Git 撤销不保证恢复数据库及外部副作用，必要时说明真实恢复边界。

## 必要约束

- 不使用无差别 `git add -A`，不擅自 stash/reset 或取消用户暂存。混合范围无法可靠分离时保留现场并报告。
- 任务完成且有本次可提交改动时默认主动本地 commit；用户不提交/人工提交约束优先。无改动、未完成、验证失败或作者缺失时不以完成名义提交。
- 作者从当前仓库 Git 配置读取，禁止编造作者或追加 AI 署名。标题不超过 72 字符，使用 `type(scope): 标题`；正文依次为中文 `【改动】`、`【原因】`、`【结果】`，保留真实 Author。完整合同见[提交细则](references/commit-details.md)。
- 本地 commit 与 push 分别判断授权。team-standards/kpay-team-standards 源码仓库的插件自身改动保留自动 push 特例；目标明确且用户未禁止时执行，拒绝则报告，不强推、不绕过 Hook 或分支保护。
- 分支与写入权消费已采用的[执行策略](../change-readiness/references/execution-adapter.md)；验证方式不额外授予建分支权限。

## 执行与完成边界

同步[受影响文档](../markdown-writing-standards/SKILL.md#作业交付时同步文档)并核对有效验证、作者和暂存范围。用脚本生成消息，核对后提交：

```bash
node "<skill-dir>/scripts/build-commit-message.js" --repo "<repo>" --title "type(scope): 标题" --change "具体改动" --reason "原因" --result "实际结果"
git commit -F "<脚本输出的绝对路径>"
```

`<skill-dir>` 为本 Skill 目录。消息依据会话事实和 staged diff，脚本只校验并安全写文件。核对提交号与范围，按已有授权推送；多仓分别提交，非 Git 产物说明实际位置。

## 精炼反例

- 把两个独立 Bug 塞进“优化系统”：分别形成完整逻辑提交。
- 工作区测试通过就提交其中一半：核对暂存快照是否依赖另一半。
- 三段正文只列文件与版本：写出行为为何变化及验证边界。
- “不要 push”就连本地 commit 也不做：分别遵守两种动作的约束。

插件/MCP 载荷变更的升版、生成文件及消息示例见[提交与版本细则](references/commit-details.md)；工作查询、汇总或持久日志用[工作汇总模式](references/work-summary.md)。
