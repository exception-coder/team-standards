---
description: 删除 kpos 本地状态文件（shared_preferences + korepos.db），用于重置本地缓存与本地库
---

# /reset-kpos-local — 重置 kpos 本地状态

> 用户已通过显式调用 `/reset-kpos-local` 表达了删除意图，**不要再次询问确认**，直接执行删除。

## 待删文件清单（Windows）

| # | 路径 | 含义 |
|---|------|------|
| 1 | `$env:APPDATA\com.example\kpos\shared_preferences.json` | Flutter `shared_preferences` 本地键值缓存（账号/会话/UI 偏好等） |
| 2 | `D:\Users\$env:USERNAME\Documents\korepos.db` | korepos 本地 SQLite 数据库 |

> 第 2 条路径中 `$env:USERNAME` 由 PowerShell 在执行时展开为当前 Windows 登录用户名；盘符固定 `D:` 是团队开发环境约定（Documents 统一放在 D 盘 `\Users\<user>\Documents\`），不要替换为 `$env:USERPROFILE` 或 `MyDocuments` 等可能解析到 C 盘的形式。

## 执行步骤

按下面顺序对**每个**文件独立执行（一个文件失败不影响另一个）：

1. 用 **PowerShell 工具**（不是 Bash）执行以下逻辑：
   ```powershell
   $paths = @(
     "$env:APPDATA\com.example\kpos\shared_preferences.json",
     "D:\Users\$env:USERNAME\Documents\korepos.db"
   )
   foreach ($p in $paths) {
     if (Test-Path -LiteralPath $p) {
       try {
         Remove-Item -LiteralPath $p -Force -ErrorAction Stop
         Write-Output "DELETED: $p"
       } catch {
         Write-Output "FAILED:  $p  ($($_.Exception.Message))"
       }
     } else {
       Write-Output "MISSING: $p"
     }
   }
   ```
2. 把 PowerShell 输出原样回报给用户，并用一行总结 X 个删除 / Y 个不存在 / Z 个失败。

## 严格边界

- ❌ 不要删除其他任何文件（不动 schema、注册表、其他 .json/.db）
- ❌ 不要清理 `%APPDATA%\com.example\kpos\` 目录下除 `shared_preferences.json` 外的文件
- ❌ 不要重建空文件 / 不要做 "重置" 之外的动作（应用启动时会自动重建）
- ❌ 不要在删除后顺手运行 `flutter clean` / `flutter pub get` 等命令
