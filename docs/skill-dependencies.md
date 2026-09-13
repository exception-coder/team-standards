# Skill 依赖与模式

全部职责域与节点见 [套件全景](suite-panorama.md)。下图只表示实施依赖，箭头不代表自动取得授权。

## 主依赖

```mermaid
flowchart LR
    ANALYSIS["现状理解 / 规划 / 异常调查"] --> SCOPE{"当前是否包含已授权实施?"}
    SCOPE -->|"否"| ANSWER["结论、证据和缺口"]
    SCOPE -->|"是"| DESIGN["change-readiness"]
    DESIGN --> FACTS["按需后端事实与设计依据"]
    FACTS --> ARCH["architecture-ddd-lite-fullstack"]
    ARCH --> COMMON["coding-standards-common"]
    COMMON --> SPECIAL["按需 Java / LLM / UI / 编码保护"]
    SPECIAL --> VERIFY["delivery-verification"]
    VERIFY --> SYNC["受影响文档与按需日志"]
    SYNC --> COMMIT["git-commit-standards"]
```

## 依赖表

| Skill | 前置 | 后续 / 叠加 |
|---|---|---|
| `change-readiness` | 用户意图、OpenSpec 配置与可用项目证据 | 自动 change 生命周期、架构、后端事实或编码标准 |
| `bug-doc-required` | Bug 现象与可验证证据 | 需要修复时进入设计与编码链 |
| `business-logic-orientation` | 现有代码和业务场景 | 结论；已授权重构时继续设计 |
| `planning-evidence-discovery` | 项目范围解析 | 规划输出或设计 |
| `backend-evidence` | 已识别服务边界 | 即时影响分析、领域规格或实施验证 |
| `markdown-writing-standards` | 已确定文档归属 | 受影响的已有导航维护 |
| `architecture-ddd-lite-fullstack` | 设计和代码坐标 | common 与语言规范 |
| `coding-standards-common` | 架构边界 | 按需 Java 或 LLM 专属规范 |
| `frontend-excellence` | 有意义的 Web UI 工作 | `design-system-guardian` 与浏览器验收 |
| `design-system-bootstrap` | 明确初始化或偏好证据 | `design-system-guardian` 消费 Profile |
| `init-project-docs` | 当前项目根和 Git/工作区状态 | structure 建最小入口、`.graphifyignore` 与 Graphify Git 共享边界；onboard/init/refresh/status 编排真实 Graphify、OpenSpec 与领域证据 |
| `daily-work-log` | 用户或项目明确要求日志 | 默认 Git 历史，按需日报按主题合并 |
| `git-commit-standards` | 已验证改动 | commit |

## 规则

- 同一 Skill 的多个模式可以在同一链路中先后执行。
- S 档可缩短设计文档，但不能跳过通用编码标准。
- 状态、字段、事件、API 或数据模型变化必须进入后端事实与影响模式。
- 跨项目契约和项目专属规则由拥有它们的仓库维护。
- Graphify 作为当前实现事实适配器，OpenSpec 作为行为规格与变更制品；Skill 编排两者但不复制其产物。项目启用 OpenSpec 后，M/L 变更必须自动匹配或创建 change，并在实施中持续 update；只有未启用项目或明确批准的单次降级使用 legacy。项目接入不再生成 Graphify Markdown 镜像或 00–10 文档树。
