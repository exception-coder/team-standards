# Frontend Excellence Skill 编码摘要

本文是 `frontend-excellence-current.md` 的实施依据，列出文件坐标、内容契约和验证要求。

## 1. 核心规则

- 新 Skill 名称固定为 `frontend-excellence`，目录名与 frontmatter 一致。
- description 同时覆盖创建、重做和审查高质量 Web 前端的明确触发语义，并排除纯后端与无视觉影响的小改。
- `SKILL.md` 保留核心流程和硬门禁；架构、美学、质量细则放入一层 `references/`。
- 分层规则的唯一来源仍是 `architecture-ddd-lite-fullstack`，不得在新 Skill 中复制完整规则。
- Figma、ImageGen、浏览器与 Playwright 都是条件能力；除真实浏览器验收外，不设置单一工具硬依赖。
- 未完成关键视口与交互路径验证时，不得宣称前端交付完成。

## 2. 接口入口指针

本次不新增 HTTP 或业务接口。Skill 入口由 frontmatter `description` 和 `CLAUDE.md` 触发表共同决定。

## 3. 涉及文件清单

| 全路径 | 操作 | 说明 |
|---|---|---|
| `plugins/team-standards/skills/frontend-excellence/SKILL.md` | 新增 | 定义触发、流程、硬门禁和引用路由。 |
| `plugins/team-standards/skills/frontend-excellence/agents/openai.yaml` | 新增 | 定义显示名称、短描述和默认提示。 |
| `plugins/team-standards/skills/frontend-excellence/references/architecture-and-state.md` | 新增 | 定义源码结构、组件边界和状态归属。 |
| `plugins/team-standards/skills/frontend-excellence/references/design-system-and-aesthetics.md` | 新增 | 定义视觉方向、令牌、组件状态和反模式。 |
| `plugins/team-standards/skills/frontend-excellence/references/quality-gates.md` | 新增 | 定义响应式、可访问性、浏览器与交付检查。 |
| `CLAUDE.md` | 修改 | 新增主动触发、分类导航、Skill 索引和资源索引。 |
| `AGENTS.md` | 生成 | 由同步脚本从 `CLAUDE.md` 生成。 |
| `docs/skill-flow.md` | 修改 | 接入编码主链路和 FAQ。 |
| `docs/skill-triggers.md` | 修改 | 说明与架构、Sites、ImageGen 的主辅关系。 |
| `docs/skill-dependencies.md` | 修改 | 登记前置和互补 Skill。 |
| `README.md` | 修改 | 登记中文能力。 |
| `README_en.md` | 修改 | 登记英文能力。 |
| `CHANGELOG.md` | 修改 | 登记新 Skill。 |
| `docs/dev-log/2026-08-13.md` | 新增 | 记录为何独立于架构 Skill。 |
| `.claude-plugin/plugin.json` | 修改 | Minor 版本升级。 |
| `.claude-plugin/marketplace.json` | 修改 | 同步插件版本。 |
| `plugins/team-standards/.codex-plugin/plugin.json` | 修改 | 同步插件版本。 |

### 关键内容职责

```text
frontend-excellence#orient-project — 读取项目、识别现有框架和设计系统
frontend-excellence#define-direction — 将内容和品牌线索收敛为单一视觉方向
frontend-excellence#implement-system — 通过令牌、基础组件和 Feature 组合实现页面
frontend-excellence#verify-experience — 在真实浏览器中验证视口、状态和交互
```

## 4. 数据结构

Skill 不新增运行时数据结构。规则资料按以下三类稳定分区：

```text
architecture-and-state    前端目录、依赖、状态、数据边界
design-system-and-aesthetics    视觉语言、令牌、组件与页面构图
quality-gates             响应式、可访问性、性能、测试和交付证据
```

## 5. 重要约束与边界

- 兼容性：已有项目优先复用现有设计系统和组件库。
- 依赖：不得仅为实现单页美学效果擅自更换框架或引入大体积 UI 框架。
- 验证：至少覆盖一个桌面和一个移动视口；高风险交互补键盘与错误路径。
- 可回滚：新增 Skill 与索引接线保持独立，不改变现有 Skill 名称或目录。
- 上下文：每个详细参考仅在对应任务阶段读取，避免无条件加载。

## 6. 下游依赖调用

```text
architecture-ddd-lite-fullstack — 提供 Feature 分层与依赖方向
coding-standards-common — 提供跨语言源码质量规则
imagegen — 在需要原创位图或视觉探索时使用
browser or Playwright — 在页面运行后执行真实浏览器验证
Figma plugin — 仅在用户给出 Figma 资源时读取结构化设计上下文
```

## 7. 异常处理要点

- 未找到项目框架或入口 → 先定位 package manager、构建脚本和应用入口，不直接新建平行工程。
- 缺少设计参考 → 基于受众、内容、品牌和场景建立明确方向，并记录关键假设。
- 浏览器无法运行 → 完成构建与静态检查，明确未完成视觉验收，不宣称完全交付。
- 现有设计系统与参考图冲突 → 优先保持产品一致性，除非用户明确要求重设计。
- 外部插件不可用 → 使用本地文件、截图或文字 brief 继续，不阻断核心工作流。

## 8. 验证命令

```text
python <skill-creator>/scripts/quick_validate.py plugins/team-standards/skills/frontend-excellence
node scripts/sync-agents.js --check
node scripts/check-cross-refs.js
node scripts/check-version-sync.js
node scripts/audit-skills.js --warnings --ci
cd plugins/team-standards/hooks && npm test
```
