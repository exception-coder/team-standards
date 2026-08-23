# 项目证据工具契约

## 目录

- [职责边界](#职责边界)
- [关系与角色](#关系与角色)
- [resolve_project_evidence_scope](#resolve_project_evidence_scope)
- [query_project_evidence](#query_project_evidence)
- [完成性门禁](#完成性门禁)
- [兼容适配](#兼容适配)

## 职责边界

插件选择项目和来源、安排查询顺序并解释证据。Forge 保存关系和路径、执行工具、持久化轨迹、恢复任务并校验完成性。模型输出不是调用证明。

MCP 实现应为工具声明 `outputSchema`，在 `structuredContent` 返回机器可校验对象，并同时保留文本结果以兼容旧客户端。业务执行错误使用工具结果的 `isError`，不要伪装成空命中。

## 关系与角色

| relation | projectRole | 语义 |
|---|---|---|
| `PRIMARY` | `CURRENT_IMPLEMENTATION` | 当前需求所属实现 |
| `REFACTORS` | `LEGACY_SOURCE` | 当前项目重构的旧实现，只作迁移和复用参考 |
| `MIGRATES_FROM` | `MIGRATION_SOURCE` | 数据或能力迁移来源 |
| `DEPENDS_ON` | `DEPENDENCY` | 普通编译、运行或业务能力依赖 |
| `INTEGRATES_WITH` | `INTEGRATION_PARTNER` | 通过接口、事件、单据或同步连接的系统 |

一个相关项目若有多种关系，resolver 返回多条关系或显式的关系集合，不得由插件选择性丢弃。

## resolve_project_evidence_scope

输入：

```json
{
  "project": "yoooni-one"
}
```

最小输出：

```json
{
  "scopeId": "scope_123",
  "primary": {
    "projectKey": "yoooni-one",
    "projectPath": "D:\\Users\\zhang\\myWork\\yoooni-one",
    "relation": "PRIMARY",
    "projectRole": "CURRENT_IMPLEMENTATION"
  },
  "relatedProjects": [
    {
      "projectKey": "yoooni",
      "projectPath": "D:\\yoooni\\yoooniCodeSpace\\yoooni",
      "relation": "REFACTORS",
      "projectRole": "LEGACY_SOURCE",
      "availability": {
        "DOMAIN_KNOWLEDGE": true,
        "GRAPHIFY": true,
        "DDL": true,
        "ROUTE_MAP": true,
        "SOURCE": true,
        "CROSS_PROJECT_TOPOLOGY": true
      }
    }
  ]
}
```

约束：

- `projectPath` 必须是平台校验后的规范绝对路径。
- resolver 读取 Forge 项目关系和目录注册，不让模型提交任意路径。
- 路径暂不可访问时仍返回项目与关系，并把可用性置为 `false`。
- 未登记、循环、越权路径或知识键冲突必须显式失败。

## query_project_evidence

输入字段：

| 字段 | 必填 | 约束 |
|---|---|---|
| `scopeId` | 是 | 关联 resolver 结果，防止路径脱离范围 |
| `projectKey` | 是 | 必须存在于 scope |
| `projectPath` | 是 | 必须与 scope 中的规范路径完全一致 |
| `relation` | 是 | 封闭关系枚举 |
| `projectRole` | 是 | 封闭角色枚举 |
| `sourceType` | 是 | 封闭来源枚举 |
| `question` | 是 | 当前需求问题 |
| `module` | 否 | 已解析模块 key 或名称 |
| `queryReason` | 是 | 说明关系和需求为什么要求本次查询 |

每次调用都创建不可变 ledger entry。重试创建新 entry，并通过 `retryOf` 关联前一次记录。

结果状态：

| status | attempted | 语义 |
|---|---:|---|
| `HIT` | true | 查询成功且返回相关证据 |
| `NO_HIT` | true | 来源存在且查询成功，但没有相关结果 |
| `SOURCE_MISSING` | true | 计划要求查询，但目标资产不存在或不可访问 |
| `EXECUTION_ERROR` | true | 适配器执行失败 |
| `NOT_APPLICABLE` | false | 输入条件不适用，例如没有 URL 时不查路由 |
| `SKIPPED_WITH_REASON` | false | 关系存在但需求不涉及，必须说明具体理由 |

`target` 记录实际文件、图谱、知识键或服务目标。`excerpt` 必须限长并由平台脱敏；敏感输入输出不应默认进入通用 trace exporter。

## 完成性门禁

门禁输入 `traceId`、`purpose` 和 `round`，只读取已持久化 ledger。至少检查：

- 主项目是否出现所有必查来源的实际记录。
- `REFACTORS` 和 `MIGRATES_FROM` 来源项目是否完成关系要求的查询。
- `INTEGRATES_WITH` 在接口、事件、单据或同步需求中是否查询路由、源码和拓扑。
- `NOT_APPLICABLE`、`SKIPPED_WITH_REASON` 是否包含原因。
- 是否存在计划中必查但完全没有 ledger entry 的项目和来源。
- `round` 是否处于 1 到 3。

门禁返回 `complete`、`missingRequiredQueries` 和 `remainingGaps`。第三轮后仍缺失时返回 `complete=false`，但不再发起新一轮。

## 兼容适配

统一工具上线前，平台可以把现有 `project-domain-knowledge.resolve_project_context`、Graphify、DDL、路由和源码服务封装为 `query_project_evidence` 的适配器。兼容期仍需满足：

- 先由 Forge resolver 给出完整 scope。
- 每次适配器调用由平台持久化。
- 结果映射到统一状态和 schema。
- 不允许插件直接拼接多个工具输出后自称账本完整。
