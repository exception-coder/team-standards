# team-standards

团队 Claude Code 开发规范插件，包含：

- **Java 编码规范**（阿里巴巴黄山版·强制项精简版）
- **功能设计文档强制约束**（开发前必须有设计文档，否则引导创建）
- **Bug 分析文档规范**（报告 Bug 时强制规范章节结构、Mermaid 图、根因表格）
- **Git 提交规范**（基于实际 diff 分析生成标准化中文提交信息）
- **文档索引优先约束**（编写任何文档前读取索引，分析内容边界，避免重复，写完后半自动更新索引）
- **Markdown 编写规范**（Mermaid 图表语法、表格、代码块等）
- **业务逻辑现状梳理**（重构/迁移前按场景维度产出流程图、知识图谱、代码索引）
- **实施前代码定位**（从文档坐标表精准定位关键文件，禁止重新扫描）

## 仓库地址

| 仓库 | 地址 | 说明 |
|------|------|------|
| GitLab（主仓） | `https://gitlab.kpay-group.com/zhangk/kpay-team-standards.git` | 日常维护与分发 |
| GitHub（镜像） | `https://github.com/exception-coder/team-standards` | 仅作镜像备份 |

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
| `design-doc-required` | 提出任何新需求、开始开发任务前 | 检查设计文档，缺失时引导创建；自动生成编码摘要 |
| `bug-doc-required` | 报告 Bug、描述异常、请求分析问题根因时 | 强制规范章节结构；调用链用 Mermaid；根因用表格 |
| `pre-implementation-code-orientation` | 文档确认后、开始写代码前 | 从文档坐标表精准 Read 关键文件，禁止重新扫描 |
| `java-coding-standards` | 编写/审查任何 Java 代码时 | 强制遵守阿里黄山版编码规范 |
| `git-commit-standards` | 执行 git commit 前 | 分析 staged 变更，生成标准化中文提交信息 |
| `doc-index-required` | 编写/创建 `docs/` 下任何文档时 | 读取索引，分析内容边界，避免重复；写完后更新索引 |
| `markdown-writing-standards` | 生成或修改含 Mermaid 图表的 Markdown 时 | Mermaid 语法规范、表格规范、代码块规范 |
| `business-logic-orientation` | 重构/复写/迁移前需要理解现有业务逻辑时 | 按场景维度产出流程图、知识图谱、核心代码索引 |
| `init-project-docs` | 初始化项目文档 / 生成知识图谱时 | 渐进式构建 11 份知识图谱文档 + 模块深度文档 + 技能卡（4 阶段，支持自动/确认模式） |
| `generate-project-profile` | 要求生成项目画像时 | 生成 AI Agent 消费的 10 维度结构化 Markdown（project-profile.md） |
| `coding-violation-log` | 用户纠正 AI 编码错误时 | 自动登记违规到 `docs/coding-violations.md`，编码前回顾防重犯 |
| `project-docs-update` | 项目代码结构变更后 | 检测代码与 docs/ 文档的差异，自动或确认式更新知识图谱 |
| `arch-lint` | Flutter 架构检查时 | 检测 5 类架构违规（presentation 层 SQL/HTTP、domain 层框架依赖、金额 double、DAO 越层调用） |
| `dev-log` | 任何 skill 或配置变更后 | 在 `docs/dev-log/` 下记录变更原因和改动内容 |

## 设计文档模板

模板位于 `skills/design-doc-required/template.md`，包含 18 个章节：

- 基本信息、背景与目标、功能范围
- 业务流程、接口设计、类设计、数据库设计
- 事务并发、缓存、消息异步、安全、日志监控、异常处理
- 测试要点、上线回滚方案、风险点

建议在项目 `docs/design/` 目录下按功能创建对应文档。

## 可选：脚本级强制拦截

默认情况下，规范约束通过 Skill 描述强制执行。

如需更强的拦截（Claude 调用写文件工具前由脚本检查），可启用 Hook：

1. 编辑 `hooks/hooks.json`，根据平台选择对应的 `_disabled_PreToolUse_windows`（Windows）或 `_disabled_PreToolUse_unix`（macOS/Linux），将其改为 `PreToolUse` 并移入 `hooks` 对象内
2. 重新安装插件或执行 `/reload-plugins`

Hook 脚本：Windows 使用 `hooks/check-design-doc.cmd`，macOS/Linux 使用 `hooks/check-design-doc.sh`。

## 配置个人 Git 署名

`git-commit-standards` Skill 会自动读取署名配置。在你的全局 `~/.claude/CLAUDE.md` 中添加：

```markdown
## Git 提交署名
Author: 你的姓名 <你的邮箱>
```

## 发版规则

通过 `.claude-plugin/plugin.json` 中的 `version` 字段判断是否有更新。**每次发布必须递增版本号**，否则升级无法检测到变更。

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
