---
name: reset-kpos-local-state
description: "当用户以自然语言要求重置 / 清空 / 删除 kpos / korepos 本地状态（shared_preferences 缓存 或 korepos.db 本地库）时触发，引导调用 `/reset-kpos-local` slash command 完成删除。**不要**在用户只说『删除文件 X.dart』『删除这一行』『删除某个 commit』等通用删除场景触发——本 skill 只识别"重置 kpos/korepos 本地数据"这一狭义意图。"
---

# 重置 kpos 本地状态触发规范

## 核心原则

**当用户的请求语义明确指向"重置/清空/删除 kpos 或 korepos 的本地状态"时，转交 `/reset-kpos-local` slash command 执行，不要自己手动 `Remove-Item`。**

slash command 是这件事的唯一权威入口：路径、边界、报告格式都在 `commands/reset-kpos-local.md` 中。本 skill 只负责语义识别 + 路由。

---

## 触发短语（必须命中其中之一）

下列短语任一精确出现，或语义等价表达：

| 触发类别 | 中文示例 | 英文/混合示例 |
|---|---|---|
| 整体重置 | "重置 kpos 本地"、"重置 korepos 本地"、"清空本地状态"、"清掉本地数据"、"重置本地环境" | "reset kpos local", "reset local state" |
| 命名具体文件 | "删 shared_preferences"、"清空 shared_preferences"、"删 korepos.db"、"清掉本地数据库" | "delete shared_preferences", "wipe korepos.db" |
| 故障复现场景 | "把本地清干净再试"、"我想换账号重新登"（**仅当上下文已经在讨论 kpos/korepos 登录或会话异常时**） | — |

## 严格不触发的场景

| 用户说 | 为什么不触发 |
|---|---|
| "删除这一行 / 这个变量 / 这个函数" | 代码内删除，与本地状态无关 |
| "删掉刚才那个 commit" / "回滚 commit" | git 操作，不删本地文件 |
| "删 lib/features/refund/xxx.dart" | 项目源码删除 |
| "清一下 build 缓存" / "flutter clean" | Flutter 构建缓存，不在本 skill 管辖（建议直接跑 `flutter clean`） |
| "删 .dart_tool / .idea / build/" | IDE / 构建产物，与 kpos 本地数据无关 |
| 用户没提 kpos / korepos / shared_preferences / korepos.db | 默认**不触发** |

---

## 触发后该做什么

1. **确认意图**（1 行问句）——只在用户表达**模糊**时问一次，例如他只说"清一下本地"没说"kpos 本地"：
   > "确认是要重置 kpos 本地状态（删除 shared_preferences.json + korepos.db）吗？"

   若用户已明确（例如直接说"删 shared_preferences 和 korepos.db"）→ **跳过确认**，直接执行下一步。

2. **告知将执行 slash command** 并列出要删的两个文件（一行一个，路径完整），让用户在 1 秒内能看见会发生什么。

3. **调用 `/reset-kpos-local`**——由 slash command 接管实际删除与回报。

4. **不要**在 skill 内自行调用 `Remove-Item`、`del`、`rm`——绕过 slash command 会让边界与日志失控。

---

## 与其他能力的边界

- `/reset-kpos-local` slash command：**实际执行者**。本 skill 是触发层，不重复实现删除逻辑。
- `daily-work-log` skill：本 skill 的触发**不是**源码 Edit/Write，**不**计入工作日志。
- `bug-doc-required` / `design-doc-required`：纯运维动作（清本地状态），**不**走文档前置流程。
