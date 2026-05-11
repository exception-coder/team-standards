# Step 4：DAO（原子化 SQL，禁止业务编排）

> 子文档 of [korepos-backend-service/SKILL.md](../SKILL.md)。
> Step 4 是 8 步编写顺序的第 4 步。本文件规定 DAO 的核心规则：原子 SQL、强类型 Row 实体、事务编排归 service。

**路径**：`backend/dao/{table}_dao.dart`（命名以**表名**为主，一个表一个 DAO 文件）

> **DAO 是 SQL 的唯一容器**。整个 backend 内（含 service / orchestrator / handler / registry / internal 原子能力）**只有 DAO 文件**允许出现 `customSelect` / `select(table)` / `update(table)` / `delete(table)` / `into(table).insert(...)` / `_db.batch(...)` 这类 drift 调用；其它任何文件出现 SQL 都视为违规（详见 [step5-service.md](./step5-service.md) 「Service 内禁止任何 SQL」红线 + 主 SKILL.md 「禁区」节）。

## 核心规则：DAO 只是 SQL 的容器，不是事务编排者

| 维度 | DAO 应该做 | DAO **不应该**做 |
|---|---|---|
| 粒度 | 一个 public 方法 = 一条原子 SQL（INSERT 一条、UPDATE 一条、SELECT 一条） | 一个方法里"先 INSERT a 表，再 UPDATE b 表，再 SELECT c 表"——这是编排，归 service |
| 事务 | **不写** `db.transaction(() async {...})` | 拥有 `db.transaction(...)` 包裹多步 SQL —— 事务由 service 包 |
| 业务条件 | 收 service 整理好的参数（如 `int orderId, int newState`），照 SQL 执行 | 在方法里判断"如果 X 就走 SQL A、否则走 SQL B"——这是业务逻辑，归 service |
| 上下文注入 | tenantId / employeeId / storeId / businessDate 由 service 整理后**作为参数传入** | DAO 内部读 `_infra.auth` / `_infra.store` 等去取——上下文耦合，独立测试痛苦 |
| 跨表读取 | 单条 SELECT JOIN 是一条原子 SQL ✅ | 先 SELECT a 表再 SELECT b 表合并 → 拆两个方法，service 编排 |

## ❌ 反例（refund/backendv2 当前 DAO 的缺陷模式）

```dart
class RefundTransactionDao {
  // 反例：DAO 既包事务，又拼上下文，又做多步业务编排
  Future<RefundResult> writeRefund(WriteRefundParams params) async {
    final now = DateTime.now().millisecondsSinceEpoch;
    final employee = _infra.auth.employeeInfo;          // ← 不该在 DAO 里取上下文
    final businessDate = await _infra.store.calculateBusinessDate();

    return await db.transaction(() async {              // ← 不该在 DAO 里包事务
      // ===== Step 1: INSERT 退款子订单 =====
      final refundOrderId = await db.into(orders).insert(...);
      // ===== Step 2: UPDATE 父订单状态 =====
      await (db.update(orders)..where(...)).write(...);
      // ===== Step 3: INSERT 退款 bill =====
      // ===== Step 4: UPDATE 原 bill 状态 =====
      // ===== Step 5: INSERT 退款流水 =====
      return RefundResult(...);
    });
  }
}
```

问题：
- service 想换 step 顺序、加补偿、跳过某步都改不动 DAO（DAO 锁死了流程）
- 单元测试这一个方法就要造 5 张表的 fixture
- 跨方法复用不了任何一步（其它接口想"只更新父订单状态"也要复制粘贴）

## ✅ 正例（原子化 DAO + service 编排事务）

```dart
class OrderDao {
  final BackendInfra _infra;
  OrderDao(this._infra);
  AppDatabase get db => _infra.db;

  /// 插入一条订单记录,返回新订单 ID。**单 SQL 原子操作**。
  Future<int> insertOrder({
    required int tenantId,
    required int storeId,
    required int orderType,
    required int orderState,
    required double payAmount,
    required int createTimeMillis,
    required int operatorId,
    // ... 其它字段
  }) async {
    return await db.into(orders).insert(OrdersCompanion.insert(
      tenantId: tenantId,
      storeId: Value(storeId),
      orderType: Value(orderType),
      orderState: Value(orderState),
      payAmount: Value(payAmount),
      createTime: Value(createTimeMillis),
      createAccountId: Value(operatorId),
      // ...
    ));
  }

  /// 更新指定订单的状态。**单 SQL 原子操作**。
  Future<int> updateOrderState({
    required int orderId,
    required int newState,
    required int modifyTimeMillis,
    required int operatorId,
  }) async {
    return await (db.update(orders)..where((t) => t.orderId.equals(orderId)))
        .write(OrdersCompanion(
      orderState: Value(newState),
      modifyTime: Value(modifyTimeMillis),
      modifyAccountId: Value(operatorId),
    ));
  }

  /// 按主键读单条订单。返回 null 表示不存在。
  Future<Order?> findById(int orderId) =>
      (db.select(orders)..where((t) => t.orderId.equals(orderId)))
          .getSingleOrNull();
}
```

