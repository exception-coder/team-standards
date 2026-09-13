# 技术栈落地规则

## Java / Spring

Controller 只做协议适配；Application Service 编排事务；Domain Service 承载跨实体规则；Repository 接口位于 domain，JPA/MyBatis 实现位于 infrastructure。禁止将 Entity、DTO 和数据库对象混为同一模型。

## Python

FastAPI、Django 或 Flask 路由只做输入输出适配；用例放 application；业务模型不依赖 Web 框架；ORM 模型与领域模型边界明确。

## Flutter / Dart

Page 和 Widget 只表达 UI；状态管理对象负责展示状态与用例调用，不直接写持久化或复杂业务规则；domain 不依赖 Flutter。

## React / Vue

组件负责展示和交互；业务用例放 feature service/use-case；API、缓存和浏览器能力通过适配器访问；避免把完整业务流程塞入组件 hook。

## Dart 服务端

Route/Handler 做协议适配；application 编排；domain 保持框架无关；数据库和远程调用实现放 infrastructure。


## Go：按业务复杂度选择 DDD-lite

Go 可使用 DDD、端口与适配器，但目录不是目标。小型 CRUD/工具保持少量按业务命名的包；存在复杂不变量、多个入口、事务编排或外部适配器时再拆以下边界，不为每层生成空包、接口或 DTO。

```text
cmd/api/main.go                  装配依赖、启动与退出
internal/order/domain/          订单行为、值对象、不变量
internal/order/application/     下单等用例、所需端口、事务协调
internal/order/adapter/http/    请求校验、认证上下文、协议与错误映射
internal/order/adapter/postgres/ 仓储与事务实现
```

这是团队可选结构，已有命名和布局合理时保持。`internal` 限制外部导入，不会自动禁止同仓跨 feature 访问；同仓依赖方向仍需审查或项目 import 检查。

- `http -> application -> domain`；适配器实现消费方需要的端口。Go 的小接口优先定义在消费它的 application/domain 包，不一律强制 Repository 放 domain。实现包依赖端口所属包，反向不可；`main` 是装配根，可引用并连接内外层。
- domain 使用普通 Go 类型和行为方法保护不变量；不引用 Gin/Echo 请求对象、SQL/ORM 实现或 HTTP 客户端。不要为了分层机械复制没有差异的数据结构，协议/存储形态有变化压力时再显式映射。
- application 编排用例、授权结果、仓储与事务；handler 不写业务规则，repository 不决定业务流程。可检索聚合才建立领域仓储，不默认每张表一个 Repository。
- 一个原子用例中的读写共享真实事务，可由事务回调/Unit of Work 或项目已有约定提供事务内仓储；不通过全局可变 Tx 或跨 goroutine 共享事务规避边界。外部 RPC/MQ 不属于本地 SQL 事务，需要时明确幂等、补偿或 outbox，不默认引入分布式事务框架。
- 跨 feature 通过明确公开的用例/端口或事件协作，不读取对方私有持久化模型；共享业务不变量有清晰 owner，不全部搬入 `common`。
- 领域测试无需 HTTP/数据库；用例测试覆盖失败与事务行为，适配器用集成测试核对真实 SQL/协议。包依赖使用 `go list -deps` 及项目规则检查；编译能发现循环导入，但不能证明 DDD 分层正确。现有插件 Hook 不宣称已覆盖 Go import 边界。

语言细则见 `go-coding-standards`。布局依据 [Go 模块组织指南](https://go.dev/doc/modules/layout)；DDD 决策与上述分层为团队约定。
