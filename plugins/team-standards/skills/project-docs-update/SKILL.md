---
name: project-docs-update
description: "持续更新项目文档和知识图谱。检测到 Controller、Service、模块、数据库、API、事件、依赖或前后端映射变化，用户要求更新项目文档、同步知识图谱、检查文档过期，或 Graphify 元数据落后于 Git HEAD 时使用。刷新可再生事实投影，并将业务语义变化留给人工确认。"
---

# 持续同步项目知识

## 核心规则

以 Git 提交作为新鲜度基线，以 Graphify 或确定性扫描作为结构事实来源。自动覆盖生成层，谨慎更新项目说明层，绝不自动覆盖人工确认的领域知识。

知识库根目录 `{KG_ROOT}` 为 `{USER_DOCUMENTS}/ai-docs/{project}/`。

## 触发方式

### 显式触发

- 更新项目文档、同步知识图谱。
- 检查文档是否过时或与代码不一致。
- 刷新 Graphify、模块图、API 图、数据关系或影响索引。

### 事件驱动提醒

在下列变化合并或准备分析影响范围时，建议执行本 skill：

- Controller、API 契约、路由或客户端调用变化。
- Service、模块边界、依赖或外部服务变化。
- Entity、DTO、Mapper、Repository、SQL、DDL 或配置变化。
- 事件、消息载荷、枚举、状态字段或前后端映射变化。

定期任务只作兜底：建议每周完整重建一次；不得用固定时间间隔替代 Git 新鲜度检查。

## 前置检查

1. 读取 `{KG_ROOT}/00_project_overview.md` 和 `{KG_ROOT}/generated/graphify-metadata.json`。
2. 若项目尚未初始化，改用 `init-project-docs`。
3. 读取当前 Git HEAD，并与 `source_commit` 比较。
4. 若提交一致且用户未要求强制重建，报告“知识图谱已是当前版本”，只检查缺失或损坏的投影。
5. 执行 `doc-index-required` Phase-A 后再修改 Markdown。

旧知识库没有 `generated/graphify-metadata.json` 时，执行一次兼容迁移：保留人工文档，创建生成层并完成全量基线，不要求重建整个知识库。

## 更新流程

### 1. 确定变化范围

优先比较 `source_commit..HEAD` 的 Git diff，按文件类型归类：模块、API、数据、依赖、事件、前端映射、文档或纯非结构变化。

若基线提交不存在、不可达、历史被改写，或生成层损坏，则执行完整重建；否则优先刷新受影响范围。Graphify 当前版本若不支持可靠增量更新，可执行完整图谱构建，但只重写发生变化的知识库投影。

### 2. 刷新事实图谱

1. Graphify 可用时，按当前安装版本支持的命令刷新项目图谱。
2. 验证输出能被读取，且来源为当前项目。
3. Graphify 不可用或失败时，使用确定性代码扫描降级，并记录失败原因和覆盖缺口。
4. 不复制原始图、HTML 或整份生成报告到知识库。

### 3. 更新生成层

允许自动覆盖：

- `generated/graphify-summary.md`
- `generated/modules.md`
- `generated/dependencies.md`
- `generated/api-map.md`
- `generated/data-access.md`
- `generated/impact-index.md`
- `generated/graphify-metadata.json`

仅在投影成功写入并完成校验后，把 metadata 的 `source_commit` 更新为当前 HEAD。失败时保留旧提交号并标记 `last_attempt_error`，禁止伪装成已同步。

### 4. 投影到项目说明层

| 文档 | 自动更新范围 | 人工确认范围 |
|---|---|---|
| `02_module_map.md` | 模块存在性、路径、依赖摘要 | 模块业务定位 |
| `04_data_model_map.md` | 实体、字段、表与数据访问关系 | 字段业务含义、约束原因 |
| `05_api_map.md` | 方法、路径、参数与调用关系 | API 业务语义和兼容承诺 |
| `06_frontend_backend_mapping.md` | 可证明的代码引用 | 动态调用或运行时路由推断 |
| `01_architecture_overview.md` | 已观察到的结构变化 | 架构目标与原则 |
| `development-reference.md` | 生成投影的链接与机械清单 | 场景建议和团队实践 |

尽量让项目说明文档引用 `generated/`，不要重复粘贴大表。

### 5. 保护领域知识

下列文档默认只生成差异候选，不自动改写正文：

- `00_project_overview.md`
- `03_business_flow_map.md`
- `07_glossary.md`
- `08_constraints_and_rules.md`
- `09_refactor_plan.md`

对状态机、公式、术语、失败语义、跨项目契约等变化，输出“旧事实、代码证据、候选新事实、影响范围”，等待人工确认。确认后才同步到领域知识或跨项目拓扑。

`10_change_log.md` 只记录真实完成的知识变更，不记录每次无变化扫描。

### 6. 校验并登记

1. 校验 metadata、生成投影和当前 HEAD 一致。
2. 校验项目说明层链接有效。
3. 校验人工确认内容未被自动覆盖。
4. 执行 `doc-index-required` Phase-B。
5. 输出更新摘要。

## 差异报告

```text
知识同步结果：
- 基线提交：{old_sha_or_none}
- 当前提交：{head_sha}
- 生成方式：{graphify|fallback}
- 更新投影：{files}
- 更新说明文档：{files}
- 无需更新：{files}
- 待人工确认：{semantic_candidates}
- 覆盖缺口或错误：{gaps}
```

## 自动化建议

- PR 或主分支合并后：运行新鲜度检查并刷新图谱构建产物。
- 开始反向影响分析前：要求 `source_commit == HEAD`，否则先刷新或明确接受旧基线。
- 每周：完整重建作为缓存和删除关系的兜底检查。
- CI 发布知识产物时：发布生成层或归档产物，不提交用户目录中的人工知识库。

本 skill 只定义更新行为，不自行创建计划任务、Git hook、CI workflow 或全局配置；用户明确要求后再实施这些外部自动化。

## 约束

- 不自动安装或升级 Graphify。
- 不修改 Codex `config.toml`。
- 不因 Graphify 缺失而删除旧知识。
- 不把 AI 推断或 Graphify 候选边自动晋升为业务真相。
- 不触发 `design-doc-required`；本 skill 属于文档维护。
- Mermaid 遵守 `markdown-writing-standards`。

## 与其他 Skill 的关系

- `init-project-docs`：负责首次基线；本 skill 负责后续更新。
- `doc-index-required`：负责写前查重和写后登记。
- `backend-knowledge-graph-required`：只接收经确认的稳定业务事实。
- `reverse-index-required`：在图谱新鲜时优先消费影响索引。
- `git-commit-standards`：识别结构变化后提醒运行本 skill，不在每次提交中强制重建。
