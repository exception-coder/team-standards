# team-standards

团队 Claude Code 开发规范插件，包含：

- **跨语言通用编码规范**（命名表意 / 函数原子 80 行硬阈值 / 层次分明单向依赖 / 零魔法值强制枚举 / 注释三档 / 异常不静默 / DRY rule of 3；任何源码语言 Edit/Write 前先于具体语言 skill 触发）
- **Java 编码规范**（阿里巴巴黄山版·强制项精简版，仅保留 Java 独占条款，通用部分由跨语言规范承载）
- **功能设计文档强制约束**（开发前必须有设计文档，否则引导创建）
- **方案审视与更优建议**（用户提出具体方案或要求参考现有代码时，先判断目标、代码质量、风险和更优做法，再实施）
- **DDD-lite 全栈架构约束**（编码前默认判断分层、Feature 模块、原子能力和结构质量）
- **后端单服务知识图谱**（沉淀全景 ER、SQL 查询逻辑、表逻辑、状态判定、订单/退款/支付规则、原子能力、API 与代码坐标）
- **Bug 分析文档规范**（报告 Bug 时强制规范章节结构、Mermaid 图、根因表格）
- **Git 提交规范**（基于实际 diff 分析生成标准化中文提交信息；**v1.18.1 起 hook 按改动大小放行**：`hooks/check-git-commit-skill.js` 看 staged diff，小改 ≤2 文件 ∧ ≤30 行 ∧ 仅 `M` 修改时直接放行让模型写 commit message，大改才强制走 skill 五步；git push 不门禁）
- **文档索引优先约束**（编写任何文档前读取索引，分析内容边界，避免重复，写完后半自动更新索引）
- **文档输出路径规则**（AI 生成 Markdown 默认进用户 Documents 下的 `ai-docs/{project}/{type}/{topic}/{filename}`，按类型 + 主题归档，无日期/agent 目录层；**v1.20 起用户目录知识库与项目 `docs/` 索引等同**，必须经 Phase-A/B 查重和登记）
- **Markdown 编写规范**（Mermaid 图表语法、表格、代码块等）
- **业务逻辑现状梳理**（重构/迁移前按场景维度产出流程图、知识图谱、代码索引）
- **实施前代码定位**（从文档坐标表精准定位关键文件，禁止重新扫描）
- **源码注释风格约束**（源码只描述当前正确逻辑，禁止变更历史和函数头大段复盘，复杂逻辑在对应代码块写短 WHY）
- **跨项目拓扑定位与登记**（kpay POS 生态跨项目调用链、接口对照、业务全链路的唯一查询/写入入口）
- **每日工作日志**（业务项目源码改动后按 bug / 功能 分类沉淀到 `docs/work-log/{YYYY-MM-DD}.md`，同主题合并、工时累计叠加）
- **team-standards 源码仓库自动提交推送**（仅插件源码仓库规则变更完成后自动小步 commit + push，业务项目不触发）

## 仓库地址

| 仓库 | 地址 | 说明 |
|------|------|------|
| GitLab（主仓） | `https://gitlab.kpay-group.com/zhangk/kpay-team-standards.git` | 日常维护与分发 |
| GitHub（镜像） | `https://github.com/exception-coder/team-standards` | 仅作镜像备份 |

## 项目结构

```text
team-standards/
  .claude-plugin/       Claude Code 插件元数据与 marketplace 配置
  .codex-plugin/        Codex 插件元数据
  skills/               各个 Skill 的规则、模板和辅助资料
  hooks/                可选 Hook 脚本，用于更强的写入前校验
  docs/                 插件维护文档、skill-flow 链路图、历史快照和决策日志
  AGENTS.md             Codex 入口规范，定义主动触发规则和 Skill 索引
  CLAUDE.md             Claude 入口规范，定义主动触发规则和 Skill 索引
  README.md             对外安装、使用、维护说明
```

### 顶层目录

