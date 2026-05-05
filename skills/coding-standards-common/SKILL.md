---
name: coding-standards-common
description: Use when writing, reviewing, or modifying source code in any language (Java / TypeScript / JavaScript / Dart / Python / Kotlin / Go / Vue / React 等). 跨语言通用编码铁律 7 条 + 注释三档,语言专属 skill (java-coding-standards / korepos-backend-service 等) 在此基础上叠加。MUST 自动触发,不需用户显式要求。
---

# 通用编码规范(跨语言)

> 适用于一切源码语言。语言专属规则(如 `java-coding-standards` 的阿里黄山版独占条款、`korepos-backend-service` 的 Flutter backend 规则)在此基础上叠加,不重复。
>
> 触发链路:`coding-standards-common`(通用) → `{language}-coding-standards`(语言专属)。任何源码 Edit/Write 前先满足本 skill 的 7 条铁律,再走语言专属。

---

## 1. 命名表意

- 名字解释「**意图**」而非「类型」或「实现细节」
- 禁拼音+英文混用,禁纯拼音命名
- 常量全大写加下划线(语言惯例允许时),如 `MAX_RETRY_COUNT`
- 类/类型名 `UpperCamelCase`;方法/变量名 `lowerCamelCase`(语言惯例允许时)
- 布尔字段不要以 `is_` / `get_` 前缀(JSON / POJO 反序列化兼容性问题)
- 接口实现类一律 `XxxImpl`;数据/传输/展示对象用 `XxxDO/DTO/VO`,禁混用
- Service / DAO / Repository 方法前缀:获取单个 `get`,获取列表 `list`,统计 `count`,插入 `save/insert`,删除 `remove/delete`,修改 `update`

---

## 2. 函数原子

- **单一职责**:一个函数只在一个抽象层级上做一件事
- **函数体硬阈值 80 行**;超出按业务步骤拆 `_xxxStep` 私有方法,主方法只做编排 + 事务 + 日志
- **参数 ≤4**;再多就收成 Request / Options / Config 对象
- **嵌套 ≤3 层**;再深用 early return、抽方法或卫语句
- 一个文件一个公开类型(语言惯例允许时)
- 构造函数禁写业务逻辑;getter/setter 不写副作用

---

## 3. 层次分明 / 单向依赖

- **上层调下层,下层不反调上层**;UI / Controller / Endpoint / Page 禁直接执行 SQL / HTTP / 第三方 SDK
- **同层禁互相 import**;Service 之间不互调,跨场景复用沉到 `orchestrator` 或原子能力层
- **跨 feature / 跨模块复用**走 `common/` 或等价的原子能力目录,禁复制粘贴
- 业务层禁直接依赖框架细节;领域模型禁带技术框架注解(JPA / Spring / Drift 等)
- 数据对象禁混层使用:DO 留持久层、DTO 走传输边界、VO 给展示层

---

## 4. 零魔法值

- 任何**有业务含义的**数字 / 字符串 / 协议码 → 必须命名常量、枚举或 const
- 例外仅:`0 / 1 / -1`、`true / false`、空串 `""`、空集合、单元测试断言字面量
- **与 DB 字段值 / 协议码 / 状态机绑定的数字** → **强制枚举**,禁裸数字字面量(如 `state == 3`、`item_type=1`)
- 阈值类常量(如 `MAX_RETRY = 3`)用 const 并写一行 WHY 注释说明阈值依据
- 浮点比较禁 `==` / `equals`;金额类用 `BigDecimal` 或差值 ≤ 容差(POS 场景常用 ±0.005)

---

## 5. 注释(三档铁律 —— 全员都要写,但都要短)

> 立场:类、方法、核心代码块**都必须写**注释,但每档都有「简要」上限。优先讲 WHY、当前职责、约束;不允许把变更历史、设计史、实现步骤流水写进源码。

### 5.1 类 / 文件级 — 必须,**1–3 行**

写清:
- 这个类做什么(业务职责,不是实现细节)
- 属于哪一层 / 哪个模块
- 与其他关键类的协作关系(被谁调用、依赖谁)

### 5.2 方法 / 函数级 — 必须,**1–2 行说明 + 参数 / 返回 / 异常**

写清:
- 业务意图(**禁止重复方法名**)
- 每个非平凡参数的含义和约束(空值规则、取值范围)
- 返回值的业务含义(失败语义:抛异常 vs 返回 null vs 返回错误码)
- 可能抛出的异常及触发条件
- 语言有 doc comment 语法(Javadoc / TSDoc / Dart doc / docstring)的优先用 doc comment

### 5.3 核心代码块 — 必须,**1 行**

