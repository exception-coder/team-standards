# Skill 链路全景图

> 本文档梳理 team-standards 与 superpowers 各 skill 的触发时机、调用关系及两条主链路，用于解决"该调哪个 skill、顺序是什么"的疑惑。

---

## Skill 总览

| Skill 名称 | 来源 | 触发时机 |
|---|---|---|
| `brainstorming` | superpowers | 任何功能创建、组件构建、行为改动前 |
| `writing-plans` | superpowers | 有 spec 或需求时，制定多步实施计划 |
| `systematic-debugging` | superpowers | 遇到 bug、测试失败、异常行为时 |
| `design-doc-required` | team-standards | 写任何实现代码前（新功能、接口变更） |
| `doc-index-required` | team-standards | 写任何 docs/ 目录下文档前 |
| `bug-doc-required` | team-standards | 编写 bug 分析文档时（内部调用 doc-index-required） |
| `pre-implementation-code-orientation` | team-standards | 文档写完后、开始实施代码前 |
| `java-coding-standards` | team-standards | 编写或修改任何 Java 代码时（自动应用） |
| `test-driven-development` | superpowers | 实现功能或 bugfix 前（先写测试） |
| `verification-before-completion` | superpowers | 声明工作完成、提交或建 PR 前 |
| `requesting-code-review` | superpowers | 完成实现后请求代码审查 |
| `git-commit-standards` | team-standards | 执行 git commit 前 |
| `finishing-a-development-branch` | superpowers | 分支实现完成、决定如何集成时 |

---

## Skill 调用关系图

三类入口，汇入同一条实施链路：

```mermaid
flowchart TD
    %% 入口层
    E1(["新增需求"])
    E2(["接口扩展 或 逻辑调整"])
    E3(["发现 Bug"])

    %% 分析层
    BRAIN["brainstorming\n探讨意图与边界"]
    PLAN["writing-plans\n制定实施计划"]
    DEBUG["systematic-debugging\n定位根因"]
    BDR["bug-doc-required\n编写 bug 分析文档"]

    %% 文档层
    DDR["design-doc-required\n检查或创建设计文档"]
    DIR["doc-index-required\n读取索引 确认无重叠"]

    %% 实施层
    PICO["pre-implementation-code-orientation\n从文档提取代码坐标"]
    JCS["java-coding-standards\n编写代码"]

    %% 收尾层
    GCS["git-commit-standards\n生成规范 commit"]

    %% 入口路径
    E1 --> BRAIN --> PLAN --> DDR
    E2 --> DDR
    E3 --> DEBUG --> BDR

    %% 文档层调用
    DDR -- "写文档前先调用" --> DIR
    BDR -- "第一步强制调用" --> DIR
    BDR -- "修复需要新接口或功能时" --> DDR

    %% 汇入实施层
    DDR -- "文档就绪后" --> PICO
    BDR -- "文档就绪后" --> PICO
    PICO --> JCS --> GCS
```

---

## 功能开发完整链路

```mermaid
flowchart TD
    START(["收到功能需求"]) --> BRAIN["brainstorming\n探讨意图与边界"]
    BRAIN --> PLAN["writing-plans\n制定实施计划"]
    PLAN --> DIR["doc-index-required\n读取索引 确认无重复文档"]
    DIR --> DDR["design-doc-required\n检查已有设计文档\n或引导新建"]

    DDR -- "文档存在且完整" --> ORIENT["pre-implementation-code-orientation\n读设计文档 提取代码坐标"]
    DDR -- "需求变更" --> NEWVER["新建版本文档\n{需求名}-{日期}-v{N+1}.md\n同步更新 coding.md"]
    NEWVER --> ORIENT

    ORIENT --> TDD["test-driven-development\n先写失败测试"]
    TDD --> CODE["java-coding-standards\n按规范实现代码"]
    CODE --> VERIFY["verification-before-completion\n运行验证 确认全部通过"]
    VERIFY --> REVIEW["requesting-code-review\n请求代码审查"]
    REVIEW --> COMMIT["git-commit-standards\n分析 diff 生成规范提交信息"]
    COMMIT --> FINISH["finishing-a-development-branch\n决定 merge 或 PR 方式"]
```

