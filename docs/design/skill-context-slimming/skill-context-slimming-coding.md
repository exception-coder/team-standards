# Skill 上下文瘦身修复编码摘要

## 目标坐标

| 目标 | 落点 |
|---|---|
| 恢复结构硬规则可达性 | `skills/architecture-ddd-lite-fullstack/SKILL.md` |
| 恢复函数体积和测试底线 | `skills/coding-standards-common/SKILL.md` |
| 阻断客观模块边界违规 | `hooks/check-architecture-boundaries.js` |
| 防止规则文档再次失联 | `scripts/audit-skills.js` |

## 实施契约

- 架构入口按场景显式路由 `rules/structure-quality-gates.md`，不复制完整规则正文。
- Maven 硬规则只匹配 `tools/tool-*/pom.xml` 新增的 `tool-*` artifact，平台模块和外部依赖不受影响。
- 前端硬规则只检查 `src/features/{owner}` 源码新增的静态、动态和 `require` import；跨 feature 的 `public-api` 是唯一合法入口。
- 巨型文件检查只在新增至少 5 行有效内容且预计超过阈值时提示，永不作为硬阻断项。
- Hook 支持 `block`、`warn`、`off`，默认 `block`；其中启发式发现即使在 block 模式也只提示。

## 验证

- Hook 单元测试覆盖两类硬违规、两类合法引用、巨型文件软提醒和 warn 降级。
- Dispatcher 测试隔离新 Hook，保持既有测试确定性。
- Skill audit 从入口递归遍历本地 Markdown 链接，并在 CI 中阻断不可达的 `rules/`、`references/` 文件。
