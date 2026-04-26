---
name: doc-index-required
description: "You MUST invoke this skill before choosing an output path for any generated Markdown document, and BOTH BEFORE and AFTER creating, writing, or editing ANY file under docs/ (at any nesting depth). First decide whether the document is team-shared or personal/temporary AI output. Team-shared docs use docs/ and require Phase-A/Phase-B indexing. Personal/temporary AI output defaults to the user's Documents directory outside the project and MUST NOT update docs/ indexes. TRIGGER Phase-A when: (1) about to call Write or Edit on any .md file whose absolute path contains /docs/ (including deeply nested paths like docs/design/xxx/yyy/file.md), (2) about to move, rename, or reorganize files under docs/, (3) user says '新建文档', '写文档', '整理文档', '移动文档', '重构文档目录', 'create doc', 'add doc', 'move doc', (4) another skill (design-doc-required, bug-doc-required, etc.) is about to produce a docs/ file — invoke Phase-A FIRST. TRIGGER Phase-B when: docs/ file writing is complete, to update INDEX.md. Do NOT touch any docs/ file until Phase-A is complete. Only exception: updates to index files themselves (docs/INDEX.md, docs/*/INDEX.md). IMPORTANT: This applies to ALL working directories, not just the primary project."
---

# 文档索引优先原则

## 文档输出路径判定

在创建任何 Markdown 文档目录或文件前，必须先判定输出路径，禁止默认把所有 AI 生成内容写入项目 `docs/`。

### 三类输出路径

| 类型 | 适用内容 | 默认路径 | 是否更新索引 |
|------|----------|----------|--------------|
| 团队共享文档 | 已确认要作为团队知识沉淀的设计文档、Bug 分析文档、API 文档、知识图谱、项目规范 | `docs/{subdir}/...` | 是，必须执行 Phase-A + Phase-B |
| 个人/临时 AI 输出 | 个人分析草稿、扫描记录、临时对照表、一次性排查笔记、未确认要团队共享的方案草稿 | `{USER_DOCUMENTS}/ai-docs/{project}/{agent}/{YYYY-MM-DD}/{topic}.md` | 否，禁止更新 `docs/INDEX.md` |
| 用户指定路径 | 用户明确给出文件路径或要求写入某个目录 | 按用户路径处理 | 若路径在 `docs/` 下则更新索引，否则不更新 |

### 默认判定规则

1. 用户明确说“团队文档 / 写到 docs / 设计文档 / bug 文档 / API 文档 / 更新知识图谱” → 判定为团队共享文档。
2. 用户明确说“我自己的 / 临时 / 草稿 / 分析一下并留档 / 不想影响团队 / 不要提交” → 判定为个人/临时 AI 输出。
3. 用户未说明共享意图，且内容不是编码门禁必须引用的正式设计/bug 文档 → 默认判定为个人/临时 AI 输出。
4. `design-doc-required` 的已确认正式实施文档、`bug-doc-required` 的正式 Bug 分析文档仍属于团队共享文档；但在确认前生成的草稿、扫描笔记、候选方案必须先落个人/临时路径。

### 用户目录路径规则

个人/临时 AI 输出默认写入：

```text
{USER_DOCUMENTS}/ai-docs/{project}/{agent}/{YYYY-MM-DD}/{主题名}.md
```

路径解析规则：

1. Windows：`%USERPROFILE%\Documents\ai-docs\{project}\{agent}\{YYYY-MM-DD}\{主题名}.md`
2. macOS / Linux：`~/Documents/ai-docs/{project}/{agent}/{YYYY-MM-DD}/{主题名}.md`
3. 若系统没有 Documents 目录，兜底写入 `~/ai-docs/{project}/{agent}/{YYYY-MM-DD}/{主题名}.md`
4. `{project}` 使用当前项目目录名，避免多个项目的个人文档混在一起

处理要求：

1. 个人/临时 AI 输出默认不写入项目目录，避免污染团队工作区或误提交
2. 不主动修改团队共享的 `.gitignore`，也不依赖 `.git/info/exclude`
3. 不对用户目录下的个人/临时文件执行 `doc-index-required Phase-B`
4. 用户明确指定项目内路径时，按用户路径处理；若路径在 `docs/` 下，必须执行 Phase-A + Phase-B
5. 若用户希望长期自定义个人输出目录，应将该目录写入项目级规则或用户级配置；否则 skill 不假设具备跨会话记忆，始终使用上述默认用户目录

### 输出判定回显

写文档前必须向用户回显一行：

```text
文档输出路径判定：{团队共享 / 个人临时 / 用户指定} -> {目标路径}，原因：{一句话}
```

---

本 skill 分为 **两个阶段**，在文档编写的**前后**各执行一次：

