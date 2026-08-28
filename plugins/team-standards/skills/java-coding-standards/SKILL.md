---
name: java-coding-standards
description: Use when writing, reviewing, or modifying Java code. Covers Java-specific rules derived from the Alibaba Huangshan guidelines and complements the common coding standards.
---

# Java 编码规范（阿里巴巴黄山版·Java 专属强制项）

> **本文件只写 Java 独占条款。** 命名表意、函数原子、层次分明、零魔法值、注释三档、异常不静默、删冗余 这 7 条通用铁律在 `coding-standards-common/SKILL.md` 中,Java 编码同时遵守通用 skill + 本文件。
>
> 触发顺序:`coding-standards-common`(通用 7 条) → `java-coding-standards`(本文件 Java 独占)。

---

## 1. 命名(Java 专属补充)

> 通用命名规则见 `coding-standards-common §1`。以下为 Java 独占:

- 抽象类以 `Abstract` / `Base` 开头;异常类以 `Exception` 结尾;测试类以被测类名开头、`Test` 结尾
- 接口方法**禁加** `public` 修饰符(冗余,接口方法默认 public)
- POJO 布尔字段禁加 `is` 前缀(框架反序列化会出错,Jackson / Fastjson 都踩过)

---

## 2. 代码格式(Java 专属)

- `if / for / while / switch / do` 即使只有一行也必须加大括号
- 单行不超过 120 个字符,超出须换行
- 二目、三目运算符左右各一个空格;`if` 与括号之间有空格
- 不同逻辑块之间插入一个空行,禁止连续多个空行

---

## 3. 注释(Java 专属补充)

> 注释三档铁律(类 1-3 行 / 方法 1-2 行 / 核心块 1 行)见 `coding-standards-common §5`。以下为 Java 独占:

- 类、属性、方法注释必须用 **Javadoc 语法**(`/** */`),禁用 `//`
- 所有抽象方法 / 接口方法必须有 Javadoc(`@param` / `@return` / `@throws`)
- 枚举字段必须有注释说明用途
- Record 类本身须有类级 Javadoc;每个字段须有行内注释或 Javadoc

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
            // 非阻塞获取失败,说明并发数已满,快速失败
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
- POJO 必须实现 `toString()`
- 禁止使用被 `@Deprecated` 标记的类或方法
- RPC / POJO 字段须用包装类型(`Integer` 等),不得用基本类型(`int` 等),避免 0 / null 语义混淆

---

## 5. 集合(Java 独占)

- 覆写 `equals` 必须同时覆写 `hashCode`
- `Arrays.asList()` 返回的 List 禁 `add / remove / clear`(底层是定长数组)
- 禁止在 `foreach` 里 `remove / add`,须用 `Iterator`
- `HashMap` 初始化时须指定初始容量(`expectedSize / 0.75 + 1`),避免触发扩容
- Map 遍历用 `entrySet`,不用 `keySet` + `get`(后者多一次哈希查找)
- 集合判空用 `CollectionUtils.isEmpty()`,不用 `== null || size() == 0`

---

## 6. 并发(Java 独占)

- 禁止 `new Thread()` 手动创建线程,必须使用线程池
- 禁止用 `Executors` 直接创建线程池,须用 `ThreadPoolExecutor` 手动指定参数(队列、拒绝策略)
- `SimpleDateFormat` 禁止定义为 `static`(线程不安全);**JDK 8+ 用 `DateTimeFormatter`**
- `ThreadLocal` 使用完毕后必须调用 `remove()`(否则线程池场景内存泄漏)
- 并发修改同一记录须加锁(应用层 / 缓存 / 数据库乐观锁三选一)
- 多线程集合操作须使用线程安全集合(`ConcurrentHashMap` 等)

---

## 7. 异常(Java 专属补充)

> 通用规则(catch 不静默、日志带堆栈、不用 try-catch 做流程控制)见 `coding-standards-common §6`。以下为 Java 独占:

- `finally` 中禁止使用 `return`(会吞掉 try 的返回值或异常)
- 有事务的 `catch` 块须**手动回滚事务**(`TransactionAspectSupport.currentTransactionStatus().setRollbackOnly()` 或抛 RuntimeException)
- 对外接口须用错误码而非异常表达业务结果;**RPC 接口须捕获所有异常**(避免 RPC 框架反序列化失败)

---

## 8. 日志(Java 独占)

- 禁止直接用 `Log4j` / `Logback` API,须用 **SLF4J 门面**(`org.slf4j.Logger`)
- 禁止日志中拼接字符串,须用占位符:`log.info("name: {}", name)`
- 生产环境禁止输出 DEBUG 日志
- 异常日志必须同时包含**现场信息和堆栈**:`log.error("处理订单失败,orderId={}", orderId, e)`,**禁止只打 `e.getMessage()`**(丢堆栈)

---

## 9. 数据库(Java / 关系库通用)

- 表名、字段名用小写字母和数字,**禁止驼峰**命名
- 表名禁止用复数;必须有 `id`、`create_time`、`update_time` 三个字段
- 禁止使用外键与级联,外键逻辑在应用层实现
- 小数类型用 `decimal`,**禁止 `float` / `double`**(精度问题)
- 禁止 `SELECT *`,须列明所有查询字段
- 查询块引用两个或更多表、视图、CTE 或派生表时，`SELECT`、`JOIN ON`、`WHERE`、`GROUP BY`、`HAVING` 和 `ORDER BY` 中的实体字段必须使用表别名限定；结果列标签必须唯一并与 Mapper / DTO 映射一致
- SQL 标识符（表/列别名、CTE、视图、索引、约束等）必须满足目标数据库版本与兼容级别的长度限制。Oracle 在未取得目标环境 `COMPATIBLE` 证据时一律按 **30 bytes** 上限设计；只有确认支持长标识符时才能放宽。领域字段和接口字段不必照搬 SQL 别名，应使用短且稳定的 SQL 别名并显式映射；新增或修改别名时必须补长度断言或目标 Oracle 解析测试
- WHERE 条件字段须有索引;**禁止在索引列上做函数操作**(会失效索引)
- 禁止 `LIKE '%keyword'` 开头的模糊查询(走不了索引)
- 索引不超过 5 个;单值索引字段不超过 5 个
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

## 违规示例快查

| 错误写法 | 正确写法 |
|----------|----------|
| `if (a == b)` 比较 Integer | `if (a.equals(b))` |
| `log.error(e.getMessage())` | `log.error("描述: {}", param, e)` |
| `new Thread(() -> {}).start()` | 使用线程池 |
| `SELECT *` | 列明字段 |
| Oracle 别名 `non_purchase_preparation_recorded`（33 bytes） | 使用不超过 30 bytes 的短别名并显式映射领域字段 |
| `Executors.newFixedThreadPool(10)` | `new ThreadPoolExecutor(...)` |
| 布尔字段 `isDeleted` | 字段名 `deleted` |
| `for` 循环内 `str += x` | `StringBuilder.append(x)` |
| `static SimpleDateFormat sdf = ...` | `DateTimeFormatter.ofPattern(...)` |
| `new HashMap<>()` 然后塞 1000 条 | `new HashMap<>(1334)` |
| `// 这是个 user 类` | `/** 用户聚合根,负责... */` |
| 两模块各写裸 `@Service class AttachmentStorageService`(默认 bean 名撞车) | `@Service("aiChatAttachmentStorageService")` 显式模块限定名 |
