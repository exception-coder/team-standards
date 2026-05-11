# Skill 依赖图

> 弥补 plugin.json 不支持声明 skill 间依赖的缺口。本文档把 skill 触发的**前置依赖**和**后置补全**显式列出,与 `CLAUDE.md` 的「Skill 并发触发顺序」配套使用。

## 依赖类型

| 类型 | 含义 |
|------|------|
| **前置 (requires)** | 不调用 A 不能进入 B(强约束,违反 = 流程违规) |
| **后置 (recommends-after)** | 调用 A 后强烈建议立即走 B(软约束,跳过会丢上下文但不阻塞) |
| **互补 (paired-with)** | 同回合通常一起触发,各管一面 |
| **不重叠 (mutually-exclusive)** | 同回合只该走其中之一,选错就是分类错误 |

## Skill 依赖关系总览

### ① 方案 / 需求分析

```text
solution-review-required ──recommends-after──> design-doc-required
                                                    │
glossary-required ─────────────────recommends-after─┤
                                                    │
backend-knowledge-graph-required ──recommends-after─┤
                                                    │
reverse-index-required ────────────recommends-after─┤
                                                    ↓
                                            design-doc-required
                                            (强制门禁,改代码前必经)
```

| Skill | 前置 | 后置 | 互补 |
|-------|------|------|------|
| `solution-review-required` | 无 | `design-doc-required` | — |
| `business-logic-orientation` | 无 | `design-doc-required` (重构场景) | `backend-knowledge-graph-required` |
| `bug-doc-required` | 无 | `design-doc-required` (修复实施方案) | — |
| `design-doc-required` | (前置 0-3 已就绪) | `pre-implementation-code-orientation` | `bug-doc-required`(bug 修复链路) |

### ② 实施前定位

| Skill | 前置 | 后置 | 互补 |
|-------|------|------|------|
| `pre-implementation-code-orientation` | `design-doc-required` 已确认 | `architecture-ddd-lite-fullstack` | — |
| `doc-index-required` | 无 | (Phase-B 在写文档完成后) | — |

### ③ 架构与编码

```text
pre-implementation-code-orientation
            ↓
architecture-ddd-lite-fullstack   ← 强制门禁(无例外)
            ↓
coding-violation-log (回顾模式)   ← 项目存在违规表时
            ↓
bugfix-coding-style              ← bug / 删冗余 / 对齐云端场景
            ↓
coding-standards-common          ← 强制门禁(无例外)
            ↓
{language}-coding-standards 或 korepos-backend-service
            ↓
markdown-writing-standards       ← 仅含 Mermaid 时
            ↓
arch-lint                        ← Flutter 代码异步触发
```

| Skill | 前置 | 后置 | 互补 / 叠加 |
|-------|------|------|------------|
| `architecture-ddd-lite-fullstack` | 通常 `pre-implementation-code-orientation` 已完成 | `coding-standards-common` | — |
| `coding-standards-common` | `architecture-ddd-lite-fullstack` | `{language}-coding-standards` | `bugfix-coding-style`(bug 修复时叠加) |
| `java-coding-standards` | `coding-standards-common` | — | 通用部分 delegate 到 common,不替代 |
| `korepos-backend-service` | `coding-standards-common` + `architecture-ddd-lite-fullstack` | `arch-lint`(写完 Flutter 代码后) | — |
| `bugfix-coding-style` | 仅 bug 修复 / 删冗余场景 | `coding-standards-common` 继续 | 注释方向与 `coding-standards-common` 注释三档对齐 |
| `arch-lint` | Flutter 代码改动 | `coding-violation-log`(若 lint 命中违规) | — |
| `coding-violation-log`(回顾) | 项目存在 coding-violations.md | (无,纯读) | — |
| `markdown-writing-standards` | 写 Mermaid 或结构性 markdown 改动 | — | — |

### ④ 提交与日志

| Skill | 前置 | 后置 | 互补 |
|-------|------|------|------|
| `git-commit-standards` | 改动落地 | `daily-work-log` (业务项目)或 `dev-log`(team-standards) | hook 按大小放行 |
| `daily-work-log` | 业务项目源码改动 | — | 与 `dev-log` 互斥(不同主体) |
| `dev-log` | team-standards 决策型变更 | — | 与 `daily-work-log` 互斥 |

