const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

const HOOK = path.resolve(__dirname, '..', 'check-query-performance-risk.js');

function runHook(filePath, addedText, env = {}) {
  const result = spawnSync('node', [HOOK], {
    input: JSON.stringify({
      tool_name: 'Edit',
      tool_input: { file_path: filePath, old_string: '', new_string: addedText },
    }),
    encoding: 'utf8',
    env: { ...process.env, ...env },
  });
  return { code: result.status, stderr: result.stderr || '' };
}

test('提醒：无界聚合缺少明显数据边界', () => {
  const result = runHook('src/main/resources/maps/Order.xml', 'SELECT COUNT(*) FROM order_item');
  assert.equal(result.code, 0);
  assert.match(result.stderr, /聚合\/去重查询缺少明显数据边界/);
  assert.match(result.stderr, /高风险查询性能门禁/);
});

test('提醒：LIMIT 只限制聚合结果，不构成扫描边界', () => {
  const result = runHook('src/main/resources/maps/Order.xml', 'SELECT COUNT(*) FROM order_item LIMIT 1');
  assert.equal(result.code, 0);
  assert.match(result.stderr, /聚合\/去重查询缺少明显数据边界/);
});

test('提醒：循环内逐条调用 Mapper', () => {
  const result = runHook(
    'src/main/java/OrderService.java',
    'for (Order order : orders) { orderMapper.queryNodeStatus(order.getId()); }'
  );
  assert.equal(result.code, 0);
  assert.match(result.stderr, /循环或 Stream 内出现逐条数据访问/);
});

test('提醒：集合过滤后在应用层分页', () => {
  const result = runHook(
    'src/main/java/OrderService.java',
    'orders.stream().filter(this::isCurrentNode).toList().subList(offset, end);'
  );
  assert.equal(result.code, 0);
  assert.match(result.stderr, /集合过滤后在应用层分页/);
});

test('放行：带 WHERE 的有界聚合', () => {
  const result = runHook(
    'src/main/resources/maps/Order.xml',
    'SELECT COUNT(*) FROM order_item WHERE order_id = #{orderId}'
  );
  assert.equal(result.code, 0);
  assert.equal(result.stderr, '');
});

test('放行：测试文件', () => {
  const result = runHook(
    'src/test/java/OrderServiceTest.java',
    'for (Order order : orders) { orderMapper.queryNodeStatus(order.getId()); }'
  );
  assert.equal(result.code, 0);
  assert.equal(result.stderr, '');
});

test('放行：off 模式完全静默', () => {
  const result = runHook(
    'src/main/resources/maps/Order.xml',
    'SELECT COUNT(*) FROM order_item',
    { TEAM_STANDARDS_SQL_PERF_HOOK: 'off' }
  );
  assert.equal(result.code, 0);
  assert.equal(result.stderr, '');
});

test('放行：非 JSON 输入不崩溃', () => {
  const result = spawnSync('node', [HOOK], { input: 'not json', encoding: 'utf8' });
  assert.equal(result.status, 0);
});
