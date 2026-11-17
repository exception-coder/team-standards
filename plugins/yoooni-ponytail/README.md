# Yoooni Ponytail — 原版核心与轻量适配试点

独立可选包 `yoooni-ponytail`，版本 `0.1.1`。引入 [Ponytail](https://github.com/DietrichGebert/ponytail) 原版核心，附 Yoooni 适配；非上游官方发行版，不是自行重写的方法论。上游采用 MIT，完整版权声明见 [LICENSE](upstream/LICENSE)。

## 内容与唯一入口

- `skills/yoooni-ponytail/SKILL.md`：唯一加载入口和适配边界。
- `upstream/ponytail-core.md`：上游 `skills/ponytail/SKILL.md` 的逐字节副本，仅更名以避免被当作第二个 Skill 发现。
- `upstream/source.json`：固定提交、源路径和 SHA-256；不在使用时追踪 main。

不携带上游插件、Hooks、状态展示、评审命令或运行时依赖。原文放在 `skills/` 之外，不注册第二个自动入口。

## 使用与停用

从本仓市场选择独立的 `yoooni-ponytail` 包；它不会随 `team-standards` 自动启用。Claude Code 安装入口为 `/plugin install yoooni-ponytail@team-standards`，安装后显式调用 `/yoooni-ponytail:yoooni-ponytail`。Codex 从市场选择该包，明确调用 `$yoooni-ponytail`。这些是声明的接入方式，真实宿主安装、发现及防重复行为需试点验收。

触发后持续本会话直至用户停用，或明确说“停用 Yoooni Ponytail”。开始无 Ponytail 对照时禁用该包及原版插件并新建会话；不要将已加载核心的会话当作无干预组。不支持相应调用策略的宿主采用人工显式加载，不宣称具有强制隔离。

统一维护源是本仓的此目录。Application Starter 2026.11.17.1 携带受控离线副本（提交 8354322），无需安装团队套件。副本保留来源、许可证和 SHA-256，唯一转换为入口的相对资源路径；项目版本优先，默认 full，会话内持续至用户停用。源正文仍只在此目录维护。更新副本时从固定源提交复制核心、许可证、适配与调用策略，更新 distribution.json 校验并运行 node scripts/check-ponytail.mjs，不独立改写方法论。真实宿主去重和试点收益待验收。

## 试点与更新

选择 8～12 个真实任务，每个任务从同一提交、模型版本、工程规范、工具权限及验收标准分别执行基线组与试点组，保存任务标识、基线、产出提交及验证证据。先核对功能完整性、正确性、安全与工程合规，再比较不必要抽象/依赖、验证充分度、Token、耗时和返工成本；失败与污染样本不得隐去，不能用代码量单独判优。

仅在质量不下降且成本有明确收益时考虑默认采用；收益不足则停用，不继续扩充生态。当前没有已完成的对照结果。

升级时审查上游核心和许可证 diff，选择固定提交，更新校验值、包版本及本记录，重新核对适配冲突并执行对照后确认。不能自动追踪最新版。

| 版本 | 变化 | 状态 |
|---|---|---|
| 0.1.1 | 固定上游核心、保留版权，新增编码任务自动入口与 Yoooni 边界 | 试点包，宿主及任务对照待验收 |

当前调用策略：编码任务自动触发，默认 full，持续会话直至用户停用；安装独立包后无需逐任务调用。对照组仍须禁用并使用新会话。
