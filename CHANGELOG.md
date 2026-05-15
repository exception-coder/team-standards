# Changelog

> 仅记录每个 plugin 发布版本的**关键变化**(新 skill / 规则方向反转 / 触发链路调整 / 重大基础设施)。逐次 commit 的细节用 `git log` 看,长期决策背景在 [docs/dev-log/](docs/dev-log/) 里。
>
> 版本号约定:`MAJOR.MINOR.PATCH`(SemVer)——`MINOR` 用于新 skill / 触发链路扩展 / 基础设施(hook、CI、sync 脚本),`PATCH` 用于规则微调与版本号同步。

## [1.28.0] - 2026-05-15

**新增第四道 PreToolUse hook `check-backend-kg-readiness.js`，兜底 `backend-knowledge-graph-required` skill 的"编码前必读图谱"约束。**

### Added
- `hooks/check-backend-kg-readiness.js` — Node 跨平台 PreToolUse Write/Edit/MultiEdit 兜底脚本。路径白名单 `lib/features/{module}/backend(v\d+)?/**/*.dart` 与 `lib/common/backend_infra/(daos|services)/**/*.dart`，命中后扫 transcript 是否 Read 过 `**/knowledge-graph/00_index.md` 或任一 `**/knowledge-graph/scenarios/*.md`；未命中按模式提示
- `hooks/tests/check-backend-kg-readiness.test.js` — 端到端测试 10 例（含 warn / block / off 三模式 + 路径白名单 + 小改豁免 + 已读图谱放行）
- `backend-knowledge-graph-required/SKILL.md` BLOCKING 段补一行"会话首次 Edit 后端业务源码 + 未读图谱即 hook 提示"；误判反例段补一条"改 bug 直接 grep + Read 源码就够了"的反例

### Changed
- `hooks/hooks.json` 注册第四道 hook 与前三道并列；`_comment` 同步
- `CLAUDE.md` 辅助资源表新增 `check-backend-kg-readiness.js` 条目

### Configuration
- `TEAM_STANDARDS_BACKEND_KG_HOOK`：`warn`（默认，exit 0 + stderr 提示）/ `block`（exit 2 硬阻断）/ `off`（完全跳过）
- `TEAM_STANDARDS_KG_TRIVIAL_FILES`（默认 1）/ `TEAM_STANDARDS_KG_TRIVIAL_LINES`（默认 20）—— 小改豁免阈值

### Motivation
- AI 在跨会话编码中反复出现"直接 grep + Read 源码就动手改，跳过项目知识图谱"的偷懒模式，导致重复发明状态判定 / 金额聚合 / SQL 查询逻辑、踩已沉淀过的坑（典型案例：korepos-refund 退款金额双计 tip bug 修复，对应 commit `ff39eccb2`，事后回顾发现 memory 含 tip 矩阵在会话起始就已加载但未主动应用）
- skill 自身已写明 BLOCKING 但靠 AI 自觉判断；与 `check-design-doc` / `check-git-commit-skill` 的成熟拦截范式对齐：v1.28 起加 hook 兜底
- 试用期采用 warn 模式（exit 0）评估误报率，成熟后用户可切换 `=block` 升级为硬阻断

## [1.27.1] - 2026-05-13

**修复 `/reset-kpos-local` 中 korepos.db 路径写死开发者用户名 `zhangkai` 的问题。**

### Changed
- `commands/reset-kpos-local.md`：第 2 个文件路径 `D:\Users\zhangkai\Documents\korepos.db` → `D:\Users\$env:USERNAME\Documents\korepos.db`，由 PowerShell 在执行时展开为当前 Windows 登录用户名，其他成员安装后无需改动即可生效
- 路径表下方注释改为明确说明：盘符 `D:` 是团队约定（Documents 统一放 D 盘），**不要**替换为 `$env:USERPROFILE` 或 `MyDocuments`，那些会解析到 C 盘

## [1.27.0] - 2026-05-13

**新增 `/reset-kpos-local` slash command + 配套语义触发 skill，用于一键删除 kpos 本地缓存与本地数据库。**

### Added
- `commands/reset-kpos-local.md` — 首个 plugin 自带 slash command。删除 `$env:APPDATA\com.example\kpos\shared_preferences.json` 与 `D:\Users\zhangkai\Documents\korepos.db` 两个本地状态文件。显式调用 = 已确认，不再询问；使用 PowerShell `Remove-Item -Force` 实现，逐文件独立成功/失败计数
- `skills/reset-kpos-local-state/SKILL.md` — 配套语义触发 skill。识别"重置 kpos 本地 / 清空 shared_preferences / 删 korepos.db"等狭义短语后**路由到** `/reset-kpos-local`，不自己 `Remove-Item`，所有边界与回报由 slash command 唯一负责

### Notes
- 第 2 个文件路径 `D:\Users\zhangkai\Documents\korepos.db` 仍是当前开发者本机硬编码——其他成员若 Documents 目录在 C 盘，需要后续扩展为可配置或环境变量化
- 故意**不**用 hook 实现：destructive 操作靠正则/事件匹配自动开火属反模式，必须靠 AI 语义层 + 显式入口

## [1.25.0] - 2026-05-12

**Plugin maintainability 重构。完整设计评审请见 commit `9d3c1d7`。**