以下场景必加行内注释:
- **业务规则判断**(如 `// 评分阈值:>=70 视为通过`)
- **非显而易见的技术决策**(如 `// 用 ConcurrentHashMap 因多线程并发`)
- **魔法数字 / 阈值含义**(如 `// 最大修正次数,超过不再重试`)
- **容错 / 降级 / 重试逻辑**(如 `// 向量库不可用时降级为纯 LLM 分析`)
- **并发 / 锁 / 事务边界**
- **TODO / FIXME 必须**带原因和负责人(如 `// TODO(zhangkai): 等 v1.22 接入新协议后删除`)

### 5.4 禁止

- 注释掉的旧代码 → 直接删,VCS 自有历史
- 变更日志 / `[BUGFIX]` / `[DEPRECATED]` / `[ADDED]` / 日期标记 / PR 号 → 进 git commit body
- 段落式设计史 / 实现步骤流水 / 未来版本计划 → 进 design doc
- 重复函数名的废话(`getUser: 获取用户`)
- 无原因 / 无负责人的 TODO / FIXME
- 业务规则的长篇科普(超过 3 行) → 进 design doc 或 bug doc
- 与 `bugfix-coding-style` 冲突的实现步骤复盘

### 5.5 简要原则

类 1–3 行,方法 1–2 行,代码块 1 行。**写不下就说明你想塞实现细节,那部分应该进文档而不是源码。**

---

## 6. 异常不静默

- `catch` 必须**处理**或**显式往上抛**,禁空 `catch`
- 日志必须含**现场参数 + 完整堆栈**;禁只打 `e.getMessage()`(等价于把堆栈丢了)
- 禁 `try-catch` 做流程控制
- `finally` 中禁 `return`(会吞掉 try 的返回值或异常)
- 有事务的 `catch` 块必须手动回滚事务
- 对外接口用错误码 / Result 包装表达业务结果;RPC / 远程接口须捕获所有异常

---

## 7. 删冗余 / DRY but rule of 3

- **三处以上**相同代码才抽公共方法,两处时容忍(避免过早抽象 / 过度设计)
- dead code 直接删,**不留**注释占位
- 不预设未来扩展(YAGNI),三个相似分支再抽抽象
- 重构与删除分开提交,避免一次 PR 既改行为又改结构
- 重复使用 ≥2 feature 的业务计算 → 沉淀到原子能力层(`common/services/` / `common/backend_infra/services/` 等)

---

## 与语言专属 skill 的关系

| 通用 skill(本文件) | 语言 / 框架专属 skill |
|---|---|
| 命名表意 / 函数原子 / 层次分明 / 零魔法值 / 注释三档 / 异常不静默 / 删冗余 | **java-coding-standards**: 包装类比较、SimpleDateFormat、SLF4J 占位符、HashMap 容量、BigDecimal 比较、JDK8+ DateTimeFormatter、SQL 列名规范、索引规则等 Java / 数据库独占条款 |
| 同上 | **korepos-backend-service**: backend 目录结构、BackendInfra 边界、一接口一 service、Service 禁裸 SQL、跨 feature 业务原子能力、长方法拆 step、DB 字段值枚举绑定等 Flutter backend 独占条款 |
| 同上 | **bugfix-coding-style**: 禁源码内变更日志 / 函数头不堆复盘 / 复杂逻辑就近 WHY(本 skill §5.4 与之完全对齐) |
| 同上 | **arch-lint**: Flutter 5 类架构违规自动检测 |

**触发顺序**:任何源码 Edit/Write 前,先满足本 skill 的 7 条铁律 → 再走语言/框架专属 skill 的独占条款 → 最后由 `coding-violation-log` 在用户纠错时登记差异。

---

## 自检清单

写代码前 / 提交前过一遍以下 7 项,有 ❌ 必须改:

- [ ] 命名是否表意?有没有拼音 / 类型填鸭 / 抽象的 `data / info / temp`?
- [ ] 函数有没有超过 80 行?有没有 ≥4 个参数?嵌套是否 ≤3 层?
- [ ] 层次方向对不对?UI / Controller 有没有直接 SQL / HTTP?同层有没有互调?
- [ ] 业务数字 / 协议码 / DB 字段值 是否全部命名常量或枚举?
- [ ] 类有 1–3 行 doc?方法有 1–2 行 doc + 参数/返回/异常?核心代码块有 1 行注释?有没有变更历史 / 注释代码 / 流水账?
- [ ] catch 有没有空吞?日志有没有带堆栈和现场?
- [ ] 是不是三处重复才抽?有没有过早抽象 / dead code 留作"以后用"?