| 路径 | 作用 | 维护要点 |
|------|------|----------|
| `.claude-plugin/` | Claude Code 插件声明目录，包含插件版本、展示信息和 marketplace 条目 | 发布前必须同步递增 `plugin.json` 与 `marketplace.json` 的 `version` |
| `.codex-plugin/` | Codex 插件声明目录，包含 Codex 侧插件元数据 | 维护 Codex 分发时同步递增 `plugin.json` 的 `version` |
| `skills/` | 插件核心目录，每个子目录是一个独立 Skill，至少包含 `SKILL.md` | 新增或修改 Skill 后，同步更新 `AGENTS.md`、`CLAUDE.md`、README 的 Skills 表和 `docs/skill-flow.md` |
| `hooks/` | 强制拦截脚本目录：`check-git-commit-skill.js` 默认启用（拦截未调用 git-commit-standards skill 的 git commit / push）；`check-design-doc.{cmd,sh}` 默认禁用模板 | 新增 hook 时同步更新 `hooks.json`、CLAUDE.md/AGENTS.md 辅助资源表 |
| `docs/` | 维护文档目录，记录 Skill 链路、历史版本、配置机制和决策型变更背景 | 链路结构变化时更新 `skill-flow.md` 并创建版本快照 |

### 关键文件

| 文件 | 作用 | 什么时候改 |
|------|------|------------|
| `AGENTS.md` | Codex 读取的插件开发规范入口，包含 Skill 主动触发表、Skill 索引、维护规则 | Skill 覆盖范围、触发条件、辅助资源或维护规则变化时 |
| `CLAUDE.md` | Claude Code 读取的插件开发规范入口，内容与 `AGENTS.md` 保持同类同步 | 与 `AGENTS.md` 同步维护，避免两个入口规则不一致 |
| `README.md` | 面向使用者和维护者的安装、升级、结构和能力说明 | 对外说明、安装方式、Skills 总览、发版规则变化时 |
| `docs/skill-flow.md` | Skill 调用链路全景图，解释什么时候调哪个 Skill、顺序是什么 | Skill 新增/删除、触发顺序、维护链路或 FAQ 变化时 |
| `docs/skill-flow-*.md` | `skill-flow.md` 的历史快照 | 链路节点或连线发生结构性变化时创建 |
| `docs/dev-log/YYYY-MM-DD.md` | 决策型变更日志，只记录长期背景 | 新增/删除 Skill、规则方向反转、触发链路变化、重大团队原则沉淀时 |
| `hooks/hooks.json` | Hook 注册配置，控制是否启用写入前脚本校验 | 需要启用或调整 Hook 时 |
| `hooks/check-design-doc.cmd` | Windows 设计文档检查脚本 | 调整 Windows 下的强制门禁逻辑时 |
| `hooks/check-design-doc.sh` | macOS/Linux 设计文档检查脚本 | 调整 Unix 系统下的强制门禁逻辑时 |
| `.claude-plugin/plugin.json` | Claude 插件基础元数据 | 每次发布前递增版本 |
| `.claude-plugin/marketplace.json` | Claude marketplace 入口 | 每次发布前与 `.claude-plugin/plugin.json` 保持版本一致 |
| `.codex-plugin/plugin.json` | Codex 插件基础元数据 | 每次发布前递增版本 |

### Skill 目录约定

每个 Skill 使用独立目录：

```text
skills/
  {skill-name}/
    SKILL.md              必须存在，定义触发时机、执行流程、红线
    *.md                  可选模板、参考资料或辅助说明
```

维护 Skill 时遵循三条原则：

1. `SKILL.md` 的 frontmatter `name` 必须与目录名一致。
2. 新增或修改 Skill 覆盖范围后，必须同步 `AGENTS.md`、`CLAUDE.md` 的 Skill 索引。
3. 若影响触发链路或调用顺序，必须同步 `docs/skill-flow.md`；链路结构变化时创建 `docs/skill-flow-{YYYYMMDD}-v{N}.md` 快照。

## 安装

在 Claude Code 中依次执行以下三步：

**第一步：注册 marketplace（指向 GitLab 仓库）**

```
/plugin marketplace add https://gitlab.kpay-group.com/zhangk/kpay-team-standards.git
```

> 此命令会将 GitLab 仓库克隆到本地插件缓存目录，无需手动 `git clone`。

**第二步：安装插件**

```
/plugin install team-standards@team-standards
```