事务编排在 service：

```dart
class RefundConfirmService {
  Future<ConfirmRefundResponse> confirm(ConfirmRefundRequest req) async {
    // 1. service 整理上下文(只在这里取一次)
    final now = DateTime.now().millisecondsSinceEpoch;
    final operatorId = _infra.auth.employeeInfo.account.employeeId;
    final tenantId = _infra.kvStorage.getTenantId() ?? 1;
    final storeId = _infra.store.boundStoreInfo.storeId;

    // 2. service 包事务,组合 DAO 原子方法
    final result = await _infra.db.transaction(() async {
      final refundOrderId = await _orderDao.insertOrder(
        tenantId: tenantId, storeId: storeId,
        orderType: 2, orderState: 6, payAmount: req.refundAmount,
        createTimeMillis: now, operatorId: operatorId,
      );
      await _orderDao.updateOrderState(
        orderId: req.originalOrderId, newState: 7,
        modifyTimeMillis: now, operatorId: operatorId,
      );
      final refundBillId = await _billDao.insertBill(/* ... */);
      // ...
      return _Internal(refundOrderId: refundOrderId, refundBillId: refundBillId);
    });

    return ConfirmRefundResponse(/* ... */);
  }
}
```

## Step 4 落盘规则

- **粒度**：一个 public 方法 = 一条原子 SQL；如果你写出 `db.transaction(...)` 在 DAO 里，**立刻拆开**
- **命名**：`{verb}{Entity}` 动词在前 — `insertOrder` / `updateOrderState` / `findBillById` / `softDeleteRefundOrder` / `selectByXxx`；忌用 `writeXxx` / `processXxx` 这种含编排意味的动词
- **入参**：业务上下文（tenantId / operatorId / storeId / businessDate / now）由 service 计算后**作为参数传入**；DAO 不读 `_infra.auth` / `_infra.store`
- **唯一允许从 `_infra` 取的东西**：`_infra.db`（数据库句柄本身）。其它一律走入参
- **返回类型必须强类型实体**（详见下方「查询返回类型」节）：禁止 `Map<String, dynamic>` / `List<QueryRow>` / `List<Map<...>>` 弱类型返回
- **类级 dartdoc**：标注「对齐云端：{Java Mapper / Repository 全路径}#方法」（如果有云端对应）
- **构造器**：保持原样接 `BackendInfra` 即可（只是为了拿 `db`），不影响入参规则

## 查询返回类型必须强类型实体（JPA 风格，禁止 JDBC 风格）

**核心规则**：DAO 方法的返回值类型必须让调方在编译期就能看到字段名与类型——拒绝 `Map<String, dynamic>`、拒绝 `QueryRow`、拒绝 `dynamic`。

**三档返回类型选择**（按场景从简到繁）：

| 档位 | 用法 | 范本 | 何时用 |
|---|---|---|---|
| **A. Drift 自动 Row 类** | `select(orders).where(...).getSingleOrNull()` 直接返回 drift 生成的 `Order` / `Bill` row | `OrderDao.findById` 返回 `Future<Order?>` | 单表查询，字段集 = 表字段集 |
| **B. 自定义 `*Row` 实体类** | `customSelect(...).get()` 后 `.map((r) => XxxRow(...))` 包装；实体类**默认**放本模块 `backend/dao/models/`（跨模块复用时才上提到 `lib/common/services/database/models/`，详见「实体类落地约定」） | `OrderServiceFeeSnapshotDao.findByOrderId` 返回 `Future<List<OrderServiceFeeSnapshotRow>>` | JOIN / 计算列 / 子集字段 / 字段需重命名 |
| **C. 自定义 `*SummaryRow` 实体类** | 同 B，但承载 SUM/COUNT/AVG 等聚合结果，字段语义是"汇总值" | `OrderDao.sumAmountsByOrderIds` 应改返 `Future<OrderAmountsSummaryRow?>`（当前是 `Map<String, double>?`，是反例） | 聚合查询，字段全部是数值汇总 |

