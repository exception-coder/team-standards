---
name: init-project-docs-initialization-output
description: "项目初始化的业务知识、draw.io 全景图、入口与可选工具产物，以及保留和完成契约。"
---

# 项目初始化输出

默认先 plan，再 apply，最后 status；已授权初始化不重复询问。仅查看时只运行 status。

```text
node <skill-root>/init-ai-structure.mjs plan --root <project-root>
node <skill-root>/init-ai-structure.mjs apply --root <project-root>
node <skill-root>/init-ai-structure.mjs status --root <project-root>
```

## 结构脚本补三个入口

- `AGENTS.md`：项目规则和检索、业务知识维护边界。
- `CLAUDE.md`：复用 Agent 入口。
- `docs/INDEX.md`：链接已有文档，同主题只维护一处。

结构脚本按字节保留已有文件，不扫描代码或生成业务正文。它的 status 只验证所选入口，不能代表整个初始化完成。Agent 随后按本次初始化授权定向补充已有正文和必要索引，不覆盖无关内容。

## 默认初始化还需完成

| 产物 | 最小要求 |
|---|---|
| 业务知识 | 复用现有概览、设计或规格；缺少载体时先写 docs/domain/overview.md，合并主要能力、主流程、关键规则、来源与待确认项。只有内容确需独立维护时才拆篇 |
| 全景图 | 复用已有同主题 draw.io 源图；缺少时默认 docs/diagrams/业务全景图.drawio，导出同源 SVG 或 PNG 并嵌入业务概览，同时链接可编辑源图 |
| 导航和维护约定 | 索引能找到正文与图；项目 Agent 入口说明业务语义改变时同步受影响正文、源图与预览，沿用 Git 随项目维护 |

按[接入流程](onboard-workflow.md)从已有文档和关键代码补齐内容。文字与图使用一致的业务名称和可信度；全景图展示角色、主要能力、核心对象、主流程及必要外部联系，不展开类图或全库 ER 图。推断节点或连线标“待确认”，不能只靠颜色区分。

完成前确认主要能力有正文或原文链接、推断有依据和待确认标记，图与正文一致，实际打开预览检查可读性与连线；核对索引链接及同主题唯一正文。空仓或证据无法取得时明确未完成的知识/图件，不以占位文件冒充完成。重复初始化只补真实缺口，不复制文档、重画未变化的图或空改日期。

## 结构脚本的可选参数

| 参数 | 补齐内容 |
|---|---|
| `--with-openspec` | openspec/AGENTS.md、config.yaml；不伪造 specs、changes 或完成状态 |
| `--with-graphify` | .graphifyignore 和 .gitignore 内受管标记块；报告已有图谱状态，不自动建图 |
| `--full` | 上述两项及 docs/README.md、docs/ai-coding-architecture.md；仅用于明确完整接入 |

plan/apply/status 使用相同参数。未启用的工具缺失不计为 pending；status 只对所选入口缺失返回非零。

Graphify 只在项目明确采用且复杂代码问题需要时生成，使用前核对 Git 与工作区覆盖。图谱与向量索引都是可重建产物；是否提交沿用项目约定。OpenSpec 仅在已采用项目按原流程校验。业务知识维护按 [business-knowledge-maintenance](../../business-knowledge-maintenance/SKILL.md)，表结构沿用迁移和实际 Schema。

## 保留与边界

plan 不写文件；apply 仅创建所选缺失入口，Graphify 启用时只更新 .gitignore 受管标记块；其余已有文件完整保留，重复执行无变化。已有文档正文和机器配置不强制迁移。

不安装工具、创建全局 MCP、定时任务、中央知识条目或空知识目录。不要求数据库、Graphify、RAG 服务才能完成初始化；没有实际证据的业务结论保留待确认状态。只读 status 或明确仅 structure 不执行业务文档与图件写入。
