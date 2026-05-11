# Service 粒度、拆分、原子能力与 DB 字段枚举规则

> 子文档 of [korepos-backend-service/SKILL.md](../SKILL.md)。
> 本文件规定 Service 的粒度、长方法拆分、模块内 internal 原子能力层、service 装配中转 DTO、DB 字段值与枚举绑定。Step 5 Service 的写法范本见 [step5-service.md](./step5-service.md)。

## Service 粒度规则：一接口一 service（debug 友好原则）

### 心智模型先校准

`backend/service/` 在 Flutter 端虽然叫 service，但语义角色 = **云端 Spring 的 Controller**（HTTP 入口的薄编排层），**不是云端的 ServiceImpl**。

| 视角 | 云端 Java | 本端 Flutter backend |
|---|---|---|
| `endpoint/{module}_handler.dart` | DispatcherServlet 路由分发（基础设施） | shelf 路由 + parse/encode 模板 |
| `service/{module}_{action}_service.dart` | `XxxController.actionOne(req)` | 一接口一 service，承接对应 endpoint |
| `service/{purpose}_orchestrator.dart` | `XxxServiceImpl` 跨方法的复用编排 | 多 service 共享的写入/校验链路 |
| `dao/` | `Mapper / Repository` | 纯 DB SQL/事务 |

云端 ServiceImpl 把多个业务方法塞一个类里有合理性（DI 便宜、跨方法事务、Spring AOP 织入）；本端 backend 不具备这些约束,debug 时**栈干净、日志定位、版本控制 diff 收敛**的友好度更重要 → **一接口一 service**。

### 强制规则

1. **粒度**:`backend/service/` 下每个 `.dart` 文件**只对应 1 个 HTTP endpoint**(即 Registry 里 1 行 `router.post(...)`)
2. **类内单一 public 方法**:方法名与 handler 转发方法名一致(例:`RefundV2Handler.confirm()` → `RefundConfirmService.confirm()`);私有 `_xxx()` 数量不限,前置校验 / 参数组装 / 响应组装继续抽 `_private`
3. **文件命名**:`{module}_{action}_service.dart`,`{action}` = handler 方法名 snake_case,与 Endpoint 枚举值同名(camel→snake)
4. **跨接口复用**:多个 service 共用的写入/校验/编排链路(典型如取消订单的「db.transaction + KPay 退款 + 数据同步」三段式)必须沉到独立文件 `service/{purpose}_orchestrator.dart`,以「编排器」名字承载(参考现存 `whole_order_cancel_orchestrator.dart`)
5. **service 之间禁止互相 import**:复用一律走 orchestrator / 共享 helper / DAO;service A 想调 service B 的能力 = 把 B 的能力下沉为 orchestrator,两个 service 各自调 orchestrator
6. **DTO 自闭环不变**:每个 service 自己声明依赖的 Request / Response,Step 2/3 流程不变

### 反例 → 正例

❌ **反例**:同一 service 暴露多个 public 方法

```dart
// service/refund_query_service.dart  ← 1 个文件 expose 3 个 endpoint,debug 时栈与日志混在一起
class RefundV2QueryService {
  Future<GetMaxRefundableAmountResponse> getMaxAmount(...) {...}
  Future<GetRefundAllocationsResponse> getAllocations(...) {...}
  Future<GetRefundProductsResponse> getProducts(...) {...}
}
```

✅ **正例**:拆成 3 个文件,Handler/Service/Endpoint/Registry 四层 1:1:1:1 对齐

```
service/get_max_refundable_amount_service.dart   → class GetMaxRefundableAmountService { Future<...> getMaxAmount(req); }
service/get_refund_allocations_service.dart      → class GetRefundAllocationsService    { Future<...> getAllocations(req); }
service/get_refund_products_service.dart         → class GetRefundProductsService       { Future<...> getProducts(req); }
```

### 命名一致性收敛

历史代码里两种命名风格并存,新代码**只允许动作型**:

| 风格 | 例 | 是否允许新增 |
|---|---|---|
| 动作型 `{action}_{resource}_service.dart` | `cancel_refund_order_service.dart` | ✅ 允许 |
| 域型 `{module}_{domain}_service.dart` | `refund_write_service.dart` | ❌ 不允许新增,文件名必须包含动作 |

> **存量 1:N 文件不改**:`refund_query_service.dart` 等历史文件由专项 PR 拆分,本规则**自本条目落入 SKILL.md 之日起仅对新增 service 文件强制生效**,改动现有文件时若机会成熟可顺手拆,但不要为了拆而开 PR。

