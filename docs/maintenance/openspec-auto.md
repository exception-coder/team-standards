# OpenSpec 自动分级与项目优先适配

Team Standards 4.16.0 提供标准源 [openspec-auto](../../plugins/team-standards/skills/openspec-auto/SKILL.md)；[Plan S 交接模板 1.1.0](../../templates/project-foundation/README.md)分发其完整副本。只有标准源需要维护，模板副本由测试比对；项目更新须明确操作并审阅差异。没有同步服务，不依赖 Forge。

## 规格与验证

AI 根据范围、业务规则、兼容性及风险选择 L1 直接实施、L2 轻量计划或 L3 项目完整 OpenSpec。高风险强制 L3，执行中风险扩大自动升级。项目明确采用的更严格流程继续适用。change-readiness 沿用分类，补实施依据，不重复创建 change。SQL/API Gate 与测试复用项目现有机制；规格深度不缩减实际风险所需的验证。

## 安装与注册入口

适配器为 [plugins/team-standards/scripts/openspec-auto.mjs](../../plugins/team-standards/scripts/openspec-auto.mjs)，需要 Node.js 18+。以下命令从套件源码根运行，示例项目路径应替换为实际项目。

```powershell
node plugins/team-standards/scripts/openspec-auto.mjs resolve --project D:/work/project --host codex
node plugins/team-standards/scripts/openspec-auto.mjs install --project D:/work/project --host codex
node plugins/team-standards/scripts/openspec-auto.mjs install --project D:/work/project --host claude
```

`resolve` 只读，返回唯一 provider、是否注册全局入口和是否能原生发现。插件缺失且项目缺失时不提供能力。安装是显式操作：拒绝覆盖已有目录；第二宿主优先复制项目现有版本，不把全局新版本覆盖进项目。更新时人工或平台审阅并合并差异，不提供强制覆盖开关。

默认检测 `.agents/skills/openspec-auto/SKILL.md` 和 `.claude/skills/openspec-auto/SKILL.md`。不同路径正文冲突时报错，不能悄悄选择全局。项目用其他名称提供同类能力时，可在 `.agents/skill-providers.json` 声明：

```json
{ "openspec-auto": ".agents/skills/my-task-flow/SKILL.md" }
```

声明目标必须存在且在项目内。自定义路径或只有另一宿主路径时，返回 `nativeDiscovery: false`；由项目入口显式读取，或明确安装对应宿主副本，不能宣称原生已加载。注册前由启动器调用适配；添加、删除或更改项目 Skill 后，在下一次启动重新解析，不复用旧选择。

## Codex

Codex 支持按 Skill 文件路径禁用，见[官方技能配置](https://learn.chatgpt.com/docs/build-skills)。适配器合并调用方提供的有效 `skills.config`，只禁用已加载的全局 openspec-auto 路径，保留其他启停项，不写个人全局配置。

启动器从当前有效配置和技能清单取得以下 JSON；路径必须是真实安装位置，不能把源码路径当已加载缓存路径。`skillConfig` 即使为空也须显式提供，避免覆盖未知配置；全部全局副本均应列入。

```json
{
  "skillConfig": [],
  "globalSkillPaths": ["C:/actual-plugin/skills/openspec-auto/SKILL.md"]
}
```

```powershell
$selection = node plugins/team-standards/scripts/openspec-auto.mjs codex --project D:/work/project --plugin C:/actual-plugin --config D:/work/effective-skills.json | ConvertFrom-Json
$hostArgs = @($selection.args)
codex -C D:/work/project @hostArgs
```

返回的 `args` 也可用于 Codex app-server 的本次启动。不要把这一项目的禁用数组写成所有项目的永久全局设置。启动器应在 `skills/list` 中确认项目入口启用、对应全局入口禁用；配置受组织策略限制时报告实际情况。

## Claude Code

Claude 的普通 `skillOverrides` 不控制插件内 Skill。适配器生成新的会话插件目录，物理去除重复的 openspec-auto，保留其他 Skill、Hook 与脚本；然后返回 `--plugin-dir` 参数。同名会话插件替换已安装副本的规则见[官方加载说明](https://code.claude.com/docs/en/plugins/loading#name-conflicts)。

```powershell
$selection = node plugins/team-standards/scripts/openspec-auto.mjs claude --project D:/work/project --plugin C:/actual-plugin --output D:/temporary/team-standards-session | ConvertFrom-Json
$hostArgs = @($selection.args)
# 从目标项目目录启动；输出目录必须是全新目录，位于项目和源插件之外。
claude @hostArgs
```

组织管理设置可能锁定插件；`team-standards@inline: false` 也会阻止替换。必须核对当前会话命令清单及加载日志，不能仅看安装列表。此适配不改个人设置，不停止其他 Hook，不修改插件缓存。宿主不能接受这些参数时，明确报告未物理去重；项目正文优先仍是语义保障，不能宣称完全无冲突。

**接入边界：**普通市场安装不会自动对所有项目启用这个启动适配。Plan S/Forge 或其他启动器应在注册前调用上述接口并应用参数。当前只交付套件适配与独立模板，未修改 Forge 启动器，也未部署 Plan S。既有会话、writer、任务及监督状态不会因此被自动重置或完成。

## 验收

`node --test scripts/tests/openspec-auto.test.mjs` 覆盖独立模板、项目优先、物理过滤与配置合并、全局补充、风险升级，以及自定义规则保留、冲突和错误声明。测试不能证明 AI 对所有自然语言需求都能正确分类，也不代表完整 OpenSpec 已在目标业务项目执行。

行为验收使用五组任务：无插件项目执行分级和已安装工作流；安装插件后项目版本优先；同时存在只创建一次规格并执行一次流程；项目缺失时插件补充；从局部 UI 筛选发现租户权限影响后升至 L3。真实 OpenSpec 与项目门禁必须在接收方目标项目验收，不能用静态文本匹配替代。

### 本次验证记录（2026-10-31）

- 8 项定向测试、2 项 Skill 布局测试通过；23 个 Skill 审计无警告，交叉引用与三份版本清单检查通过。
- Codex CLI 0.147.0 在独立临时配置中实际安装测试插件，通过 app-server `skills/list` 验证：缺少项目版本时插件启用；同时存在时能复现两个启用入口；应用适配参数后仅项目入口启用。
- Claude Code 2.1.224 的无模型初始化查询超时，尚未取得原生命令清单，因此不宣称该宿主端到端通过。目录物理过滤、其他 Skill/Hook 保留已由定向测试核验；接入前仍须核对实际会话加载行为。
- 可复验的原生清单脚本：`node scripts/tests/openspec-auto-native.mjs <codex-executable> [claude-executable-or-cli.js]`。使用隔离配置，不发送模型请求；它不运行 OpenSpec 业务工作流。
