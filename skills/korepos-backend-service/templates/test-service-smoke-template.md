# Backend service 冒烟/调试入口模板

> 配合 SKILL.md 的「Step 9：生成 services 层冒烟/调试入口」使用。
>
> **不是 TDD / 契约测试**，目的是给开发**联调时**快速触发 service：
> - 不起 POS 进程，`flutter test {file}` 即可
> - 改入参直接编辑 dart 文件，省 Postman
> - 真实抛错堆栈直接打印
>
> 模板里只有 `print`、`try/catch`，**不做断言**。带断言的 flow 测试由开发联调结束后自己按 `_support/step_runner.dart` 模式补。

---

## 1. 目录结构

```
test/features/{module}/backend/             # 注：始终用 backend/，即使源码是 backendv2/
├── _support/                               # ← 首次创建时一次性落地下面 4 个文件
│   ├── test_harness.dart                   # 起 ProviderContainer + 注入 Fake + 暴露 service getter
│   ├── fakes.dart                          # BackendInfra 依赖的跨模块 service 替身
│   ├── test_db.dart                        # 内存 DB / 文件副本 DB / seed SQL 灌入
│   ├── step_runner.dart                    # （给 flows 用的多步编排器；service smoke 不依赖）
│   └── seed/                               # ← 占位空目录：放业务场景 SQL，开发自定义
│       └── .gitkeep
├── flows/                                  # ← 占位空目录：联调结束后开发自己按 step_runner 补
│   └── .gitkeep
└── services/                               # ← 每个 service 对应一份 *_service_test.dart
    └── {action}_service_test.dart
```

### 源码 → 测试 路径映射

| 源码文件 | 测试文件 |
|---|---|
| `lib/features/{module}/backend/service/{action}_service.dart` | `test/features/{module}/backend/services/{action}_service_test.dart` |
| `lib/features/refund/backendv2/service/{action}_service.dart` | `test/features/refund/backend/services/{action}_service_test.dart` |

> refund 的测试目录沿用 `backend/`（不跟源码的 `backendv2/`），未来 backendv2 改回 backend 时测试 0 迁移。

### DTO import 路径映射

测试文件 import DTO 时统一从 `common/` 拿（与源码 backend/backendv2 无关）：

| 源码 service 位置 | 测试 import DTO 路径 |
|---|---|
| `lib/features/{module}/backend/service/...` | `package:kpos/features/{module}/common/models/{request,response}/{action}_*.dart` |
| `lib/features/refund/backendv2/service/...` | `package:kpos/features/refund/common/models/{request,response}/{action}_*.dart` |

**前提**：该接口的 DTO 已经按新规则迁到 `common/models/`（refund 大部分老接口仍在 `backendv2/dto/` 副本里，那种情况测试 import 暂时只能跟着用 backendv2/dto/，等 DTO 迁移到 common/ 时同步更新 import）。

### 占位目录策略

- **`flows/` 与 `_support/seed/` 默认只放 `.gitkeep`**
- skill **不主动生成** flows / seed 的实质内容——这两块业务语义太重，由开发联调时自己定义场景后再写
- 用户主动要求生成场景（"帮我写一个现金整单退的 flow / seed"）时再扩展

---

## 2. `services/{action}_service_test.dart`（核心模板）

这是**每写一个 service 就同步生成一份**的文件。