安装时选择作用域（推荐 user 级别，全局生效）。

**第三步：重载生效**

```
/reload-plugins
```

完成后可通过 `/plugin` → Installed 标签页确认插件已安装。

### 备选：本地目录安装

如果已手动克隆仓库到本地，也可以用本地路径注册：

```bash
git clone https://gitlab.kpay-group.com/zhangk/kpay-team-standards.git
```

```
/plugin marketplace add /path/to/kpay-team-standards
/plugin install team-standards@team-standards
/reload-plugins
```

## 升级

```
/plugin marketplace update team-standards
/plugin update team-standards
/reload-plugins
```

> 如果是本地目录安装方式，需先进入仓库目录执行 `git pull`，再执行 `/reload-plugins`。

## 包含的 Skills

| Skill | 触发时机 | 作用 |
|-------|----------|------|
| `solution-review-required` | 用户提出具体想法/方案并要求实施，或要求按某个回复、目录策略、架构路径、现有代码直接改时 | 先分离真实目标与候选方案，评估现有代码是否值得参考，识别风险、缺口和替代方案，给出更优建议后再进入设计或实施 |
| `design-doc-required` | 提出任何新需求、开始开发任务前 | 检查设计文档，缺失时引导创建；设计文档定位为方案/接口开发的简明编码依据，重点确认核心逻辑、关键规则和风险点；图表遵循最小图原则；**v1.20 起默认输出** `{USER_DOCUMENTS}/ai-docs/{project}/design/{需求名称}/{需求名称}-current.md`（不带日期，由 `doc-index-required` Phase-A/B 管控）；Git 管理下默认维护稳定/current 文档，历史写入 commit body；完整模版自动生成编码摘要 |
| `architecture-ddd-lite-fullstack` | 开始编写或审查 Java / React / Vue / Flutter 业务代码前 | 强制 DDD-lite 分层、Feature 模块化、单向依赖与原子能力沉淀；要求代码结构清晰、易维护、低耦合、高内聚，禁止 UI / Controller 直接承载业务逻辑 |
| `backend-knowledge-graph-required` | 后端接口/服务开发前涉及表读写、SQL、状态判定、订单/退款/支付等业务逻辑；会话中提到业务、表、字段来源、查询逻辑或 SQL；存在 `docs/knowledge-graph/backend/`；要求生成/更新后端知识图谱、全景 ER、SQL 归档；**或同一会话同一技术主题用户反复疑问 ≥3 轮 / 修复后 ≥2 轮验证追问 / 出现回归性措辞**（含子进程编排、并发、性能、资源争夺等非业务技术陷阱） | 双重职责：(1) 后端业务图谱——按项目沉淀领域能力、原子能力、业务流程、全景 ER、表逻辑、SQL 查询指纹、表关系、枚举、状态判定、API 与代码坐标；(2) **项目级技术难点图谱**（v1.21+）——子进程编排、并发模型、性能瓶颈、资源争夺、外部依赖、JVM 进程生命周期、缓存键策略等；长对话同主题反复疑问自动触发候选记录，无需用户显式提醒；编码前回顾各类索引，编码后同步图谱或候选池 |
| `bug-doc-required` | 报告 Bug、描述异常、请求分析问题根因时 | 强制规范章节结构；调用链用 Mermaid；根因用表格；**v1.20 起默认输出** `{USER_DOCUMENTS}/ai-docs/{project}/bug/{模块名}/{bug名称}/{bug名称}.md`（无 `{agent}/`、无 `{YYYY-MM-DD}/`、文件名不带日期）；用户目录知识库与项目 `docs/bug/` 索引体系等同，必须执行 Phase-A/B；模块名必须与同根下 `design/{模块名}/` 完全一致，无对应模块时退化为一级扁平 |
| `pre-implementation-code-orientation` | 文档确认后、开始写代码前 | 从文档坐标表精准 Read 关键文件，禁止重新扫描 |
| `coding-standards-common` | 编写/修改任何源码语言（Java / TS / JS / Dart / Python / Kotlin / Go 等）前 | 跨语言通用编码铁律 7 条 + 注释三档：命名表意 / 函数原子（80 行硬阈值）/ 层次分明 / 零魔法值（强制枚举 DB 字段值与协议码）/ 注释三档（类 1-3 行 + 方法 1-2 行 + 核心块 1 行）+ **§5.0 注释语言默认 = 当前会话沟通语言**（中文沟通写中文注释、英文沟通写英文，存量文件保持一致禁中英混用，用户明确要求则按其要求）/ 异常不静默 / DRY rule of 3 |
| `java-coding-standards` | 编写/审查任何 Java 代码时 | 阿里黄山版 Java 独占条款（Javadoc 语法、Integer 比较、SimpleDateFormat、SLF4J、HashMap 容量等），通用 7 条见 coding-standards-common |
| `git-commit-standards` | 执行 git commit 前 | 分析 staged 变更，生成标准化中文提交信息 |
| `doc-index-required` | 编写/创建任何 Markdown 文档，或编辑 `ai-docs/{project}/` / `docs/` 下文档时 | AI 生成 Markdown 默认写入用户 Documents 下的 `ai-docs/{project}/{type}/{topic}/{filename}`（无 `{agent}/`、无 `{YYYY-MM-DD}/`、文件名不带日期）；**v1.20 起用户目录知识库与项目 `docs/` 索引体系等同**：写文档前必须 Phase-A 读 INDEX 查重，写完必须 Phase-B 登记；`work-log/` 和 `knowledge-graph/` 走自管模式 |
| `markdown-writing-standards` | 生成或修改含 Mermaid 图表的 Markdown 时 | Mermaid 语法规范、表格规范、代码块规范 |
| `business-logic-orientation` | 重构/复写/迁移前需要理解现有业务逻辑时 | 按场景维度产出流程图、知识图谱、核心代码索引 |
| `init-project-docs` | 初始化项目文档 / 生成知识图谱时 | 渐进式构建 11 份知识图谱文档 + 模块深度文档 + 技能卡（4 阶段，支持自动/确认模式） |
| `generate-project-profile` | 要求生成项目画像时 | 生成 AI Agent 消费的 10 维度结构化 Markdown（project-profile.md） |
| `coding-violation-log` | 用户纠正 AI 编码错误时 | 自动登记违规到 `docs/coding-violations.md`，编码前回顾防重犯 |
| `bugfix-coding-style` | bug 修复 / 对齐云端 / 删冗余 / 任何源码改动时 | 禁止把变更历史、旧实现复盘、未来版本计划写进源码；函数/类注释只写当前职责、输入输出语义、不变式和误用风险，复杂逻辑在对应代码块附近写 1-2 行 WHY 注释 |
| `korepos-backend-service` | korepos / korepos-refund 后端接口开发时 | 约束 backend 目录结构、BackendInfra 边界、一接口一 service、Service 禁裸 SQL、跨 feature 业务原子能力、编辑前违规自检、长方法拆 step、DB 字段值枚举绑定等后端服务规则 |
| `project-docs-update` | 项目代码结构变更后 | 检测代码与 docs/ 文档的差异，自动或确认式更新知识图谱 |
| `arch-lint` | Flutter 架构检查时 | 检测 5 类架构违规（presentation 层 SQL/HTTP、domain 层框架依赖、金额 double、DAO 越层调用） |
| `cross-project-locator` | 跨项目（≥2 个 kpay POS 工程）定位 / 排查 / 登记拓扑知识时 | 路由到 `kpay-pos-topology/` 仓库：查询模式按业务域/工程名读 mapping 或 flows；登记模式拦截错误落盘位置，强制写入拓扑仓库 |
| `daily-work-log` | 业务项目源码 Edit/Write 后 / 用户说「记一下工作日志」 / 会话结束前 | 按 🐛 Bug 修复 vs ✨ 功能开发 写入 `docs/work-log/{YYYY-MM-DD}.md`；同主题合并；一行一条明细；累计预估工时；与 `dev-log`（team-standards 内部）分工互补 |
| `dev-log` | team-standards 决策型变更后 | 仅记录新增/删除 Skill、触发链路变化、规则方向反转、重大团队原则等长期背景；普通小改和版本号递增写清楚 git commit body 即可 |

