---
name: project-onboard-workflow-reference
description: "init-project-docs 的项目内接入流程；复用已有文档，不依赖集中知识服务。"
---

# 新项目接入

接入目标是让人和 AI 找到本项目规则、业务知识、实现与验证入口，不要求先做完一整套文档。

## 默认路径

1. **确认项目边界**：定位实际代码仓和现有 AGENTS、README、docs、迁移脚本、OpenSpec；聚合工作区只作导航，正文进入所属代码仓。
2. **补齐必要入口**：按[初始化契约](initialization-output.md)执行 plan → apply → status。保留已有文件，已授权初始化不重复审批。
3. **维护项目知识**：优先更新已有业务文档；没有载体且有真实内容时写入 docs/domain，从现有文档索引链接。按 [业务知识维护](../../business-knowledge-maintenance/SKILL.md) 归档业务概览、术语、规则、流程或能力；仅更新变化章节，保留确认依据。
4. **核对存储与行为**：DDL 使用项目迁移、建表脚本或已授权只读 Schema。业务推断保持草稿；已有 OpenSpec 或设计只维护原文，不复制一份 Core Spec。
5. **按需补上下文**：默认定向搜索、LSP 和 Git 定位；复杂关系且项目已采用时再使用 Graphify；项目已采用 OpenSpec 时按其流程校验。没有运行证据就写明未核实，不创建空证据配置或全模块挖掘任务。
6. **维护连接关系**：涉及跨项目调用才更新 cross-project-topology；正文只记录连接和指向双方项目的引用。不依赖 Domain Knowledge 的程序、数据或查询工具。
7. **验证与交付**：检查新增内容、来源、草稿状态与链接，确认相同主题只有一处维护，再按项目规则提交。只报告实际完成和剩余缺口。

## 复杂接入的断点续跑

需要跟踪多步接入时才使用同目录的 onboard-pipeline.mjs：

```text
node onboard-pipeline.mjs plan --repos <项目路径> --name <系统名>
node onboard-pipeline.mjs mark --name <系统名> --stage knowledge --status done
node onboard-pipeline.mjs status --name <系统名>
```

保留 fetch/profile/coding/graphify/knowledge/core-spec/evidence/topology/verify 阶段 ID，兼容已有状态；阶段只是进度，不要求生成同名文档。

- fetch、profile、knowledge：确认项目边界、入口和本地知识归属。
- coding：仅实际编码风险需要时采用编码保护；否则可 skipped。
- graphify、core-spec、evidence：按项目采用情况与本次目标执行，不适用可 skipped；已要求但缺证据时记录 pending / needs-review / waiting-evidence。
- topology：存在跨项目调用才登记，否则 skipped。
- verify：检查所有适用阶段的真实结果，不将未核实项报为完成。

脚本保存的是接入进度，业务正文始终留在项目。不得再调用集中仓 bootstrap、catalog、spec-mine 或 reload_knowledge 来完成项目初始化。

## 旧资料迁回项目

先盘点来源和实际项目根，再查现有主题。相同内容合并或改成引用；不同版本保留有日期的历史资料，指定唯一当前正文。保留 ID、草稿状态与证据，不把复制成功等同业务确认。

文件与引用核对通过后，旧知识仓只保留迁移位置说明；可回退备份不进入日常维护。当前任务未授权停用全局服务时仅报告依赖；用户已授权迁移和停用时连续完成，无需再次确认。
