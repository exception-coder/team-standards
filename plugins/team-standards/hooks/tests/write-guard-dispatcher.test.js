const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

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
  });
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
