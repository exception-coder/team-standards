---
name: go-coding-standards
description: "Use when writing, reviewing, or modifying Go code. Adds idiomatic package and interface design, error handling, context cancellation, concurrency ownership, resource safety, and Go verification to the common coding standards."
---

# Go 整洁编码规范

目标：包和接口贴合实际调用，资源、错误和并发都有明确归属。共同准则见[工程宪法](../change-readiness/references/engineering-principles.md)；叠加[通用编码规范](../coding-standards-common/SKILL.md)，业务分层按 [DDD-lite](../architecture-ddd-lite-fullstack/SKILL.md) 的 Go 规则。

## 判断准则

- 以 `go.mod`、`go.work` 和项目 toolchain 为依据，使用 `gofmt` 及既有 import 工具。包名表达职责，默认不导出，接口由消费方按所需行为定义。
- 组合与零值优先；需要保护不变量才引入构造与行为方法。接收者按修改语义、复制成本和方法集选择，mutex 等不可复制状态不按值复制；留意 interface 中的 typed nil。
- 错误补充操作上下文，需要可识别错误链时用 `%w` 与 `errors.Is/As`。预期失败返回 error，recover 留在明确隔离边界；责任边界统一记录，避免逐层打印再返回。
- Context 显式传递取消与期限，通常为首参 `ctx`；派生后调用 cancel。后台任务单独定义生命周期，context 不承载可选业务参数。
- goroutine 有启动、取消、等待和错误处理责任；并发与队列有界，阻塞通信可退出。channel 关闭由发送方协调，共享 map/状态受同步保护。

## 必要约束与完成边界

检查返回 error，忽略时有安全依据；文件、响应体和 rows 及时关闭并检查 `rows.Err()`。批量循环中控制 defer 的实际持有时间。SQL 参数绑定，同一事务统一使用 `sql.Tx`，处理 Begin/Commit 失败与回滚。

导出 API 的 Go doc 说明契约和生命周期。按实际 module/workspace 范围执行格式检查、相关 `go test` 和 `go vet`；并发改动在支持环境运行 `-race`。既有静态工具沿用项目版本，结果只覆盖实际执行路径。

## 精炼反例

- 为每个 struct 复制完整接口：接口只表达消费方当前需要。
- 请求下游换成 `context.Background()`：会丢失取消和期限。
- 用 sleep 等待 goroutine 完成：使用明确的同步与退出机制。
- 在 `sql.Tx` 中夹用 `sql.DB` 写入：这些操作不共享事务保证。

## 按需依据

具体语言契约查项目版本对应的 [Code Review Comments](https://go.dev/wiki/CodeReviewComments)、[模块布局](https://go.dev/doc/modules/layout)与[事务处理](https://go.dev/doc/database/execute-transactions)。DDD 是团队的业务边界约定。
