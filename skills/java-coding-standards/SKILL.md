---
name: java-coding-standards
description: Use when writing, reviewing, or modifying any Java code. You MUST follow these mandatory rules at all times. Apply automatically without being asked.
---

# Java 编码规范（阿里巴巴黄山版·强制项）

## 概述

以下规则来源于《阿里巴巴 Java 开发手册（黄山版）》【强制】级别条目，编写任何 Java 代码时必须遵守，不得以任何理由绕过。

---

## 1. 命名规范

- 类名用 `UpperCamelCase`；方法名、变量名用 `lowerCamelCase`；常量全大写加下划线（`MAX_COUNT`）
- 抽象类以 `Abstract`/`Base` 开头；异常类以 `Exception` 结尾；测试类以被测类名开头、`Test` 结尾
- POJO 布尔字段禁止加 `is` 前缀（框架反序列化会出错）
- 禁止拼音+英文混用命名；禁止纯拼音命名
- 接口实现类命名为 `接口名 + Impl`；接口方法禁止加 `public` 修饰符
- 领域模型：数据对象 `XxxDO`，传输对象 `XxxDTO`，展示对象 `XxxVO`，禁止混用
- Service/DAO 方法前缀：获取单个 `get`，获取列表 `list`，统计 `count`，插入 `save/insert`，删除 `remove/delete`，修改 `update`

## 2. 代码格式

- `if/for/while/switch/do` 即使只有一行也必须加大括号
- 单行不超过 120 个字符，超出须换行
- 二目、三目运算符左右各一个空格；`if` 与括号之间有空格
- 不同逻辑块之间插入一个空行，禁止连续多个空行

## 3. 注释规范

### 3.1 基本要求

- 类、属性、方法注释必须用 Javadoc（`/** */`），禁止用 `//`
- 所有抽象方法/接口方法必须有 Javadoc，说明做什么、返回值、参数、异常
- 所有类必须注明创建者和创建日期
- 枚举字段必须有注释说明用途
- 注释掉的代码块须说明原因

### 3.2 详细注释强制要求

以下场景必须编写详细的中文注释，不得省略：

**类级注释（必须包含）：**
- 类的职责描述（这个类做什么、为什么存在）
- 所属层级和模块（如：属于 Infrastructure 层控制平面模块）
- 核心设计思路（如：基于 Semaphore 实现并发控制）
- 与其他类的协作关系（如：被 DevPlanUseCase 调用，依赖 AgentExecutor）

**方法级注释（必须包含）：**
- 方法的业务语义（不是重复方法名，而是说明业务意图）
- `@param` 每个参数的含义和约束（如：不能为空、取值范围）
- `@return` 返回值的业务含义（如：返回生成的任务 ID，失败时抛异常而非返回 null）
- `@throws` 可能抛出的异常及触发条件
- 关键业务逻辑的步骤说明（用编号注释标注流程步骤）

**行内注释（以下场景必须加）：**
- 业务规则判断（如：`// 验证评分阈值：>=70 分视为通过`）
- 非显而易见的技术决策（如：`// 使用 ConcurrentHashMap 而非 HashMap，因为多线程并发访问`）
- 魔法数字/常量的含义（如：`// 最大修正次数，超过后不再重试`）
- 降级/容错逻辑（如：`// 向量库不可用时降级为纯 LLM 分析`）
- TODO 标记必须说明待完成的内容和原因

**Record 类注释：**
- Record 类本身须有类级 Javadoc，说明该数据结构的业务含义
- 每个字段须有行内注释或 Javadoc 说明字段用途
- Builder 模式的类须说明必填字段和可选字段

**示例：**

```java
/**
 * 并发控制器 — 基于 Semaphore 限制同时执行的任务数量
 *
 * <p>属于 Infrastructure 层控制平面模块，被 {@link DevPlanTaskManagerImpl} 调用。
 * 通过信号量机制确保系统不会因过多并发任务而过载。</p>
 *
 * @author zhangkai
 * @since 2026-04-06
 */
@Component
public class ConcurrencyController {

    /** 并发信号量，permits 数量由配置项 devplan.max-concurrent 决定 */
    private final Semaphore semaphore;

    /**
     * 尝试获取一个并发执行槽位
     *
     * <p>使用非阻塞方式尝试获取，获取失败立即抛出异常而非排队等待，
     * 避免请求堆积导致系统响应延迟。</p>
     *
     * @throws ConcurrencyExceededException 当前并发数已达上限时抛出
     */
    public void acquire() {
        if (!semaphore.tryAcquire()) {
            // 非阻塞获取失败，说明并发数已满，快速失败
            throw new ConcurrencyExceededException("并发超限，请稍后重试");
        }
    }
}
```

