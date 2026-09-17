# Existing Spec Resolution Hook

## 设计与边界

Hook 在写前/提交前通过宿主配置的 Forge CLI 发送 project、changeId、branch、operation 和文件范围，消费 allowed/code/actions，不实现检索或自然语言分类。Forge 实现及本轮规格归 kai-toolbox 的 `resolve-existing-specs` change；插件保持独立可安装。

默认 warn，block 拒绝未就绪结果，off 不调用；不可用默认跟随模式，可显式配置 warn。只在 OpenSpec 项目启用，不阻止规格规划文档编辑。提交识别复用命令解析模式，无法覆盖任意 Shell 副作用。跨宿主触发必须实测，不宣称注册即生效。

## 验收

覆盖可实施、未确认、配置缺失、超时、非法响应、非 OpenSpec、规划文档豁免和带空格路径。宿主命令以参数数组启动 Node，不拼接 Shell。原有文档及交付门禁不被替代。
