---
name: coding-standards-common
description: Use when writing, reviewing, or modifying source code in any language. Provides cross-language rules for structure, naming, scope, errors, duplication, testing, and comments.
---

# 跨语言通用编码规范

## 七条铁律

1. 名称表达业务含义，避免模糊缩写和无边界的 `util/helper/manager`。
2. 函数保持单一职责；函数体超过 80 行必须按业务步骤拆分，不以私有/遗留代码为豁免；不同业务场景的分支差异明显时拆分 focused function/service。
3. 依赖保持单向，业务层不反向依赖 UI、协议或基础设施实现。
4. 消除魔法值，用有语义的常量、枚举或配置表达约定。
5. 注释解释职责、契约和非显然 WHY，不记录版本历史或修改过程。
6. 异常不可静默；保留上下文并提供可观察的失败结果。
7. 删除冗余前先区分“重复知识”和“重复逻辑”，复用项目已有公共能力。

## 渐进读取

- 写或清理注释时，读取 [references/comments.md](references/comments.md)。
- 处理复用、外部 API、全局注册名或复杂自检时，读取 [references/implementation-checks.md](references/implementation-checks.md)。
- 语言特有规则由对应语言 Skill 提供，不在这里重复。

## 基础要求

- 修改范围聚焦当前任务，不夹带无关重构。
- 新代码沿用项目已确认的命名、目录和错误处理约定，但不复制明显反模式。
- 外部 API 或不熟悉的库先查项目依赖和官方契约，不凭记忆臆造。
- 新增全局名称、路由、事件、注册键或配置键前先查重。
- 为核心分支、失败路径和边界条件提供与风险相称的验证。
- 新增业务用例至少验证成功、失败和边界路径；修复 Bug 先补可复现的回归测试，无法自动化时明确记录替代验证及原因。

## 完成前自检

- 名称是否能独立说明职责？
- 函数是否混合多个业务动作或场景？
- 函数体是否超过 80 行，参数是否超过 4 个，嵌套是否超过 3 层？
- 是否引入反向依赖、魔法值、静默异常或重复规则？
- 注释是否短、准确且没有历史叙事？
- 是否复用了已有能力并验证了关键路径？
