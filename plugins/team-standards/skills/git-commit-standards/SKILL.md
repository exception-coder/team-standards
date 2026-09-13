---
name: git-commit-standards
description: Use when a task has completed changes ready for automatic local commit, or before any git commit or commit-message generation. Requires synchronized documentation, current validation, scoped staging, a three-part Chinese body, and a real Author; push authorization is separate.
---

# Git 提交规范

## 何时进入本 skill

任何准备执行或生成 `git commit` 的场景都必须先进入本 skill，包括小改、自动收尾和用户未显式说“提交”的场景。`hooks/check-git-commit-skill.js` 只决定是否追加五步重审，不能决定是否跳过正文生成：

- **小改简化**：≤ 2 文件 ∧ insertions+deletions ≤ 30 ∧ 全部为 `M`（仅修改现有文件，无 `A`/`R`/`D`）→ 可跳过五步重审，但不能跳过本 skill，也不能直接使用 `git commit -m`；仍须主动生成“标题 + 三段式中文正文 + Author”。阈值可用环境变量 `TEAM_STANDARDS_TRIVIAL_FILES` / `TEAM_STANDARDS_TRIVIAL_LINES` 调整。
- **大改强制**：以上任一不满足时，hook 检查当前 transcript 是否含 `"skill":"team-standards:git-commit-standards"` 调用记录，未调用直接 exit 2 阻断 → 你看到这套五步清单就意味着本次属于"大改"。
- **git push 不再拦截**：commit 已落地，push 不门禁。
- **提交结构与署名机械兜底**：`hooks/check-commit-no-ai-signature.js` 在宿主提供 Bash PreToolUse 时校验标题、`【改动】`、`【原因】`、`【结果】` 和真实 `Author`，任一缺失即 `exit 2`；同时继续拦截 AI 署名。Codex/Forge 等宿主不保证触发 Bash Hook，因此 Hook 不能替代本 skill 的主动生成。默认 block；`TEAM_STANDARDS_COMMIT_MESSAGE_HOOK=warn|off` 可降级，旧变量继续兼容。

**核心原则**：提交信息以**当前会话的实际改动意图**为准；diff 只是用来兜底校验"有没有遗漏"或"有没有出现你没碰过的文件"。不要把 diff 再翻译成文字——那是重复劳动，且会丢掉只在会话里有的 WHY（设计取舍、踩坑、跟用户对齐的结论）。

**提交前主动填写（所有提交强制）**：不得先执行 `git commit` 再等待 Hook 报错。必须先根据本轮会话填写标题和 `【改动】`、`【原因】`、`【结果】` 三段中文正文，调用 `scripts/build-commit-message.js` 读取 Git 作者并生成消息文件，随后统一使用 `git commit -F <消息文件>`。Hook 是遗漏兜底，不是正文生成器。

## 作业完成后自动提交

AI 原生项目把本次作业的实现、文档和提交作为同一交付单元。适用本规范的套件仓库及业务项目，任务完成且存在本次可提交改动时，默认主动 stage 并创建本地 commit，不等待用户再次说“提交”，不把已完成作业堆积到下次。

