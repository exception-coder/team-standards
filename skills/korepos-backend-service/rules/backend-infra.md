# BackendInfra 门面与跨模块原子能力

> 子文档 of [korepos-backend-service/SKILL.md](../SKILL.md)。
> 本文件规定 backend 跨非 backend 层依赖的唯一合法通道（BackendInfra 门面）+ 新实现独立子门面 + `common/backend_infra/services/` 跨 feature 业务原子能力层。

## BackendInfra 门面规则

**跨到非 backend 层的依赖**（其它 feature 的 `application / data / domain / presentation`）**只能** 通过 `BackendInfra` 接口（`lib/common/backend_infra/backend_infra.dart`）访问。其它 feature 的 **backend 层**不受此约束，可直接 import。

### Service / DAO 的标准依赖注入形态

```dart
@riverpod
XxxService xxxService(Ref ref) => XxxService(
      infra: ref.read(backendInfraProvider),
      dao: ref.read(xxxDaoProvider),
    );

class XxxService {
  final BackendInfra _infra;
  final XxxDao _dao;
  XxxService({required BackendInfra infra, required XxxDao dao})
      : _infra = infra,
        _dao = dao;
}
```

Service / DAO 内部 **不允许** 再出现 `ref.read(...)`。想拿什么从 `_infra` 取：`_infra.db` / `_infra.auth` / `_infra.store` / `_infra.kvStorage` / `_infra.dataSync` / `_infra.lang` / `_infra.createOrderRepo()` / `_infra.settlement`。

### 新增跨模块依赖的流程

先判断依赖落在哪一层，再决定路径：

#### 情况 A — 依赖的是其它模块的 **backend 层**（service / dao / dto / endpoint）

**直接 import** 即可，不需要走门面扩展。

典型场景：`features/refund/backend/` 的 service 需要调 `features/payment/backend/service/KPayOnlineRefundService`。两者同属后台团队代码区，独立服务化时会一起搬走，无需做 ACL 隔离。

#### 情况 B — 依赖的是其它模块的 **非 backend 层**（application / data / domain / presentation）

**禁止直接 import**，走 BackendInfra 扩展的以下三步：

1. 在 `backend_infra.dart` 接口上新增一个方法/getter，**写清楚独立服务化剥离路径注释**（参考 `createOrderRepo()` 和 `settlement` 的注释样式）
2. 在 `backend_infra_riverpod.dart` 的 `_RiverpodBackendInfra` 实现里用 `_ref.read(...)` 把 Provider 桥接上
3. Service / DAO 通过 `_infra.xxx` 调用，**对业务层透明**

这是跨到非 backend 层的唯一合法扩展路径。

#### 情况 C — 新实现的「backend 内部基础设施」（云端通信 / WS 推送 / 设备协议等）

**禁止挂到 `BackendInfra` 门面上**，必须建立**独立子门面 + 独立 Riverpod provider**，与 `BackendInfra` **平级**注入。

##### 为什么不能挂到 BackendInfra

`BackendInfra` 的真实定位是**「旧实现防腐过渡门面」**。通览 `backend_infra.dart` 现有字段，每个 getter 注释里清一色写着「独立服务化：xxx 后改成 RPC / 远程调用 / 配置下发」——它的演进终点是字段被一个个**清空**（每剥离一个旧实现，对应字段就移除）。

把新实现塞进 `BackendInfra` = 让新代码伪装成「将要清空的过渡通道」，**视觉上无法区分新旧**，重构演进时统计「还剩多少旧实现要剥离」会污染。

##### 判断「是不是新实现」的 1 个问句

> 这段代码是不是从 0 开始按 `features/{module}/backend/` 蓝本写的？（而不是包装某个 `features/{x}/{application,data,domain,presentation}/...` 下原有的旧 service / repository？）

- 是 → **新实现** → 走情况 C，独立门面
- 否 → **旧实现包装** → 走情况 B，挂 BackendInfra

##### 新实现独立门面的标准目录形态

