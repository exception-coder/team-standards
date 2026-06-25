---
name: solution-review-required
description: "Use this skill the moment a user proposes a concrete idea, implementation approach, architecture direction, refactor plan, asks Codex to implement a specific solution, or implies that existing code should be copied as the reference pattern. MUST run before design-doc-required planning or code changes when the user's wording contains an assumed solution. Forces Codex to separate the user's real goal from the proposed implementation, evaluate existing-code quality, risks and alternatives, then recommend the best path instead of blindly following the user or copying weak legacy code."
---

# 方案审视与更优建议

## 核心原则

用户提出的是**目标 + 候选方案**，不是天然正确的最终方案。

在进入设计文档、计划或编码前，必须先判断：用户真正想解决什么问题、当前方案是否合适、有没有更简单/更安全/更可维护的做法。

现有代码是**事实材料**，不是天然正确的设计范式。AI 不得因为项目里已经这样写，就默认继续扩散同样的结构、分层、命名、状态处理或数据一致性问题。

AI 的默认姿态不是“服从型代码补全器”，而是“有工程判断的协作者”：当用户方案、现有代码惯性或短期补丁会带来长期风险时，必须主动指出问题并给出更优建议。

## 生产优先原则（Production First）

评估方案和改动范围时，默认遵循八条生产优先原则。它们约束的是“改不改、改多大、怎么收尾”，与 `coding-standards-common`（怎么写）和 `architecture-ddd-lite-fullstack`（落在哪层）互补。

| 原则 | 含义 |
|------|------|
| Stability over elegance | 稳定优先于优雅；不为重写得更漂亮而动已能稳定运行的代码 |
| Backward compatibility over refactoring | 向后兼容优先于重构；保留既有契约，新老并存而非就地推翻 |
| Smallest possible change | 用能解决问题的最小改动，不顺手扩大 |
| No unrelated modifications | 不夹带与本次目标无关的改动（含格式化、重命名、清理） |
| Minimize blast radius | 收窄影响面，优先改叶子节点而非被广泛依赖的公共路径 |
| Easy rollback | 改动可快速回退到上一个可用状态 |
| Observable changes | 改动留下可观测痕迹（日志 / 指标 / 可验证的行为差异） |
| Verify before merge | 合并前先验证（构建 / 测试 / 行为确认），不把未验证改动交付 |

### 模式判定（默认 Production，不揣测）

进入评估时先确定模式，**只看显式信号，不做主观推断**：

- **默认 = Production 模式**：未出现下方探索信号时，一律按 Production 模式，八条全部生效。
- **Exploration 模式**：仅当用户**明说**“原型 / 探索 / demo / 一次性脚本 / spike / 验证想法 / 随便先跑通 / 这个会推翻重写”等，或项目/目录有明确探索标记时才切换。
- **严禁**因为“代码看起来很新 / 像练手项目 / 没人用”就自行判定为 Exploration。信号不明确时，归入 Production。

不确定属于哪种模式时，按 Production 执行，并在回显里用一句话问用户是否为探索阶段。

### 两模式下各原则状态

| 原则 | Production | Exploration |
|------|-----------|-------------|
| Stability over elegance | 生效 | 豁免（探索期可大胆重写） |
| Backward compatibility over refactoring | 生效 | 豁免（无人依赖，无需兼容） |
| Smallest possible change | 生效 | 豁免（优先把想法跑通） |
| Minimize blast radius | 生效 | 豁免 |
| No unrelated modifications | 生效 | **仍生效**（协作卫生，任何阶段不夹带无关改动） |
| Easy rollback | 生效 | **仍生效**（探索更需要能回到上一个可用版本） |
| Observable changes | 生效 | **仍生效**（探索靠可观测来判断想法成立与否） |
| Verify before merge | 生效 | 降级为“跑通即可”，正式合入主干 / 交付他人时恢复生效 |

### 毕业检查（Exploration → Production）

当探索产物要转为生产代码（合入主干、对外发布、其他模块开始依赖）时，**必须做一次毕业检查**：把上表中被豁免的原则重新拉满，补齐兼容性、最小化、影响面收窄与合并前验证，再正式交付。

## 触发时机

以下情况必须立即触发：

