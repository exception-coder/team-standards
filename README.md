# team-standards

跨项目通用的工程治理插件。它只保留团队层面稳定复用的分析、设计、架构、编码、文档和交付能力；项目特有的路由、脚手架、架构 lint、编码例外和系统拓扑由项目自身维护。

## 快速导航

- **理解统一流程** → [主流程](#主流程)、[Skill 流程图](docs/skill-flow.md)
- **查看能力清单** → [21 个 Skill](#21-个-skill)、[合并后的入口](#合并后的入口)
- **编码与门禁** → [编码规范叠加层级](#编码规范叠加层级)、[Hook 边界](#hook-边界)
- **未来上下文架构** → [Graphify 与 OpenSpec](#graphify-与-openspec)
- **安装和维护** → [安装](#安装)、[维护与验证](#维护与验证)

---

## 主流程

```mermaid
flowchart LR
    INTENT["需求 / Bug / 分析"] --> EVIDENCE["证据与设计依据"]
    EVIDENCE --> IMPACT["后端事实与影响分析"]
    IMPACT --> LOCATE["精确代码定位"]
    LOCATE --> GUARD["架构与编码门禁"]
    GUARD --> BUILD["实施与验证"]
    BUILD --> WRITEBACK["知识、索引与日志回写"]
    WRITEBACK --> COMMIT["规范提交"]
```

详细模式与条件见 [Skill 流程图](docs/skill-flow.md)，完整触发表见 [CLAUDE.md](CLAUDE.md)。

---

## 21 个 Skill

| 类别 | Skill | 核心价值 |
|---|---|---|
| 分析设计 | `change-readiness` | 路由 OpenSpec/兼容设计，统一方案审视、风险分档和实施前代码定位 |
| 分析设计 | `bug-doc-required` | 统一 Bug 证据、根因、修复约束与回归 |
| 分析设计 | `business-logic-orientation` | Graphify 优先理解当前业务逻辑，按需沉淀长期基线 |
| 分析设计 | `planning-evidence-discovery` | 跨项目 PRD 和估算的证据轨迹 |
| 架构编码 | `architecture-ddd-lite-fullstack` | 跨语言 DDD-lite 分层和依赖方向 |
| 架构编码 | `coding-standards-common` | 通用命名、结构、异常、测试与注释规则 |
| 架构编码 | `java-coding-standards` | Java 与关系数据库专属规范 |
| 架构编码 | `dart-coding-standards` | Dart、Flutter 与 dartdoc 专属规范 |
| 架构编码 | `llm-agent-coding-standards` | LLM/Agent 信任边界和循环安全 |
| 前端设计 | `frontend-excellence` | 生产 Web 前端质量和浏览器验收 |
| 前端设计 | `design-system-bootstrap` | Design Registry/Profile 和偏好学习 |
| 前端设计 | `design-system-guardian` | UI 实施治理和视觉验收 |
| 知识文档 | `backend-evidence` | 单服务数据事实、Graphify 即时影响、领域规格与查询性能 |
| 知识文档 | `glossary-required` | 将业务术语路由到 domain knowledge，并用 Graphify 验证代码映射 |
| 知识文档 | `markdown-writing-standards` | 写前查重、Markdown/Mermaid 和写后索引 |
| 知识文档 | `init-project-docs` | 在当前目录初始化统一 AI 工程结构，并编排 Graphify/OpenSpec/项目规则与上下文状态 |
| 质量反馈 | `coding-violation-log` | 记录用户纠正并防止重犯 |
| 质量反馈 | `comment-cleanup` | 经授权批量清理存量违规注释 |
| 日志交付 | `daily-work-log` | 业务项目个人工作日志 |
| 日志交付 | `dev-log` | 插件决策型变更日志 |
| 日志交付 | `git-commit-standards` | 可审查提交信息和提交前复核 |

---

## 合并后的入口

| 原独立能力 | 现在的位置 |
|---|---|
| 方案评审、实施前代码定位 | `change-readiness` 的按需参考 |
| Bug 修复编码约束 | `bug-doc-required` 修复模式 |
| 文档索引 | `markdown-writing-standards` 文档生命周期 |
| 反向影响、领域规格挖掘 | `backend-evidence` 使用 Graphify 即时查询和 domain knowledge 候选流程 |
| AI 工程目录、通用项目接入、上下文刷新、可选轻量画像 | `init-project-docs` 的 `structure/onboard/refresh/profile` 模式；不生成 00–10 文档树与 Graphify 镜像 |

---

## 编码规范叠加层级

```text
coding-standards-common              所有源码修改的公共基线
├── java-coding-standards            Java 代码按需叠加
├── dart-coding-standards            Dart / Flutter 代码按需叠加
└── llm-agent-coding-standards       接入 LLM / Agent 时按需叠加
```

`architecture-ddd-lite-fullstack` 位于编码规范之前，负责分层和依赖方向；语言 Skill 只补充专属规则，不复制或替代 common。

---

## Hook 边界

Hook 只承担可机械判断的最后一道检查，不替代 Skill 的语义决策。设计依据检查同时认可“真实 OpenSpec context + 完整活动 change artifacts”和兼容设计文档；后端上下文检查优先认可 Graphify 查询，图谱 manifest 早于目标文件时会显式提示或阻断。其余门禁包括架构边界、DDL、SQL 正确性风险、查询性能、注释红线和提交信息。动态 SQL 的最终结论仍由项目 DDL、真实数据库和 Mapper 契约测试给出。

---

## Graphify 与 OpenSpec

- Graphify 是可再生的当前实现事实层。
- OpenSpec 是项目内已接受行为规格和活动变更的权威入口。
- Domain knowledge 保存经确认、跨变更稳定的业务真理和术语。
- `team-standards` 只负责意图路由与质量门禁，不复制图谱或建立平行规格。

项目的 OpenSpec 配置包含真实上下文、相关 change 可定位且 artifacts 可读取后，`change-readiness` 评审 OpenSpec change 而不是另建设计文档；只有空模板、无相关 change 或 CLI 不可用时才走兼容流程。Graphify 查询前还必须校验其对 HEAD 和工作区改动的新鲜度。具体职责矩阵见 [Skill 流程图](docs/skill-flow.md#graphify-与-openspec-接入边界)。

---

## 安装

Claude Code：

```text
/plugin marketplace add https://gitee.com/wyoooni/team-standards.git
/plugin install team-standards@team-standards
/reload-plugins
```

团队整套工具通过工具仓发布包或 `yoooni-daily-plugin/plugins/yoooni-daily-plugin/scripts/` 下的维护脚本安装和更新；这些命令不作为 Skill 暴露。

---

## 维护与验证

`CLAUDE.md` 是 Claude/Codex 入口的单一来源，修改后运行：

```bash
node scripts/sync-agents.js
(cd hooks && npm test)
node scripts/sync-agents.js --check
node scripts/check-cross-refs.js
node scripts/check-version-sync.js
node scripts/audit-skills.js --warnings --ci
```

破坏性 Skill 删除或重命名递增 Major，并同步 marketplace、Claude plugin、Codex plugin 三处版本。
