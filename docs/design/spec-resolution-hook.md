# Existing Spec Resolution Hook

## 设计与边界

Hook 在写前/提交前通过宿主配置的 Forge CLI 发送 project、changeId、branch、operation 和文件范围，消费 allowed/code/actions，不实现检索或自然语言分类。Forge 实现及本轮规格归 kai-toolbox 的 `resolve-existing-specs` change；插件保持独立可安装。

默认 warn，block 拒绝未就绪结果，off 不调用；不可用默认跟随模式，可显式配置 warn。只在 OpenSpec 项目启用，不阻止规格规划文档编辑。提交识别复用命令解析模式，无法覆盖任意 Shell 副作用。跨宿主触发必须实测，不宣称注册即生效。

## 验收

覆盖可实施、未确认、配置缺失、超时、非法响应、非 OpenSpec、规划文档豁免和带空格路径。宿主命令以参数数组启动 Node，不拼接 Shell。原有文档及交付门禁不被替代。

4.6.0 补齐用户目录 runtime 发现、session_id 对应项目/分支/change 的路由、Codex freeform apply_patch 载荷与 exec_command 匹配。无 session 绑定保持明确失败，不回退到任意活动 change。源码范围仍由 Forge 确认清单检查；插件不复制该逻辑。新增载荷先适配到已有共享输入契约，不改变共享 adapter 或 Golden fixture。

验证：Hook 全量 239 项中 238 通过、1 跳过、0 失败；含隔离 Codex CLI 安装。真实临时 Git 项目调用新编译 Forge CLI，未确认返回 2，确认范围内返回 0，范围外返回 2。该证据不替代当前桌面任务中插件重载后的触发验收。
