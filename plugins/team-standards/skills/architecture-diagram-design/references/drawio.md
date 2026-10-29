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

## 原生图标与编辑

[原生图标库](../assets/native-icon-library.xml)采用 draw.io 的 `mxlibrary`，每项保存一份原生 `mxGraphModel`，使用 `xml` 属性而非 `data:image`。可通过 File → Open Library from → Device 打开，也可直接从模板复制已有图标组；不会依赖外链图片或字体图标。

- 一个图标是 `style="group;"` 的父 cell 与矩形、椭圆、线段等子 cell；子几何坐标相对组。图标外的名称另存可编辑文字，移动业务节点时图标、标签与连接一同跟随。
- 原生组样式以 `group;` 开始。模板采用 `selectParentFirst=1`，先选整体，再点击进入子图元；不要通过锁定子图元防止误选。样式或 XML 写入成功后，仍需实际抽查整体选择和取消组合。
- 可将图标整体缩放、复制或取消组合，再修改单条线、形状或颜色；修改完成后可重新组合。没有锁定图元，也不把整图或单个 SVG 当作原生分解图元。
- 图标内部线段可用无箭头的原生 edge 和 sourcePoint/targetPoint；它们不是业务依赖。业务关系必须有明确起止对象，优先挂到可见主体轮廓或稳定语义锚点，避免连接止于大片空白。
- 原生图标不是要求自建渲染器；已有基础图元与普通分组已足够，不为本模板增加 DSL 或运行时依赖。

验收时除节点改字与连线端点外，抽查一个图标可以取消组合、单独改动图元并恢复；再检查组合移动后边界与业务连线仍正确。只证明“一个整体能拖动”不足以证明逐图元编辑。

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

2026-10-29 核对：[AI 生成与验证](https://www.drawio.com/docs/reference/diagram-generation/)说明原生 XML 结构与未压缩生成方式；[保存格式](https://www.drawio.com/docs/manual/editor/save-file-formats/)说明 `.drawio` 及嵌入源数据的图片格式；[自定义图形库格式](https://www.drawio.com/docs/reference/format-custom-shape-library/)说明 `mxlibrary` 的 JSON、尺寸和 XML 属性；[组合与取消组合](https://www.drawio.com/docs/manual/editor/group-shapes-connectors/)说明编辑、选择顺序和 `selectParentFirst`；[桌面端源码](https://github.com/jgraph/drawio-desktop)是 CLI 行为依据。实际工具可能较旧，按已安装版本能力操作；不复制上游完整样式手册。
