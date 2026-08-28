---
name: domain-spec-mining-reference
description: "Internal evidence-based domain specification rules loaded by backend-evidence."
---

# 对象中心领域规格挖掘门禁

## 定位

把代码、DDL、Graphify 影响查询和运行记录转成**有证据的候选规格**，防止 AI 以“接口成功”代替业务终态和下一动作。Graphify 负责静态事实，本门禁编排 `project-domain-knowledge` 的 `spec-mining` CLI；不重复实现挖掘算法。

## 证据等级

| 等级 | 含义 | 可否直接作为业务真理 |
|---|---|---|
| `observed` | 代码、DDL、SQL、日志或数据库变化可直接定位的事实 | 否，只证明当前实现或运行行为 |
| `inferred` | 确定性算法基于多个 observed 事实生成的关系、迁移或不变量 | 否 |
| `candidate` | AI 补充语义名称、边界和冲突解释后的待确认规格 | 否 |
| `confirmed` | 业务 owner 核对证据并通过正常评审的规格 | 是 |

禁止把任一级自动跳成 `confirmed`。`promote` 最多生成 `stability: draft`。

## 执行流程

1. **先查已有规格**
   - 用 domain-knowledge MCP 查询稳定知识点。
   - 用 `list_spec_candidates` 查询当前模块候选和冲突；需要细节时只对目标 ID 调 `get_spec_candidate`。
2. **定义对象边界**
   - 列出本次操作涉及的业务对象、对象 ID、状态字段、旧关联和下一动作。
   - 字段语义不清时回到 DDL、Graphify 读写点和定向源码，不凭字段名猜。
3. **补证据缺口**
   - 静态事实：复用新鲜 Graphify `graph.json`、DDL 基线和必要的定向源码核查。
   - 运行事实：使用已授权的审计日志、历史表、CDC 导出、API 轨迹或测试前后快照。
   - 只允许只读采集；对象 ID 默认哈希，状态字段使用白名单。
4. **运行确定性挖掘**

   ```bash
   npm run spec-mine -- init --project <project> --module <module> --events <events.jsonl> --graph <graph.json>
   npm run spec-mine -- mine --config <spec-mining.config.json>
   ```

   从已配置的 domain-knowledge MCP 启动路径或团队工具工作区定位 `project-domain-knowledge`。找不到 CLI 或没有运行证据时，明确列出缺口；禁止由 LLM 伪造挖掘结果。
5. **审查候选和冲突**
   - 逐条核对 `support`、`counterexamples`、`confidence` 和 `evidenceRefs`。
   - 候选证据版本变化时，旧评审视为过期，必须基于新证据重新确认。
   - 同一字段兼具当前状态和历史追溯语义、同一动作出现多个目标状态、或存在反例时，必须先解决冲突。
6. **形成编码前闭环合同**
   - 操作前后对象状态表。
   - 建立和解除的关联清单。
   - 事务失败与重复操作行为。
   - 数据库终态断言。
   - 至少一个下一业务动作验证。
7. **人工门禁**
   - 设计可由用户确认后进入编码。
   - 候选是否进入公共知识库必须另走 `review` / `promote` 和 owner 评审，不能把“允许编码”误当“业务真理已稳定化”。

## 可以跳过挖掘的情况

- 纯展示、文案、样式或不改变业务对象状态的极简修改。
- 已有 `confirmed` 规格完整覆盖对象、迁移、不变量、失败行为和下一动作，且本次证据没有冲突。

跳过挖掘不等于跳过设计、反向影响分析或测试。

## 编码前输出

```text
对象：...
已验证事实：...
基于证据的推断：...
待确认候选：...
冲突/反例：...
操作前 → 操作后：...
解除/建立关联：...
失败与幂等：...
数据库终态：...
下一业务动作：...
```

缺少对象终态、旧关联解除或下一动作中的任一项，不得把规格判为闭环。