### Added
- `scripts/sync-agents.js`——CLAUDE.md 为 canonical,派生 AGENTS.md(`--check` 模式供 CI 校验)
- `scripts/check-cross-refs.js`——校验所有 SKILL.md / CLAUDE.md / README.md 内的跨 skill 引用与跨章节引用,避免被引文件改章节名后引用失效
- `hooks/package.json`——声明 `engines.node >= 18` 和 `npm test` 入口
- `hooks/tests/`——19 个 hook 端到端测试(`check-dto-annotation` 11 + `check-git-commit-skill` 8),用 Node 18+ 内置 `node --test`,无第三方依赖
- `.github/workflows/ci.yml`——Linux/macOS/Windows × Node 18/20/22 矩阵 + AGENTS.md 同步校验 + 跨引用校验
- `CLAUDE.md` 顶部新增「Skill 分类导航」(8 组)与「Skill 并发触发顺序与冲突解决」两节,把 24 个 skill 的检索成本和并发调用顺序模糊问题封死
- `CHANGELOG.md`(本文件)
- `docs/skill-dependencies.md`——skill 依赖图与冲突说明

### Changed
- README.md 把"包含的 Skills"24 行 markdown 表替换为 8 阶段紧凑列表,完整索引指向 CLAUDE.md(消除三处重复维护)
- 6 个 skill 的 frontmatter `description` 压缩 45%-76%(backend-knowledge-graph-required / reverse-index-required / cross-project-locator / glossary-required / design-doc-required / doc-index-required),完整决策树留在 SKILL.md body
- README.md 新增"前置依赖"(Node ≥18 / Git ≥2.20)和"维护者本地开发"小节

### Deprecated / Removed
- (无)

## [1.24.x] - 2026-05-12

**`architecture-ddd-lite-fullstack` 一连串规则方向反转,把"Service 业务动作扩展"从模糊建议固化为零退路铁律。**

### Changed
- `1.24.7`:把 Python / Dart 提到与 Java 同等公民地位,新增三栈横切关注点对照表 + Python 后端约束 + Dart 后端约束章节(commit `3c50e33`)
- `1.24.6`:补 4 个缺口——跨分支编排 Orchestrator/Saga / 横切关注点豁免 / 服务命名 taxonomy / 聚合边界 5 问(commit `333e4f9`)
- `1.24.5`:取消「同分支变种」对 god service 的豁免,统一为「每个业务分支一个 focused service」(commit `b28d335`)
- `1.24.4`:T1-T6 阈值改为「新业务分支 = 新子 service」铁律,取消 8 条豁免清单(commit `067276e`)
- `1.24.3`:新增「Service 业务动作扩展强制阈值 T1-T6」抑制 AI 惯性追加(commit `c41fe40`)

### Notable rule reversals(规则方向反转)
- 同分支变种豁免 → 取消,所有业务方法都必须落在该分支的 focused sub-service
- 「行数到 1500 才算 god service」→ god service 定义改为"承载多业务分支的 service",与行数无关

## [1.23.x] - 2026-05-09

### Changed
- `1.23.1`:`coding-standards-common` §5.0 注释语言改为「沟通语言一票否决,无存量豁免」(commit `ca27694`)

### Notable rule reversals
- 存量文件豁免 → 取消,中文沟通的会话里新增注释一律中文,短期内单文件可中英混杂

## [1.22.x] - 2026-05-07 ~ 05-08

### Changed
- `1.22.2` ~ `1.22.4`:`git-commit-standards` 重写五步流程为「会话上下文优先 + diff 兜底」并提速 hook;`coding-standards-common` §5.5 新增「修改代码同步清理过期注释 / 历史版本说明 / 废话注释」

## [1.22.0/1] - 2026-05-06

### Added
- `korepos-backend-service` 新增 DTO 字段类型强制约束 + 强化 wire DTO 注解约束 + 新增 `hooks/check-dto-annotation.js` hook 兜底

### Changed
- `backend-knowledge-graph-required` 范围扩展到项目级技术难点 + 长对话识别自动触发

## [1.21.0] - 2026-05-05

### Added
- 新增 `coding-standards-common`——跨语言通用编码 skill(命名表意 / 函数原子 80 行硬阈值 / 层次分明 / 零魔法值 / 注释三档 / 异常不静默 / DRY rule of 3),先于具体语言 skill 触发
- `coding-standards-common` §5.0「注释语言默认 = 当前会话沟通语言」

## [1.20.0] - 2026-05-05

### Changed
- 用户目录 `{USER_DOCUMENTS}/ai-docs/{project}/` 从「草稿堆」升级为**项目级知识库**,与项目 `docs/` 索引体系等同(必须 Phase-A/B)
- `design-doc-required` / `bug-doc-required` / `business-logic-orientation` 输出路径从 `{agent}/{YYYY-MM-DD}/...` 切换到稳定 / current 文档

## [1.19.x] - 2026-05-01 ~ 05-04

### Added
- 新增 `solution-review-required`——用户给出具体方案 / 现有代码作参考时,先审视目标 / 现有代码质量 / 风险 / 更优建议,反迎合
- 新增 `bugfix-coding-style` 注释方向反转(commit `9e12fc1`):禁源码内变更日志注释、函数头不堆复盘

### Changed
- `design-doc-required` 模版分级:极简跳过 / 轻量 / 完整
- `backend-knowledge-graph-required` 升级 SQL 查询逻辑为一等资产 + 强化主动触发 + 简化骨架至 Tier 1/2/3

## [1.18.x] - 2026-05-02

### Added
- 新增 `hooks/check-git-commit-skill.js` —— git commit 前按改动大小自动放行 / 阻断

## [1.17.x] - 2026-04-30

### Notable rule reversals
- `bugfix-coding-style` 方向反转:从"建议禁变更日志"变为"强制禁止源码内变更日志 / 函数头不堆复盘",commit `9e12fc1`

## 早期版本

详见 `git log --oneline --reverse | head -100`。
