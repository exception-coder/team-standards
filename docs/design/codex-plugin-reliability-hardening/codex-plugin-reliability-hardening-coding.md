# Codex 插件可靠性加固编码文档

## 快速导航

- [第一轮核心接口](#2-核心接口)
- [第二轮隔离安装](#6-隔离安装测试接口)
- [契约与指标](#7-契约夹具格式)
- [发布与测试矩阵](#9-发布-dry-run)
- [第三轮 Hook 契约](#12-第三轮-hook-契约编码坐标)
- [上下文门禁](#13-openspec-与-graphify-门禁坐标)
- [Skill 边界迁移](#14-skill-边界迁移坐标)
- [事实源与缓存版本](#15-事实源与缓存版本坐标)
- [项目接入轻量化](#16-项目接入轻量化坐标)
- [AI 工程结构初始化](#17-ai-工程结构初始化坐标)
- [OpenSpec 自动生命周期](#18-openspec-自动生命周期坐标)

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

## 11. 版本门禁编码坐标

- 三个 Plugin 仓库各自提供 `scripts/check-runtime-version-bump.js`，CI 以 `HEAD^..HEAD` 检查载荷白名单和 SemVer 递增。
- `project-domain-knowledge/scripts/check-runtime-version-bump.mjs` 同时校验 `package.json` 与 `serverInfo.version`。
- 知识目录不属于 MCP 引擎载荷；CI 单独运行 catalog 并检查生成索引无漂移。

## 12. 第三轮 Hook 契约编码坐标

### 12.1 事件生产

```text
buildHookEvent(event, context): object|null
logHookEvent(event, options): boolean
```

- `buildHookEvent` 只输出 `schemaVersion/ts/user/host/plugin/hook/rule/mode/tool/file`。
- `context` 仅用于测试注入时间、用户和主机；生产默认使用系统值。
- 必填字符串为空、时间无效或 `mode` 非 `warn/block` 时返回 `null`。
- `logHookEvent` 只对有效记录追加 JSONL，任何失败返回 `false` 且不抛出。

### 12.2 事件消费

```text
normalizeHookEvent(value): { event, legacy }|null
readEvents(directory): { events, invalidRecords }
```

- `schemaVersion === 1` 为正式 v1；字段缺失时按 legacy v1 尝试兼容。
- 未知版本和不合法字段返回 `null`，由读取器累加 `invalidRecords`。
- JSON 与文本输出都暴露无效记录数。

### 12.3 版本提醒与工作区契约

- `check-plugin-version-stale.js` 从当前 manifest 推导插件名，三个插件文件必须字节一致。
- `check-workspace-contracts.mjs` 比较两份 `event-log.js`、三份版本提醒、三份 Hook Event schema，以及既有适配器、Golden Fixtures 和指标 helper。
- `audit-skills.js` 只阻断含可分发文件但没有 `SKILL.md` 的目录，不把 Git 不跟踪的纯空目录当作 CI 契约。

### 12.4 回归矩阵

- 生产端：合法 v1、系统字段防覆盖、非法模式、缺字段、写入失败。
- 消费端：正式 v1、legacy v1、未知版本、坏 JSON、非法时间和非法模式。
- 工作区：三方版本提醒与 schema 哈希一致；两个生产 helper 一致。

## 13. OpenSpec 与 Graphify 门禁坐标

- `check-change-readiness.js#hasOpenSpecDesign(projectRoot, transcriptPath)`：读取 `openspec/config.yaml`，排除注释空模板，并只检查当前 transcript 已选择的非归档 change 是否具有 proposal、design、tasks 和 delta specs。
- `check-backend-evidence-readiness.js#readContextKind(transcriptPath)`：区分传统 knowledge-graph 和 Graphify 查询，避免把两种证据混成一个布尔值。
- `check-backend-evidence-readiness.js#findStaleGraphifyTargets(projectRoot, targetPaths)`：兼容 manifest 根映射和 `files` 包装结构，按仓库相对路径比较目标文件 mtime。
- 新鲜度校验只覆盖本次目标文件，不扫描整个仓库，不额外增加 Hook 进程；默认使用 `TEAM_STANDARDS_BACKEND_EVIDENCE_HOOK=warn`，`block` 模式返回 2。
- 回归测试至少覆盖 OpenSpec 就绪/空模板/缺 artifacts，以及 Java Graphify 新鲜/过期两组场景。

## 14. Skill 边界迁移坐标

| 旧入口 | 新入口 | 运行时文件 |
|---|---|---|
| `design-doc-required` | `change-readiness` | `check-change-readiness.js` |
| `backend-knowledge-graph-required` | `backend-evidence` | `check-backend-evidence-readiness.js` |

- `TEAM_STANDARDS_CHANGE_READINESS_HOOK` 优先，兼容读取旧 `TEAM_STANDARDS_DESIGN_DOC_HOOK`。
- `TEAM_STANDARDS_BACKEND_EVIDENCE_HOOK` 优先，兼容读取旧 `TEAM_STANDARDS_BACKEND_KG_HOOK`。
- 后端小改阈值使用 `TEAM_STANDARDS_BACKEND_EVIDENCE_TRIVIAL_FILES/LINES`，兼容旧 `TEAM_STANDARDS_KG_TRIVIAL_FILES/LINES`。
- `write-guard-dispatcher.js` 以新 Hook 名调度，并按“新变量优先、旧变量回退”决定是否跳过。
- 新旧变量兼容都必须有回归测试；Skill、目录、Hook、测试和活动文档不保留旧名称别名。
- `TEAM_STANDARDS_HOOK_EVENT_DIR` 仅覆盖 Hook Event 输出目录，用于隔离测试和本地验证；未设置时仍写入默认团队日志位置。

## 15. 事实源与缓存版本坐标

- `backend-evidence/SKILL.md` 只路由 Graphify、OpenSpec、domain knowledge、DDL 和运行证据，不再引用手工反向索引或代码知识卡模板。
- `glossary-required/SKILL.md` 只路由 domain knowledge、Graphify 和 OpenSpec；`glossary-required/template.md` 与 onboarding 的 `07_glossary.md` 删除。
- `scan-reverse-index.js` 及 `templates/reverse-index/` 删除；跨引用审计必须确保活动入口没有残留。
- `check-team-tools.ps1#Get-CodexPluginRows` 从工作区 `.codex-plugin/plugin.json` 读取期望版本，并按 SemVer 选择缓存中的最高版本。
- Codex 插件只有在配置已启用且缓存版本等于工作区版本时返回 `OK`；缺失、过期或源码 manifest 不可读均返回 `FAIL` 和更新指引。

## 16. 项目接入轻量化坐标

- `init-project-docs/SKILL.md` 只保留 `onboard/init/refresh/status/profile` 编排和权威边界。
- `references/update-workflow.md` 直接更新 Graphify/OpenSpec/项目入口，不写 `generated/*.md` 镜像。
- `references/project-profile-generation.md` 将三文件画像压缩为按需单文件导航。
- `templates/` 与三个顶层旧模板全部删除；Skill 校验不得再要求模板目录存在。
- `bug-doc-required` 与 `change-readiness` 直接查询项目入口、Graphify、OpenSpec、domain knowledge 与运行证据。
- 活动文档与跨引用审计只允许将 `00_project_overview.md` 作为旧项目兼容入口。

## 17. AI 工程结构初始化坐标

- `init-project-docs/init-ai-structure.mjs` 提供 `plan/apply/status`，默认根为 `process.cwd()`，拒绝磁盘根和用户主目录。
- `init-project-docs/assets/project-ai-structure/` 只保存会进入目标项目的八份最小模板；项目名在写入前替换，不把 Yoooni 技术栈写成通用规则。
- 缺失文件允许创建；已有文件按字节保留。`.graphifyignore` 作为完整项目文件只在缺失时创建；`.gitignore` 只维护 `team-standards:graphify` 标记块，重复执行必须保持单块。
- 初始化脚本不创建空 `.codex/skills`、`docs/domain`、`docs/design`、`docs/decisions`、`openspec/specs` 或 `openspec/changes` 目录。
- `references/initialization-output.md` 维护 structure/init 的完整文件清单、后续工具产物、保留策略和不初始化边界。
- `ai-structure-initializer.test.mjs` 覆盖 plan 无写入、首次创建、项目名替换、人工文件与 `.graphifyignore` 保护、Graphify 边界和重复执行幂等。
- `init-project-docs` 在 `apply` 后按当前安装版本调用 Graphify，并以 OpenSpec 严格校验和脚本 `status` 作为完成证据。

## 18. OpenSpec 自动生命周期坐标

- `change-readiness/SKILL.md`：OpenSpec 已启用时，M/L 变更强制进入 change；移除“无相关 change 或 CLI 不可用即自动 legacy”的路由。
- `change-readiness/references/openspec-lifecycle.md`：维护官方 Skill/CLI 选择、change 匹配与创建、schema-driven artifacts、实施 update、验证、sync 和 archive 判定。
- `check-change-readiness.js#readSelectedOpenSpecChanges(transcriptPath)`：从当前 transcript 中提取实际读取或通过 `--change` 选择的 change ID。
- `check-change-readiness.js#hasOpenSpecDesign(projectRoot, transcriptPath)`：只认可本会话选择且 proposal、design、tasks、specs 完整的活动 change。
- `check-change-readiness.js#hasDesignBasis(...)`：检测到 `openspec/config.yaml` 后默认禁止 legacy 设计放行；仅 `TEAM_STANDARDS_OPENSPEC_LEGACY_APPROVED=on` 支持启动会话前明确批准的兼容路径。
- 回归测试覆盖匹配 change 放行、无关 change + legacy 文档阻断、显式 legacy 批准和空模板阻断。
- README、统一流程、依赖、触发、dev-log 与三个 manifest 随核心行为同步；发布版本升级为 2.2.0。

## 19. 初始化输出清单与 Graphify 边界坐标

- `init-project-docs/references/initialization-output.md` 是 structure/init 初始化内容的唯一详细说明；Skill 入口只保留摘要和加载条件。
- `.graphifyignore` 加入 `TEMPLATE_TARGETS`，只在缺失时创建，已有项目扫描规则按字节保留。
- `.gitignore` 继续只维护受标记管理的输出白名单；Graphify 核心共享产物仍由 Graphify 生成，初始化器不创建空 `graphify-out/`。
- 初始化回归测试同时验证 `.graphifyignore` 通用排除项与已有项目配置保护。
- README、统一流程、依赖、设计、dev-log 与三个 manifest 随核心行为同步；发布版本升级为 2.4.0。
