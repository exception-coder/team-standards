---
name: java-coding-standards
description: Use when writing, reviewing, or modifying Java code. Covers Java-specific rules derived from the Alibaba Huangshan guidelines and complements the common coding standards.
---

# Java 编码与关系库实践

补充 `coding-standards-common`，按[工程原则](../change-readiness/references/engineering-principles.md)使用。先核对目标 JDK、框架、数据库及项目约定；风格建议不触发全量改名、类型替换或无关重构。安全、数据一致性和契约要求仍须满足。

---

## 1. 命名(Java 专属补充)

> 通用命名规则见 `coding-standards-common §1`。以下为 Java 独占:

- 抽象类以 `Abstract` / `Base` 开头;异常类以 `Exception` 结尾;测试类以被测类名开头、`Test` 结尾
- 接口方法修饰符沿用项目风格；不为省略隐式 public 单独改动既有代码。
- 布尔属性命名核对访问器和实际序列化配置，保持已有字段契约；不能为风格统一直接重命名对外字段。

---

## 2. 代码格式(Java 专属)

- `if / for / while / switch / do` 即使只有一行也必须加大括号
- 行宽及空白优先交给项目已有 formatter；长表达式按可读性换行，不单设通用硬阈值
- 二目、三目运算符左右各一个空格;`if` 与括号之间有空格
- 不同逻辑块之间插入一个空行,禁止连续多个空行

---

## 3. 注释(Java 专属补充)

公共契约优先用 Javadoc 说明用途、参数含义、结果和失败条件。继承文档、名称已表达清楚的内容不重复；内部注释说明非显然原因即可。枚举与 Record 字段只补充名称无法表达的单位、范围和兼容约束，不按行数或字段数量配注释。

**示例:**

```java
/**
 * 并发控制器 — 基于 Semaphore 限制同时执行的任务数量。
 *
 * <p>属于 Infrastructure 层,被 {@link DevPlanTaskManagerImpl} 调用。</p>
 */
@Component
public class ConcurrencyController {

    /** 并发信号量,permits 数量由配置项 devplan.max-concurrent 决定 */
    private final Semaphore semaphore;

    /**
     * 尝试获取一个并发执行槽位。非阻塞,获取失败立即抛异常,避免请求堆积。
     *
     * @throws ConcurrencyExceededException 当前并发数已达上限时抛出
     */
    public void acquire() {
        if (!semaphore.tryAcquire()) {
            throw new ConcurrencyExceededException("并发超限,请稍后重试");
        }
    }
}
```

---

## 4. OOP(Java 独占)

- 覆写方法必须加 `@Override`
- 禁止用 `==` 比较 `Integer` 等包装类(应用 `.equals()`)
- 浮点数禁止用 `==` 或 `equals` 比较,须用差值范围或 `BigDecimal`
- 字符串拼接用 `StringBuilder.append`,**禁止在循环内用 `+`**
- 仅在调试或接口需要时提供 toString；排除凭据、敏感字段及可能递归或触发懒加载的关系。
- 新代码优先使用受支持 API；存量弃用 API 按兼容性和实际风险迁移，不顺带升级整条依赖链。
- 字段类型按是否允许缺失及序列化契约选择；需要区分 null 与 0 时用包装类型，非空值可用基本类型，不能机械全量替换。

---

## 5. 集合(Java 独占)

- 覆写 `equals` 必须同时覆写 `hashCode`
- `Arrays.asList()` 返回的 List 禁 `add / remove / clear`(底层是定长数组)
- 禁止在 `foreach` 里 `remove / add`,须用 `Iterator`
- 数据规模已知且扩容成本相关时可预设集合容量；普通小集合可用默认构造器，不为容量公式增加复杂度。
- Map 遍历用 `entrySet`,不用 `keySet` + `get`(后者多一次哈希查找)
- 集合判空按 null 契约使用原生 isEmpty 或已有工具，不为统一写法引入新依赖。

---

## 6. 并发(Java 独占)

- 并发执行复用项目受管执行器或目标 JDK 支持的机制，明确生命周期、任务与资源上界、取消及失败处理；避免每次请求无界创建线程或堆积任务，不统一规定必须手写线程池。
- `SimpleDateFormat` 禁止定义为 `static`(线程不安全);**JDK 8+ 用 `DateTimeFormatter`**
- `ThreadLocal` 使用完毕后必须调用 `remove()`(否则线程池场景内存泄漏)
- 并发更新按业务不变量选择原子 SQL、约束、乐观条件或锁，验证冲突行为；不为所有更新统一加锁。
- 跨线程共享的可变集合须有同步或并发策略；线程内局部集合不需要升级为线程安全容器，多步操作还须核对整体原子性。

