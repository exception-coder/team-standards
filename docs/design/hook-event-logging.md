# 设计：hook 命中事件本地登记（hook-event-logging）

## 背景与目标

warn 档 hook（命中规则但默认放行）在试用期需要数据支撑两件事：

1. **要不要把某条规则从 warn 升 block** —— 看它命中频率、误报率。
2. **同事最常踩哪些规范** —— 哪条规则反复触发、谁在踩。

为此，warn hook 命中时把一行事件**追加到本地** `~/.kai-toolbox/hook-events.jsonl`。

## 设计要点（为什么这样做）

- **只写本地、绝不碰网络**：hook 是每次 Write/Edit/Bash 同步执行的热路径，绝不能在里面做 SMB/网络 IO（一慢一断就拖慢每次编辑）。本地 fs 追加是毫秒级。
- **best-effort、绝不阻断**：登记包在 try/catch 里，任何失败（磁盘满、权限）都静默吞掉——登记失败绝不能影响 hook 主流程（放行/拦截）的判定。
- **不引第三方依赖**：只用 node 内置 `fs/os/path`。
- **每个插件各放一份 helper**：team-standards 与 project-coding-profiles 是独立安装的插件，不能跨插件共享模块，故各自 `hooks/event-log.js`，但都写**同一个** `~/.kai-toolbox/hook-events.jsonl`。

## 事件 schema（一行一条 JSON）

```json
{"ts":"2026-06-18T07:30:00.000Z","user":"zhang","host":"ZHANGK","plugin":"team-standards","hook":"check-sql-ddl-readiness","rule":"sql-ddl","mode":"warn","tool":"Edit","file":"D:\\\\proj\\\\X.xml"}
```

| 字段 | 含义 |
|---|---|
| `ts` | ISO8601 时间戳（helper 自动补） |
| `user` / `host` | `os.userInfo().username` / `os.hostname()`（helper 自动补） |
| `plugin` | 来源插件（team-standards / project-coding-profiles） |
| `hook` | hook 文件名 |
| `rule` | 规则短名（sql-ddl / backend-kg / file-encoding / frontend-controls） |
| `mode` | 当时模式（warn / block）——便于区分"提示"与"已拦" |
| `tool` | 触发的工具（Write/Edit/MultiEdit/Bash） |
| `file` | 目标文件路径 |

## 接入的 hook（team-standards 侧）

- `check-sql-ddl-readiness.js` → `rule: sql-ddl`
- `check-backend-kg-readiness.js` → `rule: backend-kg`

注入点：在 `process.stderr.write(msg)` 之前调用 `logHookEvent(...)`。

## 下游（不在本插件，跨仓协作）

- **同步**：`yoooni-daily-plugin/scripts/update-team-tools.ps1`（计划任务/SessionStart 触发）best-effort 把本地 jsonl 复制到 `\\IT01\版本更新\vibecoding\hook-events-<user>-<host>.jsonl`（每人一文件，无写冲突）。
- **聚合**：yoooni-daily-plugin 的「hook 命中周报」skill 读该共享目录出统计。

> 边界：team-standards / project-coding-profiles **只负责产生本地事件**，不感知 \\IT01、不做网络同步——保持插件与公司内网基础设施解耦。
