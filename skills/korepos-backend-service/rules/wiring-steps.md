# 路由层步骤：Endpoint / Handler / Registry / 路由挂载 / smoke test

> 子文档 of [korepos-backend-service/SKILL.md](../SKILL.md)。
> 本文件覆盖 8 步编写顺序中"非 DTO / 非 Service / 非 DAO"的路由层步骤：
> - Step 1：Endpoint 枚举
> - Step 1.5：业务枚举
> - Step 6：Handler
> - Step 7：Registry
> - Step 8：在 ApiIntranetHandler 挂载路由
> - Step 9：生成 services 层冒烟/调试入口
> - Service ↔ Endpoint 暴露关系总览

## Step 1：Endpoint 枚举

**路径**：`lib/features/{module}/common/enums/endpoints/{module}_endpoint.dart`

> 路由枚举放在 **common 层**（不是 backend），原因：UI 客户端调用接口时也需要类型安全引用 path（避免硬编码字符串），与 backend handler 共用同一个枚举值即可保证两边的 path 永远一致。

```dart
import '../../../../../common/services/networking/remote_service/api_endpoint.dart';

/// {模块} 端点枚举
///
/// 对接文档：`docs/{模块}/{模块}-UI对接手册-{YYYYMMDD}-v1.md`
/// 路径策略：原则上与前端清单一致；若与老骨架路径冲突则加 `/v2/` 前缀避让，在此注释说明。
enum {Module}Endpoint implements ApiEndpoint {
  /// {接口 1 中文名}
  /// 文档：`docs/{模块}/{模块}-UI对接手册-*.md` §4.1
  actionOne('/xxx/one'),

  /// {接口 2 中文名}
  /// 文档：`docs/{模块}/{模块}-UI对接手册-*.md` §4.2
  actionTwo('/xxx/two');

  const {Module}Endpoint(this.path);

  @override
  final String path;
}
```

- 每个枚举值 **必须有 dartdoc 注释**，指向 UI 对接手册对应章节
- 路径小写，动词在前（`confirm/`、`get/`、`update/`、`rollback/`、`create/`、`cancel/`）
- 与老骨架冲突时加 `/v2/` 前缀，并在 dartdoc 里写明"为避让老骨架"；非冲突接口**不加任何前缀**
- import path 多了一级 `../`：`common/enums/endpoints/` → `common/services/networking/remote_service/`，5 级而非 4 级（旧版 backend/endpoint/ 是 4 级）

## Step 1.5：业务枚举（按需）

接口 DTO 字段引用的业务枚举（状态、类型、原因码）放 `lib/features/{module}/common/enums/business/`，例如：

```
common/enums/business/
├── {module}_state_enum.dart        # 订单/账单状态
├── payment_type_enum.dart          # 业务枚举（internal 域）
└── refund_method_type_enum.dart    # wire 枚举（前端契约面）
```

规则：