```dart
import 'package:flutter_test/flutter_test.dart';
// Request DTO 来自 common 契约层(UI + backend 共用,与源码 backend/backendv2 版本目录无关)
import 'package:kpos/features/{module}/common/models/request/{action}_request.dart';

import '../_support/test_harness.dart';

/// {ServiceClass}.{action} 单元测试
///
/// 端点: POST {/path}
///
/// 用途:
///   传入一组前端 HTTP 请求参数,直接执行 service 代码,观察返回值或抛出的异常。
///   不做业务数据断言,数据层若返回 "订单不存在" 等异常也算 service 跑通。
void main() {
  test('{action} - 执行 service 并打印结果', () async {
    // ====== DB 来源三选一 ======
    // ① 空内存 DB（最常用，验证参数流转 / 直接抛错路径）
    final h = await RefundTestHarness.start();

    // ② 灌 seed SQL（需要业务前置数据时）
    // final h = await RefundTestHarness.start(
    //   seedFile:
    //       'test/features/{module}/backend/_support/seed/{scenario}.sql',
    // );

    // ③ 真实 DB 文件副本（联调时直接用本机 POS 数据库；写操作只动副本不污染原文件）
    // final h = await RefundTestHarness.start(
    //   dbPath: r'D:\Users\zhangkai\Documents\korepos.db',
    // );

    try {
      // ====== 入参（= 前端 HTTP body） ======
      const req = {ActionRequest}(
        // TODO: 按 UI 对接手册 §4.N 入参表逐字段填占位值
        // 必填字段先全给 0 / '' / [] / false，跑通后再改成业务值
        someRequiredField: 0,
      );

      // ignore: avoid_print
      print('>>> {action} request: $req');

      // ====== 执行 ======
      try {
        final resp = await h.{serviceGetter}.{action}(req);
        // ignore: avoid_print
        print('<<< {action} response: $resp');
      } catch (e, st) {
        // ignore: avoid_print
        print('<<< {action} threw: $e\n$st');
      }
    } finally {
      await h.dispose();
    }
  });
}
```

### 占位符说明

| 占位符 | 取值规则 | 例 |
|---|---|---|
| `{module}` | 模块目录名 | `refund` |
| `{action}` | service 文件名（snake_case） | `confirm_refund` / `rollback_refund` |
| `{ActionRequest}` | Request DTO 类名（PascalCase） | `ConfirmRefundRequest` |
| `{ServiceClass}` | Service 类名（PascalCase） | `RefundConfirmService` |
| `{serviceGetter}` | harness 上的 service getter 名 | `confirmService` / `rollbackService` |
| `{/path}` | Endpoint 枚举里 path 字段 | `/confirm/refund/transaction` |

> **没有版本目录占位符**：DTO 现统一在 `features/{module}/common/models/`，与源码 `backend/` vs `backendv2/` 无关。即使 refund 历史走 `backendv2/`，DTO 也已迁到 `refund/common/models/`。

### 三个 DB 来源对应场景

| 场景 | 用法 |
|---|---|
| 写代码时第一次跑通 | ① 空内存 DB —— 验证参数解析、序列化、main 路径不抛 |
| 模拟特定业务前置（订单已支付 / 商品已退一半） | ② seed SQL —— 自己在 `_support/seed/` 写一份 |
| 联调真实环境复现 bug | ③ dbPath 真实文件副本 —— 拷你本机 POS 数据库 |

---

## 3. `_support/test_harness.dart`（首次落地文件，refund 模块版本）

> 当前模板只覆盖 **refund/backendv2** 这套 BackendInfra 依赖列表。新模块若用 `backend/` 跑 smoke test，需按该模块实际依赖的跨模块 service 调整 Fake 列表与 Provider override。

```dart
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kpos/common/backend_infra/backend_infra.dart';
import 'package:kpos/common/backend_infra/backend_infra_riverpod.dart';
import 'package:kpos/common/services/database/app_database.dart';
import 'package:kpos/common/services/database/data_sync/application/data_sync_service.dart';
import 'package:kpos/common/services/language_settings_service/language_settings_service.dart';
import 'package:kpos/common/services/local_storage/key_value_storage_base.dart';
import 'package:kpos/common/services/local_storage/key_value_storage_service.dart';
import 'package:kpos/features/auth/application/auth_service.dart';
import 'package:kpos/features/refund/backendv2/service/refund_callback_apply_service.dart';
import 'package:kpos/features/refund/backendv2/service/refund_confirm_service.dart';
import 'package:kpos/features/refund/backendv2/service/refund_price_service.dart';
import 'package:kpos/features/refund/backendv2/service/refund_query_service.dart';
import 'package:kpos/features/refund/backendv2/service/refund_rollback_service.dart';
import 'package:kpos/features/refund/backendv2/service/refund_write_service.dart';
import 'package:kpos/features/refund/data/settlement_allocate_repository.dart';
import 'package:kpos/features/store/application/store_service.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'fakes.dart';
import 'test_db.dart';

/// 退款 backend 测试 harness
///
/// 一次性起好:
///   1. Flutter test binding + SharedPreferences mock + KeyValueStorageBase.init
///   2. 内存 AppDatabase + 灌 seed SQL（可选）
///   3. ProviderContainer override 所有跨模块 Provider 为 Fake
///   4. 真实 `_RiverpodBackendInfra`(内部 ref.read 全走 Fake)
///   5. 暴露所有 service getter 供测试调用
///
/// 用法:
/// ```dart
/// final h = await RefundTestHarness.start();
/// try {
///   final r = await h.confirmService.confirm(...);
///   expect(r.success, true);
/// } finally {
///   await h.dispose();
/// }
/// ```
class RefundTestHarness {
  final AppDatabase db;
  final ProviderContainer container;
  final BackendInfra infra;

