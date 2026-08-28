---
name: project-context-refresh-reference
description: "init-project-docs 的内部增量刷新细则，不作为独立 Skill 发现。"
---

# 增量刷新项目上下文

## 原则

刷新权威来源本身，不维护 Graphify 的 Markdown 镜像，也不周期性重建 00–10 项目文档树。Git HEAD 与未提交工作区共同构成新鲜度基线。

## 流程

1. 读取项目 `AGENTS.md`、README、`openspec/config.yaml` 和领域知识映射，确认入口仍有效。
2. 比较 Graphify manifest、当前 HEAD 与任务涉及的工作区文件。
3. 图谱过期时，完整读取当前 Graphify Skill 并执行其增量更新；新鲜时直接复用。
4. 运行 OpenSpec 严格校验并列出活动 change；仅初始化空目录时标记 `initialized-empty`。
5. 检查领域知识目录、DDL/数据库和运行证据入口是否可达；只报告状态，不自动晋升候选。
6. 若项目自有规则、构建命令或权威入口真实变化，更新项目 `AGENTS.md` 或既有 README；否则不写文档。
7. 用户明确维护独立画像时，只增量更新一份 `project-profile.md`。

## 变化路由

| 变化 | 刷新位置 |
|---|---|
| 模块、调用、API、数据访问、依赖 | Graphify |
| 需求、接口契约、状态机、行为变更 | OpenSpec change |
| 稳定术语、业务规则、状态语义 | Domain Knowledge，经人工确认 |
| 表结构与执行事实 | DDL、真实数据库、日志或执行计划 |
| 项目特有开发规则、命令、入口 | 项目 `AGENTS.md` / 项目内 Skill |
| 跨仓调用关系 | cross-project-topology |

## 输出

```text
上下文刷新结果：
- Git 基线：{head + workspace}
- Graphify：{updated|fresh|fallback|failed}
- OpenSpec：{valid|invalid|initialized-empty|not-applicable}
- 项目入口：{updated|unchanged|missing}
- 领域/数据证据：{verified|partial|missing|not-applicable}
- 实际写入：{files_or_none}
- 剩余缺口：{gaps}
```

不得把“命令成功”包装为业务闭环完成，也不得因刷新失败删除旧的权威知识。
