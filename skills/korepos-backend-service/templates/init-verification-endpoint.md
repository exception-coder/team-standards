# 初始化骨架：{Module} backend 验证端点（ping）

当用户需求未最终确定、但希望先把 `features/{module}/{common,backend}/` 的目录结构、门面接入、路由注册链路跑通时，用这份「验证端点（ping）」方案起步。

**承诺**：需求明朗后，`ping` 端点可直接**整块删除**（common 下的 Endpoint 枚举值 + 2 个 DTO + backend 下的 Service 方法 + Handler 方法 + Registry 的 `router.post` 行），不会牵连其他业务代码。

## 目录布局速览

```text
lib/features/{module}/
├── common/                                              # ← 契约层(UI + backend 共用)
│   ├── enums/
│   │   └── endpoints/
│   │       └── {module}_endpoint.dart                   # 文件 1：路由枚举
│   └── models/
│       ├── request/
│       │   └── ping_request.dart                        # 文件 3：入参 DTO
│       └── response/
│           └── ping_response.dart                       # 文件 4：出参 DTO
└── backend/                                             # ← 后端蓝本(独立服务化时整体搬走)
    ├── endpoint/
    │   ├── {module}_handler.dart                        # 文件 6：HTTP handler
    │   └── intranet_handler_base.dart                   # 文件 2：模板基类(从 refund 拷贝)
    ├── service/
    │   └── {module}_ping_service.dart                   # 文件 5：service
    └── registry/
        └── {module}_backend_routes.dart                 # 文件 7：路由注册
```

## 使用流程

1. 占位符 `{module}` / `{Module}` 全部替换（小写模块名 / 大写驼峰）
2. 按下方顺序生成 7 个文件（注意 1/3/4 在 `common/` 下，2/5/6/7 在 `backend/` 下）
3. 在 `lib/common/services/networking/intranet_service/api_intranet_handler.dart` 的 backend 路由挂载块追加一行 `register{Module}BackendRoutes(router, _ref);`
4. 跑 `dart run build_runner build --delete-conflicting-outputs` 生成 `*.g.dart`（DTO 用 `@JsonSerializable()`，**不写 freezed**，因此没有 `*.freezed.dart`）
5. 用 Postman / curl POST `http://{POS-IP}:{PORT}/{module}/ping`，payload `{"echo":"hello"}`，预期回 `{"success":true,"message":"...","data":{"echo":"hello","serverTimeMillis":..,"tenantId":..}}`
6. 验证通过后 → 开始按真实 UI 对接手册扩展；`ping` 可在首个真实接口落地后一并删除

> **关于 Step 9 测试入口**：`ping` 端点**不走** Step 9 的 services smoke test 生成（它本身就是 curl 验证用的入口，再起 `flutter test` 反而绕路）。首个**真实业务接口**按八步落盘后，再按 SKILL.md「Step 9」+ [test-service-smoke-template.md](test-service-smoke-template.md) 给真实 service 配 smoke test。

---

## 文件 1 / 7：`common/enums/endpoints/{module}_endpoint.dart`

```dart
import '../../../../../common/services/networking/remote_service/api_endpoint.dart';

/// {模块} 端点枚举
///
/// 初始仅含 [ping] 验证端点；真实接口按 UI 对接手册追加枚举值。
/// 放在 common/ 下：UI 客户端调用接口时也通过本枚举引用 path,避免硬编码字符串。
enum {Module}Endpoint implements ApiEndpoint {
  /// 验证端点：确认 backend 路由链路通、BackendInfra 门面接入正确。
  /// 真实接口上线后可移除本条。
  ping('/{module}/ping');

  const {Module}Endpoint(this.path);

  @override
  final String path;
}
```

> 注意 import path 是 5 级 `../../../../../`（`common/enums/endpoints/` → `common/services/networking/remote_service/`），不是 4 级。

---

## 文件 2 / 7：`backend/endpoint/intranet_handler_base.dart`

**直接从 `features/refund/backendv2/endpoint/intranet_handler_base.dart` 原样拷贝**，不修改。每个新模块各自持有一份拷贝（未来可下沉到 `common/backend_infra/`，当前先保持现状）。

> `backendv2` 是 refund 的历史命名，仅作为拷贝源。新模块拷贝后放在自己的 `backend/endpoint/intranet_handler_base.dart`，文件内容完全相同。

---

## 文件 3 / 7：`common/models/request/ping_request.dart`