  // Fakes 暴露出来,测试可直接断言 spy 状态
  final FakeAuthService auth;
  final FakeStoreService store;
  final FakeKeyValueStorageService kvStorage;
  final FakeDataSyncService dataSync;
  final FakeLanguageSettingsService lang;
  final FakeSettlementAllocateRepository settlement;

  /// 走 [TestDb.fromFile] 时持有,dispose 时负责清理临时副本;
  /// 走 inMemory 时为 null。
  final TestDbFileHandle? _fileHandle;

  RefundTestHarness._({
    required this.db,
    required this.container,
    required this.infra,
    required this.auth,
    required this.store,
    required this.kvStorage,
    required this.dataSync,
    required this.lang,
    required this.settlement,
    TestDbFileHandle? fileHandle,
  }) : _fileHandle = fileHandle;

  /// 起 harness。
  ///
  /// DB 来源二选一:
  /// - 默认空内存 DB;可选 [seedFile] 灌入 SQL 文件。
  /// - [dbPath]:从真实 SQLite 文件打开(测试先把文件拷贝到临时目录,
  ///   写操作只影响副本,原文件不变)。传 [dbPath] 后忽略 [seedFile]。
  static Future<RefundTestHarness> start({
    String? seedFile,
    String? dbPath,
  }) async {
    TestWidgetsFlutterBinding.ensureInitialized();
    SharedPreferences.setMockInitialValues(<String, Object>{});
    await KeyValueStorageBase.init();

    final AppDatabase db;
    final TestDbFileHandle? fileHandle;
    if (dbPath != null) {
      fileHandle = TestDb.fromFile(dbPath);
      db = fileHandle.db;
    } else {
      db = TestDb.inMemory();
      fileHandle = null;
      if (seedFile != null) {
        await TestDb.loadSeed(db, seedFile);
      }
    }

    final auth = FakeAuthService();
    final store = FakeStoreService();
    final kvStorage = FakeKeyValueStorageService();
    final dataSync = FakeDataSyncService();
    final lang = FakeLanguageSettingsService();
    final settlement = FakeSettlementAllocateRepository();

    final container = ProviderContainer(
      overrides: [
        databaseProvider.overrideWithValue(db),
        authServiceProvider.overrideWith((ref) => auth),
        storeServiceProvider.overrideWith((ref) => store),
        keyValueStorageServiceProvider.overrideWith((ref) => kvStorage),
        dataSyncServiceProvider.overrideWith((ref) => dataSync),
        languageSettingsServiceProvider.overrideWith((ref) => lang),
        settlementAllocateRepositoryProvider.overrideWith((ref) => settlement),
      ],
    );

    final infra = container.read(backendInfraProvider);

    return RefundTestHarness._(
      db: db,
      container: container,
      infra: infra,
      auth: auth,
      store: store,
      kvStorage: kvStorage,
      dataSync: dataSync,
      lang: lang,
      settlement: settlement,
      fileHandle: fileHandle,
    );
  }

  // ===== service 快捷访问 =====
  // 新增一个 service 时,在这里追加一行 getter,**不要**在测试文件里 container.read。
  // 命名规则:`{ServiceClass camelCase}` 去掉 Refund/V2 前缀;
  // 例:RefundConfirmService → confirmService;RefundV2QueryService → queryService。
  RefundV2ConfirmService get confirmService =>
      container.read(refundV2ConfirmServiceProvider);

  RefundV2WriteService get writeService =>
      container.read(refundV2WriteServiceProvider);

  RefundV2RollbackService get rollbackService =>
      container.read(refundV2RollbackServiceProvider);

  RefundV2QueryService get queryService =>
      container.read(refundV2QueryServiceProvider);

  RefundV2PriceService get priceService =>
      container.read(refundV2PriceServiceProvider);