---

## Service 方法粒度规则：长方法必拆私有 `_xxxStep`

### 强制规则

| 方法行数 | 处理 |
|---|---|
| ≤ 30 行 | 单方法即可 |
| 30-80 行 | 推荐按业务步骤拆 `_xxxStepN` 私有方法，但不强制 |
| **> 80 行** | **强制拆**：主方法只做"步骤编排 + 事务包裹 + 日志"，每个 `_xxxStep` 私有方法 ≤ 30 行完成单一职责 |

### 拆分维度（按业务步骤切）

按"取数 / 校验 / 装配 / 算价 / 落库 / 副作用"等业务阶段切，**不要按"代码长度"机械切**：

```dart
// ❌ 反例：430 行单方法
Future<Map<String, dynamic>> _calculateRefundPriceRaw(...) async {
  // 100 行查 6 张表 (orders / order_item / order_tax / additional_fee / promotion / allocate)
  // 80 行装配 itemTaxMap / serviceFeeData / itemPromoMap
  // 200 行调 Rust + 解析出参 + 整形 selectOption
  // 50 行短路分支 + 出参组装
}

// ✅ 正例：拆 5 个私有 step 方法
Future<Map<String, dynamic>> _calculateRefundPriceRaw(...) async {
  final dbData = await _fetchOrderDataStep(orderId);
  final mapData = _buildLookupMapsStep(dbData);
  if (_isOnlyTipRefundStep(selectOption)) {
    return _buildOnlyTipResultStep(mapData);
  }
  final rustResult = await _callRustEngineStep(mapData, selectOption);
  return _normalizeRustOutputStep(rustResult, selectOption);
}

Future<_OrderDbData> _fetchOrderDataStep(int orderId) async { ... }
_LookupMaps _buildLookupMapsStep(_OrderDbData d) { ... }
bool _isOnlyTipRefundStep(Map<String, dynamic> opt) { ... }
Map<String, dynamic> _buildOnlyTipResultStep(_LookupMaps m) { ... }
Future<Map<String, dynamic>> _callRustEngineStep(_LookupMaps m, Map<String, dynamic> opt) async { ... }
Map<String, dynamic> _normalizeRustOutputStep(Map<String, dynamic> r, Map<String, dynamic> opt) { ... }
```

### 与 internal/ / backend_infra/services/ 的边界（拆分梯度）

| 层级 | 触发条件 | 位置 | 谁能调 |
|---|---|---|---|
| **私有 `_xxxStep`** | 单方法 > 80 行 | 同 service 文件内 | 仅本 service |
| **`service/internal/`** | 同模块 ≥2 个 service 重复同段逻辑 | `features/{module}/backend/service/internal/` | 同模块多个 service |
| **`backend_infra/services/`** | ≥2 feature 模块共享 | `lib/common/backend_infra/services/` | 跨 feature |

**升级路径**：私有 step → 被同模块另一 service 想用时升级 internal/ → 被另一 feature 想用时升级 backend_infra/services/。**禁止越级**（不能直接从私有 step 跳到 backend_infra/services/，要经 internal/ 中转评估）。

### 例外

- 单方法虽长但**逻辑线性、无业务分阶段**（如纯字段映射 100 行）→ 可以保留，但需在 dartdoc 写明"线性映射，无拆分价值"
- 测试方法 / 配置初始化方法不受 80 行限制

---

## Service/internal 原子能力层（细粒度复用单元）

### 概念与定位

`backend/service/internal/` 存放**多个 service 共享的原子能力**，例如：

- "按 `transactionId` 修改退款流水状态 + 时间戳 + 操作人" — 多个回调入口都会触发
- "查询订单是否已被联台占用" — 多个写入接口都要前置校验
- "组装 KPay 回调持久化的 8 字段" — confirm / write / callback-apply 都要做

**与 orchestrator 的差异**：

| 层 | 职责 | 粒度 | 命名 | 是否包事务 |
|---|---|---|---|---|
| `service/{action}_service.dart` | 一接口一 service，主流程 | 大 | 动词+资源 | ✅ 包顶层事务 |
| `service/{purpose}_orchestrator.dart` | 跨接口共享的写入/校验链路 | 中 | `{purpose}_orchestrator` | 通常不包，由调方注入事务上下文 |
| `service/internal/{capability}_service.dart` | 单一可复用业务能力 | 小（可能含 1-3 步 SQL 编排） | `{capability}_service` | 不包顶层事务，可被多种 orchestrator/service 内嵌 |

### 何时下沉到 internal/（**复用提醒规则**）

