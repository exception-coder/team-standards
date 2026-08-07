# 图谱存储与路由

## 归属

图谱属于被调查服务。多服务问题分别登记各自事实，跨服务关系交给跨项目拓扑能力。

## 渐进目录

- 起步：`00_index.md`、`_candidates.md`、`_sql_candidates.md`、`scenarios/`。
- 成熟：出现至少 3 个稳定场景后，按需增加 `tables/`、`sql/`、`states/`、`capabilities/`。
- 全景：至少 10 个场景或正式发版前，按需生成 ER、能力总览和查询索引。

不要提前创建空目录或空卡片。

## 读取顺序

先读 `00_index.md`；业务问题读对应 scenario；字段和关系问题读 table/DDL；查询问题读 SQL 卡片；状态问题读 state 卡片；实现问题读 capability 卡片。只加载当前问题需要的文件。

