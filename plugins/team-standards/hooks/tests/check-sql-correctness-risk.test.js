const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

const HOOK = path.resolve(__dirname, '..', 'check-sql-correctness-risk.js');

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

test('提醒：JOIN 查询的 SELECT 中存在未限定字段', () => {
  const result = runHook(
    'src/main/resources/maps/MilestoneMapper.xml',
    'SELECT m.id, develop_id, m.milestone_code FROM milestone m JOIN latest ON latest.develop_id = m.develop_id'
  );
  assert.equal(result.code, 0);
  assert.match(result.stderr, /未限定字段 develop_id/);
  assert.match(result.stderr, /SQL 正确性门禁/);
});

test('提醒：JOIN 查询使用通配投影', () => {
  const result = runHook(
    'src/main/resources/maps/MilestoneMapper.xml',
    'SELECT m.*, latest.* FROM milestone m JOIN latest ON latest.develop_id = m.develop_id'
  );
  assert.equal(result.code, 0);
  assert.match(result.stderr, /多数据源查询使用通配投影/);
});

test('放行：JOIN 查询全部字段已限定', () => {
  const result = runHook(
    'src/main/resources/maps/MilestoneMapper.xml',
    'SELECT m.id, m.develop_id, latest.latest_date FROM milestone m JOIN latest ON latest.develop_id = m.develop_id'
  );
  assert.equal(result.code, 0);
  assert.equal(result.stderr, '');
});

test('放行：单表查询允许未限定字段', () => {
  const result = runHook('src/main/resources/maps/MilestoneMapper.xml', 'SELECT id, develop_id FROM milestone');
  assert.equal(result.code, 0);
  assert.equal(result.stderr, '');
});

test('放行：测试文件', () => {
  const result = runHook(
    'src/test/resources/MilestoneMapper.xml',
    'SELECT develop_id FROM milestone m JOIN latest ON latest.develop_id = m.develop_id'
  );
  assert.equal(result.code, 0);
  assert.equal(result.stderr, '');
});

test('放行：off 模式完全静默', () => {
  const result = runHook(
    'src/main/resources/maps/MilestoneMapper.xml',
    'SELECT develop_id FROM milestone m JOIN latest ON latest.develop_id = m.develop_id',
    { TEAM_STANDARDS_SQL_CORRECTNESS_HOOK: 'off' }
  );
  assert.equal(result.code, 0);
  assert.equal(result.stderr, '');
});

test('放行：非 JSON 输入不崩溃', () => {
  const result = spawnSync('node', [HOOK], { input: 'not json', encoding: 'utf8' });
  assert.equal(result.status, 0);
});
