const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');

const DISPATCHER = path.resolve(__dirname, '..', 'write-guard-dispatcher.js');

function run(payload, env = {}) {
  return spawnSync('node', [DISPATCHER], {
    input: JSON.stringify(payload),
    encoding: 'utf8',
    env: {
      ...process.env,
      TEAM_STANDARDS_CHANGE_READINESS_HOOK: 'off',
      TEAM_STANDARDS_ARCH_BOUNDARY_HOOK: 'off',
      TEAM_STANDARDS_BACKEND_EVIDENCE_HOOK: 'off',
      TEAM_STANDARDS_SQL_DDL_HOOK: 'off',
      TEAM_STANDARDS_SQL_CORRECTNESS_HOOK: 'off',
      TEAM_STANDARDS_SQL_PERF_HOOK: 'off',
      TEAM_STANDARDS_DOC_LOCATION_HOOK: 'off',
      ...env,
    },
  });
}

test('dispatcher forwards one payload and preserves a blocking result', () => {
  const result = run({
    tool_name: 'apply_patch',
    cwd: process.cwd(),
    tool_input: { command: [
      '*** Begin Patch',
      '*** Update File: lib/a.dart',
      '@@',
      '+// [BUGFIX] history belongs in git',
      '*** End Patch',
    ].join('\n') },
  }, { TEAM_STANDARDS_COMMENT_HOOK: 'block' });
  assert.equal(result.status, 2);
  assert.match(result.stderr, /change-marker/);
  assert.equal(result.stdout, '');
});
test('dispatcher skips guards explicitly set to off', () => {
  const result = run({ tool_name: 'apply_patch', tool_input: { command: 'bad patch' } }, {
    TEAM_STANDARDS_COMMENT_HOOK: 'off',
  });
  assert.equal(result.status, 0);
  assert.equal(result.stderr, '');
});

test('plain documents avoid workers but SQL examples retain existing warnings', t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'guard-dispatch-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const env = { TEAM_STANDARDS_HOOK_METRICS: 'on', TEAM_STANDARDS_HOOK_METRICS_DIR: directory,
    TEAM_STANDARDS_COMMENT_HOOK: 'warn', TEAM_STANDARDS_SQL_CORRECTNESS_HOOK: 'warn' };
  const payload = { tool_name: 'Edit', tool_input: { file_path: 'README.md', old_string: 'old', new_string: '新的使用说明' } };
  assert.equal(run(payload, env).status, 0);
  assert.deepEqual(fs.readdirSync(directory), [], 'no worker should record a metric');
  payload.tool_input.new_string = 'select * from orders o join items i on o.id=i.id';
  const sql = run(payload, env);
  assert.equal(sql.status, 0);
  assert.match(sql.stderr, /多数据源查询使用通配投影/);
  assert.ok(fs.readdirSync(directory).length > 0);
  payload.tool_input.new_string = 'for (const id of ids) { orderDao.find(id); }';
  const loop = run(payload, { ...env, TEAM_STANDARDS_SQL_PERF_HOOK: 'warn' });
  assert.match(loop.stderr, /循环或 Stream 内出现逐条数据访问/);
});

test('mixed patches preserve source blocking even with ordinary documentation', () => {
  const result = run({ tool_name: 'apply_patch', tool_input: { command:
    '*** Begin Patch\n*** Add File: README.md\n+说明\n*** Add File: lib/a.dart\n+// [BUGFIX] old history\n*** End Patch' } },
  { TEAM_STANDARDS_COMMENT_HOOK: 'block' });
  assert.equal(result.status, 2);
});