  RefundV2CallbackApplyService get callbackApplyService =>
      container.read(refundV2CallbackApplyServiceProvider);

  Future<void> dispose() async {
    container.dispose();
    if (_fileHandle != null) {
      await _fileHandle.dispose();
    } else {
      await db.close();
    }
  }
}
```

### 增量更新规则（重要）

每写一个新 service，harness **末尾的 service getter 区追加一行**：

```dart
NewActionService get newActionService =>
    container.read(newActionServiceProvider);
```

**幂等检查**：grep `get {newServiceGetter} =>`，已存在则跳过追加。

---

## 4. `_support/fakes.dart`（首次落地文件）

```dart
import 'dart:ui';

import 'package:kpos/common/services/database/data_sync/application/data_sync_service.dart';
import 'package:kpos/common/services/language_settings_service/language_settings_service.dart';
import 'package:kpos/common/services/local_storage/key_value_storage_service.dart';
import 'package:kpos/features/auth/application/auth_service.dart';
import 'package:kpos/features/auth/domain/auth_employee_info.dart';
import 'package:kpos/features/refund/data/settlement_allocate_repository.dart';
import 'package:kpos/features/store/application/store_service.dart';
import 'package:kpos/features/store/domain/bound_store_info.dart';

/// Fake 约定:业务未使用的方法一律抛 UnimplementedError,
/// 意外触发即暴露"测试打到未覆盖路径",提醒扩展 Fake。

class FakeAuthService implements AuthService {
  @override
  AuthEmployeeInfo employeeInfo;

  FakeAuthService({
    int employeeId = 100,
    String employeeName = 'TestEmployee',
  }) : employeeInfo = AuthEmployeeInfo(
          account: Account(
            employeeId: employeeId,
            employeeName: employeeName,
            headPortraitPath: '',
            roleName: '',
          ),
          tenantList: const [],
        );

  @override
  dynamic noSuchMethod(Invocation i) => throw UnimplementedError(
      'FakeAuthService.${i.memberName} not implemented in test');
}

class FakeStoreService implements StoreService {
  @override
  BoundStoreInfo boundStoreInfo;

  final String _businessDate;

  FakeStoreService({
    BoundStoreInfo? store,
    String businessDate = '2026-04-20',
  })  : boundStoreInfo = store ??
            BoundStoreInfo(
              storeId: 10,
              storeName: 'TestStore',
              storeCode: 'T01',
              currency: 'HKD',
              currentUnit: r'$',
              timeZone: 'Asia/Hong_Kong',
              brandId: 100,
              brandName: 'TestBrand',
              roundingMethod: 1,
              roundingUnit: 3,
              roundingScope: 0,
            ),
        _businessDate = businessDate;

  @override
  Future<String> calculateBusinessDate() async => _businessDate;

  @override
  dynamic noSuchMethod(Invocation i) => throw UnimplementedError(
      'FakeStoreService.${i.memberName} not implemented in test');
}

class FakeKeyValueStorageService implements KeyValueStorageService {
  final int? _tenantId;

  FakeKeyValueStorageService({int? tenantId = 1}) : _tenantId = tenantId;

  @override
  int? getTenantId() => _tenantId;

  @override
  dynamic noSuchMethod(Invocation i) => throw UnimplementedError(
      'FakeKeyValueStorageService.${i.memberName} not implemented in test');
}

/// 数据同步事件上报 spy。测试可断言 `calls` 列表验证上报次数/参数。
class FakeDataSyncService implements DataSyncService {
  final List<DataSyncCall> calls = [];

  @override
  Future<bool> addBatchDataSyncReport(
    List<int> businessIds,
    String businessType,
    String eventType,
  ) async {
    calls.add(DataSyncCall(businessIds, businessType, eventType));
    return true;
  }

  @override
  dynamic noSuchMethod(Invocation i) => throw UnimplementedError(
      'FakeDataSyncService.${i.memberName} not implemented in test');
}

class DataSyncCall {
  final List<int> businessIds;
  final String businessType;
  final String eventType;
  const DataSyncCall(this.businessIds, this.businessType, this.eventType);
}

class FakeLanguageSettingsService implements LanguageSettingsService {
  @override
  Locale currentLocale;

  FakeLanguageSettingsService({
    this.currentLocale = const Locale('zh', 'HK'),
  });

