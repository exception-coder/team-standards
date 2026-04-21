# korepos-backend-service 待办

本 skill 当前仅实现三层防线的**第 2 层（双向引用）+ 第 3 层（软约束）**。第 1 层（契约测试硬闸）尚未落地，是长期防止 DTO 与 UI 对接手册漂移的**唯一可靠手段** —— 人手在 IDE 里直接改代码时，双向引用与软约束都拦不住。

## 待办项

### [ ] 契约测试硬闸（P0，推荐尽快落地）

**目标**：一个 Dart 单测，自动比对 UI 对接手册 §4 字段表与对应 freezed DTO 的字段 schema，不一致就 fail；挂 CI。

**范围**：korepos-refund / korepos 主工程中所有 `lib/features/{module}/backend/dto/**/*.dart`。

**实现要点**：

- **手册侧解析**：扫 `docs/{模块}/{模块}-UI对接手册-*.md`，regex 抽 §4.N 小节下的 `**入参**` / `**出参 `data`**` 表格，解析字段名 / 类型 / 必填列
- **代码侧反射**：读 DTO 的 dartdoc 头 `文档：docs/{模块}/*.md §4.N` 建立反向索引；通过 `fromJson({})` 触发 `CheckedFromJsonException` 反推字段必填性与类型；或直接正则扫 freezed `@freezed` 类源码拿字段列表（更稳，不用跑）
- **匹配规则**：
  - 字段名 camelCase 两侧必须一致
  - 类型映射表：`int/int`、`string/String`、`bool/bool`、`double/double`、`int[]/List<int>`、`X[]/List<X>`、`X?/T?`
  - 必填列：表里「是」→ DTO `required`；「否」→ DTO 可空或 `@Default`
- **输出**：test 失败时打印具体差异（哪个接口 / 哪个字段 / 两侧分别是什么），方便定位

**预估投入**：2–4 小时（markdown 表格解析约 1h + freezed 字段抽取约 1h + 测试用例 1h + CI 接入 1h）

**开始前决定**：

- [ ] 解析策略选 A（`fromJson` 反射）还是 B（源码正则扫 `@freezed` 类）？
- [ ] 放哪个目录？`test/contract/` 或 `tool/contract_check/`
- [ ] 失败阻断 PR，还是 warning-only（过渡期）

---

### [ ] pre-commit hook（P2，可选）

契约测试本地化：git pre-commit 时跑一次，阻止产生漂移的 commit。

- 好处：不等 CI，本地即时反馈
- 成本：接入约 30 分钟（`.husky/pre-commit` 或 lefthook）
- 前置条件：契约测试已落地

---

### [ ] PostToolUse hook（P3，可选）

在 `team-standards/.claude/settings.json` 加 hook，盯 Edit/Write 到 `**/backend/dto/**/*.dart` / `**/endpoint/*_endpoint.dart`，触发后回灌 system-reminder 让 Claude 当轮回查手册。

- 好处：Claude 参与的编辑更难遗漏同步
- 成本：15 分钟
- **注意**：这层只在 Claude 会话里生效，**不能替代契约测试**，仅作为便利补充

---

### [ ] `intranet_handler_base.dart` 下沉到 common（P3，重构）

当前每个 backend 模块各自拷贝一份 `intranet_handler_base.dart`（refund/backendv2 源）。真要独立服务化，这份应下沉到 `lib/common/backend_infra/intranet_handler_base.dart`，所有模块 import 同一份。

- 好处：消除重复拷贝，修 bug 只改一处
- 成本：1 小时（下沉 + 全 backend 模块改 import + 回归）
- 触发条件：下一次 `IntranetHandlerBase` 需要新增能力（比如统一鉴权、trace id 注入等）时顺手做

---

## 更新记录

| 日期 | 事项 |
|---|---|
| 2026-04-21 | 初版，登记契约测试硬闸 P0 + 其他选项 |
