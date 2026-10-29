# draw.io 编辑与导出

仅在交付 draw.io 时读取。默认使用现有连接器、MCP 或本地编辑器；没有专项 Skill 时可直接生成原生 XML，不强制安装新插件、桌面程序或渲染服务。

## 可编辑源图

新建时优先 UTF-8、未压缩 XML，便于审阅和修改。已有图可保留原格式；解压应使用实际工具并保留原图。以下是文件结构示意，不是业务模板：

```xml
<mxfile host="app.diagrams.net">
  <diagram id="overview" name="总览">
    <mxGraphModel grid="1" gridSize="10" page="1" pageWidth="1280" pageHeight="720">
      <root>
        <mxCell id="0"/>
        <mxCell id="1" parent="0"/>
        <mxCell id="capability" value="工作能力" vertex="1" parent="1"
                style="rounded=1;whiteSpace=wrap;html=0;fontSize=22;fillColor=#EFF6FF;strokeColor=#3B82F6;">
          <mxGeometry x="100" y="100" width="220" height="90" as="geometry"/>
        </mxCell>
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>
```

- 每页 ID 唯一，`parent`、`source`、`target` 指向本页真实对象；不同页可以复用 ID。
- 每页保留根 cell `0` 及默认层 `1`。节点有 `vertex="1"` 与正宽高，边有 `edge="1"` 及 `mxGeometry relative="1"`。
- 组内坐标相对父容器；移动分组后再检查连线。跨组连接指向实际节点，不接到装饰背景。
- 标签中的 `&`、`<`、`>` 和引号按 XML 正确转义。普通短文本可用 `html=0`；确需富文本时用 `html=1` 并正确转义 HTML 内容。
- 用原生节点、文本、边和分组保存图意。SVG 图标可作为小型内嵌图元，但不把整图栅格化或作为单一 SVG 图片交付；不引入运行时外链图标依赖。
- 常用连接采用 `edgeStyle=orthogonalEdgeStyle`，起止方向明确；仅在真实几何需要时加转折点。原生人物、文档、圆柱或判断形状可减少矩形堆积。
- 节点可换行，但不要把节点的 `whiteSpace=wrap` 直接复制给没有标签宽度的连接线，否则中文可能逐字竖排；普通短边标签使用默认不换行，并实际渲染确认。

最小结构检查可用环境已有的 XML 解析器；检查每页根结构、重复 ID、悬空父子或边引用、无效几何。它不能证明业务正确或视觉可读，不要求额外依赖或自建评分器。

## 图标选择与编辑

优先在 draw.io 的搜索与 More Shapes 中选自带图形，尽量使用同一图标家族。当前模板使用内置 iOS7 Icons；具体名称见[图标对照](visual-language.md#统一图标与语义)。从实际编辑器的样式或官方图形定义核实 `shape=mxgraph.*`，不要猜名字；未知形状可能只显示为普通矩形，必须实际渲染检查。

- 自带 stencil 通常保存为一个原生图形节点，可调整位置、大小、描边、填色，业务文字与连接线继续编辑。它不等同于 PNG/SVG 图片节点，也不表示每条笔画都能取消组合。
- 默认验证图形可选中、可移动缩放与改色，文字能修改、连接端点正确；只有用户明确要求笔画级编辑时才验证该深度，不能因此默认重建图库。
- 图标名称与业务标签分开，原生分组负责对象整体移动；移动后检查边界、标签与连接跟随。业务线挂到可见主体轮廓或稳定语义锚点，不连接到装饰空白。
- 自带图标中也可能有图片型素材，不能只因位于面板中就承诺逐笔画可编辑。遇到外链图片先检查目标环境可访问性；需要独立交付时用合适的自带 stencil 或按需内嵌素材，不依赖不可用外链。

历史 [13 项自建图标库](../assets/native-icon-library.xml)是基础图元组合的 `mxlibrary`，保留兼容旧图，当前三套模板不依赖它。仅当缺少合适自带图标且有实际需求，或用户明确要求可拆分图元时按需采用；不将其误称为 draw.io 自带资源，也不默认继续扩建。

## 打开、编辑与预览

1. 从 `.drawio` 打开最终文件，检查所有页、中文和图形；选择一个节点改字、选择一条连接检查端点。验证可在副本进行，不为了验收改掉最终内容。
2. 在交付尺寸检查溢出、重叠、裁切和箭头；必要时调整后重新打开。
3. 从同一最终源图导出 PNG 或 SVG，逐页选择正确页码并明确命名；源图改变后重导出。普通预览图不能替代源图。

有 draw.io Desktop CLI 时可使用其导出功能。PowerShell 示例（`$drawioExe` 指向已发现的实际可执行文件）：

```powershell
& $drawioExe --export --format png --page-index 0 --output 'architecture.png' 'architecture.drawio'
& $drawioExe --export --format svg --page-index 0 --output 'architecture.svg' 'architecture.drawio'
```

`--page-index` 从 0 开始，按实际安装版本的 `--help` 核对支持项。也可在编辑器使用 File → Export as；需要图像本身也能回到 draw.io 编辑时，选择包含图表数据的导出选项。中文字体、富文本和 SVG 查看器兼容性仍需在实际目标中检查。

只有解析器时先交付 `.drawio` 并明确“结构已检查，未实际渲染/编辑验证”；不要另写一个简化渲染器再声称它与 draw.io 一致。无法导出时说明预览缺口，不伪造成功。

## 官方依据

2026-10-29 核对：[搜索自带图形](https://www.drawio.com/docs/manual/shapes/shape-search/)、[图形与 stencil 的实现区别](https://github.com/jgraph/drawio/wiki/Shapes-and-Stencils)、[iOS7 Icons 官方图形定义](https://app.diagrams.net/stencils/ios7/icons.xml)、[保存格式](https://www.drawio.com/docs/manual/editor/save-file-formats/)及[桌面端源码](https://github.com/jgraph/drawio-desktop)。按实际编辑器版本核实图标和导出能力，不复制上游完整图形库进插件。
