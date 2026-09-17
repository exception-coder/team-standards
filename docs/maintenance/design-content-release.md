# 4.3.0 业务设计内容治理交付

## 问题与方案

4.2 能证明设计绑定、切片同步及证据新鲜度，但技术摘要不能稳定满足领导、产品、研发和测试的阅读需要。本次保留已有机制，增加八章概设、九项功能详设和稳定功能编号。业务内容与技术细节分层，四态交付区别规划、实现、验证与上线；未确认收益不编造。

运行实现集中在 `hooks/governance/design-content.js`，由既有 baselines/evidence/service 链路调用，不增加第二套生命周期。功能引用登记于已有 registry；名称、流程、状态仍在正文，运行结果仍在原始验证记录。一个业务功能允许多个 Requirement，Scenario 可指定所属 Requirement，避免按技术规格拆散业务叙述。

与强制迁移所有项目相比，可选 content v1 保留旧绑定。migrate 明确缺口、责任和节点；enforce 增加切片交付检查及内容审阅摘要。保留 policy/checker 历史，升级到 4 后重新 bind/record，不能静默把旧证据当新策略 PASS。

## 配置、接入与完整示例

- [八章/九项内容契约](../../plugins/team-standards/skills/change-readiness/references/design-output-contract.md)：读者、固定目录、裁剪、状态与内容审阅。
- [内容治理协议](../../plugins/team-standards/skills/change-readiness/references/design-content-governance.md)：可用 JSON 配置形状、functionImpacts、review.content、快照及支持边界。
- [AI 原生项目适配](../../plugins/team-standards/skills/init-project-docs/references/design-baseline-adoption.md)：盘点、渐进迁移、执行命令、CI/宿主边界与升级回退。
- [样衣工作区概设](../../plugins/team-standards/skills/change-readiness/references/examples/garment-sample-overview.md)及[功能详设](../../plugins/team-standards/skills/change-readiness/references/examples/garment-sample-detail.md)：真实已提交资料整理，包含正常、异常、权限、并发、恢复和验收设计；验证与发布缺口明确。

## 验收覆盖

| 检查对象 | 验收方式 |
|---|---|
| 旧绑定、同文件双章节 | 原治理回归及内容测试；未接入报告 not-enrolled |
| 固定结构与实际内容 | 八章、九项、非空正文；围栏伪标题和无原因“不适用”拒绝 |
| 功能全景与详设 | 稳定编号唯一、一一对应、真实详设锚点，不接受未登记功能 |
| 规格与证据 | Scenario 实际属于 Requirement，多 Requirement 支持，当前切片证据引用一致 |
| 规划与现状 | 明确四态；未验证目标须标状态并关联活动 change 路径 |
| 实现与上线 | 已验证需证据；已上线另需发布记录，真实性由具名审阅判断 |
| 功能更新 | 对比原 Git 对应功能正文；改其它章节、日期或虚报 unchanged 不通过 |
| 新增功能同步 | 独立新增编号、全景行、详设与证据同步；漏记 added 被拒绝 |
| 删除/替代 | 新旧编号差异、removed 与替代引用、当前正文旧编号残留检查 |
| 内容审阅 | 复用具名 review，绑定当前文档/规格/证据快照，改动后要求重审 |
| 渐进迁移 | migrate 必须有责任、节点和缺口；已 enforce 不得在本切片降级规避 |
| 完整示例 | 样衣示例结构测试，状态保留实现中，不冒充业务验收 |
| 共享入口 | bind → snapshot → record → delivery，失效及范围检查；原归档/CI 链路回归 |

本次内容审阅：Codex `/root` Agent 自审，核对用户八章/九项要求、状态边界、示例来源、旧绑定兼容、功能引用和证据失效路径。该结论不是独立人工审阅，也不是领导/产品的实际阅读验收。

## 验证记录

Windows / Node 24.16.0 / OpenSpec 1.6.0：

- 完整 hooks 回归：215 项，214 PASS、0 FAIL、1 项真实 CLI 用例因未设置路径跳过；[原始输出](evidence/design-content-full.txt)。
- 补设 OPENSPEC_TEST_CLI 后真实 CLI 定向用例：1/1 PASS，无跳过；[输出](evidence/design-content-real-cli.txt)。
- 最终内容检查回归：18/18 PASS，包含完整回归之后补充的新增功能、样衣示例及深层绑定三项；[输出](evidence/design-content-final.txt)。
- AGENTS 同步、跨引用、三 manifest 4.3.0 与工作区总览、Skill 审计均通过；两个受影响 Skill 的 quick_validate 通过。JSON Schema 元校验及内容绑定实例校验通过；17 份改动 Markdown 的本地链接和围栏检查通过。

完整回归与定向补测共同覆盖最终变更；最终审阅补齐了合法六级子标题的支持，新增深层绑定回归并重跑全部内容用例通过；其余运行实现沿用完整回归结果。原有 onboard-workflow.md 无实际 Git 内容差异，未跟踪的根 plugin.json 不被测试的官方 .codex-plugin/.claude-plugin manifest 读取，两项均排除提交；未把其它工作区改动带入结果。

Yoooni One 保持只读，未执行业务回归或部署。套件自动测试不能代替项目试点的真实读者验收。

## 限制与回退

机器证明结构、关联、声明与快照一致，不能自动判断业务合理性、所有自然语言矛盾、未登记的真实代码行为或虚构指标。正文之外的旧引用需内容审阅；宿主 Hook 仍需真实接线验收，模拟测试不等于已启用 block。

支持普通 ATX 标题及标准 Markdown 管道表/相对链接；固定标题相对绑定层级组织，旧文档先 migrate，不为迁移改写历史。回退固定旧插件版本与匹配证据，保留项目正文、绑定和历史记录；不要删除证据或换 session 绕过起始基线。
