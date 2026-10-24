---
name: java-coding-standards
description: Use when writing, reviewing, or modifying Java code. Covers Java-specific rules derived from the Alibaba Huangshan guidelines and complements the common coding standards.
---

# Java 编码与关系库实践

目标：在项目实际 JDK、框架和数据库版本下，保护类型、资源、事务与映射契约。共同准则见[工程宪法](../change-readiness/references/engineering-principles.md)，通用代码要求见[通用编码规范](../coding-standards-common/SKILL.md)。

## 语言与资源准则

- 使用项目 formatter；控制语句加大括号，覆写方法标注 `@Override`。公共 Javadoc 说明名称不能表达的参数含义、结果和失败条件。
- 值比较遵循类型与 null 契约；包装数值不用 `==` 判断值，覆写 `equals` 同时维护 `hashCode`。十进制精确金额使用 `BigDecimal`，近似数值按误差要求比较。
- 字段类型及布尔属性名以缺失语义、访问器和序列化契约为准；`toString` 排除敏感字段、递归关系和意外懒加载。
- 集合修改遵循可变性与迭代契约；`Arrays.asList` 不支持增删，遍历中使用支持删除的迭代器等适用方式。循环累积长字符串使用 `StringBuilder`。
- 并发能力由项目管理生命周期，限制实际任务和资源占用，处理取消与失败。共享可变状态需要同步策略，多步操作单独核对原子性；线程池中的 `ThreadLocal` 用后清理，不共享可变的 `SimpleDateFormat`。
- 资源及时释放；`finally` 不用 `return` 覆盖结果或异常。事务失败遵循实际回滚规则，捕获异常不能造成意外提交。
- 沿用项目日志门面，使用参数化日志；异常在责任边界记录现场与堆栈。文件上传限制类型、大小和可写目录。

## 数据库与 Spring 约束

- SQL 参数绑定，显式列出投影字段；多表/CTE/派生表查询限定实体字段，结果标签唯一并与 Mapper/DTO 映射一致。
- 标识符遵守目标数据库的版本限制；Oracle 未取得 `COMPATIBLE` 证据时按 30 bytes 设计，长领域名使用短 SQL 别名并显式映射。
- 关联完整性有明确保证机制；并发更新、索引和查询策略依据不变量及运行证据。SQL 正确性、N+1、应用层过滤分页、无界 count/汇总等风险统一按[后端证据](../backend-evidence/SKILL.md)核实。
- 新增 Spring 组件核对同一扫描范围的 Bean 名。优先构造器注入；改名还要检查按名注入、Qualifier、配置和外部引用，不能只看包名不同。
- API、字段和依赖迁移以兼容性为准；风格调整不能悄悄改变对外契约。

## 测试组织与准备复用

业务回归归所属模块，宿主覆盖完整资源、升级和跨模块装配。复用 JUnit 准备与兼容配置的 Spring TestContext 缓存；配置身份、失败生命周期或上下文污染不同则保留隔离。

数据库结构和只读夹具可以共享，每例隔离可变数据；回滚不能替代跨线程/进程清理。Maven 模块及 JUnit/Surefire 执行过滤不等于测试源码编译隔离。范围与有效证据复用见[交付验证](../delivery-verification/SKILL.md#执行范围与证据复用)，测试新增依据见[测试资产](../coding-standards-common/references/testing-assets.md)。

## 精炼反例

- 捕获事务异常后返回“失败”但实际提交：核对异常传播与回滚契约。
- 两个包都有 `AttachmentService` 就认为没有冲突：核对组件扫描下的实际 Bean 名。
- 为统一风格重命名布尔属性：先验证访问器和序列化字段。
- 每次请求新建线程池，或线程有限但队列无限：同时界定生命周期与资源上限。