```text
lib/common/backend_infra/{capability}/        # 与 backend_infra.dart 平级,各自独立
├── {capability}_port.dart                    # 子门面接口 (abstract interface)
├── {capability}_client.dart                  # 实现 (纯 HTTP / WS / 协议适配,无业务编排)
├── {capability}_client.g.dart
├── endpoint/                                 # 仅当涉及云端 HTTP
│   └── {capability}_endpoint.dart
└── dto/                                      # 子门面自持的 Request / Response,不复用业务模块 DTO
    ├── ...
```

`{capability}` 命名按能力域定（例：`kpay_online` / `device_protocol` / `cloud_push`），不要塞 `infra_` 前缀也不要叫 `xxx_facade`。

##### 调用方注入与使用形态

**正例**——子门面与 BackendInfra 平级注入：

```dart
@riverpod
XxxService xxxService(Ref ref) => XxxService(
      infra: ref.read(backendInfraProvider),
      kpayOnline: ref.read(kpayOnlinePortProvider),  // ← 平级,不是 _infra 的子节点
      dao: ref.read(xxxDaoProvider),
    );

class XxxService {
  final BackendInfra _infra;            // 旧实现走门面
  final KpayOnlinePort _kpayOnline;     // 新实现走独立门面
  final XxxDao _dao;

  XxxService({
    required BackendInfra infra,
    required KpayOnlinePort kpayOnline,
    required XxxDao dao,
  })  : _infra = infra,
        _kpayOnline = kpayOnline,
        _dao = dao;

  Future<void> run() async {
    final tenantId = _infra.kvStorage.getTenantId();        // 旧实现 → _infra
    final outcome = await _kpayOnline.refund(...);          // 新实现 → 独立门面
  }
}
```

视觉上立刻能区分：`_infra.xxx` = 旧实现包装、`_{capability}.xxx` = 新实现独立门面。

##### 红线

| 红线 | 错误形态 | 正确形态 |
| --- | --- | --- |
| 不要在 `BackendInfra` 上加 `{Capability}Port get {capability}` 转发 getter | `_infra.kpayOnline.refund(...)` | `_kpayOnline.refund(...)` |
| 不要在子门面 `client` 实现里持有 `BackendInfra`（基础设施反向依赖业务通道） | `KpayOnlineClient({required BackendInfra infra, ...})` | 子门面只依赖 `ApiInterface` / `WebSocketService` 等基础设施原语 |
| 不要把新实现的 DTO 放在 `features/{x}/backend/dto/` 等业务模块目录下 | DTO 散落在某个 feature 的 backend 目录 | DTO 与 client 同居 `common/backend_infra/{capability}/dto/` |

##### 已有反例（不要模仿）

`BackendInfra.cloud`（`CloudApiPort get cloud`）是 v1 阶段的过渡遗留——本应作为独立门面但被挂到了 BackendInfra 上。新代码**不要**沿用这个形态；该字段会在下一轮重构时拆出独立门面，让 `BackendInfra` 回归「纯旧实现防腐层」语义。

---

## BackendInfra/services/ 跨模块业务原子能力层（公共能力沉淀）

### 概念与定位

`common/backend_infra/services/` 存放**跨多个 feature 模块共享的业务原子能力**——介于「模块内 internal 原子能力」和「全局基础设施门面（情况 C）」之间的中间层：

| 层 | 路径 | 复用范围 | 性质 |
|---|---|---|---|
| 模块内原子能力 | `features/{module}/backend/service/internal/` | 单模块内 ≥2 个 service | 业务相关，但只服务一个 feature |
| **跨模块业务原子能力** | `common/backend_infra/services/` | **≥2 feature 模块共享** | **业务相关，跨 feature 复用** |
| 跨模块基础设施门面 | `common/backend_infra/{capability}/` | 全局技术能力 | 纯技术（HTTP / WS / 设备协议），无业务规则 |

**典型场景**：
- 「按 originalOrderId 计算订单可退余额」— refund / report / order 等多个 feature 都要算
- 「按 transactionId 查找原支付流水」— refund / settlement / report 都要查
- 「汇总订单的退款业务状态」— refund / order / cashbox 都要展示

