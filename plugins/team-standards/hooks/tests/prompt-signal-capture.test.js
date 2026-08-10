const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const HOOK = path.resolve(__dirname, '..', 'prompt-signal-capture.js');

function runHook(prompt, dir, env = {}) {
  return spawnSync('node', [HOOK], {
    input: JSON.stringify({
      prompt,
      cwd: path.join(dir, 'secret-project'),
      session_id: 'sensitive-session',
    }),
    encoding: 'utf8',
    env: {
      ...process.env,
      TEAM_STANDARDS_PROMPT_SIGNAL_DIR: dir,
      ...env,
    },
  });
}

function readRecord(dir) {
  const file = fs.readdirSync(dir).find((name) => /^prompt-signals-.*\.jsonl$/.test(name));
  assert.ok(file, 'expected a prompt signal file');
  return JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8').trim());
}

test('redacts secrets and omits cwd/session/user/host fields', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'prompt-signal-'));
  try {
    const result = runHook(
      '为什么失败？ password=hunter2 token="abc123456789" 邮箱 test@example.com 手机 13800138000',
      dir,
    );
    assert.equal(result.status, 0);
    const record = readRecord(dir);
    assert.equal(record.kind, 'question');
    assert.match(record.text, /password=\[REDACTED\]/);
    assert.match(record.text, /token=\[REDACTED\]/);
    assert.match(record.text, /\[REDACTED_EMAIL\]/);
    assert.match(record.text, /\[REDACTED_PHONE\]/);
    assert.ok(!('cwd' in record));
    assert.ok(!('session' in record));
    assert.ok(!('user' in record));
    assert.ok(!('host' in record));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
test('skips low-value prompts by default and truncates captured questions', () => {
  const skipDir = fs.mkdtempSync(path.join(os.tmpdir(), 'prompt-signal-skip-'));
  const longDir = fs.mkdtempSync(path.join(os.tmpdir(), 'prompt-signal-long-'));
  try {
    assert.equal(runHook('实现这个功能', skipDir).status, 0);
    assert.equal(fs.readdirSync(skipDir).filter((name) => name.endsWith('.jsonl')).length, 0);

    assert.equal(runHook(`为什么${'很长'.repeat(1000)}`, longDir).status, 0);
    const record = readRecord(longDir);
    assert.ok(record.text.length <= 1012);
    assert.match(record.text, /\[TRUNCATED\]$/);
  } finally {
    fs.rmSync(skipDir, { recursive: true, force: true });
    fs.rmSync(longDir, { recursive: true, force: true });
  }
});