> 这三档都是 **JPA 风格**：调方拿到的是 dart 强类型对象，IDE 自动补全字段名、字段拼写错编译期就报。**Map / QueryRow 是 JDBC 风格**——拼错字段名运行时才崩，且查询语义靠 doc 描述而不是类型。

### ❌ 反例（项目里现存的 JDBC 风格代码，不要复制）

```dart
// 反例 1: 返回 Map<String, dynamic>,字段名是字符串
Future<Map<String, double>?> sumAmountsByOrderIds(List<int> orderIds) async {
  final result = await customSelect('SELECT SUM(...) AS total_amount, ...').getSingleOrNull();
  if (result == null) return null;
  return {
    'totalAmount': result.readNullable<double>('total_amount') ?? 0,
    'payAmount': result.readNullable<double>('pay_amount') ?? 0,
    // ...10 个字段全靠字符串 key
  };
}

// 调方使用:
final m = await dao.sumAmountsByOrderIds([1, 2]);
final total = m?['totalAmount']; // ← 拼错 key 运行时才发现,IDE 不补全

// 反例 2: 返回 List<QueryRow>(drift 通用行类型)
Future<List<QueryRow>> findRefundableMainItems(List<int> orderIds) async {
  return customSelect('SELECT oi.order_item_id, oi.commodity_name, ...').get();
}

// 调方使用:
final rows = await dao.findRefundableMainItems([1]);
final id = rows.first.read<int>('order_item_id'); // ← 同样的字符串问题
```

### ✅ 正例（用自定义实体类承载结果集）

**Step 1：在本模块 `backend/dao/models/` 下建实体文件**（默认就近落地，跨模块复用时才上提到全局；上提条件见「实体类落地约定」）

```dart
// lib/features/{module}/backend/dao/models/order_amounts_summary_row.dart

/// 订单金额汇总行(DAO 层 DTO)
///
/// 由 [OrderDao.sumAmountsByOrderIds] 返回,联台订单按 SUM 聚合后的字段集合。
/// 字段语义对齐云端 `OrderAmountAggregator.java#aggregate`。
///
/// **不进 wire**:这是 DAO 层内部表示,service 拿到后会重新映射成 common DTO。
class OrderAmountsSummaryRow {
  const OrderAmountsSummaryRow({
    required this.totalAmount,
    required this.payAmount,
    required this.orderDiscountAmount,
    required this.commodityDiscountAmount,
    required this.discountAmount,
    required this.taxAmount,
    required this.taxAddonAmount,
    required this.taxIncludeAmount,
    required this.serviceFeeAmount,
    required this.tipAmount,
  });

  final double totalAmount;
  final double payAmount;
  final double orderDiscountAmount;
  final double commodityDiscountAmount;
  final double discountAmount;
  final double taxAmount;
  final double taxAddonAmount;
  final double taxIncludeAmount;
  final double serviceFeeAmount;
  final double tipAmount;
}
```

**Step 2：DAO 方法返回该实体**

```dart
// backend/dao/order_dao.dart
import 'models/order_amounts_summary_row.dart';

export 'models/order_amounts_summary_row.dart'; // 调方 import dao 即可拿到实体

