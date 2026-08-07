---
name: init-project-docs
description: "用于初始化当前代码项目的文档、知识图谱、架构能力说明或 Graphify 事实层；不用于新员工入职、SVN checkout 或拉取 Yoooni 公司文档。"
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
2. 读取当前已安装 Graphify skill 的完整说明，并按当前安装版本探测实际支持的命令；不要凭记忆拼接参数，也不要把独立 CLI 的行为等同于宿主 skill 编排。
3. 先检测语料类型：纯代码语料只执行本地 AST，不需要 LLM API Key；仅当存在文档、PDF 或图片时才需要语义提取能力。
4. 按下方“Graphify 执行路由”选择完整构建路径。不得因为未发现 API Key 就直接执行 `--code-only`。
5. 验证生成结果可读取，并至少覆盖模块、依赖、API 和数据访问中的可识别部分。
6. Graphify 结构提取不可用或完整构建失败时，记录每次尝试和失败原因，再降级为确定性代码扫描；不得中断整个初始化，也不得把 AI 猜测伪装成 Graphify 事实。
7. 不把原始 `graph.json`、HTML 或整份生成报告复制进 Markdown 知识库。

### 2.1 Graphify 执行路由

按顺序执行，命中可用路径后停止继续探测：

| 优先级 | 条件 | 执行策略 | 是否需要用户确认 |
|---:|---|---|---|
| 1 | 语料只有代码 | 使用 Graphify 本地 AST 完整建立结构事实层 | 否 |
| 2 | 当前宿主已加载 Graphify skill，且支持宿主代理或子代理 | 严格按 Graphify skill 编排；代码走 AST，非代码语义由当前宿主会话处理 | 否 |
| 3 | 独立 CLI 场景，`claude` CLI 可执行且登录态可用 | 查询当前 Graphify 版本是否支持 Claude CLI 后端；支持时显式选择该后端 | 否 |
| 4 | 独立 CLI 场景，已存在 Graphify 支持的 API Key 或本地后端 | 使用已配置后端；不得要求用户重复提供当前环境已有的凭据 | 否 |
| 5 | 存在非代码语料，但所有语义后端均不可用 | 说明将跳过的文件类型和知识缺口，询问是否接受代码结构索引 | 是 |
| 6 | Graphify 未安装、结构提取报错或输出不可验证 | 使用 `rg`、构建文件和语言 AST 等确定性扫描生成 fallback 事实层 | 否，但必须报告降级 |

宿主判定以实际能力为准，不仅看产品名称：

- **Claude Code**：优先使用 Graphify skill 的宿主编排；只有明确走独立 CLI 时才尝试 Claude CLI 后端。Claude Code 订阅登录态不等于 `ANTHROPIC_API_KEY`。
- **Codex**：优先使用 Graphify skill；需要非代码语义提取时由当前宿主代理能力处理，不把 Codex 会话误判为 Claude API Key。
- **普通终端或脚本**：没有宿主代理能力，只能选择 Graphify 当前版本实际支持的 CLI 后端，或进入有损降级。

禁止以下行为：

- 看到“缺少 LLM API Key”后立刻执行 `--code-only`。
- 在纯代码项目中要求任何 LLM API Key。
- 未检查 `claude` CLI 和对应后端支持情况，就断言 Claude Code 引擎不可用。
- Graphify 失败后无记录地改用 AI 自由扫描。

### 2.2 降级规则

降级分为两类，禁止混淆：

| 降级类型 | 适用条件 | 结果边界 |
|---|---|---|
| 语义降级 | AST 可用，但非代码语义后端不可用 | 保留代码结构事实；跳过文档、PDF、图片语义，必须先取得用户确认 |
| 工具降级 | Graphify 不可用或结构结果无法验证 | 改用确定性扫描；生成内容标记为 `fallback`，不得声称来自 Graphify |

每次初始化都把路由结果写入 `generated/graphify-metadata.json`：记录宿主、语料类型、尝试过的后端、失败原因、最终模式和被跳过的文件类型。禁止记录 API Key 值、登录令牌或其他凭据。

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
  "host": "claude-code-or-codex-or-terminal",
  "corpus_mode": "code-only-or-mixed",
  "backend_attempts": [],
  "fallback_reason": null,
  "skipped_content_types": [],
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