  @override
  dynamic noSuchMethod(Invocation i) => throw UnimplementedError(
      'FakeLanguageSettingsService.${i.memberName} not implemented in test');
}

/// 分摊在 confirm service 里是容错调用(try/catch 吞异常),
/// 测试里做 noop 即可,callCount 可用于断言是否真的被触发。
class FakeSettlementAllocateRepository
    implements SettlementAllocateRepository {
  int callCount = 0;

  @override
  Future<void> allocateAndPersist({
    required int billId,
    required int orderId,
    required bool isRefundOrder,
    int allocateMethod = 6,
  }) async {
    callCount++;
  }

  @override
  dynamic noSuchMethod(Invocation i) => throw UnimplementedError(
      'FakeSettlementAllocateRepository.${i.memberName} not implemented in test');
}
```

---

## 5. `_support/test_db.dart`（首次落地文件）

```dart
import 'dart:io';

import 'package:drift/native.dart';
import 'package:kpos/common/services/database/app_database.dart';

/// 测试用数据库工厂 + seed SQL 灌入工具
class TestDb {
  /// 起一个新的内存 AppDatabase 实例。
  /// 每个测试独占一份,跑完 dispose。
  static AppDatabase inMemory() =>
      AppDatabase.forTesting(NativeDatabase.memory());

  /// 以指定文件为源打开 AppDatabase。
  ///
  /// 为保护原文件,默认**复制到临时目录**再打开;测试里的写操作
  /// 只会改副本,不会污染 [sourcePath]。测试结束调 [TestDbFileHandle.dispose] 清理。
  static TestDbFileHandle fromFile(String sourcePath) {
    final source = File(sourcePath);
    if (!source.existsSync()) {
      throw StateError('DB 源文件不存在: $sourcePath');
    }
    final tempDir = Directory.systemTemp.createTempSync('kpos_backend_test_');
    final tempFile = File('${tempDir.path}/copy.db');
    source.copySync(tempFile.path);
    final db = AppDatabase.forTesting(NativeDatabase(tempFile));
    return TestDbFileHandle._(db: db, tempDir: tempDir);
  }

  /// 从文件读 SQL 按 `;` 切分逐条 exec 灌入 db。
  ///
  /// SQL 规范:
  /// - 每条语句独占一行或多行,以 `;` 结尾
  /// - `--` 开头的行视作注释,整行忽略
  /// - 空行忽略
  static Future<void> loadSeed(AppDatabase db, String sqlFilePath) async {
    final sql = await File(sqlFilePath).readAsString();
    for (final stmt in _splitStatements(sql)) {
      await db.customStatement(stmt);
    }
  }

  static Iterable<String> _splitStatements(String sql) sync* {
    final buffer = StringBuffer();
    for (final line in sql.split('\n')) {
      final trimmed = line.trim();
      if (trimmed.isEmpty) continue;
      if (trimmed.startsWith('--')) continue;
      buffer.writeln(line);
      if (trimmed.endsWith(';')) {
        final stmt = buffer.toString().trim();
        if (stmt.isNotEmpty) {
          yield stmt.substring(0, stmt.length - 1);
        }
        buffer.clear();
      }
    }
    final leftover = buffer.toString().trim();
    if (leftover.isNotEmpty) yield leftover;
  }
}

/// [TestDb.fromFile] 返回句柄：持有打开的 DB 副本与临时目录。
/// 测试结束前调 [dispose] 关 DB + 删临时文件,避免临时文件堆积。
class TestDbFileHandle {
  final AppDatabase db;
  final Directory _tempDir;

  TestDbFileHandle._({required this.db, required Directory tempDir})
      : _tempDir = tempDir;

  Future<void> dispose() async {
    await db.close();
    try {
      _tempDir.deleteSync(recursive: true);
    } catch (_) {
      // Windows 下 sqlite 进程可能滞后释放,删除偶发失败,忽略
    }
  }
}
```

---

## 6. `_support/step_runner.dart`（首次落地文件，给 flows 用）

> service smoke test 不依赖此文件，但首次落地时一并放好，避免后续开发写 flow 测试时再造一遍。

```dart
import 'dart:async';

import 'test_harness.dart';

