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

- 类、属性、方法注释必须用 Javadoc（`/** */`），禁止用 `//`
- 所有抽象方法/接口方法必须有 Javadoc，说明做什么、返回值、参数、异常
- 所有类必须注明创建者和创建日期
- 枚举字段必须有注释说明用途
- 注释掉的代码块须说明原因

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
