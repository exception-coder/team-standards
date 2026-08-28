---
name: project-profile-generation-reference
description: "init-project-docs 的可选轻量项目画像细则，不作为独立 Skill 发现。"
---

# 轻量项目画像

## 使用条件

只有用户明确要求“生成项目画像”，且项目现有 README、`AGENTS.md` 或知识索引无法承担导航时才生成。默认只输出一份 `project-profile.md`，不再拆分 `business-context.md` 与 `coding-conventions.md`。

## 内容

1. 项目/部署单元身份与仓库边界。
2. 技术栈、构建、测试和启动命令的权威位置。
3. 项目自有规则入口与编码风险；团队通用规范只链接。
4. Graphify、OpenSpec、Domain Knowledge、DDL/数据库与运行证据的入口和状态。
5. 当前缺口、最后核验提交与工作区覆盖说明。

模块、API、调用链和数据访问通过 Graphify 按需查询；行为规格通过 OpenSpec 查询；业务语义通过 Domain Knowledge 查询。画像不得复制这些正文。

## 生成流程

1. 读取项目 `AGENTS.md`、README、构建文件及既有知识索引。
2. 验证 Graphify 对 HEAD/工作区的新鲜度，检查 OpenSpec 与领域知识状态。
3. 生成或增量更新一份导航；每个非显然结论附权威来源。
4. 已有人工内容无法安全合并时停止并报告冲突。
5. 执行 `markdown-writing-standards` 的写前查重与写后校验。

## 完成标准

- 单文件、导航性、可追溯，不成为新的事实数据库。
- 项目规则仍归项目，业务真理仍归 Domain Knowledge，目标行为仍归 OpenSpec。
- 缺失项写“缺失/不适用/待确认”，不编造。
- 密钥、令牌、密码和连接串均不进入画像。