---

## Bug 修复完整链路

```mermaid
flowchart TD
    BUG(["发现 Bug"]) --> DEBUG["systematic-debugging\n系统性定位根因"]
    DEBUG --> DIR["doc-index-required\n读取索引 确认文档唯一性"]
    DIR --> BUGDOC["bug-doc-required\n编写 bug 分析文档\n调用链 Mermaid 根因表格"]
    BUGDOC --> NEED{"修复方案需要\n新接口或功能?"}

    NEED -- "否 纯修复" --> ORIENT["pre-implementation-code-orientation\n从 bug 文档提取代码坐标"]
    NEED -- "是 需扩展" --> DDR["design-doc-required\n先创建功能设计文档"]
    DDR --> ORIENT

    ORIENT --> CODE["java-coding-standards\n实施修复"]
    CODE --> VERIFY["verification-before-completion\n验证修复有效"]
    VERIFY --> COMMIT["git-commit-standards\n type: fix  提交"]
    COMMIT --> MORE{"还有关联 Bug?"}
    MORE -- "有" --> BUG
    MORE -- "无" --> FINISH["finishing-a-development-branch\n完成分支"]
```

---

## 文档-索引-coding 子循环详解

这是最容易混淆的部分，拆解如下：

```mermaid
flowchart LR
    subgraph 分析阶段
        direction TB
        A1["触发：\nbug-doc-required\n或 design-doc-required"]
        A2["doc-index-required\n步骤1 读总索引\n步骤2 读子目录索引\n步骤3 分析内容边界\n步骤4 写文档\n步骤5 半自动更新索引"]
        A1 --> A2
    end

    subgraph 定位阶段
        direction TB
        B1["pre-implementation-code-orientation\n提取 涉及类清单 全类名\n提取 关键代码路径 行号\n精准 Read 不整文件扫描"]
    end

    subgraph 实施阶段
        direction TB
        C1["java-coding-standards\n按规范写代码"]
        C2["代码与文档不符时\n更新 current.md\n或新建版本文档"]
        C1 --> C2
        C2 -- "文档更新后\n同步 coding.md" --> C1
    end

    subgraph 提交阶段
        direction TB
        D1["git-commit-standards\ngit diff staged 分析\n生成规范 commit 信息"]
    end

    分析阶段 --> 定位阶段 --> 实施阶段 --> 提交阶段
```

### 各文档类型与用途

| 文件名格式 | 何时创建 | 谁来读 | 可否修改 |
|---|---|---|---|
| `{需求}-{日期}-v{N}.md` | 需求确定时 | 人 | 禁止，变更须新建版本 |
| `{需求}-{日期}-v{N}-coding.md` | 读完设计文档后自动生成 | AI（节省 token） | 随设计文档版本同步 |
| `{需求}-current.md` | 代码上线稳定后 | AI 优先读取 | 随代码演进直接覆盖 |
| `docs/bug/{名称}/{名称}.md` | 确认 bug 根因后 | AI 实施修复时 | 可补充，不删章节 |
| `docs/{subdir}/INDEX.md` | 首个文档创建时 | doc-index-required 读取 | 随文档新增自动追加 |

---

## 常见困惑速查

| 困惑 | 答案 |
|---|---|
| doc-index-required 和 design-doc-required 谁先? | doc-index-required 先，它是所有 docs/ 写作的前置门卫 |
| bug-doc-required 需要单独调 doc-index-required 吗? | 不需要，bug-doc-required 第一步已内嵌调用 |
| pre-implementation-code-orientation 什么时候调? | 文档写完后、敲第一行代码前，两者之间的桥梁 |
| 需求变更时改原设计文档还是新建? | 新建版本文档（禁止改原文），design-doc-required 第五步有引导流程 |
| coding.md 和 current.md 有什么区别? | coding.md 是版本快照的精简摘要；current.md 是当前代码的终版描述，随代码直接覆盖 |
| 纯 Bug 修复需要调 design-doc-required 吗? | 不需要，bug-doc-required 仅在修复方案引入新接口时才调 design-doc-required |
