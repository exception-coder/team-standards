# 编码违规记录

> 本文由 `coding-violation-log` Skill 维护。编码前必须回顾，避免重犯已登记错误。

| # | 类型 | 违规描述 | 正确做法 | 涉及文件 | 首次发生 | 次数 |
|---|---|---|---|---|---|---:|
| 1 | 架构约束 | 精简 Skill 时保留了规则文件，却删除主入口到硬规则的读取路由，导致规则实际不可达 | 所有 `rules/`、`references/` 文档必须从 `SKILL.md` 链接图可达，并由 CI 静态审计 | architecture-ddd-lite-fullstack/SKILL.md 等 | 2026-08-11 | 3 |
