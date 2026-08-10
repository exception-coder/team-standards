# 设计：团队疑问/纠正信号采集（prompt-signal-capture）

## 背景与目标

团队 vibecoding 时，每天对 AI 发出大量**自然语言信号**，其中两类有沉淀价值：

1. **反复出现的疑问**（「X 怎么配」「这表关系是啥」）—— 信号指向**知识图谱 / 术语表缺了一条**。
2. **对 AI 的纠正**（「不对，不能这样引用」「应该走接口」）—— 信号指向**通用标准约束缺了一条**，或某条 warn 该升 block。

现有 6 道 PreToolUse hook 全是机械判定，从不采集 prompt；`coding-violation-log` 只在单项目、靠模型自觉触发。缺口是：**跨人、跨会话、无遗漏的自然语言信号采集 + 离线聚合**。

本设计补齐这条闭环，**完全复用既有范式**：采集照抄 `hook-event-logging`，同步照抄 `update-team-tools` 每日 best-effort，落地照抄 `_candidates.md` / `coding-violations.md`。

## 闭环全景

```
UserPromptSubmit hook(sync, 微秒)  → 启发式打标、脱敏截断，只写本地 jsonl
SessionStart 每日                  → 显式 opt-in 后由 update-team-tools 推送
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
  - 上下文：只保存由 `cwd` 派生的 `project`，不保存完整 `cwd` / session / user / host；保留是否**紧跟在一次 Edit/Write/apply_patch 之后**（纠正信号更强）。
- **数据最小化**：默认只登记疑问与纠正，`other` 仅在 `TEAM_STANDARDS_PROMPT_SIGNAL=all` 时登记；文本先屏蔽常见令牌、密码、Cookie、私钥、邮箱和手机号，再截断到 1000 字符。
- **不引第三方依赖**：只用 node 内置 `fs/os/path`。

### 文件命名（一人一机一文件，根除写冲突）

```
~/.kai-toolbox/prompt-signals-<user>-<host>.jsonl
            ↓ 推到
\\IT01\版本更新\vibecoding\prompt-signals-<user>-<host>.jsonl
```

每台机器只写、只推自己的文件 → 共享上「一文件一属主」→ 同步用**整文件覆盖拷贝**即天然幂等、不跨机交错写坏（沿用 `hook-events-*.jsonl` 的招）。单人文件涨起来后按月切片：`...-<host>-YYYYMM.jsonl`。

### 同步层（SessionStart / 计划任务）

- 不在 UserPromptSubmit 热路径做网络 IO。
- `yoooni-daily-plugin/scripts/update-team-tools.ps1` 随日常更新周期执行整文件覆盖同步。
- 只有 `YOOONI_PROMPT_SIGNAL_UPLOAD=on` 时才执行上传；未设置、空值或其它值均只留本地。
- `\\IT01` 不可达时 best-effort 跳过；同步始终为 local → 共享单向。

### 隐私闸

| 闸 | 默认 | 说明 |
|----|------|------|
| 采集开关 | 开 | 默认只采集疑问/纠正且先脱敏；`=all` 才含其它任务，`=off` 完全不写本地 |
| 上行开关 | **关** | `YOOONI_PROMPT_SIGNAL_UPLOAD=on` 才随每日刷新推 `\\IT01` |

> prompt 文本比 hook 命中标签更敏感，因此本地保存与跨机上传采用两个独立开关，上传必须显式同意。

## 事件 schema（一行一条 JSON，草案）

```json
{"ts":"2026-06-24T07:30:00.000Z","project":"korepos","kind":"correction","markers":["不对"],"priority":"high+","afterEdit":true,"text":"不对，application 层不能直接 new infrastructure 的类，应该走接口"}
```

| 字段 | 含义 |
|---|---|
| `ts` | ISO8601 时间戳 |
| `project` | 由 cwd 推断的项目名 |
| `kind` | 粗分类：`correction` / `question`；`other` 默认不登记，`command` 始终丢弃 |
| `markers` | 命中的启发式标记词 |
| `priority` | `high+`(纠正+紧跟编辑) / `high`(纠正) / `medium`(疑问) / `low`(其它)——供聚合层排序 |
| `afterEdit` | 是否紧跟一次 Edit/Write（纠正信号增强） |
| `text` | 脱敏并截断后的 prompt，最大 1000 字符 |

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

## v1.41 采集精化（降噪 + 去重 + 优先级）

试用数据显示 `kind:"other"` 桶里混入大量噪声（slash 命令、"更新套件 / 安装公司工具"、`/doctor` 等运维指令，及连续重复 prompt），淹没真正的纠正/疑问信号。本版在**采集层**加三道：

1. **命令/运维降噪**：`COMMAND_RE` 命中（`/` 开头、套件安装更新、`/doctor` 等）→ `kind:"command"`、**直接不登记**（对"反推知识缺口"零价值）。
2. **连续去重**：sidecar `.prompt-signal-last` 存上一条 `project+text` 指纹，相同则跳过（根除"更新套件"刷屏式重复）。
3. **优先级标注**：新增 `priority`（`high+`/`high`/`medium`/`low`），其中**纠正 + 紧跟编辑(afterEdit) = `high+`** 最强信号，供聚合层先看高价值。

> 边界不变：采集层仍只做机械启发式（降噪是"删确定噪声"，不是"判定业务问题"）；**"精准提取业务缺口"由聚合层 LLM 规整完成**（见 `yoooni-hook-report` 周报）。
