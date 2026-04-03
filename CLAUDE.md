# team-standards 插件开发规范

> 每次操作 skill 前必须阅读本文件，根据索引分析后再决策。

---

## Skill 主动触发规范

**Skill 必须主动触发，不等用户显式调用。** Claude 在以下场景必须自动识别并第一时间调用对应 Skill：

| 用户意图 | 必须第一时间调用 |
|---------|----------------|
| 提出任何新需求、重构计划、技术方案讨论、可行性分析 | `design-doc-required` |
| 报告 Bug、描述异常、请求分析问题根因 | `bug-doc-required` |
| 即将创建或编辑 `docs/` 下任何文件 | `doc-index-required` |
| 设计文档或 Bug 文档已确认，准备开始写第一行代码 | `pre-implementation-code-orientation` |
| 执行 git commit 或生成提交信息 | `git-commit-standards` |
| 编写或审查 Java 代码 | `java-coding-standards` |
| 本次会话对 team-standards 有任何变更 | `dev-log`（会话结束前） |

**核心原则：** 触发时机是用户表达意图的那一刻，而不是开始动手的那一刻。收到需求就触发 `design-doc-required`，不要等到真的要写代码时才触发。

---

## Skill 索引

| Skill 名称 | 目录 | 覆盖范围 | 关键词 |
|-----------|------|---------|--------|
| `design-doc-required` | `skills/design-doc-required/` | 编写代码前强制要求设计文档；文档存储结构；coding-summary 自动生成 | 设计文档、需求、方案、实现前、新功能 |
| `git-commit-standards` | `skills/git-commit-standards/` | commit 类型前缀；中文 body；基于 diff 分析；Author 署名 | 提交、commit、git、分支 |
| `java-coding-standards` | `skills/java-coding-standards/` | 阿里巴巴黄山版 Java 规范：命名、格式、注释、OOP、集合、并发、异常、日志、数据库、安全 | Java、代码规范、命名、注释、异常、线程 |
| `doc-index-required` | `skills/doc-index-required/` | 写文档前读取总索引与子目录索引；分析内容边界；半自动更新索引 | 文档、docs、写文档、索引、重复内容 |
| `bug-doc-required` | `skills/bug-doc-required/` | 编写 bug 分析文档前强制规范章节结构；调用链必须用 Mermaid；根因必须用表格 | bug、缺陷、问题分析、bug文档、OOM、异常 |
| `pre-implementation-code-orientation` | `skills/pre-implementation-code-orientation/` | 实施前从 bug/设计文档的代码坐标表精准 Read 关键文件，禁止重新扫描 | 实施前、开始写代码、修复前、开发前、代码定位 |
| `dev-log` | `skills/dev-log/` | 每次对 team-standards 有变更时记录开发日志；在 docs/dev-log/ 下按日期创建日志文件 | 开发日志、变更记录、skill 修改、发版记录 |

---

## 辅助资源

| 文件 | 所属 Skill | 用途 |
|------|-----------|------|
| `skills/design-doc-required/template.md` | design-doc-required | 18 节完整设计文档模板 |
| `skills/design-doc-required/coding-template.md` | design-doc-required | 7 节精简编码摘要模板 |
| `hooks/check-design-doc.cmd` | 可选 Hook | 提交前脚本级设计文档校验（默认禁用） |
| `skills/bug-doc-required/template.md` | bug-doc-required | bug 分析文档标准模板（6 节） |

---

## 操作前决策流程

收到扩展或调整需求时，按以下顺序判断：

```
新需求进来
    │
    ├─ 关键词匹配已有 Skill？
    │       ├─ 是 → 在该 Skill 的 SKILL.md 中扩展内容
    │       └─ 否 ↓
    │
    ├─ 与多个已有 Skill 强相关？
    │       ├─ 是 → 评估是否合并，或在最相关的 Skill 中新增章节
    │       └─ 否 ↓
    │
    └─ 完全独立的规范领域？
            └─ 是 → 在 skills/ 下新建目录，创建 SKILL.md
```

---

## Skill 文件规范

### 目录结构
```
skills/
└── {skill-name}/           # kebab-case，与 frontmatter name 一致
    ├── SKILL.md            # 必须
    └── {辅助模板}.md       # 可选，由 SKILL.md 引用
```

### SKILL.md frontmatter 格式
```yaml
---
name: skill-name            # 唯一标识，kebab-case
description: 触发时机描述   # 明确说明何时 MUST 调用
---
```

---

## 维护规则

**每次新增或修改 Skill 后，必须同步更新本文件的 Skill 索引表：**
- 新增 Skill → 在索引表中追加一行，补充辅助资源表（如有）
- 修改 Skill 覆盖范围 → 更新对应行的「覆盖范围」和「关键词」列
- 删除 Skill → 从索引表和辅助资源表中移除对应行
- 新增辅助模板文件 → 在辅助资源表中追加

不更新索引视为操作未完成。

---

## 发版规则（push 前必须执行）

**每次 push 前，必须先更新 `.claude-plugin/plugin.json` 中的 `version` 字段，否则团队成员执行 `/plugin update` 无法检测到变更。**

版本号遵循语义化版本（SemVer），按变更类型递增：

| 变更类型 | 递增位 | 示例 |
|---------|--------|------|
| 新增 Skill、新增模板文件 | Minor（中位） | `1.1.0` → `1.2.0` |
| 修复 Skill 内容、调整措辞、补充规则 | Patch（末位） | `1.2.0` → `1.2.1` |
| 不兼容的结构变更（目录重组、Skill 重命名） | Major（首位） | `1.2.0` → `2.0.0` |

**发版检查清单（每次 push 前逐项确认）：**
1. `.claude-plugin/plugin.json` 的 `version` 已按上表递增
2. `.claude-plugin/marketplace.json` 中对应插件的 `version` 已同步递增（两处必须一致，插件系统以 marketplace.json 为基准判断是否有更新）
3. 本文件 Skill 索引表已同步（新增/修改/删除）
4. README.md 的「包含的 Skills」表已同步（如有新增 Skill）