写新接口时，遇到以下信号**主动建议**用户把能力下沉到 `service/internal/`：

| 信号 | 例 |
|---|---|
| 同一段"取数→判定→写库"逻辑在**本模块** ≥ 2 个 service 出现 | 退款回调成功 / 失败两条链路都要"修改流水状态 + 写时间 + 推数据同步" |
| 业务术语强烈（"退款流水回写"、"账单状态切换"、"分摊重算"），跨方法粘贴会丢上下文 | "退款流水回写"在 callback / confirm-rollback / write 三处出现 |
| service 主流程超过 80 行且核心操作能用一句业务术语命名 | service 里 30 行专门做"组装数据同步事件参数"——抽 `data_sync_event_builder_service` |

**判定 ≥ 2 次复用**：grep 模块内 service 文件，看相同的 SQL/编排片段是否出现两次以上。仅出现一次的 → **暂不下沉**（YAGNI），加注释 `// FIXME(reuse): 若 X 接口也要做这事，下沉到 service/internal/`。

### internal/ 写法约定

```dart
// service/internal/refund_callback_persistence_service.dart
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../../../../common/backend_infra/backend_infra.dart';
import '../../../../../common/backend_infra/backend_infra_riverpod.dart';
import '../../dao/refund_transaction_dao.dart';

part 'refund_callback_persistence_service.g.dart';

@riverpod
RefundCallbackPersistenceService refundCallbackPersistenceService(Ref ref) =>
    RefundCallbackPersistenceService(
      infra: ref.read(backendInfraProvider),
      txDao: ref.read(refundTransactionDaoProvider),
    );

/// 退款流水回写原子能力
///
/// 多个 service 复用：refund_callback_apply_service / refund_confirm_service / refund_rollback_service
/// 单一职责：按 transactionId 改流水状态 + 写回调时间 + 操作人。**不包事务**——由调方在外层事务里调用。
class RefundCallbackPersistenceService {
  final BackendInfra _infra;
  final RefundTransactionDao _txDao;

  RefundCallbackPersistenceService({
    required BackendInfra infra,
    required RefundTransactionDao txDao,
  })  : _infra = infra,
        _txDao = txDao;

  /// 把回调结果落到 order_transaction 表
  ///
  /// 注：本方法**不开新事务**。调方应在 `db.transaction(() async { ... })` 内调用,
  /// 或本身就是只读 + 单条 UPDATE 不需事务。
  Future<void> persistCallbackResult({
    required int transactionId,
    required int newState,
    required int callbackTimeMillis,
    required int operatorId,
  }) async {
    await _txDao.updateTransactionState(
      transactionId: transactionId,
      newState: newState,
      modifyTimeMillis: callbackTimeMillis,
      operatorId: operatorId,
    );
  }
}
```

#### 强制规则

- **路径**：`backend/service/internal/{capability}_service.dart`
- **命名**：以**能力**命名，**不带动作前缀**——`refund_callback_persistence_service`、`order_lock_check_service`、`data_sync_event_builder_service`；**禁用** action 前缀（`cancel_xxx`、`confirm_xxx`），那是顶层 service 命名风格
- **不挂 endpoint**：internal service 不出现在 `Registry` 里，不暴露 HTTP path
- **不包顶层事务**：`db.transaction()` 永远在调用方（顶层 service 或 orchestrator）；internal 内部的方法要么是单条 SQL，要么明确"调方需在事务内调用"
- **可被多个 service 注入**：通过 `@riverpod` Provider 暴露，调方在构造器注入
- **Dartdoc 必须列出复用方**：类级 dartdoc 写明"被 X / Y / Z service 复用"，便于改动时评估影响面
- **范本**：`refund/backendv2/service/internal/refund_callback_persistence_service.dart`

### internal/ 的"提醒"工作流（写代码时主动触发）

写新 service 时按以下步骤主动审视：

1. **写完 service 主流程后**，反向 grep：本模块 `service/` 下其它文件是否有相似片段？（搜索关键 SQL where 子句、关键方法名、关键魔法数字）
2. **发现 ≥2 个 service 重复** → 给用户**主动建议**：「我注意到 `xxxService` 也在做同样的「按 transactionId 改流水」操作，建议抽到 `service/internal/refund_callback_persistence_service.dart` 做原子能力层；我可以帮你抽出来吗？」
3. **得到用户确认后**，再做下沉重构：先建 internal/ 文件 → 改老 service 调用 → 跑 build_runner
4. **未确认前不要擅自抽**：避免抽出"看似可复用、实际两边语义微妙不同"的伪原子能力

