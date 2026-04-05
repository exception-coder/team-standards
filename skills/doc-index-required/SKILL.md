---
name: doc-index-required
description: "You MUST invoke this skill BEFORE creating, writing, or editing ANY file under docs/ (at any nesting depth) — no exceptions. TRIGGER when: (1) about to call Write or Edit on any .md file whose absolute path contains /docs/ (including deeply nested paths like docs/design/xxx/yyy/file.md), (2) about to move, rename, or reorganize files under docs/, (3) user says '新建文档', '写文档', '整理文档', '移动文档', '重构文档目录', 'create doc', 'add doc', 'move doc', (4) another skill (design-doc-required, bug-doc-required, etc.) is about to produce a docs/ file — invoke this skill FIRST. Do NOT touch any docs/ file until index check is complete. Only exception: updates to index files themselves (docs/INDEX.md, docs/*/INDEX.md). IMPORTANT: This applies to ALL working directories, not just the primary project."
---

# 文档索引优先原则

在编写或创建任何 `docs/` 目录下的文档之前，**必须先读取文档索引**，分析现有内容边界，再决定新建还是补充到已有文档。

## 不适用场景

以下情况**不触发**本 skill：
- 修改非 `docs/` 目录下的文件（代码、配置等）
- 对索引文件本身的更新（`docs/INDEX.md`、`docs/*/INDEX.md`）

---

## 执行流程

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

### 第四步：执行文档写作

按第三步的分析结论执行文档写作。

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