/// 单步退款操作
///
/// [name] 用作区间选择的锚点(fromStep/toStep 按名字匹配),
/// [run] 接收 step 间共享的 [ctx] 和 [harness],自行调 service + 断言。
class RefundStep {
  final String name;
  final Future<void> Function(Map<String, dynamic> ctx, RefundTestHarness h) run;

  const RefundStep(this.name, this.run);
}

/// 一条业务流程(例:现金整单退款)
///
/// 用法:
/// ```dart
/// final flow = RefundFlow(
///   name: '现金整单退款',
///   seedFile: 'test/features/refund/backend/_support/seed/cash_paid_order.sql',
///   steps: [
///     RefundStep('查询可退商品', (ctx, h) async { ... }),
///     RefundStep('确认入库', (ctx, h) async { ... }),
///   ],
/// );
///
/// test('完整流程', () => flow.execute());
/// test('只跑查询链路', () => flow.execute(
///   fromStep: '查询可退商品',
///   toStep: '查询渠道分配',
/// ));
/// ```
class RefundFlow {
  final String name;
  final String seedFile;
  final List<RefundStep> steps;

  const RefundFlow({
    required this.name,
    required this.seedFile,
    required this.steps,
  });

  Future<void> execute({
    String? fromStep,
    String? toStep,
    Map<String, dynamic>? initialContext,
  }) async {
    final harness = await RefundTestHarness.start(seedFile: seedFile);
    final ctx = <String, dynamic>{...?initialContext};

    try {
      final slice = _slice(steps, fromStep, toStep);
      // ignore: avoid_print
      print('━━━ Flow: $name (seed: $seedFile) ━━━');
      for (final step in slice) {
        // ignore: avoid_print
        print('▶ Step: ${step.name}');
        await step.run(ctx, harness);
      }
      // ignore: avoid_print
      print('━━━ Flow: $name 完成 — ${slice.length}/${steps.length} 步 ━━━');
    } finally {
      await harness.dispose();
    }
  }

  List<RefundStep> _slice(List<RefundStep> list, String? from, String? to) {
    var start = 0;
    var end = list.length;
    if (from != null) {
      start = list.indexWhere((s) => s.name == from);
      if (start < 0) throw ArgumentError('fromStep 未找到: $from');
    }
    if (to != null) {
      final idx = list.indexWhere((s) => s.name == to);
      if (idx < 0) throw ArgumentError('toStep 未找到: $to');
      end = idx + 1;
    }
    return list.sublist(start, end);
  }
}
```

---

## 7. 占位文件 `.gitkeep`

`flows/.gitkeep` 与 `_support/seed/.gitkeep` 内容相同——空文件，仅占位。可写一行说明帮助后续维护者：

```
# flows/ — 多步业务 flow 测试,带断言。开发联调时自定义 RefundFlow + steps,详见 _support/step_runner.dart。
```

```
# seed/ — flows 灌库用的业务场景 SQL。每个 *.sql 描述一个完整的业务前置(订单+账单+流水…)。
```

---

## 8. 落地动作清单（skill 执行时按此推进）

完成 Step 5（Service 落盘）后，对**每个新增 service**：

1. **判断 `test/features/{module}/backend/_support/test_harness.dart` 是否已存在**
   - 不存在 → 落 4 个 `_support/` 文件 + 2 个 `.gitkeep`（首次接入该模块）
   - 已存在 → 跳过基础文件，仅在 harness 末尾追加新 service 的 getter（grep 幂等）
2. **生成** `test/features/{module}/backend/services/{action}_service_test.dart`
   - 套第 2 节模板，填占位符（module / 版本目录 / Request 类名 / service getter 名 / 端点 path）
   - 入参字段全给 `0` / `''` / `[]` / `false`，加 `// TODO: 按 §4.N 入参表`
3. **回报用户**：列出新增/修改的测试文件路径，提示 `flutter test {file}` 命令可一键跑

**禁止**：
- 不要在 services smoke test 里写断言（`expect`）—— 那是 flows 测试的活
- 不要主动给 `flows/` 或 `_support/seed/` 生成内容（用户明确要求时除外）
- 不要修改 `_support/` 已存在的 `test_harness.dart` 的 Fake 列表 / Provider override —— 这套 6 Fake 是 refund/backendv2 当前依赖的 BackendInfra 实现决定的，跨模块扩展 Fake 由独立 PR 处理