- **业务状态/类型枚举**（不区分 wire/internal 的）→ 直接放 `business/` 下，命名 `{xxx}_{state|type|reason}_enum.dart`
- **ACL L2 双枚举**（一个 internal 一个 wire，详见 [dto-and-acl.md § ACL L2 样例](./dto-and-acl.md#l2-样例双枚举物理分离已在项目内应用)）→ 两个文件都放 `business/`，命名后缀显式标注用途
- 已存在的 refund 业务枚举范本：`refund/common/enums/{order_state_type_enum, bill_state_type_enum, transaction_state_type_enum, kpos_pay_result_enum, prepared_reason_type_enum}.dart`
- 这些 `business/` 枚举可被 UI、backend、跨模块共同 import — 是契约层的一部分

---

## Step 6：Handler

`endpoint/{module}_handler.dart` — 全部走 `IntranetHandlerBase` 模板，每个方法仅 5 行

```dart
import 'dart:ui';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:shelf/shelf.dart';

import '../../../../common/backend_infra/backend_infra_riverpod.dart';
import '../dto/request/{action}_request.dart';
import '../service/{module}_{feature}_service.dart';
import 'intranet_handler_base.dart';

part '{module}_handler.g.dart';

@riverpod
{Module}Handler {module}Handler(Ref ref) => {Module}Handler(ref: ref);

/// {模块} HTTP handler 集合
///
/// 每个方法本体仅 3-5 行：构造 Base 模板 → 指定 parse / action / encode。
/// try-catch、日志、错误映射、JSON 读写全部下沉到 [IntranetHandlerBase]。
class {Module}Handler {
  final Ref _ref;
  static const IntranetHandlerBase _base = IntranetHandlerBase();

  {Module}Handler({required Ref ref}) : _ref = ref;

  Locale get _locale => _ref.read(backendInfraProvider).lang.currentLocale;

  Future<Response> actionOne(Request request) => _base.handle(
        request: request,
        locale: _locale,
        logTag: '{Module}Handler.actionOne',
        parse: {Action}Request.fromJson,
        action: (req) =>
            _ref.read({module}{Feature}ServiceProvider).actionOne(req),
        encode: (resp) => resp.toJson(),
      );
}
```

- **禁止** 在 handler 里手写 `try-catch` / `jsonDecode` / `request.readAsString()` — 一律走 `_base.handle(...)`
- Rust FFI 或已经返回 `{code,message,data}` 整包的场景走 `_base.handleRaw(...)`
- `logTag` 规范：`{Module}Handler.{方法名}`，用于 `ZoneLogger.record` 排错

## Step 7：Registry

`registry/{module}_backend_routes.dart`

```dart
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shelf_router/shelf_router.dart';

import '../endpoint/{module}_endpoint.dart';
import '../endpoint/{module}_handler.dart';

/// 把 {模块} backend 的 N 条路径挂到传入的 [router] 上。
void register{Module}BackendRoutes(Router router, Ref ref) {
  final handler = ref.read({module}HandlerProvider);

  router.post({Module}Endpoint.actionOne.path, handler.actionOne);
  router.post({Module}Endpoint.actionTwo.path, handler.actionTwo);
}
```

文件命名对标已存在的 `features/payment/backend/registry/payment_backend_routes.dart`（函数名 `registerPaymentBackendRoutes`）。

## Step 8：在 ApiIntranetHandler 挂载路由（必须完成，否则接口不可访问）

Service 写完不等于接口上线。**Service → Handler → Registry → `api_intranet_handler.dart`** 四环缺一不可，最后一环是在全局 shelf Router 上注册子路由，没做这一步前端调任何 `/{module}/...` 都会 404。

挂载点：**`lib/common/services/networking/intranet_service/api_intranet_handler.dart`**。该文件里已有 backend 路由挂载区块（现有挂载行：`registerRefundV2Routes(router, _ref)` 与 `registerPaymentBackendRoutes(router, _ref)`），新模块在同一块内追加一行即可。

模式：

```dart
// 文件顶部：加一条 import（按字母序排在其他 backend registry import 旁）
import 'package:kpos/features/{module}/backend/registry/{module}_backend_routes.dart';

// 文件中部的路由构建区块 — 找到 backend 路由挂载块：
// === backendv2 路由（v2 接口，独立于 v1）===
registerRefundV2Routes(router, _ref);                // 历史遗留：refund 走 backendv2

// === {module}/backend 路由 ===
register{Module}BackendRoutes(router, _ref);         // ← 新增行

// === payment/backend 路由（POS offline 退款回调独立入口）===
registerPaymentBackendRoutes(router, _ref);
```

**硬约束**：
- **只能修改 `api_intranet_handler.dart` 这一处**。不允许在其他模块的 endpoint 注册点、别处的 Router 构建点挂 backend 路由
- **不删 / 不改已有注释行与已有 registry 调用**（v1 老骨架在自己的 PR 下线，本次不动）
- 如果本次是**同模块追加新接口**（不是首次接入）→ `register{Module}BackendRoutes` 挂载行已存在，**不要重复添加**，只在 Registry 文件里加 `router.post(...)` 即可

**验证挂载成功**：
1. 重启 POS 进程（shelf router 构建时一次性读入）
2. `curl -X POST http://{POS-IP}:{PORT}/{接口 path} -d '{"...":"..."}' -H 'Content-Type: application/json'`
3. 预期回 `ApiIntranetResponse` 结构的 JSON（不管 success=true/false 都算通，只要不是 404）

## Step 9：生成 services 层冒烟/调试入口（联调辅助，强烈推荐）

> Step 1-8 是路由必经环节；**Step 9 不挂路由**，但每个新落盘的 service 都应配一份冒烟测试入口，给联调和自测用。完整模板见 [../templates/test-service-smoke-template.md](../templates/test-service-smoke-template.md)。

**目的**：
- 不起 POS 进程，`flutter test {file}` 单独触发 service
- 改入参直接编辑 dart 文件，省 Postman
- 真实抛错堆栈直接打印
- **不做断言**——这不是 TDD 测试，只是手动调参 + 打印结果的入口；带断言的 flow 测试由开发联调结束后另写

**目录布局**（始终用 `backend/`，refund 测试目录沿用此命名而不跟源码 `backendv2/`，未来 backendv2 改回 backend 时测试 0 迁移）：

```
test/features/{module}/backend/
├── _support/                              # 首次接入该模块时一次性落地
│   ├── test_harness.dart                  # ProviderContainer + 注入 Fake + 暴露 service getter
│   ├── fakes.dart                         # BackendInfra 依赖的跨模块 service 替身
│   ├── test_db.dart                       # 内存 DB / 文件副本 DB / seed SQL 灌入
│   ├── step_runner.dart                   # 给 flows 用的多步编排器
│   └── seed/.gitkeep                      # 占位空目录,业务场景 SQL 由开发自定义
├── flows/.gitkeep                         # 占位空目录,联调结束后开发自己按 step_runner 补
└── services/                              # ← 每写一个 service 同步生成一份
    └── {action}_service_test.dart
```

**源码 → 测试 路径映射**：

| 源码文件 | 测试文件 |
|---|---|
| `lib/features/{module}/backend/service/{action}_service.dart` | `test/features/{module}/backend/services/{action}_service_test.dart` |
| `lib/features/refund/backendv2/service/{action}_service.dart` | `test/features/refund/backend/services/{action}_service_test.dart` |

**Step 9 落地动作**（对每个新增 service 重复）：

1. **判断 `test/features/{module}/backend/_support/test_harness.dart` 是否已存在**
   - 不存在 → 拷模板第 3-6 节内容落 4 个 `_support/` 文件 + 2 个 `.gitkeep`（首次接入该模块）
   - 已存在 → 跳过基础文件，仅在 `test_harness.dart` 末尾的 service getter 区**幂等追加**新 getter（grep `get {newServiceGetter} =>` 已存在则跳过）
2. **生成** `services/{action}_service_test.dart` —— 套模板第 2 节，填占位符（`{module}` / `{backend|backendv2}` / `{ActionRequest}` / `{serviceGetter}` / `{action}` / `{/path}`），入参字段全给 `0` / `''` / `[]` / `false`，标 `// TODO: 按 §4.N 入参表`
3. **回报用户**：列出新增/修改的测试文件路径，给出 `flutter test {file}` 命令一键跑

**Step 9 禁区**：

| 行为 | 为什么禁止 |
|---|---|
| 在 services smoke test 里写 `expect(...)` 业务断言 | 那是 `flows/` 测试的职责；smoke 入口的语义就是"能跑、能改入参、能看输出"，加了断言会模糊定位 |
| 主动给 `flows/` 或 `_support/seed/` 生成内容 | 业务场景语义重，必须由开发联调时定义；用户主动要求时再扩展 |
| 修改已存在 `test_harness.dart` 的 Fake 列表 / Provider override | 当前 6 Fake 是 refund/backendv2 依赖的 BackendInfra 决定的；新模块若需要不同 Fake，独立 PR 处理 |

---

## Service ↔ Endpoint 暴露关系总览

为避免漏挂路由，一份能让前端调到的接口必须满足**四层联动**：

```
UI 对接手册           Service 方法                 Handler 方法                Registry 挂路由           api_intranet_handler
{actionName}     →    actionName(req)        →    actionName(Request)     →    router.post(...)     →    register{Module}BackendRoutes(router,_ref)
{Path}                                             _base.handle(parse,         ↑                          ↑
                                                   action, encode)             用 Endpoint 枚举.path      只挂一次（首次接入）
```

**读法**：每一行从左到右必须同名对应。UI 对接手册里新增一个接口名 / Path，对应：
- Service 里新增一个 public 方法（方法名 = 接口名 camelCase）
- Handler 里新增一个方法（方法名同上，委托给 Service）
- Endpoint 枚举里新增一个枚举值（枚举名同上，path 就是接口的 Path）
- Registry 里新增一行 `router.post({Module}Endpoint.{name}.path, handler.{name})`

**四行里哪怕漏一环**，接口都**暴露不出去**：
- 漏 Service public 方法 → Handler 没法调
- 漏 Handler 方法 → Registry 引用不到
- 漏 Endpoint 枚举值 → 没有路径字符串可挂
- 漏 Registry 的 `router.post` → 路径未注册，前端 404

落盘完每个接口前，对照这张表把四行都补齐再进入自检清单。
