# team-standards / design 文档索引

## Hook 命中事件本地登记

- 文件：`hook-event-logging.md`
- 编码摘要：`codex-plugin-reliability-hardening/codex-plugin-reliability-hardening-coding.md` 第 12 节
- 摘要：定义独立插件共同遵守的 Hook Event v1 生产、兼容消费和跨仓防漂移契约。
- 大纲：背景与目标 / 设计原则 / 整体架构 / Hook Event v1 契约 / 关键交互 / 接入与下游 / 验证要点

## SQL 正确性与性能门禁

- 文件：`sql-performance-guard/sql-performance-guard-current.md`
- 编码摘要：`sql-performance-guard/sql-performance-guard-coding.md`
- 摘要：用 DDL、字段限定、真实数据库、Mapper 契约、性能证据和制品 SHA 共同治理 AI 生成 SQL。
- 大纲：目标与边界 / 整体架构 / 模块职责 / 正确性与性能规则 / 验证证据 / 编码落点 / 风险与回滚 / 验收标准

## Frontend Excellence Skill

- 文件：`frontend-excellence/frontend-excellence-current.md`
- 编码摘要：`frontend-excellence/frontend-excellence-coding.md`
- 摘要：维护产品级前端工程 Skill，在既有分层规范上补齐设计系统、人工视觉判断、可恢复交互状态、响应式、可访问性与真实浏览器验收。
- 大纲：目标与边界 / 整体架构 / 模块拆分与职责 / 关键交互 / 核心规则 / 编码落点 / 数据与依赖变更 / 风险与待确认 / 验证要点

## Skill 上下文瘦身

- 文件：`skill-context-slimming/skill-context-slimming-current.md`
- 编码摘要：`skill-context-slimming/skill-context-slimming-coding.md`
- 摘要：压缩两个团队插件的 Skill 常驻描述，并将超大 Skill 改为渐进披露结构。
- 大纲：目标 / 范围 / 非目标 / 兼容策略 / 硬规则可达性 / 架构机械兜底 / 验证

## Codex 插件可靠性加固

- 文件：`codex-plugin-reliability-hardening/codex-plugin-reliability-hardening-current.md`
- 编码摘要：`codex-plugin-reliability-hardening/codex-plugin-reliability-hardening-coding.md`
- 摘要：统一 Claude Code 与 Codex Hook 输入契约，收紧安全默认值，并建立隔离安装、共享契约、性能预算和可重复发布闭环。
- 大纲：目标与边界 / 整体架构 / 模块职责 / 核心规则 / 第一轮实施结果 / 第二轮架构 / 安全边界 / 验收标准 / 第二轮实施结果 / 运行载荷版本门禁 / 第三轮共享 Hook 契约收敛 / 第三轮关键交互