## 4. OOP 规范

- 覆写方法必须加 `@Override`
- 禁止用 `==` 比较 Integer 等包装类（应用 `equals`）
- 浮点数禁止用 `==` 或 `equals` 比较，须用差值范围或 `BigDecimal`
- 字符串拼接用 `StringBuilder.append`，禁止在循环内用 `+`
- 构造方法里禁止写业务逻辑
- POJO 必须实现 `toString()`，禁止在 getter/setter 中写业务逻辑
- 禁止使用 `@Deprecated` 的类或方法
- RPC/POJO 字段须用包装类型，不得用基本类型

## 5. 集合处理

- 覆写 `equals` 必须同时覆写 `hashCode`
- `Arrays.asList()` 返回的 List 禁止 `add/remove/clear`
- 禁止在 `foreach` 里 `remove/add`，须用 `Iterator`
- HashMap 初始化时须指定初始容量（`expectedSize / 0.75 + 1`）
- Map 遍历用 `entrySet`，不用 `keySet` + `get`
- 集合判空用 `CollectionUtils.isEmpty()`，不用 `== null || size() == 0`

## 6. 并发编程

- 禁止 `new Thread()` 手动创建线程，必须使用线程池
- 禁止用 `Executors` 直接创建线程池，须用 `ThreadPoolExecutor` 手动指定参数
- `SimpleDateFormat` 禁止定义为 `static`；JDK8+ 用 `DateTimeFormatter`
- `ThreadLocal` 使用完毕后必须调用 `remove()`
- 并发修改同一记录须加锁（应用层/缓存/数据库乐观锁三选一）
- 多线程集合操作须使用线程安全集合（`ConcurrentHashMap` 等）

## 7. 异常处理

- 禁止用 `try-catch` 做流程控制
- 捕获异常后禁止什么都不做（不处理须向上抛出）
- `finally` 中禁止使用 `return`
- 有事务的 catch 块须手动回滚事务
- 对外接口须用错误码而非异常表达业务结果；RPC 接口须捕获所有异常

## 8. 日志规范

- 禁止直接用 `Log4j`/`Logback` API，须用 `SLF4J` 门面
- 禁止日志中拼接字符串，须用占位符：`log.info("name: {}", name)`
- 生产环境禁止输出 DEBUG 日志
- 异常日志必须同时包含现场信息和堆栈：`log.error("描述: {}", param, e)`，禁止只打 `e.getMessage()`

## 9. 数据库规范

- 表名、字段名用小写字母和数字，禁止驼峰命名
- 表名禁止用复数；必须有 `id`、`create_time`、`update_time` 三个字段
- 禁止使用外键与级联，外键逻辑在应用层实现
- 小数类型用 `decimal`，禁止 `float`/`double`
- 禁止 `SELECT *`，须列明所有查询字段
- WHERE 条件字段须有索引；禁止在索引列上做函数操作
- 禁止 `LIKE '%keyword'` 开头的模糊查询
- 索引不超过 5 个；单值索引字段不超过 5 个

## 10. 安全规范

- 所有用户输入须做有效性校验（防 SQL 注入、XSS、目录遍历）
- 禁止拼接用户输入到 SQL，须用 Prepared Statement
- 禁止明文输出敏感数据（密码、手机号、银行卡号）到日志
- 鉴权校验必须在服务端进行，不得仅靠前端
- 文件上传须校验类型、大小，并限制上传目录

---

## 违规示例快查

| 错误写法 | 正确写法 |
|----------|----------|
| `if (a == b)` 比较 Integer | `if (a.equals(b))` |
| `log.error(e.getMessage())` | `log.error("描述", e)` |
| `new Thread(() -> {}).start()` | 使用线程池 |
| `SELECT *` | 列明字段 |
| `Executors.newFixedThreadPool(10)` | `new ThreadPoolExecutor(...)` |
| 布尔字段 `isDeleted` | 字段名 `deleted` |
| `for` 循环内 `str += x` | `StringBuilder.append(x)` |