## 设计文档模板

模版分两档，根据改动规模选择，由 `design-doc-required` 第一·七步硬清单兜底判定。

### 完整模版（`skills/design-doc-required/template.md`）

适用：超出轻量范围的方案/接口设计，例如新增表/字段/对外契约入口、复杂事务/分布式锁、状态机调整、跨服务风险等。

包含 8 个章节，聚焦编码依据：

- 目标与边界、接口 / 入口契约
- 核心流程（必填 1 张核心图，主流程和异常流程优先合并）
- 核心业务规则、编码落点
- 数据与依赖变更（只写本次变化，不复写项目全集资料）
- 风险与待确认、验证要点

完整模版必须配套 `-coding.md`（基于 `coding-template.md`）作为编码摘要。

### 轻量模版（`skills/design-doc-required/lightweight-template.md`）

适用：在已有架构内新增/调整单接口、单接口的库表读写流程描述、入参出参微调、同模块内业务规则修正。

包含 7 个章节，以「接口自身核心流程图」为主轴：

- 代码入口、接口契约
- 核心流程图（接口自身流程 / 库表读写顺序，flowchart 或 sequenceDiagram 二选一）
- 关键过滤/写入规则、失败行为
- 升级到完整模版的触发条件、修订记录

轻量模版**不需要**配套 `-coding.md`，核心流程图 + 规则表已涵盖编码所需信息。

