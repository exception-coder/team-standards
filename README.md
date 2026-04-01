# team-standards

团队 Claude Code 开发规范插件，包含：

- **Java 编码规范**（阿里巴巴黄山版·强制项精简版）
- **功能设计文档强制约束**（开发前必须有设计文档，否则引导创建）
- **Git 提交规范**（基于实际 diff 分析生成标准化中文提交信息）
- **文档索引优先约束**（编写任何文档前读取索引，分析内容边界，避免重复，写完后半自动更新索引）

## 安装

> Claude Code 插件通过 marketplace 机制安装，需要两步完成。

**第一步：注册 marketplace**

在 Claude Code 中执行：

```
/plugin marketplace add exception-coder/team-standards
```

**第二步：安装插件**

```
/plugin install team-standards@team-standards
```

**第三步：重载生效**

```
/reload-plugins
```

完成后可通过 `/plugin` → Installed 标签页确认插件已安装。

## 升级

当插件有更新时，执行以下命令同步最新版本：

```
/plugin update team-standards
/reload-plugins
```

## 包含的 Skills

| Skill | 触发时机 | 作用 |
|-------|----------|------|
| `java-coding-standards` | 编写/审查任何 Java 代码时 | 强制遵守阿里黄山版编码规范 |
| `design-doc-required` | 开始任何开发任务前 | 检查设计文档，缺失时引导创建；自动生成编码摘要 `-coding.md` |
| `git-commit-standards` | 执行 git commit 前 | 分析 staged 变更，生成标准化中文提交信息 |
| `doc-index-required` | 编写/创建 `docs/` 下任何文档时 | 读取总索引与子目录索引，分析内容边界，避免重复；写完后半自动更新索引 |

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

1. 编辑 `hooks/hooks.json`，将 `_disabled_PreToolUse` 改为 `PreToolUse` 并移入 `hooks` 对象内
2. 重新安装插件或执行 `/reload-plugins`

Hook 脚本说明见 `hooks/check-design-doc.cmd`。

## 配置个人 Git 署名

`git-commit-standards` Skill 会自动读取署名配置。在你的全局 `~/.claude/CLAUDE.md` 中添加：

```markdown
## Git 提交署名
Author: 你的姓名 <你的邮箱>
```

## 发版规则

插件缓存系统通过 `.claude-plugin/plugin.json` 中的 `version` 字段判断是否有更新。**每次发布必须递增版本号**，否则 `/plugin update` 无法检测到变更。

版本号遵循语义化版本（SemVer）：

| 变更类型 | 版本递增 | 示例 |
|---------|---------|------|
| 新增 Skill、新增模板 | Minor（中位） | `1.0.0` → `1.1.0` |
| 修复 Bug、调整措辞 | Patch（末位） | `1.1.0` → `1.1.1` |
| 不兼容的结构变更 | Major（首位） | `1.1.1` → `2.0.0` |

发版流程：

1. 修改 `.claude-plugin/plugin.json` 中的 `version` 字段
2. 提交并推送到远端
3. 团队成员执行 `/plugin update team-standards` → `/reload-plugins`

## 升级编码规范

如需更新 Java 编码规范内容，直接编辑 `skills/java-coding-standards/SKILL.md`，push 后团队成员执行 `/plugin update team-standards` 即可同步。