---

## 7. 异常(Java 专属补充)

> 通用规则(catch 不静默、日志带堆栈、不用 try-catch 做流程控制)见 `coding-standards-common §6`。以下为 Java 独占:

- `finally` 中禁止使用 `return`(会吞掉 try 的返回值或异常)
- 事务失败必须符合实际提交/回滚契约；异常不能被吞掉后意外提交。优先使用框架声明式规则，确需捕获时核对传播与回滚设置，不要求每个 catch 手动回滚。
- 对外错误按现有协议与框架映射，区分预期拒绝和系统失败；在有效边界处理，不要求每个 RPC 方法重复 catch-all 或改造既有错误格式。

---

## 8. 日志(Java 独占)

- 禁止直接用 `Log4j` / `Logback` API,须用 **SLF4J 门面**(`org.slf4j.Logger`)
- 禁止日志中拼接字符串,须用占位符:`log.info("name: {}", name)`
- 生产诊断日志遵守项目开关、时限和敏感信息策略，不因级别低就输出凭据，也不一律禁用排障日志。
- 异常日志必须同时包含**现场信息和堆栈**:`log.error("处理订单失败,orderId={}", orderId, e)`,**禁止只打 `e.getMessage()`**(丢堆栈)

---

## 9. 数据库(Java / 关系库通用)

- 表、字段和审计列沿用项目与数据库约定；是否需要统一 ID、时间戳由实体生命周期和审计需求决定。
- 关联完整性明确由数据库约束、应用事务或其它已验证机制保证；外键与级联按真实一致性、删除语义及迁移成本选择，不默认禁止或移除已有外键。
- 金额等要求十进制精确语义的数据使用 decimal/BigDecimal；科学测量等近似数值按精度与误差要求选择。
- 禁止 `SELECT *`,须列明所有查询字段
- 查询块引用两个或更多表、视图、CTE 或派生表时，`SELECT`、`JOIN ON`、`WHERE`、`GROUP BY`、`HAVING` 和 `ORDER BY` 中的实体字段必须使用表别名限定；结果列标签必须唯一并与 Mapper / DTO 映射一致
- SQL 标识符（表/列别名、CTE、视图、索引、约束等）必须满足目标数据库版本与兼容级别的长度限制。Oracle 在未取得目标环境 `COMPATIBLE` 证据时一律按 **30 bytes** 上限设计；只有确认支持长标识符时才能放宽。领域字段和接口字段不必照搬 SQL 别名，应使用短且稳定的 SQL 别名并显式映射；新增或修改别名时复用长度检查或目标 Oracle 解析证据，已有有效覆盖不重复新增测试
- 索引按查询模式、选择性、数据规模和写入成本选择，用必要的执行计划或运行证据核实；不要求每个 WHERE 字段建索引，不规定统一索引数量。
- 函数表达式和前导通配查询须核对目标数据库的索引支持及扫描成本；能满足当前规模和响应目标时可采用，不预建搜索平台。
- 禁止先分页取候选、再按 Java 计算结果过滤并持续翻批次凑页；优先把稳定条件下推到数据库，不能下推时先执行 `backend-evidence` 的高风险查询性能门禁
- 禁止在循环或 Stream 中逐条调用 DAO / Mapper / Repository；改用集合查询、批量聚合或预计算能力，确有硬上限的例外须记录最坏查询次数
- 禁止为 `count` / `exists` / 汇总加载全量明细到 Java；使用数据库集合运算，或明确受控离线场景的数据上限与资源边界

---

## 10. 安全(Java 专属)

> 通用安全(用户输入校验、敏感数据脱敏、鉴权服务端)见 `coding-standards-common`(暂未单独成节,后续可补)。以下为 Java 独占:

- 禁止拼接用户输入到 SQL,须用 **PreparedStatement** / MyBatis `#{}` 占位符(不用 `${}`)
- 禁止明文输出敏感数据(密码、手机号、银行卡号)到日志
- 文件上传须校验类型、大小,并限制上传目录

---

## 11. Spring / 依赖注入(Java 专属)

> AI 反复违规行为:新建 `@Service` / `@Controller` 时只顾自己这个类,不查同扫描范围内是否已有同简单类名的 bean,直接埋下启动期 `ConflictingBeanDefinitionException`。本节专治这类「不查重名」。通用原则(任何全局注册名先查重)见 `coding-standards-common §7.7`。

