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

## 验证

- 校验全部 Skill frontmatter 可解析且名称与目录一致。
- 运行交叉引用、版本同步、AGENTS 同步和 Skill audit。
- 对比修改前后的 Skill 数量、description 字符数、四个主文件行数及引用完整性。

