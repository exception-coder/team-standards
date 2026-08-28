# Skill 触发归属

## 主辅决策表

| 信号 | 主 Skill | 按需叠加 |
|---|---|---|
| 具体方案、目录策略、参考实现 | `change-readiness` 方案审视模式 | `planning-evidence-discovery` |
| 新需求、重构、源码修改 | `change-readiness` | 架构、语言和领域 Skill |
| Bug、异常、超时、错误行为 | `bug-doc-required` | `change-readiness`、编码标准 |
| 重构前理解现状 | `business-logic-orientation` | `backend-evidence` |
| 表、SQL、状态、字段、事件、API、性能 | `backend-evidence` | `glossary-required` |
| 共享定义影响面 | `backend-evidence` Graphify 即时影响模式 | `change-readiness` |
| 状态密集业务缺少闭环规格 | `backend-evidence` 领域规格模式 | `planning-evidence-discovery` |
| 新建或重组 Markdown | `markdown-writing-standards` | 内容所属 Skill |
| 初始化新项目、接入新系统、刷新或检查项目上下文状态 | `init-project-docs` | `backend-evidence` |
| 新建或大改 Web UI | `frontend-excellence` | `design-system-guardian` |
| 初始化设计资料或记录偏好 | `design-system-bootstrap` | — |
| UI 视觉验收 | `design-system-guardian` | `frontend-excellence` |
| Java / Dart / LLM 代码 | 对应专属编码 Skill | `coding-standards-common` 必须先执行 |
| 用户纠正规范错误 | `coding-violation-log` | — |
| 批量清理存量注释 | `comment-cleanup` | `coding-standards-common` |
| 业务源码有改动 | `daily-work-log` | — |
| team-standards 决策变化 | `dev-log` | — |
| commit | `git-commit-standards` | — |

## 不属于团队插件

模块脚手架、URL 到页面定位、特定 Flutter 架构 lint、特定产品生态拓扑、IDE/应用启动和某项目数据库连接都由项目自身声明。