| 阶段 | 时机 | 职责 | 包含步骤 |
|------|------|------|---------|
| **Phase-A（前置）** | 文档编写**之前** | 读取索引、分析内容边界、判断新建还是补充 | 第一步 ~ 第三步 |
| **Phase-B（后置）** | 文档编写**之后** | 更新索引，登记新文档或同步变更 | 第五步 |

**调用方式：**
- 其他 skill（如 `design-doc-required`、`bug-doc-required`）应在文档写作前调用 `doc-index-required Phase-A`，在文档写作后调用 `doc-index-required Phase-B`
- 第四步（执行文档写作）由调用方自行完成，本 skill 不负责写作本身

## 不适用场景

以下情况**不触发**本 skill：
- 修改非 `docs/` 目录下的文件（代码、配置等）
- 对索引文件本身的更新（`docs/INDEX.md`、`docs/*/INDEX.md`）
- 写入用户目录个人/临时 AI 输出路径（但写入前仍必须完成“文档输出路径判定”）

---

## Phase-A：前置阶段（文档编写前）

### 第一步：读取总索引

读取项目根目录下的 `docs/INDEX.md`。

**若 `docs/INDEX.md` 不存在：**
扫描 `docs/` 下的子目录，向用户展示以下初始化模板并请求确认后写入：

```markdown
# 文档索引

| 目录 | 说明 |
|------|------|
| [（子目录名）/](（子目录名）/INDEX.md) | （请补充说明） |
```

**若存在：** 读取并理解各子目录的覆盖范围。

---

### 第二步：读取目标子目录索引

根据本次要写的文档所在子目录（如 `docs/design/`、`docs/bug/`），读取对应的 `docs/{subdir}/INDEX.md`。

**若子目录索引不存在：**
扫描该子目录下现有的 `.md` 文件（排除 `INDEX.md`），读取每个文件中以 `# ` 开头的首个 H1 标题行作为 `{现有文档标题}` 的来源（若文件无 H1 标题则以文件名去扩展名作为标题），向用户展示以下初始化模板并请求确认后写入：

```markdown
# {subdir} 文档索引

## {现有文档标题}
- 文件：`{文件名}.md`
- 摘要：（请补充）
- 大纲：（请补充）
```

若子目录下暂无文档，则初始化为空索引：

```markdown
# {subdir} 文档索引

（暂无文档）
```

**若存在：** 读取并理解已有文档的标题、摘要、大纲。

---

### 第三步：分析内容边界

基于索引内容，判断本次要写的内容：

| 判断项 | 处理方式 |
|--------|---------|
| 是否已有完全对应的文档？ | 有 → 提示用户考虑直接补充到已有文档 |
| 是否与现有文档存在内容重叠？ | 有 → 明确告知重叠范围，建议合并或区分边界后再写 |
| 内容是否全新、无重叠？ | 新建文档，继续执行 |

分析结果必须向用户明确说明，获得确认后再写文档。

---

> **Phase-A 到此结束。** 调用方现在执行文档写作，完成后再调用 Phase-B。

---

## Phase-B：后置阶段（文档编写后）

### 第四步：（由调用方执行文档写作，本 skill 不介入）

---

### 第五步：半自动更新索引

文档写作完成后，**生成索引更新内容**，向用户展示并请求确认后写入。

**新增文档时**，在子目录索引末尾追加：

```markdown
## {新文档标题}
- 文件：`{新文件名}.md`
- 摘要：{一句话描述}
- 大纲：{二级标题1} / {二级标题2} / ...
```

同时检查总索引 `docs/INDEX.md` 中是否已有该子目录条目：
- 已有 → 不修改总索引
- 没有 → 在总索引表中追加该子目录行，一并展示给用户确认

**修改已有文档时**，按以下触发规则更新子目录索引中对应条目：
- 文档的 `##` 二级标题结构发生变化（新增、删除或修改标题文字）→ 更新索引中的大纲字段
- 文档第一段（H1 标题后、第一个 `##` 前的引言/摘要段落）内容发生变化 → 更新索引中的摘要字段

若以上两项均未变化，则跳过索引更新。

---

## 索引文件格式参考

### `docs/INDEX.md`（总索引）

```markdown
# 文档索引

| 目录 | 说明 |
|------|------|
| [design/](design/INDEX.md) | 功能设计文档 |
| [bug/](bug/INDEX.md) | Bug 分析与修复记录 |
| [api/](api/INDEX.md) | API 接口文档 |
```

### `docs/{subdir}/INDEX.md`（子目录索引）

```markdown
# {subdir} 文档索引

## 文档标题
- 文件：`文件名.md`
- 摘要：一句话描述文档内容
- 大纲：背景 / 根因分析 / 解决方案 / 验证方式
```