class OrderDao extends DatabaseAccessor<AppDatabase> with _$OrderDaoMixin {
  /// 联台订单金额汇总。返回 null 表示 orderIds 为空或无匹配。
  Future<OrderAmountsSummaryRow?> sumAmountsByOrderIds(List<int> orderIds) async {
    if (orderIds.isEmpty) return null;
    final placeholders = orderIds.map((_) => '?').join(',');
    final result = await customSelect(
      '''
      SELECT
        SUM(COALESCE(o.total_amount, 0))    AS total_amount,
        SUM(COALESCE(o.pay_amount, 0))      AS pay_amount,
        ...
      FROM orders o
      WHERE o.order_id IN ($placeholders) AND o.deleted = 0
      ''',
      variables: orderIds.map(Variable.withInt).toList(),
    ).getSingleOrNull();

    if (result == null) return null;
    return OrderAmountsSummaryRow(
      totalAmount: result.readNullable<double>('total_amount') ?? 0,
      payAmount: result.readNullable<double>('pay_amount') ?? 0,
      // ...其余字段
    );
  }
}
```

**Step 3：调方拿到强类型对象**

```dart
final summary = await orderDao.sumAmountsByOrderIds([1001, 1002]);
if (summary == null) return _emptyResponse();
final total = summary.totalAmount;     // ← IDE 自动补全,类型 double
final pay = summary.payAmount;          // ← 字段拼错编译期就报错
```

### 实体类落地约定

| 项 | 规则 |
|---|---|
| **物理位置（默认）** | `lib/features/{module}/backend/dao/models/{purpose}_row.dart` —— 与本模块 `dao/` 同包，独立服务化时随 `backend/` 整包搬走，不污染全局 common |
| **物理位置（例外，跨模块复用）** | `lib/common/services/database/models/{purpose}_row.dart` —— 仅当**已实际有 ≥2 个不同模块的 DAO 同时返回该 Row**（不是"假设可能复用"）时才上提到全局；首次出现复用需求时机会主义迁移，不预先上提 |
| **命名后缀** | `*Row`（普通查询）/ `*SummaryRow`（聚合查询）/ `*ProjectionRow`（子集投影） |
| **类型** | 普通 `class`，`final` 字段，`const` 构造器 + `required`；**不写** `fromJson` / `toJson`（DAO 内部 DTO，不进 wire，详见 [dto-and-acl.md § ACL](./dto-and-acl.md#aclanti-corruption-layer内部类型与-wire-dto-的边界)） |
| **字段类型** | 严格强类型：`int / double / String / DateTime / int? / double?...`；**禁用** `dynamic` / `Object` |
| **可空语义** | 字段可空（`int?`）= "DB 列允许 NULL 或 SUM/MIN 在空集时返回 NULL"；不可空（`int`）= "DAO 内部已用 `?? 默认值` 兜底" |
| **export** | DAO 文件顶部 `export 'models/{xxx}_row.dart';`（默认本模块就近）或 `export '../../../../common/services/database/models/{xxx}_row.dart';`（已上提到全局时）—— 调方 `import '{module}_dao.dart'` 就能拿到实体，无需双 import |
| **跨模块引用方式** | A 模块 DAO 想用 B 模块的 Row：先确认是否真的复用同一形状；是 → 把 Row 上提到 `common/services/database/models/`；否 → A 模块自己在 `backend/dao/models/` 下建一份（DAO 层 DTO 允许重复，避免硬绑两个模块） |

### 何时不必新建 `*Row`：drift 自动 Row 已经够用

如果 SQL 是单表 `SELECT * FROM orders WHERE ...` 这种全字段查询，**直接返 drift 自动生成的 `Order` / `Bill` row**（drift 已经帮你做了 JPA 风格映射）：

```dart
Future<Order?> findById(int orderId) =>
    (select(orders)..where((t) => t.orderId.equals(orderId))).getSingleOrNull();

Future<List<Order>> findByMergeTableId(int mergeTableId) =>
    (select(orders)..where((t) =>
        t.mergeTableId.equals(mergeTableId) & t.deleted.equals(0))).get();
```

**不要**为单表全字段查询额外造一个 `OrderRow` 类——drift 生成的 `Order` 就是它，重复造轮子。

### 现存 OrderDao JDBC 风格代码处理

`OrderDao` 当前有 5+ 个方法返回 `Future<Map<String, dynamic>>` 或 `Future<List<QueryRow>>`（`sumAmountsByOrderIds` / `findRefundExtras` / `findRefundableMainItems` / `findAllItemsByOrderIds` / `getRefundedQuantities`）—— **存量缺陷代码**，按 [dto-and-acl.md § 存量处理](./dto-and-acl.md#现存-backenddto-副本与-backendendpointmodule_endpointdart-路由枚举的存量处理) 原则：

- **新接口** → 一律走 `*Row` 实体路径，**禁止** Map / QueryRow 返回
- **改老 DAO 方法主体时** → 顺手把 Map/QueryRow 返回改成 `*Row` 实体，调方 service 同步改（机会主义迁移）
- **不为单纯迁移开 PR**

## Drift 工具兼容性

drift 的 SELECT JOIN / UPDATE WHERE / INSERT 都属于"原子 SQL"，写在一个 DAO 方法里没问题。**反例信号**：DAO 方法体里出现 `db.transaction(...)` / `await dao.xxx(...)` 嵌套调用 / `if (条件) { update A } else { update B }` 这类多步业务分支。