`backend_infra/daos/` 已经按"跨模块共享 DAO"分了一层（如 `RefundEligibilityDao` / `BackendOrderTransactionDao`），`backend_infra/services/` 是它的对偶——DAO 解决"原子 SQL 跨模块共享"，services 解决"原子业务能力跨模块共享"（**调用 daos 的同时可包含跨表组合 / 业务规则计算**）。

### 何时下沉到 backend_infra/services/（**写代码前必须检索**）

**写新 service 主流程前的强制工作流**：

1. **第一步：检索索引** — 打开 `lib/common/backend_infra/services/INDEX.md`（详见下方 INDEX.md 节），按业务关键词搜索是否已有可复用的原子能力
2. **第二步：直接用** — 已有 → 直接 `ref.read(xxxServiceProvider)` 注入，**禁止复制粘贴 SQL / 业务计算到新 service**
3. **第三步：评估抽出** — 没有 → 写完新 service 主流程后，反向 grep：本能力是否已在其他 feature 的 service 中出现（判定 ≥2 个 feature）

**判定信号（命中 ≥1 项即考虑下沉）**：

| 信号 | 例 |
|---|---|
| 同一段业务计算在 ≥2 feature 模块的 service 出现 | "按 orderId 算可退余额" 在 refund + report 两个 feature 都出现 |
| 业务术语强烈、跨 feature 边界明显 | "订单退款时序状态推导"、"账单跨模块关联查询" |
| 单 service 内已有 internal 原子能力，但被另一个 feature 的 service 也想用 | refund 的 `OrderLockCheckService` 被 cashbox 想用 → 升级为 `backend_infra/services/order_lock_check_service.dart` |

**禁止下沉的场景**：

- 仅 1 个 feature 用 → 留在 `features/{module}/backend/service/internal/`
- 纯技术能力（HTTP / WS / 协议适配）→ 走上方「情况 C」独立子门面
- 单 SQL 操作 → 留在 `backend_infra/daos/`

### backend_infra/services/ 写法约定

```dart
// common/backend_infra/services/order_refundable_amount_service.dart
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../daos/refund_eligibility_dao.dart';

part 'order_refundable_amount_service.g.dart';

@riverpod
OrderRefundableAmountService orderRefundableAmountService(Ref ref) =>
    OrderRefundableAmountService(
      eligibilityDao: ref.read(refundEligibilityDaoProvider),
    );

/// 订单可退余额计算原子能力
///
/// 跨 feature 复用：refund (confirm 校验阶段 1) / report (退款汇总报表) / cashbox (钱箱补退判定)
/// 单一职责：按 originalOrderId 算"原支付流水 pay_amount - sum(pending+success refund pay_amount)" 累加。
/// **不包事务**——纯只读查询。
class OrderRefundableAmountService {
  final RefundEligibilityDao _eligibilityDao;

  OrderRefundableAmountService({required RefundEligibilityDao eligibilityDao})
      : _eligibilityDao = eligibilityDao;

  Future<double> calculate(int originalOrderId) async {
    final pool = await _eligibilityDao.queryRefundableTxPool(originalOrderId);
    return pool.fold<double>(0.0, (s, t) => s + t.maxRefundAmount);
  }
}
```

#### 强制规则

- **路径**：`lib/common/backend_infra/services/{capability}_service.dart`
- **命名**：以**业务能力**命名（不带 feature 模块前缀）—— `order_refundable_amount_service`、`transaction_lookup_service`、`order_status_business_code_service`
- **不挂 endpoint**：跨模块原子能力不出现在 Registry 里、不暴露 HTTP 路径
- **不包顶层事务**：能力本身只读，或被外部事务包裹时也明确"调方需在事务内调用"
- **不依赖 feature 模块**：禁止 import 任何 `features/{module}/`，依赖只能来自 `backend_infra/daos/` 或更底层的工具
- **dartdoc 必须列出复用的 feature**：类级 dartdoc 写明"跨 feature 复用：refund / report / cashbox"，便于评估改动影响面
- **必须更新 INDEX.md**：新增 / 修改 / 删除原子能力 service 时，**同步更新 `lib/common/backend_infra/services/INDEX.md`**（详见下节）