```dart
import 'package:json_annotation/json_annotation.dart';

part 'ping_request.g.dart';

/// 接口 POST /{module}/ping 入参
///
/// 验证端点专用，不接入真实业务；真实接口上线后可移除。
/// 放在 common/ 下：UI 端如需调用本接口可直接 import 同一份 DTO。
@JsonSerializable()
class PingRequest {
  /// 任意回显字符串，服务端原样回写，用于确认 JSON 编解码正确
  final String echo;

  const PingRequest({required this.echo});

  factory PingRequest.fromJson(Map<String, dynamic> json) =>
      _$PingRequestFromJson(json);

  Map<String, dynamic> toJson() => _$PingRequestToJson(this);
}
```

---

## 文件 4 / 7：`common/models/response/ping_response.dart`

```dart
import 'package:json_annotation/json_annotation.dart';

part 'ping_response.g.dart';

/// 接口 POST /{module}/ping 出参 data
@JsonSerializable()
class PingResponse {
  /// 回显入参 echo 字段，原样透传
  final String echo;

  /// 服务端当前时间戳（UTC 毫秒），BackendInfra 未暴露时钟能力，故直接 DateTime.now()
  final int serverTimeMillis;

  /// 当前租户 ID，取自 BackendInfra.kvStorage.getTenantId()
  final int tenantId;

  const PingResponse({
    required this.echo,
    required this.serverTimeMillis,
    required this.tenantId,
  });

  factory PingResponse.fromJson(Map<String, dynamic> json) =>
      _$PingResponseFromJson(json);

  Map<String, dynamic> toJson() => _$PingResponseToJson(this);
}
```

---

## 文件 5 / 7：`backend/service/{module}_ping_service.dart`

```dart
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../../../common/backend_infra/backend_infra.dart';
import '../../../../common/backend_infra/backend_infra_riverpod.dart';
// DTO 来自 common 契约层(UI + backend 共用,不是 backend 自持副本)
import '../../common/models/request/ping_request.dart';
import '../../common/models/response/ping_response.dart';

part '{module}_ping_service.g.dart';

@riverpod
{Module}PingService {module}PingService(Ref ref) =>
    {Module}PingService(infra: ref.read(backendInfraProvider));

/// {模块} 验证端点 service
///
/// 职责：确认 BackendInfra 门面能在本模块内正常注入并读到 tenantId。
/// 真实接口上线后可整体移除本文件。
class {Module}PingService {
  final BackendInfra _infra;

  {Module}PingService({required BackendInfra infra}) : _infra = infra;

  Future<PingResponse> ping(PingRequest req) async {
    return PingResponse(
      echo: req.echo,
      serverTimeMillis: DateTime.now().millisecondsSinceEpoch,
      tenantId: _infra.kvStorage.getTenantId() ?? 0,
    );
  }
}
```

> 符合 SKILL.md 「Service 粒度规则」节的强制要求：一接口一 service 文件，类内仅 1 个 public 方法（`ping`），方法名与 Endpoint 枚举值同名。后续真实业务 service 也必须保持这个粒度。
>
> DTO import 路径关键：从 `backend/service/` 出发到 `common/models/`，即 `../../common/models/{request,response}/`（向上 2 级到 `features/{module}/`，再下到 `common/`）。
>
> **关于 BackendInfra 注入**：`ping` 范本只用 `_infra.kvStorage.getTenantId()`，属于 SKILL.md「BackendInfra 门面规则」**情况 B**（旧实现包装）的合法用法。如果真实业务 service 涉及**新实现的「backend 内部基础设施」**（云端 HTTP 客户端 / WS 推送 / 设备协议适配等从 0 写的 backend 蓝本代码），**不要**把它们挂到 `BackendInfra` 上——遵循 SKILL.md「情况 C」建立独立子门面 + 平级 provider 注入。`BackendInfra` 的演进终点是字段被一个个清空，新实现挂上去 = 让新代码伪装成「将要清空的过渡通道」，破坏新旧区分。

---

## 文件 6 / 7：`backend/endpoint/{module}_handler.dart`

```dart
import 'dart:ui';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:shelf/shelf.dart';

import '../../../../common/backend_infra/backend_infra_riverpod.dart';
// Request DTO 来自 common 契约层
import '../../common/models/request/ping_request.dart';
import '../service/{module}_ping_service.dart';
import 'intranet_handler_base.dart';

part '{module}_handler.g.dart';

@riverpod
{Module}Handler {module}Handler(Ref ref) => {Module}Handler(ref: ref);

/// {模块} HTTP handler 集合
class {Module}Handler {
  final Ref _ref;
  static const IntranetHandlerBase _base = IntranetHandlerBase();

  {Module}Handler({required Ref ref}) : _ref = ref;

  Locale get _locale => _ref.read(backendInfraProvider).lang.currentLocale;

  /// 验证端点
  Future<Response> ping(Request request) => _base.handle(
        request: request,
        locale: _locale,
        logTag: '{Module}Handler.ping',
        parse: PingRequest.fromJson,
        action: (req) => _ref.read({module}PingServiceProvider).ping(req),
        encode: (resp) => resp.toJson(),
      );
}
```

