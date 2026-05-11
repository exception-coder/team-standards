# Step 5：Service（事务编排者）

> 子文档 of [korepos-backend-service/SKILL.md](../SKILL.md)。
> Step 5 是 8 步编写顺序的第 5 步。本文件规定 Service 的完整写法范本、强制规则、外部调用前的边界兜底校验。
> Service 粒度 / 长方法拆分 / internal 原子能力等结构性规则见 [service-rules.md](./service-rules.md)。

**路径**：`backend/service/{action}_service.dart`（动作型命名，一接口一 service —— 详见 [service-rules.md § Service 粒度规则](./service-rules.md#service-粒度规则一接口一-servicedebug-友好原则)）

> Service 是**事务编排层**：包 `db.transaction()`、组合 DAO 原子方法、整理上下文、做业务条件分支。DAO 不再做这些（详见 [dao-rules.md](./dao-rules.md)）。

```dart
import 'package:flutter/foundation.dart'; // 仅 debugPrint
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../../../common/backend_infra/backend_infra.dart';
import '../../../../common/backend_infra/backend_infra_riverpod.dart';
import '../../../../common/services/networking/constants/api_intranet/api_intranet_message_key.dart';
import '../../../../common/services/networking/intranet_service/api_intranet_exception.dart';
// DTO 来自 common 契约层(UI + backend 共用,不是 backend 自持副本)
import '../../common/models/request/{action}_request.dart';
import '../../common/models/response/{action}_response.dart';
// DAO 来自本模块 backend
import '../dao/{table_a}_dao.dart';
import '../dao/{table_b}_dao.dart';
// 原子能力(可选,见 [service-rules.md § Service/internal 原子能力层](./service-rules.md#serviceinternal-原子能力层细粒度复用单元))
import 'internal/{capability}_service.dart';

part '{action}_service.g.dart';

@riverpod
{Action}Service {action}Service(Ref ref) =>
    {Action}Service(
      infra: ref.read(backendInfraProvider),
      orderDao: ref.read(orderDaoProvider),
      billDao: ref.read(billDaoProvider),
      // capabilityService: ref.read({capability}ServiceProvider),  // 可选
    );

/// {模块} {action} 编排 service
///
/// 对齐云端：{Java 类全路径}#{方法}
class {Action}Service {
  final BackendInfra _infra;
  final OrderDao _orderDao;
  final BillDao _billDao;

  {Action}Service({
    required BackendInfra infra,
    required OrderDao orderDao,
    required BillDao billDao,
  })  : _infra = infra,
        _orderDao = orderDao,
        _billDao = billDao;

  /// {一句话职责} — 对齐云端 {Java#method}
  Future<{Action}Response> {action}({Action}Request req) async {
    try {
      // 1. 前置校验
      final original = await _fetchOrderOrFail(req.originalOrderId);

      // 2. 参数整形 + 上下文（抽私有方法）
      final ctx = _buildContext();

      // 3. 本地事务编排（service 包,不在 DAO 包）
      final inner = await _infra.db.transaction(() async {
        final newOrderId = await _orderDao.insertOrder(
          tenantId: ctx.tenantId, storeId: ctx.storeId,
          orderType: 2, orderState: 6, payAmount: req.refundAmount,
          createTimeMillis: ctx.now, operatorId: ctx.operatorId,
        );
        await _orderDao.updateOrderState(
          orderId: req.originalOrderId, newState: 7,
          modifyTimeMillis: ctx.now, operatorId: ctx.operatorId,
        );
        final newBillId = await _billDao.insertBill(/* ... */);
        return _Inner(orderId: newOrderId, billId: newBillId);
      });

      // 4. 容错调用（事务外,失败仅记日志不回滚）
      await _infra.dataSync.addBatchDataSyncReport(
        [inner.orderId], 'order', 'create',
      );

      return {Action}Response(
        success: true,
        recordId: inner.orderId,
      );
    } on ApiIntranetException {
      rethrow; // 受控业务异常冒泡到 handler
    } catch (e, st) {
      debugPrint('{action} 失败: $e\n$st');
      return const {Action}Response(success: false);
    }
  }

  /// 上下文整理 — 一次性读 _infra,事务内不再回头取
  _Ctx _buildContext() {
    return _Ctx(
      now: DateTime.now().millisecondsSinceEpoch,
      operatorId: _infra.auth.employeeInfo.account.employeeId,
      tenantId: _infra.kvStorage.getTenantId() ?? 1,
      storeId: _infra.store.boundStoreInfo.storeId,
    );
  }

  /// 前置数据校验 — 缺失时抛业务异常
  Future<Order> _fetchOrderOrFail(int orderId) async {
    final order = await _orderDao.findById(orderId);
    if (order == null) throw ApiIntranetException(MessageKey.notFound);
    return order;
  }
}

/// 事务上下文(service 私有 record,不进 wire)
class _Ctx {
  final int now, operatorId, tenantId, storeId;
  const _Ctx({
    required this.now, required this.operatorId,
    required this.tenantId, required this.storeId,
  });
}

/// 事务内部产物(service 私有,跨步骤传递,不进 Response)
class _Inner {
  final int orderId, billId;
  const _Inner({required this.orderId, required this.billId});
}
```

## 强制规则

- **一接口一 service**：每个 service 文件只对应 1 个 endpoint，类内只暴露 1 个 public 方法（详见 [service-rules.md § Service 粒度规则](./service-rules.md#service-粒度规则一接口一-servicedebug-友好原则)）；跨接口复用的链路下沉到 `service/{purpose}_orchestrator.dart` 或 `service/internal/{capability}_service.dart`，**严禁** service A 直接 import service B
- **Service 内禁止任何 SQL（核心红线）**：service 文件里**不允许**出现 `_db.customSelect(...)` / `_db.select(table)` / `_db.update(table)` / `_db.delete(table)` / `into(table).insert(...)` / `_infra.db.batch(...)` 等任何 drift 直接读写形式；所有数据访问必须经 DAO 方法调用。`db.transaction(() async { ... })` 是**唯一例外**（事务编排归 service），但事务体内每一步只能是 `await _xxxDao.method(...)` 调用，不得直接拼 SQL。**理由**：① service 直接出现 SQL 字符串会让"业务编排"与"数据访问"耦合在同一栈，单元测试要 mock 整个 db；② 同一条 SQL 会被多个 service 复制粘贴，schema 变更时改散无主；③ 字段名靠 `row.read('xxx_col')` 字符串取值，IDE 无补全、拼写错误运行时才暴露；④ 独立服务化时 SQL 与业务逻辑无法分包搬走。**违规处置**：发现 service 文件里出现任何 SQL 字符串或 drift typed query → 立刻在 `backend/dao/` 或 `common/backend_infra/daos/` 下加一个原子 DAO 方法（`findXxx` / `updateXxx` / `insertXxx`），把 SQL 移走，service 改调 DAO；同步把违规登记到 `docs/coding-violations.md`（详见 `coding-violation-log` skill）
- **事务编排归 service**：`db.transaction()` 必须出现在 service，不在 DAO；service 内部按"读上下文 → 事务内组合 DAO → 事务外容错调用"三段式
- **public 方法 = 对外接口**：类级 / 方法级 dartdoc **必须**写「对齐云端：{Java 类全路径}#方法」
- **参数组装 / 校验 / 辅助查询 / 上下文打包 必须抽 `_private` 方法**，不得内联在主流程里
- **对外调用前必须用 DB 实读数据兜底校验业务数值**：service 调云端 HTTP / 跨子门面 / POS 硬件协议前，凡传给对方的"业务数值"（金额、数量、配额、剩余次数等）若在本地 DB 中存在可查到的上限/边界（原流水金额、剩余可退、可用库存等），**必须**用 DB 实读值做边界校验，不得直接信任上游入参或前序内存对象；校验逻辑抽 `_private` 方法（详见下方「外部调用前的边界兜底校验」节）
- **DTO 来自 common**：`import '../../common/models/{request,response}/...';` —— 不再 import `../dto/`
- **只 import `BackendInfra` + DAO + 本模块 common + 原子能力 + lib/common`**，禁止 `ref.read(xxxProvider)` 方式直接拉其他模块（其它模块依赖走 BackendInfra 门面或其它模块 backend 直接 import）
- **业务异常用 `ApiIntranetException(MessageKey.xxx)`**，由 handler 层统一本地化
- **失败场景**：受控异常 rethrow；未预期异常 catch 后返回 `success: false` 的响应，不让 HTTP 500 冒泡
- **internal 类型不进 wire**：service 内部用的 record/class（`_Ctx` / `_Inner` 这种）必须用 `_` 前缀私有化，**永远不要**让它们出现在 Request/Response 字段类型里
- **详细注释**：
  - 业务规则判断 → 注释写明"为什么这样判"
  - 魔法数字（状态码、枚举值）→ 枚举所有可能值及语义
  - 字段取值来源 → 注明 DB 列 / 入参字段 / 云端对齐路径
  - 容错降级（比如分摊失败仅记日志不回滚）→ 注明"为何不回滚"

## 外部调用前的边界兜底校验（健壮性硬规则）

**任何要传给云端 HTTP、跨子门面 / capability port、POS 硬件协议的"业务数值"（金额、数量、配额等），如果它在本地 DB 中存在可查到的上限/边界，service 层在发起调用前必须用 DB 实读值兜底校验，不得直接信任上游入参或前序内存对象。**

### 为什么必须做

| 风险 | 影响 |
|---|---|
| 云端/硬件回错信息泛化（如"退款金额大于交易流水金额"） | 定位成本高，要翻三层日志才知道是本地传错 |
| 上游计算可能 bug 或入参变形（UI 算价、Rust FFI、allocator、外部模块入参） | 一旦失真没本地兜底就直接打到云端 |
| 即便本次代码无 bug，DB 状态可能因并发/幂等竞争出现偏差 | 边界校验是最后一道防线 |
| 错误金额一旦云端入账，回滚链路远比拦截一次复杂 | 风险不对称，必须前移 |

### 强制做法

1. **校验时机**：service 内调外部前。事务内 DAO 读完上下文 → 立即校验 → 校验通过才进事务写入或外部调用
2. **校验对象**：每一笔即将发出的"可向云端发起业务变更的数值"（refundAmount / quantity / amount / 等）
3. **校验依据**：DB 实读的边界值（原流水 `pay_amount`、累计已退 `SUM(...)` 等），**不是入参回显**，**不是上游内存对象**
4. **校验方法必须抽 `_private` 方法**（与「健壮性/参数校验代码须抽私有方法」规则呼应），不得内联到主流程
5. **失败抛业务异常**：`ApiIntranetException(MessageKey.invalidParam)` 或更具体的 `MessageKey`
6. **金额比较加 ±0.005 浮点容差**：避免 double 精度误差导致 "9.0 > 9.0000001" 的误报

### ❌ 反例

```dart
// 直接信任 DAO 读出的 pay_amount，无兜底就送云端
final onlineRefundInfo = RefundOnlineCallInfo(
  outTradeNo: refundOutTradeNo,
  oriOrderNo: alloc.originalChannelTradeNo,
  refundAmount: _formatOnlineRefundAmount(alloc.payAmount),
);

// 信任 allocator 的 currentRefundAmount，没核"原流水可退余额"
refundAmount: _formatOnlineRefundAmount(alloc.currentRefundAmount),
```

风险：上游 allocator 一旦把 currentRefundAmount 算大（哪怕 0.01 元），云端立刻回 result=3 reason=发起退款失败；本地无线索可查（业务日志里 refundAmount 看着没问题，但和 DB 不一致）。

### ✅ 正例

```dart
// 1. service 在调云端前用 DB 实读做兜底
final originalTx = await _orderTransactionDao.findById(alloc.originalTransactionId);
final alreadyRefunded = await _orderTransactionDao.sumSuccessRefundsOf(alloc.originalTransactionId);
_assertRefundAmountWithinBound(
  proposed: alloc.currentRefundAmount,
  originalPayAmount: originalTx.payAmount,
  alreadyRefunded: alreadyRefunded,
);
// 校验通过才组装外发参数 + 调云端
final outcome = await _infra.refundKpayOnline(/* ... */);

// 2. 校验抽私有方法
void _assertRefundAmountWithinBound({
  required double proposed,
  required double originalPayAmount,
  required double alreadyRefunded,
}) {
  if (proposed <= 0) {
    throw ApiIntranetException(MessageKey.invalidParam); // 金额必须 > 0
  }
  final available = originalPayAmount - alreadyRefunded;
  if (proposed > available + 0.005) {  // 浮点容差
    throw ApiIntranetException(MessageKey.invalidParam); // 超过可退余额
  }
}
```

### 适用范围

| 场景 | 是否强制 |
|---|---|
| service 调云端 HTTP 接口（如 kpayOnlineRefund / kpayOfflineRefund） | ✅ 必须 |
| service 调跨子门面 / capability port（独立服务化后变 RPC） | ✅ 必须 |
| service 调 POS 硬件协议（线下刷卡撤销/退款） | ✅ 必须 |
| service 内部纯本地 DB 写入（无外部调用） | 推荐做（前置校验防写入异常态） |
| 单纯查询接口（无 mutation） | 不强制（查询不会引发不一致） |

### 已知反例（待补救）

- `lib/features/refund/backendv2/dao/cancel_order_refund_dao.dart` cancel/reject 路径
- `lib/features/refund/backendv2/dao/refund_transaction_dao.dart` 部分退路径
- 都直接信任原流水 `pay_amount` / allocator `currentRefundAmount` 后送云端，未做"原流水可退余额"实读核对；后续在对应 service 加私有 `_assertRefundAmountWithinBound` 补齐

## 复用提醒（重要）

写 service 时如果发现"这段事务编排 / 这块校验 / 这次跨表读取"在**本模块多个 service** 出现 ≥2 次，**主动建议**用户把它下沉到：

- 跨接口写入/校验链路（多步事务复合）→ `service/{purpose}_orchestrator.dart`（粗粒度编排器）
- 单一原子能力（如"按 transactionId 修改退款流水状态"）→ `service/internal/{capability}_service.dart`（细粒度复用单元）

详见 [service-rules.md § Service/internal 原子能力层](./service-rules.md#serviceinternal-原子能力层细粒度复用单元)。