- **默认 bean 名 = 简单类名首字母小写**:`@Component` / `@Service` / `@Controller` / `@Repository` 不显式指定名字时,bean 名就是简单类名首字母小写(`AttachmentController` → `attachmentController`)。
- **同名冲突会让应用起不来**:多模块共用同一 base package、被同一次 `@ComponentScan` 扫描时,两个不同包下的同简单类名类会生成**相同默认 bean 名** → 启动期抛 `ConflictingBeanDefinitionException`,应用直接启动失败(不是运行期才暴露)。
- **新增 `@Component` 系注解的类前,先查重名**:在同一扫描范围内搜一下是否已存在同简单类名的 bean(尤其 `XxxController` / `XxxService` / `XxxStorageService` 这类高频撞名)。可能撞车 → 显式赋**模块限定名**:`@Service("aiChatAttachmentStorageService")` / `@RestController("claudeChatAttachmentController")`。
- **注入按类型,不按名**:依赖注入优先构造器注入、按类型装配;避免按字符串名引用(`@Qualifier("xxx")` / `applicationContext.getBean("xxx")`)。无按名引用时,改 bean 名不影响装配,查重名/改名都安全。
- **同一对象的同名常成对出现**:`XxxController` 撞了,配套的 `XxxService` / `XxxStorageService` 大概率紧随其后一起撞,一并核对、别只改报错那一个。

```java
// ai-chat 与 claude-chat 两模块同处 com.exceptioncoder.toolbox,各有一个 AttachmentController
// 默认 bean 名都是 attachmentController → ConflictingBeanDefinitionException
@RestController("aiChatAttachmentController")      // 显式模块限定名,消除撞名
@RequestMapping("/api/ai-chat/attachments")
public class AttachmentController { }
```

---

## 12. 测试组织与准备复用

- 业务数据库回归归所属模块与稳定能力包，宿主只承接完整资源、升级和跨模块装配；移动套件维护 test-scope 依赖和资源边界。JUnit 标签/Surefire/Failsafe 可区分执行成本，但执行分组不会自动隔离测试源码编译。编译受阻先核对 mvn -version、源码和依赖制品；不追加全仓命令或把单例结果当完整宿主通过。

- 按稳定能力复用已有 JUnit 套件、准备方法及参数化场景，新增依据遵循 [测试资产规则](../coding-standards-common/references/testing-assets.md)。不为小功能重复搭建完整 Spring 应用。
- Spring 上下文配置一致且同一测试进程内，优先利用原生 TestContext 缓存；profiles、属性、mock/bean 覆盖等也是配置身份的一部分。不同配置、事件生命周期或启动失败场景不能强行合并；确实污染上下文时保留必要的重建与隔离，不为提速删除 `@DirtiesContext`。
- 数据库结构及只读夹具可共享，每例清理可变数据、重建可变对象；事务、锁、并发与提交可见性测试保留真实隔离条件，不将回滚视为跨线程或跨进程的万能清理。
- 使用 Maven 模块及 Surefire/JUnit 原生选择能力；必要上游构建不等于执行所有上游测试，按项目真实装配和消费者风险决定。不要为缩短测试破坏进程隔离或自建上下文池。

## 违规示例快查

| 错误写法 | 正确写法 |
|----------|----------|
| `if (a == b)` 比较 Integer 数值 | 按 null 契约使用 equals 或 Objects.equals |
| `log.error(e.getMessage())` | `log.error("描述: {}", param, e)` |
| 每次请求无界创建线程 | 复用受管执行能力并限制实际资源占用 |
| `SELECT *` | 列明字段 |
| Oracle 别名 `non_purchase_preparation_recorded`（33 bytes） | 使用不超过 30 bytes 的短别名并显式映射领域字段 |
| 有限线程数但无限堆积待执行任务 | 根据负载设置排队、拒绝或背压策略 |
| 未核对序列化就重命名布尔属性 | 保留对外契约，核对访问器及序列化配置 |
| `for` 循环内 `str += x` | `StringBuilder.append(x)` |
| `static SimpleDateFormat sdf = ...` | `DateTimeFormatter.ofPattern(...)` |
| 未核实规模就统一套用容量公式 | 扩容确有成本且规模已知时预设，否则沿用默认 |
| `// 这是个 user 类` | `/** 用户聚合根,负责... */` |
| 两模块各写裸 `@Service class AttachmentStorageService`(默认 bean 名撞车) | `@Service("aiChatAttachmentStorageService")` 显式模块限定名 |

## 契约参考

涉及具体实现时按项目版本查阅官方契约：[JDK Map](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/Map.html)、[Spring 事务回滚](https://docs.spring.io/spring-framework/reference/data-access/transaction/declarative/rolling-back.html)、[PostgreSQL 索引](https://www.postgresql.org/docs/current/indexes.html)。数据库差异不能直接套用，旧规范中的风格偏好也不能替代运行证据。
