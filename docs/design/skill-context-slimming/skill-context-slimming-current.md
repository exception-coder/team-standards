# Skill 上下文瘦身设计

## 目标

降低 `team-standards` 与 `yoooni-daily-plugin` 的常驻 Skill 元数据和触发放大，同时保持第一阶段的 Skill 名称、能力范围与外部调用方式兼容。

## 范围

- 压缩两个插件全部 Skill 的 `description`，只保留准确的正向触发条件与关键排除条件。
- 删除 `description` 中对其他 Skill 的强制调用和流程实现说明，跨 Skill 顺序继续由入口规范与正文维护。
- 将四个超大 Skill 的详细模板、示例和速查内容下沉到 `references/`，主 `SKILL.md` 保留触发、核心流程、硬门禁与引用路由。
- 修正 `yoooni-daily-plugin` manifest 中过期的 Skill 数量与能力描述。

## 非目标

- 本阶段不删除、合并或重命名 Skill。
- 不改变业务开发门禁的最终约束。
- 不调整 hooks、自动提交策略或知识库目录协议。

## 兼容策略

现有 Skill 名称、目录及模板路径保持不变。迁移到 `references/` 的内容必须由主 `SKILL.md` 直接链接，并明确何时读取，避免深层引用。

## 硬规则可达性

- 上下文瘦身只能降低默认加载量，不能删除硬门禁或让规则失去可达路径。
- `rules/` 与 `references/` 下的 Markdown 必须能从主 `SKILL.md` 的链接图到达；允许通过一层已链接文档继续路由，但禁止依赖 Agent 自行遍历目录。
- 主入口必须写明读取条件。涉及巨型文件、既有 Service 扩展、跨 feature 引用或跨分支编排时，架构 Skill 必须读取结构质量门禁。
- CI 的 Skill audit 对不可达规则报错，防止“文件仍在仓库，所以规则仍有效”的错误判断。

## 架构机械兜底

语义判断仍由架构 Skill 负责；低误报、可客观判定的新增依赖由 Hook 阻断：

- `tool-*` Maven 模块不得新增对另一个 `tool-*` 的直接依赖。
- 前端 feature 跨模块只能引用对方 `public-api`，不得引用内部组件、hook、store 或 API 文件。
- 源码文件超过默认 500 行后继续增加有效代码时提醒拆分；该项为启发式软提醒，不阻断紧急修复。

## 验证

- 校验全部 Skill frontmatter 可解析且名称与目录一致。
- 运行交叉引用、版本同步、AGENTS 同步和 Skill audit。
- 对比修改前后的 Skill 数量、description 字符数、四个主文件行数及引用完整性。
- 构造跨工具依赖、跨 feature 内部引用、合法 `public-api` 和巨型文件增长用例，验证硬阻断与软提醒分级。
