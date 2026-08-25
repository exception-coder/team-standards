const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');

const dispatcher = path.join(__dirname, '..', 'write-guard-dispatcher.js');

test('hook metrics create no files by default', () => {
  withTemporaryRoot((root) => {
    const metricsDirectory = path.join(root, 'metrics');
    const result = runDispatcher({ TEAM_STANDARDS_HOOK_METRICS_DIR: metricsDirectory });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(fs.existsSync(metricsDirectory), false);
  });
});

test('opt-in hook metrics contain only the approved minimal fields', () => {
  withTemporaryRoot((root) => {
    const metricsDirectory = path.join(root, 'metrics');
    const result = runDispatcher({
      TEAM_STANDARDS_HOOK_METRICS: 'on',
      TEAM_STANDARDS_HOOK_METRICS_DIR: metricsDirectory,
    });
    assert.equal(result.status, 0, result.stderr);
    const file = path.join(metricsDirectory, 'team-standards-hook-metrics.jsonl');
    const records = fs.readFileSync(file, 'utf8').trim().split(/\r?\n/).map(JSON.parse);
    assert.equal(records.length, 1);
    assert.deepEqual(Object.keys(records[0]), ['ts', 'plugin', 'guard', 'durationMs', 'code']);
    assert.equal(records[0].plugin, 'team-standards');
    assert.equal(records[0].guard, 'check-comment-density.js');
    assert.equal(typeof records[0].durationMs, 'number');
  });
});

function runDispatcher(extraEnvironment) {
  return spawnSync(process.execPath, [dispatcher], {
    encoding: 'utf8',
    input: JSON.stringify({ tool_name: 'noop', tool_input: {} }),
    env: {
      ...process.env,
      TEAM_STANDARDS_DESIGN_DOC_HOOK: 'off',
      TEAM_STANDARDS_ARCH_BOUNDARY_HOOK: 'off',
      TEAM_STANDARDS_BACKEND_KG_HOOK: 'off',
      TEAM_STANDARDS_SQL_DDL_HOOK: 'off',
      TEAM_STANDARDS_SQL_PERF_HOOK: 'off',
      TEAM_STANDARDS_DOC_LOCATION_HOOK: 'off',
      ...extraEnvironment,
    },
  });
}

function withTemporaryRoot(callback) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'team-hook-metrics-test-'));
  try { callback(root); }
  finally {
    const resolved = path.resolve(root);
    assert.ok(resolved.startsWith(`${path.resolve(os.tmpdir())}${path.sep}`));
    fs.rmSync(resolved, { recursive: true, force: true });
  }
}