1. 先按 [文档同步规则](../markdown-writing-standards/SKILL.md#作业交付时同步文档) 核对并更新受影响的 README、使用说明、规则入口和索引；可执行改动必须具备 delivery-verification 要求的最新通过证据，纯文档任务执行文档与引用检查。
2. 任务开始记录工作区及暂存区基线，提交前以会话编辑记录和 diff 确定本次范围。只暂存本次文件或可独立分离的片段，禁止无差别 `git add -A`。已有无关暂存内容不能带入本次提交，也不能擅自取消暂存；混合片段无法可靠分离时报告具体阻碍。
3. 用户明确要求不提交或项目明确要求人工提交时遵守该约束；用户当前明确授权优先于项目默认规则。“不要 push”只禁止推送，不禁止本地 commit。无改动不创建空提交，验证失败、作业未完成或作者缺失时不以完成名义自动提交，说明待办而非伪报完成。
4. 多仓作业按仓库分别提交本次范围，最终报告提交号及剩余改动归属。非 Git 目录的产物报告为本地文件，不擅自初始化仓库或声称已纳入版本控制。

**推送独立判断：** 本地自动 commit 不授予业务项目自动 push、发布或部署权限。用户已授权推送时按指定远端执行；保留 team-standards / kpay-team-standards 源码仓库插件自身改动的自动 push 特例，用户未禁止且目标远端明确时执行。目标不明或远端拒绝时保留已完成的本地提交并报告，不强推、不绕过分支保护。版本递增按仓库载荷规则执行，不因自动 commit 为业务项目自动升版。宿主审批仍须遵守。

---

## 提交信息格式

```
<type>(<scope>): <标题——用一句话说清楚做了什么>

【改动】<代码具体编写或调整了什么>
【原因】<为什么需要这样改，包含根因或设计取舍>
【结果】<解决了什么问题，或带来什么可验证改善>

Author: <姓名> <邮箱>
```

### 格式规则

| 部分 | 规则 |
|------|------|
| `type` | 必填，见下表 |
| `scope` | 可选，填模块/功能名，如 `order`、`user-auth` |
| 标题 | 不超过 72 字符；动词开头；不加句号 |
| body | 必填；严格按 `【改动】`、`【原因】`、`【结果】` 顺序各写一段中文，不得合并、缺项或用空泛套话代替 |
| Author | 必填；格式：`姓名 <邮箱>`；**只填真实提交者，禁止添加任何 AI 工具署名** |

---

## Type 类型表

| Type | 含义 | 示例场景 |
|------|------|----------|
| `feat` | 新功能 | 新增接口、新增业务流程 |
| `fix` | Bug 修复 | 修复空指针、修复逻辑错误 |
| `refactor` | 重构 | 不改变功能的代码改善，如提取方法、替换实现 |
| `perf` | 性能优化 | 优化 SQL、减少 N+1 查询、加缓存 |
| `docs` | 文档 | 修改注释、更新 Javadoc、更新设计文档 |
| `test` | 测试 | 新增/修改单元测试或集成测试 |
| `style` | 格式 | 不影响逻辑的格式调整（空格、换行、命名） |
| `chore` | 杂项 | 依赖升级、配置修改、构建脚本 |
| `ci` | CI/CD | 流水线配置变更 |
| `revert` | 回滚 | 回滚某次提交 |

---

## 五步执行清单（每步完成后才能进入下一步）

提交前依次完成以下五步；宿主有待办工具时可用于记录，工具缺失不阻碍执行：

```
[ ] 第一步：读取 git config user.name / user.email
[ ] 第二步：确认文档、验证和本次改动范围；定向暂存并核对 staged diff
[ ] 第三步：用会话已知的改动意图直接写 type / scope / body
[ ] 第四步：输出完整提交信息；默认按作业完成规则自动确认，遵守明确例外
[ ] 第五步：执行 git commit 并核对提交范围；独立判断 push 授权
```

### 第一步：获取提交者信息

```bash
git config user.name
git config user.email
```

- 两项均有值 → 记为 Author，继续第二步
- 任意一项为空 → **暂停**，告知用户缺失哪项，等用户补充后再继续，禁止使用占位值

### 第二步：基于会话上下文确认改动范围

**优先用会话上下文，不要直接全量读 diff。**

a) 从对话历史归纳本次会话中你 Edit/Write 过的所有源文件，以及每个文件的改动意图。

b) 跑一次轻量校验：

```bash
git status --short
git diff --staged --name-only
```

c) 比对 staged 文件列表 vs 你在本次会话改过的文件：