项目内正式设计文档进入 Git 后，默认维护稳定文档（如 `{需求}-current.md` / `{需求}-coding.md`），普通迭代直接更新原文件，历史和变更原因写入 git commit body。只有重大架构基线、发布快照、非 Git 管理文档或用户明确要求时，才创建 `YYYYMMDD-vN` 快照文件。

## 可选：脚本级强制拦截

默认情况下，规范约束通过 Skill 描述强制执行。

如需更强的拦截（Claude 调用写文件工具前由脚本检查），可启用 Hook：

1. 编辑 `hooks/hooks.json`，根据平台选择对应的 `_disabled_PreToolUse_windows`（Windows）或 `_disabled_PreToolUse_unix`（macOS/Linux），将其改为 `PreToolUse` 并移入 `hooks` 对象内
2. 重新安装插件或执行 `/reload-plugins`

Hook 脚本：Windows 使用 `hooks/check-design-doc.cmd`，macOS/Linux 使用 `hooks/check-design-doc.sh`。

## 配置个人 Git 署名

`git-commit-standards` Skill 会自动读取署名配置。在你的全局 `~/.claude/CLAUDE.md` 中添加：

```text
Git 提交署名
Author: 你的姓名 <你的邮箱>
```

## 发版规则

通过 `.claude-plugin/plugin.json` 中的 `version` 字段判断是否有更新。**每次发布必须递增版本号**，否则升级无法检测到变更。

仅在维护 team-standards / kpay-team-standards 插件源码仓库时，仓库自身变更完成后默认自动执行 `git add -A`、规范 commit 和 `git push`，以小步提交方式及时分发规则调整。业务项目即使安装本 plugin，也不会因此自动提交、推送或修改版本号。若某次插件仓库维护只想保留本地变更，需要明确说明“不要提交”或“不要 push”。

是否每次 `git push` 都弹授权由 Codex / Claude / IDE 宿主的命令审批策略决定；本插件只能规定“需要自动 push”，不能绕过宿主授权。若宿主支持保存 `git push` 授权，保存后后续才可免重复确认。

版本号遵循语义化版本（SemVer）：

| 变更类型 | 版本递增 | 示例 |
|---------|---------|------|
| 新增 Skill、新增模板 | Minor（中位） | `1.0.0` → `1.1.0` |
| 修复 Bug、调整措辞 | Patch（末位） | `1.1.0` → `1.1.1` |
| 不兼容的结构变更 | Major（首位） | `1.1.1` → `2.0.0` |

发版流程：

1. 修改 `.claude-plugin/plugin.json` 中的 `version` 字段
2. 提交并推送到 GitLab
3. 团队成员执行 `/plugin marketplace update team-standards` → `/plugin update team-standards` → `/reload-plugins`
