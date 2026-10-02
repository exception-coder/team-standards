const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { call } = require('../governance/openspec');

test('OpenSpec slow success and fail-closed timeout contract', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'governance-timeout-'));
  const cli = path.join(directory, 'fixture.cjs');
  fs.writeFileSync(cli, `
    const mode = process.argv[2];
    if (mode === 'slow') setTimeout(() => console.log('{"ok":true}'), 5500);
    else if (mode === 'timeout') setTimeout(() => console.log('{}'), 10000);
    else if (mode === 'failure') process.exitCode = 2;
    else if (mode === 'invalid') console.log('not-json');
    else console.log('{"ok":true}');
  `);
  const previous = process.env.TEAM_STANDARDS_OPENSPEC_TIMEOUT_MS;
  try {
    delete process.env.TEAM_STANDARDS_OPENSPEC_TIMEOUT_MS;
    assert.deepEqual(call(directory, ['slow'], { cli }), { ok: true });
    process.env.TEAM_STANDARDS_OPENSPEC_TIMEOUT_MS = '1000';
    assert.throws(() => call(directory, ['timeout'], { cli }),
      error => error.rule === 'CLI_ERROR' && /1000 毫秒/.test(error.message));
    process.env.TEAM_STANDARDS_OPENSPEC_TIMEOUT_MS = '30000';
    assert.throws(() => call(directory, ['failure'], { cli }),
      error => error.rule === 'CLI_ERROR' && /执行失败（2）/.test(error.message));
    assert.throws(() => call(directory, ['invalid'], { cli }), SyntaxError);
    assert.throws(() => call(directory, ['missing'], { cli: path.join(directory, 'missing.cjs') }),
      error => error.rule === 'CLI_ERROR');
    for (const value of ['0', '-1', 'NaN', 'Infinity', '120001', '1000.5', '']) {
      process.env.TEAM_STANDARDS_OPENSPEC_TIMEOUT_MS = value;
      assert.throws(() => call(directory, ['ok'], { cli }),
        error => error.rule === 'CLI_TIMEOUT_INVALID');
    }
    process.env.TEAM_STANDARDS_OPENSPEC_TIMEOUT_MS = '120000';
    assert.deepEqual(call(directory, ['ok'], { cli }), { ok: true });
  } finally {
    if (previous === undefined) delete process.env.TEAM_STANDARDS_OPENSPEC_TIMEOUT_MS;
    else process.env.TEAM_STANDARDS_OPENSPEC_TIMEOUT_MS = previous;
    fs.unlinkSync(cli);
    fs.rmdirSync(directory);
  }
});
