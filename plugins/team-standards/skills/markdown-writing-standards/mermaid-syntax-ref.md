# Mermaid 语法入口与易错边界

用于按图种查语法；表达与校验准则见[格式细则](references/markdown-format.md)。以项目安装版本和目标宿主为准，官方当前示例不能直接证明旧环境兼容。

## 按图种查阅

- 流程、节点与分组：[Flowchart](https://mermaid.js.org/syntax/flowchart.html)。Unicode 标签按官方语法加引号；区分 ID 和显示文本，留意 end 等语法关键字。
- 调用顺序、消息及控制块：[Sequence diagram](https://mermaid.js.org/syntax/sequenceDiagram.html)。官方支持消息/备注换行，参与者名称换行使用别名；实际写法与宿主渲染须核实。
- 层级归类：[Mindmap](https://mermaid.js.org/syntax/mindmap.html)。缩进决定层级，类样式及图标需要宿主提供相应资源；不能笼统称为“不支持样式”。
- 状态、类及实体关系等其他图种：从[官方语法目录](https://mermaid.js.org/intro/syntax-reference.html)选择对应章节，不套用另一图种的关键字、转义和换行规则。

## 兼容写法的取舍

稳定简短的 ID、带引号的显示名、明确分组与较短标签通常更容易维护；这是团队的可读性选择，不是完整的解析器能力边界。长标签先调整信息层次，再选择目标版本支持的换行或 Markdown 文本。

HTML 标签、实体转义、图标字体、主题及安全配置可能影响显示。具体环境不支持时使用文字或结构调整，并说明限制；不维护未经版本验证的 GitHub/GitLab/编辑器全局支持矩阵。

## 精炼反例

- 围栏写成 mermaid 就认为已验证：需要目标环境的解析和可读性证据。
- 在 mindmap 中直接复制 flowchart 的 style 语句：查对应图种和宿主的样式机制。
- 把英文 ID 当成业务名称：为读者提供清楚的中文显示标签。
