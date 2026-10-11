# 测试资产与原生工具

目标是覆盖独立风险并减少重复准备与无关执行；减少文件或用例数量本身不是提速证据。

## 先查覆盖，再补缺口

- 按稳定业务能力寻找已有套件和夹具。现有有效用例可满足成功、失败、边界验证；优先补充已有场景，只有独立风险、生命周期差异或无法清晰承接的验收缺口才新增测试文件。
- 同一行为场景可包含多个相关断言；独立权限拒绝、失败路径和状态转换仍须可单独定位。不要为减少计数合成难以定位的巨型测试。
- 共享准备过程不等于共享可变状态。数据库结构、只读数据可复用；每例清理可变数据、重建可变对象，保留事务、并发及隔离保障。异常中断也应清理，不依赖执行顺序。
- 文件名、import、被测对象相同只能提示审阅；删除或替代前核对触发条件、断言、生命周期、隔离和消费者是否等价。保留原风险保护，不为了统计减少文件而删断言。

## 优先项目已有原生能力

范围选择优先复用 Maven Reactor、Surefire/JUnit 用例过滤、Vitest 文件过滤与 `related --run`，静态规则优先已有 ESLint、ArchUnit 等。按项目安装版本确认命令；关联测试只能帮助选择，不能代替公共协议的消费者分析。不因列出工具就安装新依赖。

新增公司自定义检查前，在现有任务或提交中说明独立风险、维护归属及已有能力为何不足；优先补充已有检查器，不另建依赖图、测试扫描器、上下文池或验证规划平台。修改检查器时验证其行为，普通业务修改只运行适用检查，不连带重跑无关检查器自测。

Java 上下文和数据库准备见 [Java 测试组织](../../java-coding-standards/SKILL.md#12-测试组织与准备复用)，前端准备见 [frontend-excellence](../../frontend-excellence/SKILL.md)。执行去重和证据边界见 [delivery-verification](../../delivery-verification/SKILL.md#执行范围与证据复用)。

原生能力依据：[Maven Reactor](https://maven.apache.org/guides/mini/guide-multiple-modules.html)、[Spring TestContext 缓存](https://docs.spring.io/spring-framework/reference/testing/testcontext-framework/ctx-management/caching.html)、[Vitest CLI](https://vitest.dev/guide/cli.html)。