| 情况 | 处理 |
|------|------|
| staged 文件与片段均属于本次作业，且已与初始基线核对 | 进入第三步；不能仅凭文件名相同就认定全部片段属于本次任务 |
| 出现你没碰过的文件或片段（用户在 IDE 手动改 / 之前残留的 stage） | 定向读取对应 staged diff，保留原有内容；不能可靠隔离时暂停本次提交并报告归属问题 |
| 工作区有未暂存变更 | 仅对本次已完成且验证通过的文件或片段定向暂存，核对完整 staged diff；保留无关改动 |
| 当前会话被压缩过（关键改动上下文已丢失） | 降级：跑完整 `git diff --staged` + `--stat` 重建上下文 |
| 无任何变更 | 停止，不提交空 commit |

### 第三步：基于会话意图写 type / scope / body

直接用会话里已知的改动目的填：

- 新增了类/方法/接口 → `feat`
- 修改了已有逻辑修复问题 → `fix`
- 改了代码结构但功能不变 → `refactor`
- 只改了注释/文档 → `docs`
- 改了测试文件 → `test`
- 改了 pom.xml/build 配置 → `chore`
- 涉及多个 type → 选主要的，其余在 body 中说明

scope 从变更的包路径或模块名中提取（取最小公共前缀）。

**body 三段重点**：
- `【改动】`：陈述实际编写、调整或删除的能力，避免只写“优化代码”“完善功能”。
- `【原因】`：写根因、设计取舍、踩坑或与用户对齐的结论，这部分优先来自会话上下文。
- `【结果】`：明确解决的问题、恢复的行为或可验证的改善；纯重构也要说明消除的风险或保持的不变量。
- **不要**把 diff 按文件机械翻译成 changelog；三段都要表达语义和闭环。
- 第二步 c) 兜底发现的"你没碰过的文件"，body 里**单独标一段**说明来源

### 第四步：输出提交信息并处理确认

将完整提交信息输出给用户。

- 默认完成场景：记录“自动确认：作业完成后本地提交规则”，直接进入第五步，不重复请求确认。
- 用户或项目明确要求人工确认的例外：在文档、验证、范围和完整提交信息已准备好后，仅询问缺少的确认；已有明确授权时直接执行。

提交失败时保留改动并说明原因，不绕过 Hook，也不将失败表述为已提交。

### 第五步：生成消息文件并执行 git commit

先调用本 skill 自带脚本。`<skill-dir>` 是当前已加载 `git-commit-standards/SKILL.md` 所在目录：

```bash
node "<skill-dir>/scripts/build-commit-message.js" --repo "<repo>" --title "type(scope): 标题" --change "具体改动" --reason "改动原因" --result "解决的问题或改善结果"
git commit -F "<脚本输出的绝对路径>"
```

标题和三段正文由 AI 在脚本调用前根据会话上下文写好；脚本把 `--change`、`--reason`、`--result` 组装为三段式正文，完成校验后读取 Git Author 并安全写文件，不会根据 diff 猜测语义。兼容入口 `--body` 仅用于已组装好的三段式正文，禁止退回只有标题的 `git commit -m`。

**提交信息末尾禁止追加任何内容**，包括但不限于：
- `Co-Authored-By: Claude ...`
- `Generated by ...`
- `🤖 ...`

team-standards 插件源码仓库自动收尾场景在 commit 成功后继续执行：

```bash
git push
```

push 前必须确认**三处 manifest 版本号完全一致**——`.claude-plugin/plugin.json`、`.claude-plugin/marketplace.json`、`.codex-plugin/plugin.json`，三处缺一不可（CI `version-sync-check` 对三处强校验，`.codex-plugin/plugin.json` 是常见漏升点）。若本次改动含 `CLAUDE.md`，push 前还须运行 `node scripts/sync-agents.js` 重新生成 `AGENTS.md`（CI `agents-sync-check` 强校验，无 hook 自动同步）。该版本号递增与同步要求只适用于 team-standards 插件源码仓库，禁止在业务项目中套用。

Plugin 版本递增按**运行载荷**判定：`skills/`、运行时 `hooks/`、`commands/`、`agents/`、`apps/` 或 `mcp/` 变化时必须递增三处 manifest；README、docs、测试、benchmark 和纯发布脚本变化不触发。MCP 引擎的 `src/`、工具 schema、依赖锁或构建契约变化时必须递增 `package.json` 并同步 server info；知识 Markdown 变化不升引擎版本，刷新 catalog 后调用 `reload_knowledge`。

