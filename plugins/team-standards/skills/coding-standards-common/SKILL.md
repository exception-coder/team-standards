---
name: coding-standards-common
description: "Use when writing, reviewing, or modifying source code, explicitly cleaning comments, or handling coding-standard corrections. Provides cross-language structure, naming, errors, testing, comments, and optional maintenance modes."
---

# 跨语言通用编码规范

目标：代码能直接表达业务意图，失败可观察，改动容易理解和验证。共同准则见[工程宪法](../change-readiness/references/engineering-principles.md)；语言特有约束由对应 Skill 补充。

## 判断准则

- 名称表达业务含义；函数与目录围绕稳定职责组织。拆分应减少耦合和理解成本，不能只增加跳转。
- 非显然的约定用有语义的常量、枚举或配置表达；注释补充契约、兼容原因和限制，变更流水归 Git。
- 失败保留必要上下文并交给明确责任边界处理。用户输入及外部返回按实际契约验证，凭据和敏感载荷不得进入诊断输出。
- 新增全局名称、路由、事件、注册键或配置键前查重；调用外部 API 前核对项目版本和官方契约。
- 新测试保护独立风险或尚未覆盖的验收条件。Bug 修复优先复用能复现的用例；不能自动化时说明替代验证。

## 必要约束与完成边界

沿用项目命名、错误处理和目录约定；依赖与业务落点遵循 [DDD-lite](../architecture-ddd-lite-fullstack/SKILL.md)。正确性、相关失败路径和受影响契约有验证依据，注释与行为一致，即可交付。

## 精炼反例

- 函数超过某行数就拆成多层转发：按职责和变化原因判断。
- 捕获异常后返回空列表：保留失败结果，避免把失败当作无数据。
- 为统一判空新增依赖：使用原生能力或项目已有工具。
- 为每条规范新增一个扫描器：检查真实风险和已有覆盖。

## 按需参考

- 写或清理注释：[注释规则](references/comments.md)；明确批量清理时用[注释维护](references/comment-maintenance.md)。
- API、全局注册名与实现检查：[实现细则](references/implementation-checks.md)。
- 测试组织、夹具与检查脚本：[测试资产](references/testing-assets.md)；执行范围归[交付验证](../delivery-verification/SKILL.md)。
- 用户纠正规范：[反馈处理](references/feedback.md)。
