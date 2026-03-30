# 编码摘要文档

> 本文档由完整设计文档精简而来，供 AI 辅助编码时使用，聚焦实现所需的最小必要信息。
> 对应完整文档：`{需求名称}-{YYYYMMDD}-v{N}.md`

---

## 变更记录

| 版本 | 日期 | 变更内容摘要 |
|------|------|--------------|
| v1 | YYYY-MM-DD | 初始版本 |

---

## 1. 核心业务规则

> 列出所有必须遵守的业务规则，编码时不得违反。每条规则一行，简洁明确。

- 规则1：
- 规则2：
- 规则N：

---

## 2. 接口契约

### 入口接口

```
{HTTP方法} {路径}
请求：{全类名} - 关键字段列表
返回：{全类名} - 关键字段列表
```

### 关键方法签名（全类名）

```java
// 示例
com.example.order.service.OrderService#createOrder(OrderCreateDTO dto): OrderVO
com.example.order.service.impl.OrderServiceImpl#validateStock(Long skuId, Integer qty): void
```

---

## 3. 涉及类清单（全类名）

| 全类名 | 操作 | 说明 |
|--------|------|------|
| `com.example.xxx.XxxController` | 新建 | |
| `com.example.xxx.XxxServiceImpl` | 修改 | 新增 method1、method2 |
| `com.example.xxx.domain.XxxDO` | 新增字段 | 新增 status 字段 |
| `com.example.xxx.convert.XxxConvert` | 新建 | DO→VO 转换 |

---

## 4. 数据结构

### 关键表及字段

```
表名：xxx_order
新增字段：status tinyint(2) NOT NULL DEFAULT 0 COMMENT '状态 0待支付 1已支付 2已取消'
新增索引：idx_user_id (user_id)
```

### 关键 DTO/DO 字段

```java
// XxxCreateDTO
String orderNo;      // 订单号，非空
Long userId;         // 用户ID，非空
BigDecimal amount;   // 金额，精度2位
```

---

## 5. 重要约束与边界

- 幂等键：`{字段名}`，重复请求直接返回原结果
- 并发控制：`{乐观锁/分布式锁/数据库锁}`，锁粒度 `{说明}`
- 事务范围：`{哪些操作在同一事务内}`
- 不处理的场景：`{明确排除在外的情况}`

---

## 6. 下游依赖调用

```java
// FeignClient / RPC 调用
com.example.pay.feign.PayFeignClient#pay(PayDTO): PayResultDTO
com.example.inventory.feign.InventoryFeignClient#deduct(DeductDTO): Boolean
```

---

## 7. 异常处理要点

- `{场景}` → 抛出 `{全类名异常}` / 返回错误码 `{CODE}`
- `{场景}` → 返回 `{默认值/空列表}`
