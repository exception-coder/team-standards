# Codex 插件可靠性加固编码文档

## 快速导航

- [第一轮核心接口](#2-核心接口)
- [第二轮隔离安装](#6-隔离安装测试接口)
- [契约与指标](#7-契约夹具格式)
- [发布与测试矩阵](#9-发布-dry-run)

## 1. 变更摘要

本轮先解决实际失效和敏感数据风险，再进行 Hook 进程收敛。八个写入校验入口统一通过 `normalizeChanges(payload)` 获取标准变更列表；规则判断口径保持不变。

## 2. 核心接口

```javascript
/**
 * @typedef {Object} Change
 * @property {'add'|'update'|'delete'|'move'} operation
 * @property {string} filePath
 * @property {string} [previousFilePath]
 * @property {string} addedText
 * @property {string} removedText
 */

function normalizeChanges(payload) {}
```

适配器不输出日志、不访问网络、不修改或读取目标文件内容；仅允许检查文件是否存在以区分 Claude `Write` 的新增与覆盖。未知事件返回空数组。

## 3. 调用约定

```javascript
const { normalizeChanges } = require('./change-input');

const changes = normalizeChanges(payload);
for (const change of changes) {
  // 复用现有规则，使用 change.filePath 与 change.addedText。
}
```

多文件事件必须全部遍历。需要阻断时收集全部命中项，排序和去重后只写一次 JSON 响应，避免多个进程争抢标准输出。

## 4. 测试夹具

- Claude Code：`Write`、`Edit`、`MultiEdit`。
- Codex：新增文件、更新文件、删除文件、移动文件和一个补丁内的多个文件。
- 边界：空命令、未知工具、缺失 `cwd`、Windows 与 POSIX 风格路径。
- 安全：提示词秘密脱敏、最大长度、上传默认关闭、旧明文配置迁移。

## 5. 完成标准

1. Codex `apply_patch` 危险样例不再静默退出。
2. 原有 Claude 输入测试保持通过。
3. 不新增明文凭据或默认外发行为。
4. JS 语法、PowerShell AST、Shell 语法和插件校验全部通过。
5. 文档索引、版本清单与实际文件一致。

## 6. 隔离安装测试接口

测试为每个插件创建临时用户根，写入本地 personal marketplace，将插件复制到 marketplace 的 `plugins/<name>/`，再以隔离环境调用：

```text
codex plugin list
codex plugin add <name>@personal --json
```

安装完成后从临时 Codex 缓存读取插件副本，验证 `.codex-plugin/plugin.json`、`hooks/hooks.json` 和命令入口均存在。测试退出时只删除自身创建的临时根。

## 7. 契约夹具格式

```javascript
{
  contractVersion: 1,
  cases: [
    {
      name: 'codex-multi-file',
      payload: {},
      expected: []
    }
  ]
}
```

测试按临时 `cwd` 替换 `${CWD}` 占位符，再对 `normalizeChanges` 的 operation、路径、新增和删除文本做深比较。夹具和适配器分别记录 SHA-256，发布前跨仓比较。

## 8. Hook 指标接口

```text
Metric {
  ts: ISO-8601 UTC,
  plugin: string,
  guard: string,
  durationMs: integer,
  code: integer
}
```

指标写入由插件专属 `*_HOOK_METRICS=on` 开启，输出目录可由测试专用环境变量覆盖。写入失败必须静默降级，不改变规则退出码。

## 9. 发布 dry-run

`release-team-tools.mjs` 默认执行以下顺序：发现三个兄弟仓库、检查版本、验证镜像、调用各仓测试、运行插件结构校验、复制插件发布内容到临时 staging、生成 `tar.gz` 和 SHA-256。只有显式 `--skip-tests` 才跳过测试；脚本不包含提交、推送或发布命令。

## 10. 第二轮测试矩阵

- 安装：三个插件真实 Codex CLI 本地 marketplace 安装。
- 契约：Claude Write/Edit/MultiEdit；Codex add/update/delete/move/multi-file；畸形输入。
- 安全：DPAPI、迁移、脱敏、非法域名/端口、保留期、锁恢复。
- 性能：默认不落指标、显式最小化落盘、并发相对顺序基线不回退。
- 发布：成功产物、版本不一致失败、镜像漂移失败、缺仓失败。
