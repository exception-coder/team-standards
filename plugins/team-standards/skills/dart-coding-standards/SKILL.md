---
name: dart-coding-standards
description: Use when writing, reviewing, or modifying Dart or Flutter code. Supplements common coding rules with precise numeric types and TODO conventions; does not require generated API documentation or a special documentation-comment format.
---

# Dart、Flutter 编码规范

## 适用与注释边界

Dart、Flutter 编码叠加 [coding-standards-common](../coding-standards-common/SKILL.md) 和项目自身规则。本 Skill 只补充下面的专属约束。

不要求 dartdoc、生成 API 文档或统一使用 `///`；不要求首句摘要、标识符链接或公开/私有成员的专用文档格式。必要注释按 [通用注释规范](../coding-standards-common/references/comments.md) 说明当前职责与非显然约束，不因本次规则调整批量删除或转换现有注释。

---

## TODO 格式

- 使用 `// TODO(负责人): 原因`，负责人和原因必填，不带日期；`FIXME` 同理。
- 能用任务跟踪的优先记录任务，不把 TODO 长期留在源码。

```dart
// TODO(zhangkai): 等多次部分退款上线后支持金额累加
```

---

## 精确数值

金额、数量等需要精确计算的值不使用 `double`，使用 `int`（明确单位，如分）或项目采用的 `Decimal`。项目需要更严格的架构扫描时，在项目内声明并执行。

```dart
final int priceInCents = 1250;
```