### ⑤ 知识图谱

| Skill | 前置 | 后置 | 互补 |
|-------|------|------|------|
| `backend-knowledge-graph-required` | 后端表 / SQL / 状态 / 原子能力相关 | 编码后回写图谱或候选池 | `reverse-index-required`(影响面分析) |
| `reverse-index-required` | 改枚举 / 字段 / 事件 / API | 同回合回写反向索引 | `backend-knowledge-graph-required`(正向 vs 反向) |
| `glossary-required` | PRD / 设计 / 对话含未登记业务术语 | — | `init-project-docs`(批量初始化 07_glossary.md) |
| `cross-project-locator` | ≥2 个 kpay POS 工程命中 | — | 与单服务图谱互斥(单服务归 backend-kg) |

### ⑥ 质量回路

| Skill | 前置 | 后置 | 互补 |
|-------|------|------|------|
| `coding-violation-log`(登记) | 用户纠错时 | 后续会话编码前回顾 | — |
| `arch-lint` | Flutter 代码改动后 | — | — |
| `markdown-writing-standards` | Markdown 含 Mermaid 或结构性改动 | — | — |
| `project-docs-update` | 项目结构变更(新增 Controller/Service/表/API) | — | — |

### ⑦ 项目初始化(一次性)

| Skill | 前置 | 后置 | 互补 |
|-------|------|------|------|
| `init-project-docs` | 新项目 / 现有项目首次铺规范 | `project-docs-update`(后续维护) | — |
| `generate-project-profile` | 需要 AI Agent 消费的 10 维度结构化项目画像 | — | 与 init 互补,init 偏全 11 份文档,profile 偏 AI 消费 |

### ⑧ plugin 自身维护

| Skill | 前置 | 后置 | 互补 |
|-------|------|------|------|
| `dev-log` | team-standards 决策型变更 | — | — |

## 互斥关系一览

| Skill A | Skill B | 互斥原因 |
|---------|---------|---------|
| `daily-work-log` | `dev-log` | 主体不同——业务项目 vs team-standards plugin 本身 |
| `cross-project-locator` | `backend-knowledge-graph-required` | 单服务图谱归 backend-kg,跨项目拓扑归 cross-project-locator;同回合只该走其中之一 |
| `business-logic-orientation` | `pre-implementation-code-orientation` | orientation 是重构前的现状梳理(独立文档),pre-implementation 是基于已写好的 design 文档定位代码;同回合只走其一 |
| `XxxService` 命名 / `XxxUseCase` / `XxxCommandHandler` (项目级命名 taxonomy) | (无) | 同一项目只选一种,不混用——参见 `architecture-ddd-lite-fullstack`「服务命名 taxonomy」节 |

## 关键依赖断裂检测

如果发现以下场景,说明依赖链路被绕过:

| 现象 | 缺失的 skill |
|------|------------|
| 用户直接要求改代码,无设计文档 | `design-doc-required`(强制门禁) |
| AI 改完代码没回写枚举 / 字段反向索引 | `reverse-index-required`(回写模式) |
| AI 改完后端代码没沉淀 DAO/SQL/状态判定 | `backend-knowledge-graph-required`(回写候选池或正式图谱) |
| 业务项目源码改动后未记工作日志 | `daily-work-log`(会话结束前必须回补) |
| team-standards 决策型变更后无 dev-log 条目 | `dev-log`(会话结束前) |
| Java 代码改完只走了 coding-standards-common 没走 java-coding-standards | 漏掉语言专属叠加 |

## 与 plugin.json 的关系

Claude Code 的 plugin.json 不支持声明 skill 间依赖,本文档**仅描述**约束。实际执行由两条机制保证:

1. **CLAUDE.md / SKILL.md frontmatter 的 BLOCKING 触发条件**——AI 自觉触发
2. **hooks/check-*.js**——强制拦截兜底(目前覆盖 git-commit / DTO 注解;未来可扩展)

如果某条依赖反复被绕过,优先在 SKILL.md 加更明确的 BLOCKING 触发条件,其次考虑写 hook 兜底。
