---
name: bugfix-coding-style
description: "Use when applying any bug fix, alignment correction, redundant-code removal, OR adding missing logic to align with upstream/cloud during integration/联调 phase. Trigger when: (1) design-doc-required has routed the change to 「第四·五步：轻量修订流水」 branch, (2) user describes the change as 'fix bug', 'align with cloud/upstream', 'add missing piece', '修 bug', '对齐云端', '删冗余', '修正实现', '改回正确逻辑', '补上漏掉的逻辑', '补缺漏', or (3) about to Edit/Write source code with intent of replacing existing erroneous logic OR adding alignment code that was missed in previous iterations. Forbids in-source change-log comments and commented-out legacy code; requires WHY-only inline comments and pushes structural explanations into method/class doc comments."
---

# Bug 修复 / 联调期编码风格

> **本 skill 自 v1.17.0 起方向反转：禁止把变更历史写进代码内部，禁止保留注释式旧代码。** 之前版本要求的 `[DEPRECATED YYYY-MM-DD]` / `[ADDED YYYY-MM-DD]` / 注释保留旧代码段全部废止。变更历史归 git log / commit message / bug 文档 / 设计文档管，不入源码。

## 核心原则

**代码内只保留对当下读者有意义的"WHY 注释"，禁止任何形式的变更历史叙事。** 修改/替换/删除已有代码时直接覆盖，不留旧代码副本；新增对齐补丁时直接添加，不打补丁标记。

| 类型 | 处理方式 |
|------|---------|
| 修改/替换/删除已有代码 | 直接改写。不要 `//` 注释保留旧实现，不要写 `[DEPRECATED]`/`[BUGFIX]`/`[FIXED YYYY-MM-DD]` 等标记。 |
| 新增之前缺漏的对齐代码 | 直接添加。不要写 `[ADDED YYYY-MM-DD]`、不要写"对齐云端 XX 第 N 行"作为头注释，不要引用调整流水编号。 |
| 必要的 WHY 注释 | **优先上提到方法 / 类的 doc comment**；只有当某行本身的逻辑非显然且无法在方法 doc 里讲清时，才在该行加单行注释。 |

## 为什么反向

| 旧规则的初衷 | 实际产生的问题 |
|-------------|---------------|
| 留对照证据方便快速回滚 | git 本身就是回滚锚点，注释段反而和实际代码脱节、容易腐烂 |
| code review 看"改了什么、为什么" | review 看 PR diff 即可；commit message + bug 文档讲"为什么"更准确 |
| 跨端联调时直接指原代码作凭据 | 联调结论应沉淀到 bug 文档 / 设计文档，不应靠源码注释当临时白板 |
| 让代码"留下故事" | 故事归 git history。源码每多一行噪声注释，下个读者多一份认知负担 |

## 红线（任何情况下都不得出现在源码中）

| 反例 | 原因 |
|------|------|
| `// [BUGFIX 2026-04-30] 旧实现用 transaction_no 反查...` | 变更日期/原因属于 git log，不属于代码 |
| `// [DEPRECATED 2026-04-25] 这段以前是 X，现在改成 Y` | 完全属于 commit message |
| `// [ADDED 2026-04-25] 对齐云端 RefundServiceImpl#handleX（L1063-1070）` | 对齐依据应放方法 doc comment 的"对齐云端"段（不带日期），或写进设计/bug 文档 |
| 大段被 `//` 注释的旧代码 | 增加噪声、容易腐烂、git 已经留底 |
| `// 详见 v6 调整流水 2026-04-25 条目` | 引用易失效；让读者跳到外部文档才能理解的代码不合格 |
| `// PR #1234 / Issue #56 / Linear ticket KP-789` | 同上 |
| `// TODO(zhangkai 2026-04): 这里以后再优化` | 带个人/日期的 TODO 也是噪声；要 TODO 就匿名写"待优化原因"，但更应该开任务 |

## 推荐写法（WHY 注释只放有当下价值的）

允许且鼓励的注释形式：

| 类型 | 例子 | 摆放位置 |
|------|------|---------|
| 方法/类承担的隐藏不变式 | "字段映射约定：POS 回调 outTradeNO 对应本地 out_trade_no 而非 transaction_no" | 方法/类 doc comment |
| 与外部系统的字段语义对齐 | "对齐云端 PayV1ServiceImpl#refundOrderNotifyForKpayOffline" | 类 doc comment（不带日期/版本） |
| 单行非显然的业务约束 | `// 加 ±0.005 浮点容差是为了让前端 toFixed(2) 与 Rust BigDecimal 的尾差不报错` | 该行上方 |
| 对易误解参数的语义说明 | `/// [businessDate] 营业日（不一定等于 createTime 的日期）` | 参数 doc tag |

