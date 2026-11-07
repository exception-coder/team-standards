---
name: init-project-docs
description: "用于接入项目，以及初始化、刷新或检查项目上下文；默认复用现有业务文档、从代码补齐知识缺口并标注待确认，交付简明业务概览和 draw.io 全景图，随项目维护；OpenSpec 和 Graphify 按需使用。"
---

# 项目上下文接入

目标：让人和 AI 看懂项目做什么、主要业务如何流转、哪些结论已有依据；知识正文与全景图随项目维护。共同准则及证据分工见[工程宪法](../change-readiness/references/engineering-principles.md)。

## 模式与判断准则

| 请求 | 行为与按需参考 |
|---|---|
| 检查状态 `status` | 只读检查项目入口、图谱覆盖、规格与知识缺口 |
| 仅初始化工程结构 `structure` | 仅在明确只要目录或入口时，用 [init-ai-structure](references/initialization-output.md) 创建缺失入口，保留既有内容 |
| 完整初始化 `init` | 先完成默认业务知识与全景图，再按项目采用情况构建/校验 Graphify、校验 OpenSpec，核对运行证据入口 |
| 项目初始化/接入 `onboard` | 按[接入流程](references/onboard-workflow.md)补入口、整理业务知识并配一张 draw.io 全景图；复杂接入才使用进度脚本 |
| 刷新 `refresh` | 按 [Git 变化](references/update-workflow.md)刷新受影响权威产物 |
| 独立画像 `profile` | 仅在明确要求时按[画像规则](references/project-profile-generation.md)保存轻量导航 |

只说“初始化项目/项目知识/项目上下文”时，默认采用轻量 `onboard`：补缺失入口，复用已有文档，从代码补齐主要业务知识，标注推断与缺口，交付一张 draw.io 全景图及同源预览。不能在三个入口文件生成后就报告初始化完成；不默认展开全模块详设或构建知识图谱。

检查状态不因缺项升级为初始化。明确初始化时，默认根目录为当前项目，用户指定其他路径才覆盖；创建范围不能扩到父目录或其他仓库。

## 必要约束

- 复用项目规则和已有事实入口，不生成平行代码清单或 00–10 文档树；项目专属架构和业务规范留在项目内。
- 初始化器按字节保留已有正文与配置，管理标记区按其合同处理；禁止强制覆盖。初始化不写业务代码、不安装升级工具、不改全局配置或创建定时任务。
- 默认以定向搜索、LSP（可用时）和 Git 理解代码；Graphify 仅明确采用且复杂关系需要时构建，缺失不阻断轻量初始化。
- OpenSpec 按项目采用情况初始化或链接；空配置标 initialized-empty，不伪造 specs/changes。领域候选、缺失 DDL 和未取得运行证据分别报告。
- 当前设计接入用[基线指引](references/design-baseline-adoption.md)及既有 status/plan/apply 协议；仅在项目明确采用绑定治理时使用[设计准备](../change-readiness/references/automatic-design-maintenance.md)，不因普通模块修改初始化全项目。

首次初始化整理现状，后续在业务语义变化或明确要求知识整理时，按 [business-knowledge-maintenance](../business-knowledge-maintenance/SKILL.md) 原位更新受影响正文和全景图。Markdown + 轻量 YAML 为正文来源，不强制知识图谱。

## 项目内知识归属

- 业务术语、规则、状态与理由留在所属项目现有 docs；缺少概览时先用 docs/domain/overview.md 合并主要能力、流程、关键规则、依据与待确认项，不强制五件套。已有同主题正文原位补缺，从既有索引链接。
- 代码推断标“待确认”（新知识文件使用 knowledge_status: inferred），保留文件/符号等可定位依据；遇到文档与实现冲突保留双方来源，不擅自改成已确认规则。空仓无业务资料时只说明缺口，不编造正文或业务全景图。
- 同主题已有设计或 OpenSpec 时更新原文，不再维护知识副本；表结构优先复用迁移脚本及实际 Schema，历史快照必须保留来源和日期。
- 新项目不注册 Domain Knowledge、不创建集中库 project 条目、不依赖外部 bootstrap/catalog/reload。代码索引由 Graphify 按需生成，不手工同步第二套模块事实。
- 跨项目共享内容选择一个所属项目作为唯一正文，消费者只引用；cross-topology 仅登记连接关系，不复制项目业务内容。
- 迁入旧资料时先比对重复和归属，保留草稿、证据与历史状态，验证文件和引用后退役旧正文；备份只用于回退。

## 初始化操作边界

`structure/init` 按[初始化契约](references/initialization-output.md)先 plan、核对 missing/preserved/update 后 apply，再 status；这是保护既有文件的操作顺序。已授权初始化无需再次审批。

结构脚本仅补 AGENTS.md、CLAUDE.md、docs/INDEX.md；业务整理和全景图由 Agent 在同次初始化中继续完成，结构检查通过不等于业务整理完成。Graphify、OpenSpec 与完整架构入口通过显式参数按需补齐。产物、保留策略与验收见上述契约。

## 精炼反例

- 用户只问状态，发现入口缺失就自动创建：保持 status 只读。
- 图谱文件存在就称上下文新鲜：核对当前提交及未提交改动覆盖。
- 创建空 OpenSpec 配置就称业务规格齐备：报告 initialized-empty。
- 把某项目的 Java/Oracle 规则写进通用模板：保留在项目自身入口。

完成时说明项目边界、各入口状态、覆盖与缺口；默认会话交付，独立画像按请求保存。结构检查通过、设计内容认可、真实接入和运行验证分别报告。
