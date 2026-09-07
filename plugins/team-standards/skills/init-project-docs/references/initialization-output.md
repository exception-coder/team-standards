---
name: init-project-docs-initialization-output
description: "Exact files, follow-up products, preservation rules, and exclusions for init-project-docs structure and init modes."
---

# 项目初始化输出清单

在用户要求查看初始化内容、执行 `structure` / `init`，或判断现有项目是否符合统一结构时读取本文件。

## `structure` 直接创建或补齐

| 目标 | 初始化内容 | 约束 |
|---|---|---|
| Agent 入口 | `AGENTS.md`、`CLAUDE.md` | 根入口只声明项目规则、上下文路由和适配关系；不复制团队通用规范 |
| 长期知识入口 | `docs/README.md`、`docs/INDEX.md`、`docs/ai-coding-architecture.md` | 只建立索引和六层职责模型，不创建空领域、设计、决策或开发目录 |
| OpenSpec 入口 | `openspec/AGENTS.md`、`openspec/config.yaml` | 只建立项目上下文和 artifact 规则；不伪造 specs、changes 或完成状态 |
| Graphify 输入边界 | `.graphifyignore` | 排除依赖、构建物、压缩前端产物和 Graphify 自身输出；已有项目规则完整保留 |
| Graphify Git 边界 | `.gitignore` 的 `team-standards:graphify` 标记块 | 默认只允许提交 `graph.json`、`manifest.json` 与 `GRAPH_REPORT.md`，本地缓存和个人状态继续忽略 |

`plan` 只报告 `missing`、`managed`、`preserved`、`update` 和 Graphify `pending/ready` 状态，不写文件。`apply` 只创建缺失模板，并只更新 `.gitignore` 中由本 Skill 管理的标记块；其它已有文件按字节保留。

## `init` 在结构之后继续完成

`init` 不是再复制一套模板，而是在 `structure` 之后编排当前安装的官方能力：

1. 使用当前 Graphify Skill 首次构建或增量刷新 `graphify-out/graph.json`、`manifest.json` 与 `GRAPH_REPORT.md`。
2. 检查图谱覆盖的 Git HEAD 和任务相关工作区改动；过期或不完整时标记缺口。
3. 对 `openspec/config.yaml` 执行严格校验，区分真实项目上下文与 `initialized-empty`。
4. 识别领域知识、DDL、数据库、日志和项目验证命令的权威入口，只报告连接状态，不生成猜测内容。
5. 运行初始化器 `status`，输出 Agent、Graphify、OpenSpec、领域知识和运行证据状态。

Graphify 核心共享产物由 Graphify 生成后进入 Git；初始化脚本本身不创建空 `graphify-out/`，也不生成假的图谱或指纹。

## 明确不初始化

- 空 `.codex/skills/`、`.claude/` 或项目 Skill 占位目录。
- `docs/domain/`、`docs/design/`、`docs/decisions/`、`docs/development/` 等无内容目录。
- OpenSpec `specs/`、`changes/`、proposal、design、tasks 或归档记录。
- 业务术语、领域规则、DDL 快照、数据库结果、日志或项目画像正文。
- Graphify 缓存、个人 memory/reflections、HTML、Obsidian、成本记录或机器路径文件。
- 全局 MCP、IDE、定时任务、Graphify/OpenSpec 安装或版本升级。

这些内容只有在项目真实需要、存在权威证据并获得相应授权时，才由对应 Skill 或工具创建。
