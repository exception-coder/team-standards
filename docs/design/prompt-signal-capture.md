# 设计：团队疑问/纠正信号采集（prompt-signal-capture）

## 背景与目标

团队 vibecoding 时，每天对 AI 发出大量**自然语言信号**，其中两类有沉淀价值：

1. **反复出现的疑问**（「X 怎么配」「这表关系是啥」）—— 信号指向**知识图谱 / 术语表缺了一条**。
2. **对 AI 的纠正**（「不对，不能这样引用」「应该走接口」）—— 信号指向**通用标准约束缺了一条**，或某条 warn 该升 block。

现有 6 道 PreToolUse hook 全是机械判定，从不采集 prompt；`coding-violation-log` 只在单项目、靠模型自觉触发。缺口是：**跨人、跨会话、无遗漏的自然语言信号采集 + 离线聚合**。

本设计补齐这条闭环，**完全复用既有范式**：采集照抄 `hook-event-logging`，同步照抄 `update-team-tools` 每日 best-effort，落地照抄 `_candidates.md` / `coding-violations.md`。

## 闭环全景

```
UserPromptSubmit hook(sync, 微秒)  → 启发式打标，只写本地 jsonl
Stop hook(async, 单飞)            → 推 \\IT01（默认开，self-healing）
SessionStart 每日                  → update-team-tools 兜底整体推
            │
            ▼
周报 skill（人工按需 / 每周提醒，离线，读 \\IT01）
   ├─ 高频「疑问」簇 → glossary / backend-kg 的 _candidates.md
   └─ 高频「纠正」簇 → coding-standards 新约束候选 / warn→block 建议
            │
            ▼
        人审通过 → 才写成规
```

## 设计要点（为什么这样做）

### 采集层（UserPromptSubmit hook）

- **只写本地、绝不碰网络**：与 `hook-event-logging` 同一红线。每条 prompt 都触发，是输入热路径，本地 fs 追加是微秒级，SMB/网络一断一慢就会拖慢甚至卡住输入。
- **best-effort、绝不阻断**：登记包 try/catch，任何失败静默吞掉，绝不影响 prompt 放行。
- **机械启发式打标，不做 LLM 判定**：采集层只打粗标签（见下），精确分簇留给离线聚合的 LLM。
  - 纠正标记：`不对 / 不能 / 应该 / 错了 / 改一下 / 别这样 / 方向反了` 等。
  - 疑问标记：`怎么 / 为什么 / 在哪 / 能不能 / ?` + 命中业务术语。
  - 上下文：`cwd → project`、是否**紧跟在一次 Edit/Write 之后**（纠正信号更强）。
- **不引第三方依赖**：只用 node 内置 `fs/os/path`。

### 文件命名（一人一机一文件，根除写冲突）

```
~/.kai-toolbox/prompt-signals-<user>-<host>.jsonl
            ↓ 推到
\\IT01\版本更新\vibecoding\prompt-signals-<user>-<host>.jsonl
```

每台机器只写、只推自己的文件 → 共享上「一文件一属主」→ 同步用**整文件覆盖拷贝**即天然幂等、不跨机交错写坏（沿用 `hook-events-*.jsonl` 的招）。单人文件涨起来后按月切片：`...-<host>-YYYYMM.jsonl`。

### 同步层（Stop async hook，单飞 + 尾随）

- **时机**：
  - ❌ 不在 UserPromptSubmit（输入热路径 + 信号刚写）。
  - ✅ **Stop（回合结束）为主**：本回合信号已落盘，又不在输入热路径上。
  - ✅ **SessionStart 每日**兜底：`update-team-tools` 整体补推。
- **单飞机制**（实现「上一次同步完才开下一次」）：
  ```
  Stop hook(async) ── 请求同步 ──┐
                                 ▼
              抢 ~/.kai-toolbox/.prompt-signals-sync.lock (O_EXCL 原子创建)
                 ├─ 抢到 → 整文件覆盖推 \\IT01
                 │           └─ 完成前看 dirty 标记：有→再跑一轮(尾随)；无→释放锁退出
                 └─ 没抢到 → 只写 dirty 标记后立即退出（请求被合并）
  ```
  - **单飞**：同一时刻只一个进程动 `\\IT01`，杜绝并发覆盖同一文件。
  - **请求合并 + 尾随**：回合密集时塌缩成「正在跑的 + 末尾再跑一次」，保证最后写入也被推上去，不无限排队。
  - **崩溃自愈**：锁带 pid + 时间戳，超阈值（如 5 分钟）视为陈旧锁直接抢占。
  - **best-effort**：`\\IT01` 不可达即静默释放锁退出，等下个 Stop 或每日刷新再推；本地是唯一源头，不丢。
- **单向**：只 local → 共享，绝不回拉。

### 隐私闸

| 闸 | 默认 | 说明 |
|----|------|------|
| 采集开关 | 开 | `TEAM_STANDARDS_PROMPT_SIGNAL=off` 完全不写本地 |
| 上行开关 | **开** | 默认随每日刷新推 `\\IT01`；可单独关闭只留本地 |

> 注：prompt 原文比 hook 命中标签更敏感，团队已决定上行默认开；保留关闭闸作为个人/团队级 kill switch。

## 事件 schema（一行一条 JSON，草案）

```json
{"ts":"2026-06-24T07:30:00.000Z","user":"zhang","host":"ZHANGK","project":"korepos","kind":"correction","markers":["不对","应该"],"afterEdit":true,"text":"不对，application 层不能直接 new infrastructure 的类，应该走接口"}
```

| 字段 | 含义 |
|---|---|
| `ts` | ISO8601 时间戳 |
| `user` / `host` | `os.userInfo().username` / `os.hostname()` |
| `project` | 由 cwd 推断的项目名 |
| `kind` | 粗分类：`question` / `correction` / `other` |
| `markers` | 命中的启发式标记词 |
| `afterEdit` | 是否紧跟一次 Edit/Write（纠正信号增强） |
| `text` | prompt 原文（受上行开关约束） |

## 聚合层（周报 skill）

- **触发**：默认**人工按需**（对标 `yoooni-hook-report` 的「hook 命中周报」），可选每周定时**只生成草稿 + 提醒**、不动文档。
- **产物是候选，不是规**：高频疑问簇 → `glossary` / `backend-kg` 的 `_candidates.md`；高频纠正簇 → `coding-standards` 新约束提议 / warn→block 建议。
- **人审红线**：任何候选要变成硬约束，必须人点头——与 `hook-events`→`hook-report` 现状一致。

## 落地顺序

1. 本设计文档评审通过（本文件）。
2. 实现采集层 `UserPromptSubmit` hook + 本地 jsonl（最小可用）。
3. 实现 Stop async 单飞同步 hook；`update-team-tools` 加每日兜底推。
4. 跑一两周有真实数据后，再实现聚合周报 skill（规则才不拍脑袋）。

## 边界

- team-standards **只负责产生本地事件**，不感知 `\\IT01`、不在 hook 里做网络同步——与公司内网基础设施解耦。
- 同步与聚合由 `yoooni-daily-plugin` 承接（`update-team-tools` + 周报 skill）。