---

## 文件 7 / 7：`backend/registry/{module}_backend_routes.dart`

```dart
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shelf_router/shelf_router.dart';

// 路由枚举来自 common 契约层
import '../../common/enums/endpoints/{module}_endpoint.dart';
import '../endpoint/{module}_handler.dart';

/// 把 {模块} backend 的全部路径挂到传入的 [router] 上。
///
/// 在 `ApiIntranetHandler` 的 backend 路由挂载块调用一次即可：
/// ```dart
/// register{Module}BackendRoutes(router, _ref);
/// ```
void register{Module}BackendRoutes(Router router, Ref ref) {
  final handler = ref.read({module}HandlerProvider);

  router.post({Module}Endpoint.ping.path, handler.ping);
}
```

> 函数名带 `Backend` 后缀，对齐已有的 `registerPaymentBackendRoutes` / `registerReopenOrderBackendRoutes`。`refund` 现有的 `registerRefundV2Routes`（不带 `Backend`）是 backendv2 历史遗留，新模块**不要**模仿。

---

## 挂载步骤：改 `api_intranet_handler.dart`

在 `lib/common/services/networking/intranet_service/api_intranet_handler.dart`：

**Step 1**：文件头部追加 import（按字母序排在其他 `backend/registry` import 旁）

```dart
import 'package:kpos/features/{module}/backend/registry/{module}_backend_routes.dart';
```

**Step 2**：在已有的 backend 路由挂载块追加一行。当前 `api_intranet_handler.dart` 中已挂载的 backend registry 调用有 3 条（位置可能不连续，挂载点见 grep `register\w+(Backend)?Routes`）：

```dart
    // === backendv2 路由（v2 接口，独立于 v1）===
    registerRefundV2Routes(router, _ref);                // refund 历史命名，无 Backend 后缀

    // === payment/backend 路由（POS offline 退款回调独立入口）===
    registerPaymentBackendRoutes(router, _ref);

    // ... 中间可能穿插一些直接 router.post 的旧路径，不要动 ...

    // 7 条路径：getReopenableTransactionList / createReopen / ...
    registerReopenOrderBackendRoutes(router, _ref);

    // === {module}/backend 路由 ===
    register{Module}BackendRoutes(router, _ref);         // ← 新增,挂在已有 backend registry 调用之后
```

插入位置选择：

- **优先**：紧跟最后一条 `register*BackendRoutes(router, _ref)` 之后，与同类挂在一起
- **次选**：紧跟 `registerPaymentBackendRoutes(router, _ref)` 之后（这是文件中较前的 backend 挂载点）
- **避免**：插到产品/订单等直接 `router.post(...)` 的中间，会打断阅读

**禁区**：

- 不要在其他模块的 endpoint 注册区块插队，保持 backend 路由 registry 调用集中
- 不要删除或改动已有的 v1 路由行、已有 registry 调用、已有的注释行
- 不要修改 `// === backendv2 路由 ===` / `// === payment/backend 路由 ===` 等已有分组注释，后续脚本/读者可能靠它们定位插入点
- 不要把 `register{Module}BackendRoutes` 改成不带 `Backend` 的写法去对齐 `registerRefundV2Routes`——后者是历史例外

---

## 验证链路通过后的清理

真实业务接口落地（比如 UI 对接手册 §4.1 的 `actionOne` 已经按挡位 B 流程补全并编码）后，`ping` 的清理 checklist：

- [ ] `common/enums/endpoints/{module}_endpoint.dart` 删除 `ping` 枚举值
- [ ] `common/models/request/ping_request.dart` + 生成文件 `.g.dart` 整组删除
- [ ] `common/models/response/ping_response.dart` + 生成文件 `.g.dart` 整组删除
- [ ] `backend/service/{module}_ping_service.dart` + 生成文件 `.g.dart` 整组删除
- [ ] `backend/endpoint/{module}_handler.dart` 删除 `ping` 方法及相关 import
- [ ] `backend/registry/{module}_backend_routes.dart` 删除 `router.post(...ping.path, handler.ping)` 行
- [ ] `api_intranet_handler.dart` 的 `register{Module}BackendRoutes` 挂载行**保留**（真实接口仍要走它）

做完以上 `dart run build_runner build --delete-conflicting-outputs` 重新生成，确认无编译错误。
