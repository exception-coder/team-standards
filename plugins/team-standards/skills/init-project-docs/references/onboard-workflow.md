---
name: project-onboard-workflow-reference
description: "init-project-docs 的项目内接入流程；复用已有文档，不依赖集中知识服务。"
---

# 新项目接入

接入目标是让人和 AI 看懂现有主要业务：默认完成简明业务知识和一张 draw.io 全景图，不要求先做完整模块设计。

## 默认路径

1. **确认项目边界**：定位实际代码仓和现有 AGENTS、README、docs、迁移脚本、OpenSpec；聚合工作区只作导航，正文进入所属代码仓。
2. **补齐必要入口**：按[初始化契约](initialization-output.md)执行 plan → apply → status。保留已有文件，已授权初始化不重复审批。
3. **整理现有业务**：先读现有概览、规格与设计，按主要角色、页面或 API 入口识别能力和主流程；仅对缺口追踪关键服务、状态、数据模型与校验分支，必要时用 Git 查变化。覆盖能识别的主要业务，复杂细节留作明确缺口，不逐类抄录代码。接口存在不等于业务已上线。
4. **原位补齐正文**：按 [业务知识维护](../../business-knowledge-maintenance/SKILL.md) 复用已有主题；无载体时先写一篇业务概览，包含主要能力、主流程、关键规则、必要数据范围与来源/待确认项。代码推断标“待确认”并给文件/符号依据，保留文档与实现冲突；没有已接受规格或业务确认依据时不标 verified。字段引用项目迁移、建表脚本或已授权只读 Schema，不另抄全量数据字典。
5. **配一张业务全景图**：按 [架构图设计](../../architecture-diagram-design/SKILL.md) 复用或更新现有同主题 draw.io 图，连接角色、主要能力、核心对象与业务流转，只保留必要外部联系。推断和规划明确标记；源图导出同源预览嵌入概览，实际检查文字、连线与正文一致。路径及完成条件见[初始化产物](initialization-output.md)。
6. **链接并随项目维护**：从既有索引链接正文和图，在项目 Agent 入口补充业务语义改变时原位更新正文与图的约定。已有同义约定不重复写；后续只更新受影响部分。跨项目内容只引用所属项目，涉及真实跨项目调用才维护 cross-topology，不依赖 Domain Knowledge。
7. **验证与交付**：按初始化产物的完成条件核对正文、证据、图与链接，确认同一主题只有一处维护，再按项目规则提交。说明覆盖的主要业务和待确认项；资料或工具不足时记录缺口，不把三文件 status 成功报告为知识整理完成。空仓无业务证据时不编造内容或图件。

默认用定向搜索、LSP（可用时）和 Git 查代码；Graphify 只在项目已采用且复杂关系需要时使用，OpenSpec 只按已采用流程校验。均不作为知识整理前置条件，不创建空运行证据配置或全模块挖掘任务。

## 复杂接入的断点续跑

需要跟踪多步接入时才使用同目录的 onboard-pipeline.mjs：

```text
node onboard-pipeline.mjs plan --repos <项目路径> --name <系统名>
node onboard-pipeline.mjs mark --name <系统名> --stage knowledge --status done
node onboard-pipeline.mjs status --name <系统名>
```

保留 fetch/profile/coding/graphify/knowledge/core-spec/evidence/topology/verify 阶段 ID，兼容已有状态；阶段只是进度，不要求生成同名文档。

- fetch、profile：确认项目边界与入口；knowledge 包含正文整理、可信度标记和全景图验证，不能仅因目录存在就标 done。
- coding：仅实际编码风险需要时采用编码保护；否则可 skipped。
- graphify、core-spec、evidence：按项目采用情况与本次目标执行，不适用可 skipped；已要求但缺证据时记录 pending / needs-review / waiting-evidence。
- topology：存在跨项目调用才登记，否则 skipped。
- verify：检查所有适用阶段的真实结果，不将未核实项报为完成。

脚本保存的是接入进度，业务正文始终留在项目。不得再调用集中仓 bootstrap、catalog、spec-mine 或 reload_knowledge 来完成项目初始化。

## 旧资料迁回项目

先盘点来源和实际项目根，再查现有主题。相同内容合并或改成引用；不同版本保留有日期的历史资料，指定唯一当前正文。保留 ID、草稿状态与证据，不把复制成功等同业务确认。

文件与引用核对通过后，旧知识仓只保留迁移位置说明；可回退备份不进入日常维护。当前任务未授权停用全局服务时仅报告依赖；用户已授权迁移和停用时连续完成，无需再次确认。
