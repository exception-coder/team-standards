---
name: code-orientation-reference
description: "Internal implementation-orientation rules loaded by change-readiness; reuse current evidence and verify precise code locations before editing."
---

# 实施前代码定位

## 核心原则

复用当前任务已有证据，确认将要修改的文件、符号、调用方与约束。定位不要求先写独立 Bug 文档，也不要求把类名和行号抄成固定表格。

## 定位步骤

1. **确定来源。** 使用当前会话已验证的诊断坐标、新鲜 Graphify、相关 OpenSpec change 或已有设计/问题记录。设计依据仍由 change-readiness 决定；会话坐标不能绕过 OpenSpec 或设计要求。
2. **检查新鲜度。** 对照 Git HEAD 和工作区改动，确认坐标指向当前实现。行号只用于导航，代码可能移动；以真实文件和符号为准，不能凭记忆填写。
3. **补齐必要缺口。** 已有可靠坐标时直接读取目标附近代码；缺失、过期或引用不符时用定向搜索补齐，不重复扫描整库。按项目语言引用函数、组件或配置，不强制使用 Java 全类名。
4. **核对修改边界。** 确认入口、受影响调用方、关键条件和相关测试。涉及后端事实时按 backend-evidence 取证，不把代码推断当成数据库或业务真理。
5. **简短回显后实施。** 说明关键文件或符号、修改目的和必须保持的约束；简单 Bug 可用几句话，不为定位另建报告、索引或 Mermaid 图。

## 与 Bug 流程的衔接

bug-doc-required 提供诊断证据，change-readiness 判断实施准备，本参考核实当前代码位置。修复后由 delivery-verification 验证，再按 git-commit-standards 同步受影响说明并提交。问题记录存在时直接复用，不因其缺失而要求简单 Bug 补文档。
