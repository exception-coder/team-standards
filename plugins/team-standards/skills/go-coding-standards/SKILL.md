---
name: go-coding-standards
description: "Use when writing, reviewing, or modifying Go code. Adds idiomatic package and interface design, error handling, context cancellation, concurrency ownership, resource safety, and Go verification to the common coding standards."
---

# Go 整洁编码规范

叠加 `coding-standards-common`；业务边界与 DDD 分层使用 `architecture-ddd-lite-fullstack` 的 Go 章节。Go 的包、接口、错误与并发规则以本 Skill 为语言专属解释，不套用 Java 的类、Javadoc、异常和线程池要求。

## 开始前

读取 `go.mod`、`go.work`（存在时）、项目 Agent 入口和现有包结构；按声明的 Go/toolchain 版本编码。不顺手升级 Go、引入 DI 框架或批量执行 `go mod tidy`。

## 包、类型与接口

- 使用 `gofmt`，沿用项目 import 工具；包名短、小写、表达职责，避免 `utils`、`common`、`manager` 收容不相关代码。
- 默认不导出标识符；导出名避免包名重复。使用组合，不模拟继承、抽象基类或 `XxxImpl` 层次。
- 接口通常由消费方定义，只描述当前所需行为；不要给每个 struct 配一个接口，也不为 mock 方便建立全量仓储接口。一般返回具体类型，已有稳定 API 不为形式改签名。
- 接收者命名一致，按修改语义、复制成本和方法集选择值/指针；包含 mutex 等不可复制状态的类型不按值复制。
- 注释说明契约、生命周期或不明显的原因。导出 API 的文档注释以符号名开头，使用 Go doc comment，不生成 Java 风格 `@param` 模板或给每个私有字段机械补注释。
- 不为零值天然有效的类型强造构造器；需要保护不变量时使用显式构造/行为方法。注意 interface 内含 typed nil 时并不等于 nil。

## 错误与副作用

- 检查返回的 `error`；只在能解释安全原因时忽略。添加操作上下文，需保留可识别错误链时用 `%w`，以 `errors.Is/As` 判断，不比较错误文案。
- 预期失败返回 error；不使用 panic 处理用户输入、数据库失败或常规业务分支。recover 留在明确的进程/请求隔离边界，不掩盖损坏状态。
- 错误由责任边界统一记录，避免逐层“打印再返回”。沿用项目结构化日志，记录必要业务标识，不输出凭据或敏感载荷；不强求每个 Go error 自带堆栈。
- 及时关闭文件、响应体和 rows，检查 `rows.Err()`；循环内长时间持有资源时抽取局部函数或显式释放，不把所有 defer 堆到整个批次结束。
- SQL 使用参数绑定；事务中统一使用同一个 `sql.Tx`，处理 Begin/Commit 错误并保证失败路径回滚，不混用事务外 `sql.DB` 操作假装原子性。具体数据证据走 `backend-evidence`。

## Context 与并发

- 请求范围的 `context.Context` 通常作为首参 `ctx` 显式传递，不传 nil、不用 context 承载可选业务参数、不随意保存在长期 struct 中。
- 调用链传递取消与期限；派生 context 后确保 cancel 被调用。不在请求下游用 `context.Background()` 丢弃取消。后台任务单独定义生命周期、超时与退出策略。
- 启动 goroutine 前明确谁启动、谁取消、谁等待、如何传递错误。限制并发和队列容量，阻塞发送/接收考虑取消；不用 sleep 同步协程。
- 明确 channel 关闭所有权，通常由发送方协调关闭；不在接收方随意 close，不并发写普通 map，不在锁保护外读写共享可变状态。
- 简单临界区优先 mutex，确需消息传递时用 channel；不为了“Go 风格”把同步逻辑改成异步。事务不会自动保护进程内共享内存。

## 验证与交付

按实际 module/workspace 范围执行格式检查、相关 `go test` 与 `go vet`；多 module 不把工作区根 `go test ./...` 当作已覆盖全部模块。并发改动增加受支持环境下的 `go test -race`，其通过只覆盖实际运行路径。

测试针对行为、边界、错误与取消；表驱动测试按可读性选择，不强制所有测试套模板。已有 Staticcheck/golangci-lint 时沿用已固定版本和项目配置；不因本 Skill 自动安装新工具。环境或外部依赖缺失时报告未验证项，不把静态阅读当作运行通过。

## 依据

Go 官方 [Code Review Comments](https://go.dev/wiki/CodeReviewComments)、[模块布局](https://go.dev/doc/modules/layout)、[事务处理](https://go.dev/doc/database/execute-transactions)。DDD 分层是团队针对业务复杂度的约定，不是 Go 官方强制目录标准。
