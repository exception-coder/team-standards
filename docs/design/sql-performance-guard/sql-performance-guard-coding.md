# SQL 正确性与性能门禁编码摘要

## 1. 实施顺序

1. 扩展后端知识图谱 Skill 的 SQL 正确性与性能路由。
2. 分别用 `sql-correctness-gate.md` 和 `query-performance-gate.md` 维护正确性、性能规则。
3. 同步 Java SQL 规则、设计档位与轻量模板。
4. 新增只告警的 SQL 正确性与查询性能 Hook 及单元测试。
5. 明确真实数据库、Mapper 契约和制品 SHA 由项目 CI 验证。
6. 同步 CLAUDE、AGENTS、skill-flow、索引和开发日志。

## 2. Hook 契约

| 项目 | 约定 |
|---|---|
| 输入 | 复用 `normalizeChanges(payload)` |
| 检查范围 | 本次新增的源码、SQL 和 Mapper 文本 |
| 输出 | stderr 风险摘要与 `backend-evidence` 指引 |
| 退出码 | 命中仍为 0；仅脚本异常返回非零 |
| 开关 | `TEAM_STANDARDS_SQL_PERF_HOOK=warn|off` |
| 事件 | `hook=check-query-performance-risk`、`rule=sql-performance` |

SQL 正确性 Hook 使用 `TEAM_STANDARDS_SQL_CORRECTNESS_HOOK=warn|off`，事件为 `hook=check-sql-correctness-risk`、`rule=sql-correctness`。它只提示多表投影中的保守高置信度信号，不把启发式结果升级为硬阻断。

## 3. 风险信号

| 信号 | 最小判定 |
|---|---|
| 无界聚合 | `COUNT/SUM/AVG/GROUP BY/DISTINCT` 且同一 SQL 片段无 `WHERE` |
| 循环查询 | 循环或 Stream 片段同时出现 DAO、Mapper、Repository 查询调用 |
| 内存分页 | 集合 `filter` 与 `subList/skip/take` 在同一变更片段出现 |

正确性信号包括：多数据源 `SELECT` 中的简单未限定字段，以及 `SELECT *` / `table.*` 通配投影。复杂表达式、动态分支和数据库方言交给项目级解析与契约测试。

信号只用于提醒，不声称已经证明性能问题。

## 4. 测试

- 分别验证三类命中均提示且 exit 0。
- 验证主键有界查询、测试文件和非 JSON 输入放行。
- 验证 `TEAM_STANDARDS_SQL_PERF_HOOK=off` 静默。
- 验证字段歧义示例命中、显式限定放行、通配投影命中和 `TEAM_STANDARDS_SQL_CORRECTNESS_HOOK=off` 静默。
- 验证 dispatcher 能独立关闭新 Hook。

## 5. 完成条件

- 所有新增规则都有单一权威来源和可达引用。
- Hook 不读取数据库、不访问网络、不扫描工作区。
- 完整 CI 五道闸门通过。
