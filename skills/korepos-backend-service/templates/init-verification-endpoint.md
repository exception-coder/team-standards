# 初始化骨架：{Module} backend 验证端点（ping）

当用户需求未最终确定、但希望先把 `features/{module}/backend/` 的目录结构、门面接入、路由注册链路跑通时，用这份「验证端点（ping）」方案起步。

**承诺**：需求明朗后，`ping` 端点可直接**整块删除**（枚举值 + DTO + Service 方法 + Handler 方法 + Registry 的 `router.post` 行），不会牵连其他业务代码。

## 使用流程

1. 占位符 `{module}` / `{Module}` 全部替换（小写模块名 / 大写驼峰）
2. 按下方顺序生成 7 个文件
3. 在 `lib/common/services/networking/intranet_service/api_intranet_handler.dart` 的 backend 路由挂载块追加一行 `register{Module}BackendRoutes(router, _ref);`
4. 跑 `dart run build_runner build --delete-conflicting-outputs` 生成 `*.freezed.dart` / `*.g.dart`
5. 用 Postman / curl POST `http://{POS-IP}:{PORT}/{module}/ping`，payload `{"echo":"hello"}`，预期回 `{"success":true,"message":"...","data":{"echo":"hello","serverTimeMillis":..,"tenantId":..}}`
6. 验证通过后 → 开始按真实 UI 对接手册扩展；`ping` 可在首个真实接口落地后一并删除

---

## 文件 1 / 7：`endpoint/{module}_endpoint.dart`

```dart
import '../../../../common/services/networking/remote_service/api_endpoint.dart';

/// {模块} 端点枚举
///
/// 初始仅含 [ping] 验证端点；真实接口按 UI 对接手册追加枚举值。
enum {Module}Endpoint implements ApiEndpoint {
  /// 验证端点：确认 backend 路由链路通、BackendInfra 门面接入正确。
  /// 真实接口上线后可移除本条。
  ping('/{module}/ping');

  const {Module}Endpoint(this.path);

  @override
  final String path;
}
```

---

## 文件 2 / 7：`endpoint/intranet_handler_base.dart`

**直接从 `features/refund/backendv2/endpoint/intranet_handler_base.dart` 原样拷贝**，不修改。每个新模块各自持有一份拷贝（未来可下沉到 `common/backend_infra/`，当前先保持现状）。

> `backendv2` 是 refund 的历史命名，仅作为拷贝源。新模块拷贝后放在自己的 `backend/endpoint/intranet_handler_base.dart`，文件内容完全相同。

---

## 文件 3 / 7：`dto/request/ping_request.dart`

```dart
import 'package:freezed_annotation/freezed_annotation.dart';

part 'ping_request.freezed.dart';
part 'ping_request.g.dart';

/// 接口 POST /{module}/ping 入参
///
/// 验证端点专用，不接入真实业务；真实接口上线后可移除。
@freezed
class PingRequest with _$PingRequest {
  const factory PingRequest({
    /// 任意回显字符串，服务端原样回写，用于确认 JSON 编解码正确
    required String echo,
  }) = _PingRequest;

  factory PingRequest.fromJson(Map<String, dynamic> json) =>
      _$PingRequestFromJson(json);
}
```

---

## 文件 4 / 7：`dto/response/ping_response.dart`

```dart
import 'package:freezed_annotation/freezed_annotation.dart';

part 'ping_response.freezed.dart';
part 'ping_response.g.dart';

/// 接口 POST /{module}/ping 出参 data
@freezed
class PingResponse with _$PingResponse {
  const factory PingResponse({
    /// 回显入参 echo 字段，原样透传
    required String echo,

    /// 服务端当前时间戳（UTC 毫秒），BackendInfra 未暴露时钟能力，故直接 DateTime.now()
    required int serverTimeMillis,

    /// 当前租户 ID，取自 BackendInfra.kvStorage.getTenantId()
    required int tenantId,
  }) = _PingResponse;

  factory PingResponse.fromJson(Map<String, dynamic> json) =>
      _$PingResponseFromJson(json);
}
```

---

## 文件 5 / 7：`service/{module}_ping_service.dart`

```dart
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../../../common/backend_infra/backend_infra.dart';
import '../../../../common/backend_infra/backend_infra_riverpod.dart';
import '../dto/request/ping_request.dart';
import '../dto/response/ping_response.dart';

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

---

## 文件 6 / 7：`endpoint/{module}_handler.dart`

```dart
import 'dart:ui';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:shelf/shelf.dart';

import '../../../../common/backend_infra/backend_infra_riverpod.dart';
import '../dto/request/ping_request.dart';
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

## 文件 7 / 7：`registry/{module}_backend_routes.dart`

```dart
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shelf_router/shelf_router.dart';

import '../endpoint/{module}_endpoint.dart';
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

---

## 挂载步骤：改 `api_intranet_handler.dart`

在 `lib/common/services/networking/intranet_service/api_intranet_handler.dart`：

**Step 1**：文件头部追加 import（按字母序排在其他 `backend/registry` import 旁）

```dart
import 'package:kpos/features/{module}/backend/registry/{module}_backend_routes.dart';
```

**Step 2**：在已有的 backend 路由挂载块追加一行。该文件当前已有 `registerRefundV2Routes` 与 `registerPaymentBackendRoutes` 两条挂载行，在它们附近插入：

```dart
    // === backendv2 路由（历史遗留：refund 特例）===
    registerRefundV2Routes(router, _ref);

    // === {module}/backend 路由 ===
    register{Module}BackendRoutes(router, _ref);     // ← 新增

    // === payment/backend 路由（POS offline 退款回调独立入口）===
    registerPaymentBackendRoutes(router, _ref);
```

**禁区**：

- 不要在其他模块的 endpoint 注册区块插队，保持 backend 路由集中在同一块
- 不要删除或改动已有的 v1 路由行与已有 registry 调用
- 不要修改 `// === backendv2 路由 ===` / `// === payment/backend 路由 ===` 注释，后续脚本可能靠它们定位插入点

---

## 验证链路通过后的清理

真实业务接口落地（比如 UI 对接手册 §4.1 的 `actionOne` 已经按挡位 B 流程补全并编码）后，`ping` 的清理 checklist：

- [ ] `endpoint/{module}_endpoint.dart` 删除 `ping` 枚举值
- [ ] `dto/request/ping_request.dart` + 生成文件整组删除
- [ ] `dto/response/ping_response.dart` + 生成文件整组删除
- [ ] `service/{module}_ping_service.dart` + 生成文件整组删除
- [ ] `endpoint/{module}_handler.dart` 删除 `ping` 方法及相关 import
- [ ] `registry/{module}_backend_routes.dart` 删除 `router.post(...ping.path, handler.ping)` 行
- [ ] `api_intranet_handler.dart` 的 `register{Module}BackendRoutes` 挂载行**保留**（真实接口仍要走它）

做完以上 `dart run build_runner build --delete-conflicting-outputs` 重新生成，确认无编译错误。
