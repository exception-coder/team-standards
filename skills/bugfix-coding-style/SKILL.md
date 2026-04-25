---
name: bugfix-coding-style
description: "Use when applying any bug fix, alignment correction, redundant-code removal, OR adding missing logic to align with upstream/cloud during integration/联调 phase. Trigger when: (1) design-doc-required has routed the change to 「第四·五步：轻量修订流水」 branch, (2) user describes the change as 'fix bug', 'align with cloud/upstream', 'add missing piece', '修 bug', '对齐云端', '删冗余', '修正实现', '改回正确逻辑', '补上漏掉的逻辑', '补缺漏', or (3) about to Edit/Write source code with intent of replacing existing erroneous logic OR adding alignment code that was missed in previous iterations. Two distinct sub-rules: (A) modifying/replacing existing code → comment-out-then-append; (B) adding pure new code that was missing → tag with `[ADDED YYYY-MM-DD]` header comment."
---

# 联调期 Bug 修复编码风格

## 核心原则

**联调期代码改动必须留下「为什么改」「原代码长什么样 / 为什么以前没有」的对照证据，禁止直接删除或无声新增。** 改动按性质分两类，分别有强制注释规范：

| 改动性质 | 处理方式 | 注释标记 |
|---------|---------|---------|
| **A. 修改/替换/删除**已有错误代码 | 先 `//` 注释保留旧代码，紧接着追加新代码 | `[DEPRECATED YYYY-MM-DD]` |
| **B. 新增**之前缺漏的对齐/补丁代码（无原代码可注释） | 直接添加新代码，但**必须**在新增代码块上方加头注释 | `[ADDED YYYY-MM-DD]` |

理由：联调期代码尚未稳定，留对照证据可作为：

- 快速回滚锚点（A 类注释一行恢复 / B 类删一段恢复）
- code review 时的对照参照（reviewer 一眼看出"改了什么、为什么"或"为什么这里要新加一段"）
- 跨端联调时的对话凭据（前后端讨论行为差异时直接指原代码或对齐依据）

直接删除/无声新增会让上述三件事都困难，要么靠 git blame 跨多个 commit 翻历史，要么靠记忆复原，都不可靠。

---

## 适用范围

| 场景 | 是否适用 | 改动类型 | 处理方式 |
|------|---------|---------|---------|
| **联调期 bug 修复**（与云端/规范/上游不一致的修正） | ✅ 适用 | A | 注释保留 + 追加新代码 |
| **删除明确无效的 if/else 分支** | ✅ 适用 | A | 注释保留整段 |
| **方法体内逻辑修正**（不改签名） | ✅ 适用 | A | 注释保留原行 |
| **补上原本缺漏的对齐代码**（如云端有、本地没搬过来） | ✅ 适用 | **B** | 加 `[ADDED]` 头注释 + 直接添加 |
| **修复时同时做 A+B**（既删旧错误又补新缺漏） | ✅ 适用 | A+B | 两套规范分别应用，互不混淆 |
| **新功能开发**（design-doc-required 走 vN+1） | ❌ 不适用 | — | 按新版本完整实现，不保留旧逻辑注释 |
| **纯重命名 / IDE refactor**（变量名、import 排序） | ❌ 不适用 | — | 直接改 |
| **测试代码 / 配置文件** | ❌ 不适用 | — | 直接改 |
| **commit 已合并主干、确认稳定后的清理** | ❌ 不适用 | — | 由用户在 review 时主动要求 AI 清理 |

---

## 注释格式规范

### A 类：注释保留旧代码（修改/替换/删除）

每段注释保留的旧代码，必须配套一段头注释，包含三要素：

1. **`[DEPRECATED YYYY-MM-DD]`** 标记 + 改动日期
2. **替代逻辑摘要**（一句话说明新逻辑做了什么）
3. **变更原因 + 引用文档**（指向调整流水 / bug 文档 / 设计文档某条目）

#### A 类标准模板

```dart
// [DEPRECATED 2026-04-25] selectedServices 直接采用前端传值，不再覆盖
// 原逻辑（保留待联调验证后由确认人移除）：与云端 RefundServiceImpl#calculateRefundPrice 不一致，
// 会强制塞入 DB 全量服务费 ID，导致前端"勾选/取消勾选服务费"算价结果完全相同。
// 详见 v6 调整流水 2026-04-25 条目。
// if (serviceFeeData.isNotEmpty) {
//   selectedOption['selectedServices'] = serviceFeeData
//       .map((f) => f['serviceFeeManagementId'] as int)
//       .toList();
// }
```

### B 类：纯新增缺漏代码（无原代码可注释）

新增代码块上方必须加头注释，包含三要素：

1. **`[ADDED YYYY-MM-DD]`** 标记 + 改动日期
2. **新增逻辑摘要**（一句话说明这段代码做了什么）
3. **缺漏原因 + 对齐依据**（为什么之前没有 / 对齐哪个上游接口 / 引用文档）

#### B 类标准模板