> 此规则建议性，不强制阻断。**仅在重复 ≥2 次时才提醒**，第一次出现允许 YAGNI 复制粘贴 + `FIXME(reuse)` 注释埋点。

---

## Service 装配中转 DTO（`service/models/`）

### 概念与定位

`service/{action}_service.dart` 在主流程里经常需要把一组字段当一个对象传递 —— 例如：

- 调 Rust FFI 前组装的算价入参对象（`OrderAdditionalFee` / `PosOrder` / `MainItem`...）
- 跨多个私有方法传递的结构化中间结果
- 拼装响应前的 internal 装配对象（与 wire DTO 形状不一定一致）

这些**不是 wire DTO**（不进 common，因为不出现在前端契约中），**也不是 DAO Row**（不由 DAO 返回，是 service 自己拼出来的）。它们的归宿是 `lib/features/{module}/backend/service/models/`，与 `dao/models/` 形成对称：

| 层 | 私有 DTO 位置 | 用途 | 命名 |
|---|---|---|---|
| DAO | `backend/dao/models/{xxx}_row.dart` | DB 查询结果（聚合/JOIN/子集） | `*Row` / `*SummaryRow` / `*ProjectionRow` |
| service | `backend/service/models/{xxx}.dart` | service 装配中转（FFI 入参/跨方法传递/装配中间产物） | 语义命名（如 `RustServiceFeeData` / `RefundConfirmContext`） |
| service 文件内 `_` 私有 record | service 文件底部 | **小** 上下文 record（1-3 字段） | `_Ctx` / `_Inner` / `_AllocateInfo` |

### 抽出阈值（何时建 `service/models/`，何时留 `_` 私有 record）

满足**任一**条件时抽到 `service/models/`：

| 信号 | 例 |
|---|---|
| 字段数 **≥ 5** | `RustServiceFeeData` 12 字段 — 塞 service 文件底部会挤占可读空间 |
| 在多个 public/private 方法间传递（**≥ 2 处** use site） | 一个 DTO 同时被装配方法、`_buildResponse` 私有方法、`_buildXxxBranch` 用 |
| 有 `toJson` / `fromJson` / 转换方法 | 行数会膨胀，与 service 主流程混在一起视觉割裂 |
| 类级 dartdoc 超过 3 行（需写明 wire 形态/对齐云端类/特殊语义） | 注释占据 service 文件，读者注意力被分散 |

**否则**保留为 service 文件底部 `_` 私有 record / class（**字段 ≤ 3** 且**单一方法内传递**）—— 这是事务上下文场景（`_Ctx { now, operatorId, tenantId }`）。

### `service/models/` 的写法约定

```dart
// lib/features/{module}/backend/service/models/rust_service_fee_data.dart

/// Rust FFI 入参：单条服务费配置（对齐 rust additional_fee.rs OrderAdditionalFee）
///
/// service 装配阶段的中转 DTO —— 不是 wire DTO（前端响应仍透传 Rust 出参,与本类无关），
/// 也不是 DAO Row。仅 backend 内部 service 与 Rust FFI 桥接用。
///
/// [toJson] 输出形态与历史 Map 字节级一致：method=1 输出 serviceChargeRate,
/// 其它输出 serviceFixedCharge（互斥）；其余字段无条件输出。
class RustServiceFeeData {
  final int serviceFeeManagementId;
  final String serviceFeeName;
  // ... 其余字段
  final double? serviceChargeRate;
  final double? serviceFixedCharge;

  const RustServiceFeeData({
    required this.serviceFeeManagementId,
    required this.serviceFeeName,
    // ...
    this.serviceChargeRate,
    this.serviceFixedCharge,
  });

  /// 输出 Map 给 Rust FFI / 出参分支共用；保留互斥字段语义
  Map<String, dynamic> toJson() => {
        'serviceFeeManagementId': serviceFeeManagementId,
        'serviceFeeName': serviceFeeName,
        if (serviceChargeMethod == 1) 'serviceChargeRate': serviceChargeRate ?? 0,
        if (serviceChargeMethod != 1) 'serviceFixedCharge': serviceFixedCharge ?? 0,
        // ...
      };
}
```

#### 强制规则