---

## Red Flags

出现以下念头时立即停止，回到对应步骤：

| 念头 | 现实 |
|------|------|
| "我已经改完了，直接全量 git diff --staged 再读一遍才放心" | 第二步明确：会话上下文优先，diff 只兜底；全量读是重复劳动 |
| "git config 肯定有值，跳过读取" | 必须执行命令确认，不能假设 |
| "完成后等用户再说提交" | 默认主动完成文档、验证和本地 commit，明确禁止或人工确认约束除外 |
| "自动 commit 就可以自动 push" | 本地提交与远端推送分别判断授权 |
| "把整个工作区一起暂存最省事" | 只提交本次作业范围，不混入用户或其他任务改动 |
| "加上 Co-Authored-By 是好习惯" | 这是明确禁止的行为，立即删除 |
| "用户让我快点，可以省几步" | 用户说"提交"是 WHAT，流程是 HOW，不可跳过 |

---

## 示例

### 新功能提交
```
feat(order): 新增订单支付状态回调接口

【改动】新增 PayCallbackController#callback() 接口与 OrderPayService#handleCallback()，处理支付网关异步通知，包含：
- 幂等校验（基于 payOrderNo 去重）
- 订单状态流转（待支付→已支付/支付失败）
- 发布 OrderPaidEvent 触发后续业务
【原因】支付结果此前缺少统一异步回调入口，重复通知也没有幂等保护。
【结果】订单可稳定收敛到正确支付状态，重复回调不再产生重复业务动作。

Author: 张凯 <kai.zhang@example.com>
```

### Bug 修复提交
```
fix(user-auth): 修复 token 刷新时并发导致的重复登出问题

【改动】对 userId 维度增加分布式锁，确保同一用户同一时刻只有一个刷新操作执行。
【原因】TokenRefreshServiceImpl#refresh() 未加锁，并发请求会同时判断 token 过期并多次删除旧 token。
【结果】并发刷新不再导致后续请求因 token 不存在而被重复登出。

Author: 李明 <li.ming@example.com>
```

### 重构提交
```
refactor(payment): 替换 BeanUtils 为 MapStruct 转换器

【改动】将 PaymentServiceImpl 中 BeanUtils.copyProperties 替换为 PaymentConvert.INSTANCE，并新增 PaymentConvert 接口。
【原因】反射复制缺少编译期字段检查，字段演进时容易静默漏映射。
【结果】业务行为保持不变，转换错误可在编译期暴露并消除反射带来的类型安全隐患。

Author: 王芳 <wang.fang@example.com>
```

---

## 多文件变更的 body 组织方式

变更文件超过 5 个时，按模块分组描述，不逐文件列举：

```
feat(inventory): 新增库存预占与释放功能

【改动】
- InventoryReserveService 及其实现，支持库存预占、确认、释放三态流转
- inventory_reserve 表及对应 DO/Repository
- OrderCreateServiceImpl#create()：下单时调用库存预占接口
- InventoryController：新增预占查询接口
- 新增 com.example.inventory.feign.InventoryFeignClient，需同步部署库存服务
【原因】下单流程缺少库存占用边界，并发订单可能同时消耗同一份可售库存。
【结果】下单到履约期间的库存具备可追踪的预占、确认和释放闭环，降低超卖风险。

Author: 张凯 <kai.zhang@example.com>
```

---

## 团队配置

Author 信息**统一从当前仓库的 git 配置中读取**，无需在 CLAUDE.md 中手动配置：

```bash
git config user.name    # 例：张凯
git config user.email   # 例：kai.zhang@kpay-group.com
```

每位成员在本机配置好 git 用户信息即可，Skill 自动读取。若仓库未配置，则回退读取全局配置（`--global`）；若均为空，暂停并提示用户配置后再继续。