判断准绳：**删掉这条注释，下一个改这段代码的人会不会犯错？** 会则保留，不会则删。

## A vs B 不再区分

旧规则的 A 类（DEPRECATED）/ B 类（ADDED）已废止。不论是修改还是新增，写法都一样：直接改、不留痕迹。需要解释 WHY 时，按上节"推荐写法"上提到 doc comment。

## 摆放位置

```dart
/// 按 POS 回调的 outTradeNO 反查退款流水。
///
/// 字段映射约定：POS 回调字段 outTradeNO 对应本地 `order_transaction.out_trade_no`，
/// **不是** `transaction_no`（那是本地系统流水号 RTX/T...）。退款场景下两者必然不同。
///
/// 命中行须满足 `refund_flag=1`，确保只匹配退款流水而非原支付流水。
Future<RefundCallbackLookupResult?> lookupByOutTradeNo(String outTradeNo) async {
  // Step 1: 退款流水
  final transaction = await (db.select(db.orderTransaction)
        ..where((t) =>
            t.outTradeNo.equals(outTradeNo) &
            t.refundFlag.equals(1) &
            t.deleted.equals(0))
        ..limit(1))
      .getSingleOrNull();
  // ...
}
```

对照反例：

```dart
// ❌ 禁止：变更日志、deprecated 旧代码、引用文档
//
// [BUGFIX 2026-04-30] 旧实现用 transaction_no 反查，原支付场景因 transaction_no
// 与 out_trade_no 同值（均为 T...）而凑巧命中；退款场景导致全部反查未命中。
// 详见 v6 调整流水 2026-04-30 条目。
// final transaction = await (db.select(db.orderTransaction)
//       ..where((t) => t.transactionNo.equals(outTradeNo) & t.deleted.equals(0))
//       ..limit(1))
//     .getSingleOrNull();
final transaction = await ...; // 新代码
```

## 适用范围

| 场景 | 是否适用 | 处理方式 |
|------|---------|---------|
| 联调期 bug 修复 | ✅ | 直接改写，逻辑说明上提方法 doc |
| 删除明确无效的 if/else 分支 | ✅ | 直接删，不留注释 |
| 方法体内逻辑修正（不改签名） | ✅ | 直接改 |
| 补上原本缺漏的对齐代码 | ✅ | 直接加，无需 ADDED 标记 |
| 新功能开发 | ✅ | 同样适用本规范 |
| 纯重命名 / IDE refactor | ✅ | 直接改 |
| 测试代码 / 配置文件 | ✅ | 直接改 |

本 skill 现在适用于**所有源码改动**，不再局限于轻量修订流水。

## 遇到旧的 [DEPRECATED] / [ADDED] 注释怎么办

旧版本（v1.16 及以前）按规范留下的标记注释，**编辑同一段代码时可顺手清理**：

- A 类（`[DEPRECATED]` + 注释保留的旧代码）：删除整段（头注释 + 旧代码）
- B 类（`[ADDED]` 头注释 + 实际代码）：删除头注释，**保留代码本身**

这与旧版"AI 永不主动删除带标记注释"规则相反 —— 因为新规范本身就要求源码内不留这类注释。但仅限于"刚好在改这段代码"时顺手做，不必专开 PR 全仓清理。

## 与其他 Skill 的协作

| Skill | 关系 |
|-------|------|
| `design-doc-required` 第四·五步 | 走轻量修订流水分支时，代码改动遵循本 skill（直接改，不留变更日志） |
| `coding-violation-log` | 用户若纠正本 skill 的执行（如又写了 BUGFIX 标记），由 coding-violation-log 登记 |
| `git-commit-standards` | 变更原因写进 commit message body（中文 body），不入源码 |
| `bug-doc-required` | bug 文档保留完整根因/修复历史；源码不重复这些信息 |

## 红色警告

| 想法 | 正确处理 |
|------|----------|
| "删了改不回去" | git revert 一条命令的事；源码里堆 deprecated 注释才是不可靠的回滚机制 |
| "Reviewer 看不懂为什么改" | 写在 commit message body / PR description / bug 文档里 |
| "我加了 [ADDED 日期] 显得有交代" | 是噪声不是交代；把对齐依据上提到方法 doc 的"对齐云端"段（不带日期） |
| "这段代码以前 bug 过，警示后人" | 加测试用例覆盖、写进 bug 文档；不在源码注释里复述故事 |
| "TODO 想标个日期方便回头查" | 别。开 issue / 任务卡，源码里只留"为什么这里需要 TODO"的内容（且更应避免） |
| "用户没说要清理，那就保留旧 DEPRECATED" | 错。本 skill v1.17 起规则反转，遇到就可以顺手清（限改同一段代码时） |
