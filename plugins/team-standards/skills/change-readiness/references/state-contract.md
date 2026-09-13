# 状态契约治理接入

## 职责与适用范围

涉及状态值、转换、状态 SQL、按钮条件、迁移或统计时使用本协议。插件提供格式和机械检查，项目拥有业务规则；不把某个项目的状态推广为团队常量。状态正文保存在所属 OpenSpec 规格，结构化附件建议为 `state-contract.json`。这是团队扩展附件，不是官方 OpenSpec artifact；官方校验和归档不会自动处理它。

有活动 change 时在 change 内修订完整候选契约，登记基线与差异；同步阶段显式将已验收附件晋升到主规格并核对引用。不要长期维护两份互相矛盾的状态定义。未启用 OpenSpec 的项目可引用已有权威规格，复用同一检查器。

## 契约结构

可复制并改写插件的 [可运行示例](../../../state-contract/example/state-contract.json)，结构见 [JSON Schema](../../../state-contract/schema.json)。插件内校验器只实现此 Schema 实际使用的类型、必填、枚举、数组和闭合属性约束，不宣称通用 JSON Schema 支持。

| 字段 | 项目责任 |
|---|---|
| module / spec | 模块及唯一业务规格路径 |
| dimensions | 区分档案、库存、入仓等维度；代码、含义、current/legacy |
| actions | 操作、前置条件、effects、invariants 与各维度 from/to 转换；这些表达不替代领域策略 |
| sourceRoots | 精确模块源码目录；包含写入、策略、查询、前端和迁移，不能为了通过检查缩小范围 |
| inputFiles | 额外影响验证的测试、依赖锁、构建配置等文件；不包含生成报告和构建产物 |
| scanTerms | 状态字段名或符号；联合已登记代码值作字面检索，不使用全仓通用词 |
| bindings | file、anchor、role、dimension、values、actions；role 为 writer/policy/query/display/migration/test/compatibility |
| tests | 唯一 id、kind、actions、command 参数数组；每项操作至少 lifecycle 与 negative，其余按风险补 concurrency/idempotency/rollback/query |

每个登记的操作需要 writer 和 policy 来源。已废弃值只允许出现在明确登记的 migration、compatibility、test 边界。每个命中来源与状态值都必须被 binding 覆盖。代码里的相同字符串可能是无关业务，需缩小到正确模块或解释调整契约，不能全局替换。

## 命令与接入

`<plugin>` 为当前已安装插件根，Node 18+。路径是仓库根内的 `/` 相对路径，禁止符号链接与跨仓路径；每文件最多 4 MiB、范围最多 2000 文件，目录应只含文本源码，排除依赖和输出目录。

```text
node <plugin>/scripts/state-contract.js impact --repo <repo> --contract openspec/specs/<module>/state-contract.json --graph graphify-out/graph.json
node <plugin>/scripts/state-contract.js check --repo <repo> --contract openspec/specs/<module>/state-contract.json
node <plugin>/scripts/state-contract.js verify --repo <repo> --contract openspec/specs/<module>/state-contract.json --out openspec/changes/<change>/state-evidence.json
node <plugin>/scripts/state-contract.js check --repo <repo> --contract openspec/specs/<module>/state-contract.json --evidence openspec/changes/<change>/state-evidence.json
```

`impact/check` 不运行命令；无 `--out` 时不写文件。`verify` **实际执行契约的 command**，执行前必须审阅项目命令及授权范围，不能执行来源不可信的附件命令。命令使用参数数组、不经 shell；单命令超时 120 秒、输出上限 1 MiB。Windows 的 `.cmd` 入口需经项目 Node 包装器或 JVM/Maven 明确的可执行入口，不拼 shell 字符串。长集成验证应拆成可独立验收命令；本版本没有超时覆盖选项。

证据记录命令、退出码、输出摘要哈希、输入指纹和检查器摘要，不保存原始输出或环境变量；成功记录遵循 [证据 Schema](../../../state-contract/evidence.schema.json)。失败时在项目自己的日志中定位；不能把命令输出的业务数据复制进证据。状态为 STATIC_PASS 仅代表结构和引用通过；PASS 表示指定命令成功执行且输入未变化；NEEDS_WORK 退出 2，CHECK_ERROR 退出 1。参数及 Schema 错误不得当作“无变化”。

项目选择试点模块后，提交 `.team-standards/state-contracts.json`：

```json
{
  "schemaVersion": 1,
  "contracts": [
    {
      "contract": "openspec/specs/<module>/state-contract.json",
      "evidence": "openspec/changes/<change>/state-evidence.json"
    }
  ]
}
```

现有 `openspec-governance` 的 preflight 检查所有已登记模块的静态契约，record/delivery/archive/CI 检查其当前证据。未登记模块不自动宣称已治理。删除或缩小登记属于治理变更，代码审阅与分支保护必须覆盖该配置；本版本不自动从 Git 历史阻止移除登记。归档移动证据后同步更新路径。

独立 CI 可运行上述 `verify` 再 `check --evidence`，固定插件版本，检出待验收代码。本地 JSON 证据没有签名，不能作为对抗恶意篡改的认证；CI 必须自行执行验证。Hook 可调用相同现有治理入口，但不同宿主是否触发、远端必需检查是否启用，须分别取得运行证据。

## Graphify 与影响审阅

适配器只读取已观察到的 `nodes[].source_file`、`links[].source/target`，关联到 bindings 后输出候选节点和相邻边；不会修改 Graphify，也不把命名推断当成确定业务关系。缺少 Graphify 时返回 UNAVAILABLE，源码字面扫描仍执行。图谱存在时仍标 CANDIDATE，内容哈希只标识版本，不证明新鲜度。按原 Graphify 流程核对生成版本、源码及未提交差异。

impact 输出的命中文件、状态值和 role 可作为当前 change 的影响清单。逐项评审新增来源、共享策略、SQL 等价性、前后端与导出的覆盖；将审阅说明写回现有设计与 validation，避免另建手工代码索引。

## 验证质量与诚实边界

1. lifecycle 测试必须通过真实业务写入入口创建数据，再执行消费者操作；不能只手插与错误实现一致的状态值。negative 测试覆盖禁止路径。夹具示例仅证明检查器机制，不能替代业务项目验收。
2. CI 验证命令应重建本次依赖并测试同一产物；核对实际测试 classpath/制品版本。输入指纹能发现已登记文件变化，**不能证明外部数据库、未登记依赖或旧 JAR 与源码一致**。
3. 字面扫描无法完整解析动态 SQL、生成代码、间接枚举和未知新值；登记、图谱、语义审阅与真实链路测试共同补齐，不能宣称自动穷尽全部消费者。
4. 验证失败不刷新成 PASS；代码、规格、输入文件、命令或检查器改变后重新执行。检查器只读命令执行后的快照，不给“人工填 PASS”入口。
5. 接入验收必须注入旧值判断、遗漏消费者、过期证据三个故障，证明静态或业务检查能阻断，再扩大模块范围。

格式参考 [JSON Schema 2020-12](https://json-schema.org/draft/2020-12)；命令执行采用 [Node child_process 参数数组及无 shell 模式](https://nodejs.org/api/child_process.html)。本协议不是新的业务状态机运行时。
