---
name: project-context-refresh-reference
description: "init-project-docs 的内部增量刷新细则，不作为独立 Skill 发现。"
---

# 增量刷新项目上下文

## 原则

刷新权威来源本身，不维护 Graphify 的 Markdown 镜像，也不周期性重建 00–10 项目文档树。Git HEAD 与未提交工作区共同构成新鲜度基线。

## 流程

1. 读取项目 `AGENTS.md`、文档索引、业务概览和全景图；项目已采用 OpenSpec 时再读其配置，确认入口仍有效。
2. 结合 Git 变化与相关工作区文件，判断主要能力、规则、流程或数据范围是否改变；定向查证据，不默认重扫全库。
3. 按[业务知识维护](../../business-knowledge-maintenance/SKILL.md)原位更新受影响正文；变化影响全景图时同步 draw.io 源图和同源预览。推断仍标待确认，无业务变化则不空改文档和日期。
4. Graphify 仅在项目已采用且本次需要时核对 manifest/工作区覆盖并按其 Skill 增量刷新；OpenSpec 仅在项目已采用时校验，不适用则跳过。
5. 检查实际涉及的 DDL/数据库和运行证据入口；缺失如实报告，不自动晋升可信度，也不把文档快照当当前 Schema。
6. 项目自有规则、构建命令或权威入口真实变化时，更新 `AGENTS.md` 或既有索引；检查正文、图和链接一致，不另建同主题副本。
7. 用户明确维护独立画像时，只增量更新一份 `project-profile.md`。

## 变化路由

| 变化 | 刷新位置 |
|---|---|
| 模块、调用、API、数据访问、依赖 | 源码；已采用且需要时刷新 Graphify |
| 需求、接口契约、状态机、行为变更 | 项目现有规格/设计；已采用 OpenSpec 时按其流程维护 |
| 稳定术语、业务规则、状态语义 | 项目内唯一正文；涉及主流程时同步业务全景图及预览 |
| 表结构与执行事实 | DDL、真实数据库、日志或执行计划 |
| 项目特有开发规则、命令、入口 | 项目 `AGENTS.md` / 项目内 Skill |
| 跨仓调用关系 | cross-project-topology |

## 输出

```text
上下文刷新结果：
- Git 基线：{head + workspace}
- Graphify：{updated|fresh|fallback|failed|not-applicable}
- OpenSpec：{valid|invalid|initialized-empty|not-applicable}
- 项目入口：{updated|unchanged|missing}
- 业务正文与全景图：{updated|unchanged|partial|missing}
- 领域/数据证据：{verified|partial|missing|not-applicable}
- 实际写入：{files_or_none}
- 剩余缺口：{gaps}
```

不得把“命令成功”包装为业务闭环完成，也不得因刷新失败删除旧的权威知识。
