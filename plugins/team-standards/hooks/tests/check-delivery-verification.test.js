const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const hook = path.resolve(__dirname, '..', 'check-delivery-verification.js');

function project() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'delivery-verification-'));
  spawnSync('git', ['init'], { cwd: root });
  return root;
}

function run(root, events, env = {}) {
  const transcript = path.join(root, 'transcript.jsonl');
  fs.writeFileSync(transcript, events.join('\n'));
  return spawnSync('node', [hook], {
    cwd: root,
    input: JSON.stringify({ cwd: root, transcript_path: transcript }),
    encoding: 'utf8',
    env: { ...process.env, ...env },
  });
}

test('放行纯文档改动', (t) => {
  const root = project();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.writeFileSync(path.join(root, 'README.md'), '# docs');
  assert.equal(run(root, []).status, 0);
});

test('阻止有源码改动但没有验证证据的完成', (t) => {
  const root = project();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.writeFileSync(path.join(root, 'Main.java'), 'class Main {}');
  const result = run(root, ['{"tool_name":"Edit","tool_input":{"file_path":"Main.java"}}']);
  assert.equal(result.status, 2);
  assert.match(result.stderr, /本轮未执行 forge_verify 或 Forge CLI/);
});

test('放行最后一次编辑后的 all 阶段 PASS', (t) => {
  const root = project();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.writeFileSync(path.join(root, 'Main.java'), 'class Main {}');
  const result = run(root, [
    '{"tool_name":"Edit","tool_input":{"file_path":"Main.java"}}',
    '{"name":"forge_verify","arguments":{"phase":"all"}}',
    '{"status":"PASSED","executedCheckers":[],"executedVerifiers":[]}',
  ]);
  assert.equal(result.status, 0, result.stderr);
});

test('阻止验证后再次编辑', (t) => {
  const root = project();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.writeFileSync(path.join(root, 'Main.java'), 'class Main {}');
  const result = run(root, [
    '{"name":"forge_verify","arguments":{"phase":"all"}}',
    '{"status":"PASSED"}',
    '{"tool_name":"Edit","tool_input":{"file_path":"Main.java"}}',
  ]);
  assert.equal(result.status, 2);
  assert.match(result.stderr, /最后一次相关修改之前/);
});

test('warn 模式只提示不阻断', (t) => {
  const root = project();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.writeFileSync(path.join(root, 'Main.java'), 'class Main {}');
  const events = ['{"tool_name":"Edit","tool_input":{"file_path":"Main.java"}}'];
  assert.equal(run(root, events, { TEAM_STANDARDS_DELIVERY_VERIFICATION_HOOK: 'warn' }).status, 0);
});

test('放行会话开始前遗留的源码改动', (t) => {
  const root = project();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.writeFileSync(path.join(root, 'Main.java'), 'class Main {}');
  assert.equal(run(root, ['{"tool_name":"Read","path":"Main.java"}']).status, 0);
});
