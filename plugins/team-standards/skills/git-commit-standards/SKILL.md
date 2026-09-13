---
name: git-commit-standards
description: "Use before committing completed work or when querying, summarizing, or explicitly recording work history. Requires scoped commits, synchronized documentation, current validation, a three-part Chinese body, and a real Author; push authorization is separate."
---

# Git 提交规范

## 作业完成后自动提交

AI 原生项目把本次作业的实现、文档和提交作为同一交付单元。适用本规范的套件仓库及业务项目，任务完成且存在本次可提交改动时，默认主动 stage 并创建本地 commit，不等待用户再次说“提交”，不把已完成作业堆积到下次。

1. 先按 [文档同步规则](../markdown-writing-standards/SKILL.md#作业交付时同步文档) 核对并更新受影响的 README、使用说明、规则入口和索引；可执行改动必须具备 delivery-verification 要求的最新通过证据，纯文档任务执行文档与引用检查。
2. 任务开始记录工作区及暂存区基线，提交前以会话编辑记录和 diff 确定本次范围。只暂存本次文件或可独立分离的片段，禁止无差别 `git add -A`。已有无关暂存内容不能带入本次提交，也不能擅自取消暂存；混合片段无法可靠分离时报告具体阻碍。
3. 用户明确要求不提交或项目明确要求人工提交时遵守该约束；用户当前明确授权优先于项目默认规则。“不要 push”只禁止推送，不禁止本地 commit。无改动不创建空提交，验证失败、作业未完成或作者缺失时不以完成名义自动提交，说明待办而非伪报完成。
4. 多仓作业按仓库分别提交本次范围，最终报告提交号及剩余改动归属。非 Git 目录的产物报告为本地文件，不擅自初始化仓库或声称已纳入版本控制。

**推送独立判断：** 本地自动 commit 不授予业务项目自动 push、发布或部署权限。用户已授权推送时按指定远端执行；保留 team-standards / kpay-team-standards 源码仓库插件自身改动的自动 push 特例，用户未禁止且目标远端明确时执行。目标不明或远端拒绝时保留已完成的本地提交并报告，不强推、不绕过分支保护。版本递增按仓库载荷规则执行，不因自动 commit 为业务项目自动升版。宿主审批仍须遵守。


## 提交步骤

1. 读取当前仓库 `git config user.name` 和 `git config user.email`；缺失时报告具体缺项，不编造作者，不添加 AI 署名。
2. 核对本次已完成改动、文档及最新验证，定向暂存并审阅 staged diff；保护用户和其他任务的未提交、已暂存内容。
3. 根据实际意图填写不超过 72 字符的 `type(scope): 标题`，以及依次排列的 `【改动】`、`【原因】`、`【结果】` 三段中文正文和真实 Author。type 使用 feat、fix、refactor、perf、docs、test、style、chore、ci 或 revert；scope 可选。
4. 用下方脚本生成并核对消息文件，再执行 `git commit -F <消息文件>`。小改也不得省略正文或改用仅标题的 `-m`；正常自动提交不重复展示正文或要求确认，用户要求查看或缺少必要人工确认时才展示完整信息。
5. 核对提交范围与提交号，按已有授权推送；失败保留改动并报告，禁止绕过 Hook、强推或伪报完成。

```bash
node "<skill-dir>/scripts/build-commit-message.js" --repo "<repo>" --title "type(scope): 标题" --change "具体改动" --reason "原因" --result "实际结果"
git commit -F "<脚本输出的绝对路径>"
```

`<skill-dir>` 是本 SKILL.md 所在目录。脚本校验结构并读取 Git 作者，不根据 diff 猜测业务意图。

## 按需细则

- 修改或发布插件/MCP 运行载荷前，必须读取 [提交与版本细则](references/commit-details.md) 的版本要求；team-standards 三处 manifest 同步升版，CLAUDE.md 修改后生成 AGENTS.md。业务项目不套用插件升版规则。
- 需要格式示例或排查提交步骤时读取同一参考。Hook 的小改豁免只影响额外重审，不能豁免本 Skill 的提交格式和安全边界；宿主未执行 Hook 不代表已校验。
- 收尾只报告结果、验证、提交号及实际剩余问题，不重复提交正文和内部清单。

## 工作汇总模式

用户要求工作查询、汇总或持久日志时，读取 [work-summary.md](references/work-summary.md)；普通交付不自动创建日报。