| 项 | 规则 |
|---|---|
| **物理位置** | `lib/features/{module}/backend/service/models/{xxx}.dart` —— 与 `dao/models/` 对称，单文件单 class（与现有 wire DTO 一致风格） |
| **命名** | 语义命名 **不带 `_` 前缀**（dart 没有 package-private，靠目录约定隔离）；动词/语境前缀让用途自明，如 `Rust*Data` / `*Context` / `*Input` |
| **类型** | 普通 `class`，`final` 字段，`const` 构造器 + `required`；按需加 `toJson()` / `fromJson()` / 工厂方法 |
| **dartdoc 必含 3 项** | (1)用途定位（"装配中转 DTO，不进 wire"）(2)对齐云端/Rust 的 source（如 `rust additional_fee.rs OrderAdditionalFee`）(3)`toJson` 输出形态与历史 Map 是否字节级一致 |
| **不进 wire** | 类不能被任何 handler / Response DTO 直接引用；只允许 service 文件 import |
| **跨模块复用** | 默认本模块独享。其它模块需要相同形状 → 各自在自己模块的 `service/models/` 下复制一份（DAO Row 同规则）—— **DTO 重复 OK，硬绑两个模块不 OK** |
| **build_runner** | 通常无需（本类无 `*.g.dart`）；如确有 freezed/json_serializable 才加 part |

### 写代码时何时主动抽到 `service/models/`

写 service 时按以下流程主动审视：

1. 写完装配段或主流程后，反向看私有 record / `Map<String, dynamic>` 拼装：是否符合**抽出阈值**任一条件？
2. **是** → 主动建议用户：「这个 `Map<String, dynamic>` 拼装有 12 字段且 toJson 形态固定，建议抽到 `backend/service/models/{xxx}.dart`，IDE 能补全字段、编译期检查拼写错误。我抽吗？」
3. **否** → 保留为 service 文件底部 `_` 私有 record；**不擅自外移**

> 此规则建议性，但**抽出后必须遵循 dartdoc 三项规范**（用途/source/toJson 形态），保证读者无须翻 service 文件就能理解这个中转 DTO 的语义。

---

## DB 字段值与枚举绑定（魔法数字硬规则）

### 强制规则

**任何与 DB 字段比较 / 过滤 / 写入 / 读取后判断的数字常量** —— `item_type=1`、`order_tax_type=2`、`refund_flag=1`、`transaction_state=3`、`additional_fee_type=1` 等 —— **必须用枚举类常量引用，禁止裸数字字面量**。

`docs` / dartdoc 注释里"枚举出可能取值"是**额外**的可读性要求（已有规则）；本节强制的是**代码体内必须用枚举类型**，两者并存不冲突。

### 适用范围（凡涉及 DB 数字常量必转）

| 场景 | ❌ 反例 | ✅ 正例 |
|---|---|---|
| DAO SQL 过滤值 | `WHERE item_type = 1 AND deleted = 0` | `WHERE item_type = ? AND deleted = ?` + `Variable.withInt(ItemType.payment.code), Variable.withInt(CommonState.normal.code)` |
| Service 比较 | `if (txState == 3)` | `if (txState == RefundTransactionState.failed.code)` |
| DAO 写入 | `Value(2)` | `Value(BillRefundState.pendingRefund.code)` |
| 读后判断 | `row.read<int>('refund_flag') == 1` | `row.read<int>('refund_flag') == RefundFlag.refund.code` |
| 短路兜底 | `?? 1` 在 `additional_fee_method` 字段 | `?? AdditionalFeeMethod.fixedAmount.code` |

### 编码工作流

写代码时遇到 DB 数字常量 → 按以下顺序处理：

1. **检索现有枚举**：grep `lib/common/backend_infra/enums/` + `lib/features/{module}/common/enums/business/` 是否已定义
2. **复用**：已有 → `import` 直接用 `Xxx.yyy.code`
3. **新建**：没有 → 按 [wiring-steps.md § Step 1.5 业务枚举](./wiring-steps.md#step-15业务枚举按需) 新建枚举类，把所有取值列全 + dartdoc 标注每个值的业务含义
4. **代码体内一律走枚举**：DAO / Service / DTO / 任何位置出现 DB 字段数字字面量都视为违规

### 边界

| 不算违规 | 理由 |
|---|---|
| 算术常量（`* 100` 把元换成分、`/ 1000` 把毫秒换秒） | 不是 DB 字段值映射 |
| 数组/列表索引（`list[0]`） | 不是业务语义 |
| 测试代码里的 setup 数据 | 测试对枚举依赖会增加脆弱性 |
| 边界值（`>= 0 ? a : b`） | 0 是数学边界，不是状态码 |

### 违规处置

发现裸数字字面量 → 先建/找枚举 → 替换 → 同步登记 `docs/coding-violations.md`（按 `coding-violation-log` skill）。
