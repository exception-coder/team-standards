---
name: init-project-docs
description: "用于接入新代码项目或系统，以及初始化、刷新或检查项目上下文；安全幂等地建立 Agent、文档索引、OpenSpec、Graphify 输入与 Git 共享边界，并编排领域知识和新鲜度状态。"
---

# 项目上下文接入

目标：项目规则、行为规格、实现事实和业务证据有可用入口与真实状态。共同准则及证据分工见[工程宪法](../change-readiness/references/engineering-principles.md)。

## 模式与判断准则

| 请求 | 行为与按需参考 |
|---|---|
| 检查状态 `status` | 只读检查项目入口、图谱覆盖、规格与知识缺口 |
| 初始化工程结构 `structure` | 用 [init-ai-structure](references/initialization-output.md) 创建缺失入口，保留既有内容 |
| 完整初始化 `init` | 完成 structure，再构建/校验 Graphify、严格校验 OpenSpec，核对领域与运行证据入口 |
| 新系统接入 `onboard` | 按[接入流程](references/onboard-workflow.md)使用 onboard-pipeline 断点续跑 |
| 刷新 `refresh` | 按 [Git 变化](references/update-workflow.md)刷新受影响权威产物 |
| 独立画像 `profile` | 仅在明确要求时按[画像规则](references/project-profile-generation.md)保存轻量导航 |

检查状态不因缺项升级为初始化。明确初始化时，默认根目录为当前项目，用户指定其他路径才覆盖；创建范围不能扩到父目录或其他仓库。

## 必要约束

- 复用项目规则和已有事实入口，不生成平行代码清单或 00–10 文档树；项目专属架构和业务规范留在项目内。
- 初始化器按字节保留已有正文与配置，管理标记区按其合同处理；禁止强制覆盖。初始化不写业务代码、不安装升级工具、不改全局配置或创建定时任务。
- Graphify 按当前可用 Skill 构建或增量更新，核对 HEAD 与相关工作区覆盖；缺失时报告 pending，确定性扫描降级标 fallback。
- OpenSpec 按项目采用情况初始化或链接；空配置标 initialized-empty，不伪造 specs/changes。领域候选、缺失 DDL 和未取得运行证据分别报告。
- 当前设计接入用[基线指引](references/design-baseline-adoption.md)及既有 status/plan/apply 协议；仅在项目明确采用绑定治理时使用[设计准备](../change-readiness/references/automatic-design-maintenance.md)，不因普通模块修改初始化全项目。

## 初始化操作边界

`structure/init` 按[初始化契约](references/initialization-output.md)先 plan、核对 missing/preserved/update 后 apply，再 status；这是保护既有文件的操作顺序。已授权初始化无需再次审批。

最小结构覆盖 Agent 入口、既有文档导航与架构入口、OpenSpec 配置、Graphify 输入排除及 Git 共享边界。具体文件清单、保留策略和命令归上述契约。

## 精炼反例

- 用户只问状态，发现入口缺失就自动创建：保持 status 只读。
- 图谱文件存在就称上下文新鲜：核对当前提交及未提交改动覆盖。
- 创建空 OpenSpec 配置就称业务规格齐备：报告 initialized-empty。
- 把某项目的 Java/Oracle 规则写进通用模板：保留在项目自身入口。

完成时说明项目边界、各入口状态、覆盖与缺口；默认会话交付，独立画像按请求保存。结构检查通过、设计内容认可、真实接入和运行验证分别报告。