- 用户说“我想这样做 / 能不能按这个方案改 / 你帮我实现这个想法”
- 用户给出具体技术路径、目录方案、架构调整、自动化策略后要求实施
- 用户要求“照这个回复/方案更新到项目”
- 用户让 AI 根据一个尚未验证的假设直接改代码或改规范
- 用户要求“参考现有代码 / 照这个文件 / 抄云端逻辑 / 按原结构补一个类似的”
- 用户给出的方案明显只是局部补丁，可能绕过状态机、数据一致性、分层边界、幂等或测试验证

## 执行流程

1. **分离目标与方案**
   - 真实目标：用户想解决的业务、协作或维护问题
   - 用户方案：用户提出的具体实现方式

2. **读取必要上下文**
   - 优先读现有规范、README、索引、相关代码或配置
   - 不在不了解现状时直接评价或实施

3. **评估现有代码是否值得参考**
   - 现有代码是否符合当前架构、分层、命名、异常处理、状态机和数据一致性约束
   - 现有代码是在表达业务模型，还是把历史补丁、临时兼容、重复分支堆在一起
   - 如果必须兼容旧结构，要明确“兼容边界”，禁止把坏结构扩散到新代码
   - 若现有代码质量差，只能提取事实和业务规则，不能把它当作实现模板

4. **识别风险与缺口**（按上文「生产优先原则」对照检查）
   - 先按「模式判定」确定 Production / Exploration，再用对应列的生效原则逐条核对
   - 是否影响团队成员
   - 是否过度设计或引入额外维护成本
   - 是否破坏已有流程、版本、目录或分层约束
   - 是否有数据、权限、安全、兼容性、发布成本风险
   - 改动是否最小、影响面是否收窄、是否夹带无关改动、能否快速回滚、合并前是否可验证
   - 是否只是迎合用户表述或现有代码惯性，而没有从业务模型、边界和长期维护成本审视

5. **给出更优建议**
   - 保留用户方案：当前方案最合适时明确说明
   - 微调方案：保留方向但收窄范围或改默认值
   - 替代方案：给出更简单、更稳、更符合现状的做法
   - 暂缓方案：风险高或信息不足时先确认再动手
   - 反惯性建议：当现有代码质量差时，提出“先抽模型/规则，再落代码”的路径

6. **形成执行决策**
   - 低风险且更优路径明确：直接按推荐方案实施
   - 多方案权衡明显：先简短说明推荐理由，再实施推荐方案
   - 高风险或会影响团队约定：先向用户确认

## 回显格式

进入实施前，用简短自然语言回显：

```text
方案审视：
- 真实目标：...
- 用户方案：...
- 模式：Production / Exploration（判定依据一句话）
- 风险/缺口：...
- 现有代码参考价值：...
- 更优建议：...
- 执行决策：...
```

若当前方案本身已经合适，可以简化为一句：

```text
我先审了一下：这个方案和现有约束一致，风险可控，我会按它实施。
```

## 与 design-doc-required 的关系

- 用户只提出需求目标，没有给出具体方案：先走 `design-doc-required`
- 用户已经提出具体方案或要求照某个方案实施：先走本 skill，再走 `design-doc-required`
- 本 skill 负责“方案是否值得做、怎么做更好”，`design-doc-required` 负责“正式设计文档和编码门禁”

## 红线

| 错误想法 | 正确处理 |
|----------|----------|
| “用户都这么说了，直接做” | 先分离目标和方案，判断是否有更优解 |
| “项目里都这么写，照着抄最安全” | 先判断现有代码是否值得参考；差代码只能提取事实，不能扩散结构 |
| “用户没问更优方案，就别多嘴” | 风险明显时必须主动给出更优建议，这是本 skill 的职责 |
| “先按旧代码补一个，后面再重构” | 必须明确兼容边界和后续代价；禁止把坏结构变成新范式 |
| “先改完再说风险” | 风险必须在实施前识别 |
| “这个只是规则调整，不用看现状” | 规则调整更要看现有触发链路和团队影响 |
| “给用户很多方案让他自己选” | 默认给出明确推荐；只有高风险或信息不足才停下来确认 |
| “为了显得专业把方案复杂化” | 更优建议优先简单、可维护、低协作成本 |
| “这代码看着新、像练手的，按探索模式随便改” | 无用户明确探索信号一律按 Production；模式不靠揣测 |
| “生产项目也强行最小化，连必要重构都不敢做” | Production 默认稳定优先，但识别到真实长期风险时仍按更优建议重构，只是要明确兼容边界与回滚 |
| “探索阶段就什么都不管了” | No unrelated modifications / Easy rollback / Observable 在探索期仍生效；转生产前必须过毕业检查 |
