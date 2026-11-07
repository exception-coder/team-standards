---
name: init-project-docs-initialization-output
description: "项目初始化的轻量默认产物、可选 Graphify/OpenSpec 入口及保留契约。"
---

# 项目初始化输出

默认先 plan，再 apply，最后 status；已授权初始化不重复询问。仅查看时只运行 status。

```text
node <skill-root>/init-ai-structure.mjs plan --root <project-root>
node <skill-root>/init-ai-structure.mjs apply --root <project-root>
node <skill-root>/init-ai-structure.mjs status --root <project-root>
```

## 默认只补三个入口

- `AGENTS.md`：项目规则和检索、业务知识维护边界。
- `CLAUDE.md`：复用 Agent 入口。
- `docs/INDEX.md`：链接已有文档，同主题只维护一处。

已有文件按字节保留；不生成业务正文、空 docs/domain、图谱、OpenSpec 或派生索引。Agent 发现已有业务文档时，经本次授权在既有索引补必要链接，不复制正文；初始化器本身不扫描或重写业务文档。

## 明确需要时选择

| 参数 | 补齐内容 |
|---|---|
| `--with-openspec` | openspec/AGENTS.md、config.yaml；不伪造 specs、changes 或完成状态 |
| `--with-graphify` | .graphifyignore 和 .gitignore 内受管标记块；报告已有图谱状态，不自动建图 |
| `--full` | 上述两项及 docs/README.md、docs/ai-coding-architecture.md；仅用于明确完整接入 |

plan/apply/status 使用相同参数。未启用的工具缺失不计为 pending；status 只对所选入口缺失返回非零。

Graphify 只在项目明确采用且复杂代码问题需要时生成，使用前核对 Git 与工作区覆盖。图谱与向量索引都是可重建产物；是否提交沿用项目约定。OpenSpec 仅在已采用项目按原流程校验。业务知识维护按 [business-knowledge-maintenance](../../business-knowledge-maintenance/SKILL.md)，表结构沿用迁移和实际 Schema。

## 保留与边界

plan 不写文件；apply 仅创建所选缺失入口，Graphify 启用时只更新 .gitignore 受管标记块；其余已有文件完整保留，重复执行无变化。已有文档正文和机器配置不强制迁移。

不安装工具、创建全局 MCP、定时任务、中央知识条目或空知识目录。不要求数据库、Graphify、RAG 服务才能完成初始化；没有实际证据的业务结论保留待确认状态。