```dart
// [ADDED 2026-04-25] 算价后按 selectedTip 修正 refundAmount，对齐云端
// RefundServiceImpl#handleCalculateAfterRefundResponse（L1063-1070）。
// Rust 算价时 tipAmount 不参与分摊，返回的 posOrder.payAmount 不含小费；
// 必须在外层按 selectedTip 决定是否把 tipAmount 加到 refundAmount 里，否则
// 前端"勾选/取消勾选小费"算价结果完全相同。详见 v6 调整流水 2026-04-25 第二条。
final data = resultJson['data'] as Map<String, dynamic>?;
if (data != null) {
  final selectedTipFinal = selectedOption['selectedTip'] == true;
  final outPosOrder = data['posOrder'] as Map<String, dynamic>?;
  final payAmount = (outPosOrder?['payAmount'] as num?)?.toDouble() ?? 0;
  final outTipAmount = (outPosOrder?['tipAmount'] as num?)?.toDouble() ?? 0;
  data['refundAmount'] = selectedTipFinal ? payAmount + outTipAmount : payAmount;
  data['tipAmount'] = outTipAmount;
}
```

### A vs B 判定速查

| 问题 | A 类 | B 类 |
|------|------|------|
| 原文件这段位置有无错误代码可指？ | 有 | 无（纯空白/缺漏） |
| diff 看到的是什么？ | 删除 + 新增 / 全是注释行 | 纯新增 |
| reviewer 第一眼疑问 | "为什么这样改？" | "为什么这里要加？以前没有合理吗？" |
| 头注释要回答的核心问题 | "新逻辑替代了什么、为什么替代" | "之前为什么没有、现在为什么必须加" |

### 各语言对应注释符

| 语言 | 行注释 | 块注释（多行旧代码可用） |
|------|--------|----------------------|
| Dart / Java / Kotlin / TS / JS | `//` | `/* ... */` |
| Python | `#` | `""" ... """` 或多行 `#` |
| SQL | `--` | `/* ... */` |
| YAML / Bash | `#` | 仅多行 `#` |

**优先用行注释**（每行一个 `//`），不用块注释 —— 行注释每行独立，IDE 折叠/搜索更友好。

---

## 摆放位置

新代码与注释保留的旧代码的相对位置：

```dart
// 新逻辑放在前面（执行路径上）
final selectedOption = _initCalculateSelectedOption(rawSelectedOption);

// [DEPRECATED 2026-04-25] ...（注释保留旧代码紧跟在新代码后）
// if (serviceFeeData.isNotEmpty) { ... }
```

**禁止把注释保留的旧代码放在新逻辑前**（视觉上让 reviewer 误以为旧逻辑还会执行）。

---

## 移除时机

**AI 永远不主动删除带标记的注释/头注释。** 必须由用户明确指令才能清理。A 类（DEPRECATED）和 B 类（ADDED）的清理范围不同：

| 触发指令 | A 类（DEPRECATED） | B 类（ADDED） |
|---------|-------------------|--------------|
| "可以删了"、"清理一下" | 删除注释段（旧代码连同头注释一起删） | **保留代码本身**，仅删除头注释 |
| "移除 DEPRECATED" | 仅清理 A 类 | 不动 |
| "移除 ADDED" / "去掉新增标记" | 不动 | 仅清理 B 类头注释 |
| "全部清理" | 两类都清理 | 两类都清理 |
| "这次 commit 把注释也删了" | commit 前先清理，再提交 | 同左 |
| 无明确指令 | 保留 | 保留 |

**红线：** 即使 AI 在后续编辑同一段代码时，也不能"顺手"删除带 `[DEPRECATED]` / `[ADDED]` 的注释 —— 哪怕注释看起来"已经过时很久"。

---

## 与其他 Skill 的协作

| Skill | 关系 |
|-------|------|
| `design-doc-required` 第四·五步 | 走轻量修订流水分支时，代码改动必须遵循本 skill |
| `coding-violation-log` | 用户若纠正本 skill 的执行（如忘记保留注释），由 coding-violation-log 登记 |
| `git-commit-standards` | commit message 不必专门描述"保留了注释代码"，diff 自身可见 |

---

## 红色警告

| 想法 | 正确处理 |
|------|----------|
| "改动很小，删了更干净" | 联调期就是要"不干净"地保留对照，干净留给主干 |
| "git diff 能看到旧代码" | diff 看的是改了什么，注释看的是"为什么改"和"原代码长啥样"，两者互补 |
| "纯新增不需要注释" | ❌ 错。B 类必须加 `[ADDED]` 头注释，否则 reviewer 无法判断"这段以前为什么没有、现在为什么必须加"，commit 信息也讲不清 |
| "用户没说要保留注释" | 默认就是保留，用户说删才删 |
| "重新编辑这段代码时顺手清理" | 禁止。带 `[DEPRECATED]` / `[ADDED]` 标记的注释只能由用户明确指令删除 |
| "新功能开发也用这套" | 新功能走 vN+1 完整实现，不保留旧逻辑注释、也不加 `[ADDED]` 标记 |
| "B 类清理时把代码也删了" | ❌ 错。B 类清理只删头注释，代码本身是新增的对齐补丁，必须保留 |
