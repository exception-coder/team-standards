---
name: init-project-docs
description: "初始化当前代码项目的文档和知识图谱。用户要求初始化项目文档、生成或构建知识图谱、分析当前项目能力或架构、生成开发参考文档，或首次把 Graphify 接入当前项目知识库时使用；当请求同时包含“项目文档”和“知识图谱”时优先使用本 skill。优先用 Graphify 建立可再生代码事实层。不要用于新员工入职、SVN checkout 或拉取 Yoooni 公司项目文档，这些属于 yoooni-onboard-init。"
---

# 初始化项目文档与知识图谱

## 目标

把知识分成三层，禁止混写：

| 层 | 内容 | 可信边界 |
|---|---|---|
| 生成事实层 | Graphify 提取的模块、符号、调用、API、数据访问与依赖 | 来自代码，可覆盖重建 |
| 项目说明层 | 架构摘要、模块导航、开发参考 | 基于生成事实归纳，注明来源提交 |
| 领域知识层 | 业务流程、术语、规则、状态语义、重构决策 | AI 只能提出候选，人工确认后才成为事实 |

OpenSpec 等变更规格描述“准备怎么改”，不替代上述当前实现知识。

## 路由边界

- “初始化当前项目文档和知识图谱”“生成知识图谱”明确归本 skill，不得路由到入职初始化。
- 只有用户明确要求新员工入职、SVN checkout 或拉取 Yoooni 公司项目文档时，才交给 `yoooni-onboard-init`。
- 不因项目名包含 Yoooni 就执行 SVN 检查；本 skill 从当前工作目录和 Git 仓库开始。
- 若意图确实不明确，先澄清一次；禁止在澄清前创建凭据文件或启动外部拉取。

## 输出位置

将知识库根目录 `{KG_ROOT}` 解析为 `{USER_DOCUMENTS}/ai-docs/{project}/`，不写项目 `docs/`。项目内的 `graphify-out/` 是可再生构建产物，不是知识库正文。

执行 `doc-index-required` Phase-A 后再写 Markdown；完成后执行 Phase-B。

## 初始化流程

### 1. 建立项目身份

1. 确认项目根目录、项目名和当前 Git HEAD。
2. 识别语言、框架、构建系统、模块边界和仓库类型。
3. 若 `{KG_ROOT}/00_project_overview.md` 已存在，停止初始化并改用 `project-docs-update`，不得覆盖现有知识。

### 2. 构建代码事实层

1. 检查项目是否已有 Graphify 配置、命令或产物。
2. Graphify 可用时，按其当前安装版本支持的命令对项目根执行完整构建；不要猜测不受支持的参数。
3. 验证生成结果可读取，并至少覆盖模块、依赖、API 和数据访问中的可识别部分。
4. Graphify 不可用或构建失败时，记录原因，降级为确定性代码扫描；不得中断整个初始化，也不得把 AI 猜测伪装成 Graphify 事实。
5. 不把原始 `graph.json`、HTML 或整份生成报告复制进 Markdown 知识库。

### 3. 写入生成投影

创建 `{KG_ROOT}/generated/`，写入下列可覆盖文件：

```text
generated/
├── graphify-metadata.json
├── graphify-summary.md
├── modules.md
├── dependencies.md
├── api-map.md
├── data-access.md
└── impact-index.md
```

`graphify-metadata.json` 至少记录：

```json
{
  "generator": "graphify-or-fallback",
  "graphify_version": "unknown-or-version",
  "source_commit": "git-sha",
  "generated_at": "ISO-8601",
  "generation_mode": "graphify-or-fallback",
  "verified": false
}
```

无法可靠提取的投影允许省略，但必须在摘要中说明覆盖缺口。所有生成 Markdown 顶部注明来源提交、生成时间、生成器和“可自动覆盖”。

### 4. 生成项目说明层

按现有模板生成：

| 阶段 | 文档 | 默认行为 |
|---|---|---|
| Phase 1 | `00_project_overview.md`、`01_architecture_overview.md`、`08_constraints_and_rules.md` | 自动草拟；约束需标明观察事实或团队决策 |
| Phase 2 | `02_module_map.md`、`04_data_model_map.md`、`05_api_map.md`、`06_frontend_backend_mapping.md`、`development-reference.md` | 优先引用 `generated/`，不重复粘贴大表 |
| Phase 3 | `03_business_flow_map.md`、`07_glossary.md`、`09_refactor_plan.md`、`10_change_log.md` | 候选内容需人工确认 |
| Phase 4 | `modules/{module}.md`、`skills/{technology}_skill.md` | 按需生成，引用事实投影 |

默认执行 Phase 1-2。只有用户明确要求全量或已有足够业务上下文时才执行 Phase 3-4，避免无依据扩写。

### 5. 标注证据等级

对非纯生成内容使用以下标记：

- `代码事实`：可定位到代码或 Graphify 节点。
- `AI 推断`：从命名、调用链或注释归纳，尚未确认。
- `人工确认`：用户或权威文档已确认。

业务规则、术语含义、状态语义和失败语义不得仅凭 Graphify 自动标成“人工确认”。

### 6. 完成校验

1. 校验所有链接和相对路径。
2. 校验 `source_commit` 等于构建时 HEAD。
3. 确认项目说明层没有复制大段可再生内容。
4. 列出 Graphify 覆盖范围、降级项和待人工确认项。
5. 执行 `doc-index-required` Phase-B。

## 存储结构

```text
{KG_ROOT}/
├── INDEX.md
├── 00_project_overview.md
├── 01_architecture_overview.md
├── 02_module_map.md
├── 03_business_flow_map.md
├── 04_data_model_map.md
├── 05_api_map.md
├── 06_frontend_backend_mapping.md
├── 07_glossary.md
├── 08_constraints_and_rules.md
├── 09_refactor_plan.md
├── 10_change_log.md
├── development-reference.md
├── generated/
├── modules/
└── skills/
```

## 约束

- 不覆盖已有人工文档；已有初始化时转交 `project-docs-update`。
- 不自动安装 Graphify、修改全局配置或写入 Codex `config.toml`；需要安装时先取得用户授权。
- 不把 Graphify 推断边直接同步为跨项目契约或领域规则。
- 不要求定时任务作为正确性的唯一保障；新鲜度由提交元数据判断。
- Mermaid 遵守 `markdown-writing-standards`。
- 本 skill 属于分析与文档初始化，不触发 `design-doc-required`。

## 与其他 Skill 的关系

| Skill | 关系 |
|---|---|
| `project-docs-update` | 初始化后的增量刷新与语义确认 |
| `doc-index-required` | 写前查重、写后登记 |
| `backend-knowledge-graph-required` | 接收人工确认后的稳定业务事实，不接收原始推断 |
| `reverse-index-required` | 优先消费 `generated/impact-index.md` 或 Graphify 查询结果 |
| `cross-project-locator` | Graphify 只提供候选关系，跨项目契约仍需确认 |
