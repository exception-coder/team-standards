# Dashboard Spec 最小契约

## 1. 何时采用

多图组合、指标复用或前后端交接时使用，复用项目已有类型与设计载体。这里定义设计信息，不假定已有运行时解释器；不为普通页面建设通用 DSL。

## 2. 必要信息

| 层级 | 需要表达的事实 |
|---|---|
| 页面上下文 | 对象、受众、决策问题、权限与数据范围、时区、更新时间、默认过滤及时间语义 |
| 指标 | ID、业务名称、单位、来源引用、对象粒度/去重键、公式、排除条件、分子分母、零/空行为 |
| 洞察 | 指标引用、事实证据、结论、数据限制、业务优先级、可行动入口；未验证结论用假设标识 |
| 展示 | 区域、图表类型或无图、选图原因、维度、排序、尺度、状态语义色、格式、回退、文本替代 |
| 交互 | 筛选作用域、钻取目标与参数、重置、权限、加载/空/失败/过期状态 |
| 验收 | 同口径对账方法、重要边界、浏览器视口与实际完成的证据 |

指标引用必须可以追溯到真实计算，组件不能自己猜公式。运行时动态规格确有需求时才定义 schema 和白名单验证；拒绝任意代码、SQL、HTML 或未授权路由，未知组件安全降级。数值聚合与权限由可信服务或现有计算层落实。

## 3. 示例片段

以下为设计草案，字段引用需映射实际项目；没有真实数据值，也不假定明细路由已实现。

```yaml
dashboard:
  object: GarmentSample
  audience: 样衣管理员
  question: 哪些有效样衣当前需要处理
  evidence_status: design_only
  time_semantics: 当前快照；期间新增按创建事件统计
  sections:
    - id: attention
      title: 需要关注
      components:
        - id: overdue_borrows
          type: alert_list
          metric_ref: active_overdue_borrow_count
          reason: 优先处理已逾期且仍有效的未归还借用实例
          required_evidence:
            - 借用实例标识、适用截止时间、当前状态和取消豁免规则
          drilldown:
            status: requires_existing_route_binding
            preserve_filters: true
          fallback:
            missing_contract: 暂不展示数值，提示口径待核实
            no_permission: 显示权限状态
            query_error: 保留筛选并提供重试
    - id: stock
      title: 当前样衣状态
      components:
        - id: lifecycle_distribution
          type: horizontal_bar
          metric_ref: effective_sample_count_by_status
          dimension: lifecycle_status
          reason: 直接比较各状态数量并进入相应明细
          order: verified_business_order
          unknown_status: 单独展示
          accessible_alternative: 同口径状态数量表
  omitted:
    - candidate: 历史在库趋势
      reason: 当前尚无历史快照或可重建状态的事件证据
```

## 4. 候选可视化清单

用于明确要求看板优化或图表化改造时的实施前决策。以下仅展示决策方式，不能直接当作项目事实；实际填写当前口径、来源与最终采用结果。

| 指标/业务问题 | 现有表达 | 候选表达 | 证据与限制 | 最终决策及原因 |
|---|---|---|---|---|
| 按期与延误占比 | 数字卡 | 100% 堆叠条、数字卡 | 需证明同一总体、互斥且穷尽，未知类别单列 | 条件成立时采用堆叠条，便于读出构成；不成立则保留数字并说明范围 |
| 各节点耗时 | 明细数字 | 横向条形、表格 | 同单位、可比统计量与可靠时间依据 | 条件成立时采用横条，按流程顺序呈现；精确值保留文本 |
| 多种风险标签 | 标签计数 | 横条、饼图 | 同一对象可有多个标签 | 不用饼图，采用独立计数横条或行动明细，避免暗示互斥份额 |
| 历史变化 | 当前快照 | 折线、摘要 | 缺少历史序列 | 不画趋势图，保留当前摘要并标明历史证据缺口 |

每项最终决策只填写本项目实际选择；表中的条件分支是示例，不是已完成的决策。没有改变图表时，实施前简要说明为何候选不足以改善业务阅读，以及此次实际优化范围。交付时补上实际结果、变更原因和视觉证据引用，复用原清单。