### INDEX.md 索引文档（强制维护）

`lib/common/backend_infra/services/INDEX.md` 是 AI 写新 service 前的**检索入口**。**任何对该目录的增删改都必须同步更新本索引**，否则视为操作未完成。

**索引格式（按业务域分组）**：

```markdown
# backend_infra/services/ 原子能力索引

> 跨 feature 模块共享的业务原子能力。**写新 service 前先查本表**，已有则直接注入复用，禁止复制粘贴。

## 按文件登记

| 文件 | 类名 | 业务能力 | 入参 | 出参 | 复用 feature |
| --- | --- | --- | --- | --- | --- |
| `order_refundable_amount_service.dart` | `OrderRefundableAmountService` | 按 originalOrderId 计算订单可退余额（含 pending 扣减） | `int originalOrderId` | `double` | refund / report / cashbox |
| `transaction_lookup_service.dart` | `TransactionLookupService` | 按 transactionId 查找原支付流水（含 deleted=0 过滤） | `int transactionId` | `OrderTransaction?` | refund / settlement |

## 按业务关键词反查

便于 AI 按"我要做 XX"反查：

### 退款 / 退货
- 可退余额计算：`OrderRefundableAmountService`
- 失败重试判定：（待登记）

### 流水 / 交易
- 原流水查找：`TransactionLookupService`

### 订单状态
- （待登记）
```

**维护规则**：

- 新增 service 文件 → 在「按文件登记」表追加一行 + 在「按业务关键词反查」对应分组追加
- 修改 service 入参 / 出参 / 职责 → 同步更新表格对应行
- 删除 service → 删表格行 + 删反查
- 新增业务关键词领域（如新增「会员」「促销」等） → 在反查节增加分组
- **不更新索引视为操作未完成**

### 写代码时主动触发的工作流

写新 service **主流程前**必须按以下步骤主动审视：

1. **检索 INDEX.md** — 找业务关键词，看是否已有可复用能力
2. **如有 → 直接注入** — 通过 `ref.read(xxxServiceProvider)` 注入，**禁止复制粘贴实现到新 service 内**
3. **如无 → 写完主流程后反向评估** — grep 同业务计算是否已在其他 feature 的 service 中出现（≥2 feature 即考虑下沉）
4. **下沉时同步更新 INDEX.md** — 新建 service 后立即在索引追加表格行 + 反查项

> 此规则**强制性**。新写大 service 前未查 INDEX.md = 流程违反；下沉新原子能力但未更新 INDEX.md = 流程违反。

### 与现有 §Service/internal 的边界

| 维度 | `service/internal/` | `backend_infra/services/` |
|---|---|---|
| 复用范围 | 单 feature 内 ≥2 个 service | ≥2 feature 模块 |
| 路径 | `features/{module}/backend/service/internal/` | `lib/common/backend_infra/services/` |
| 命名 | 可带模块语义（`refund_callback_persistence_service`） | 不带模块前缀，纯业务能力（`order_refundable_amount_service`） |
| 索引文档 | 不要求 | **强制维护 INDEX.md** |
| 升级路径 | 被另一 feature 想用时 → 升级到 `backend_infra/services/` | — |

**升级流程**（internal/ → backend_infra/services/）：

1. 确认 ≥2 feature 复用 → 用户确认后开始
2. 物理移动：`features/{module}/backend/service/internal/{xxx}_service.dart` → `lib/common/backend_infra/services/{xxx}_service.dart`
3. 改 import 路径 + 重命名（如有 module 前缀，去掉）
4. 跑 `dart run build_runner build --delete-conflicting-outputs`
5. **同步更新 INDEX.md**
6. 跑 `flutter analyze` 验证
