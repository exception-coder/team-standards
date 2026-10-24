const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const hooksRoot = path.resolve(__dirname, '..');
const config = JSON.parse(fs.readFileSync(path.join(hooksRoot, 'hooks.json'), 'utf8'));
const commitGroup = config.hooks.PreToolUse.find(group => group.matcher === 'Bash|exec_command');

function run(script, payload) {
  return spawnSync(process.execPath, [path.join(hooksRoot, script)], {
    input: JSON.stringify(payload), encoding: 'utf8',
    env: { ...process.env, TEAM_STANDARDS_COMMIT_MESSAGE_HOOK: 'block' },
  });
}

test('默认提交链只校验消息，不再登记体量或 Skill 调用门禁', () => {
  assert.equal(commitGroup.hooks.length, 1);
  assert.match(commitGroup.hooks[0].command, /check-commit-no-ai-signature\.js/);
  assert.doesNotMatch(JSON.stringify(config), /check-git-commit-skill/);
});

for (const tool of ['Bash', 'exec_command']) {
  test(tool + ': 大量新增文件且未调用 Skill 时仍可通过合规提交，旧入口也不再阻断', t => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'commit-policy-'));
    t.after(() => {
      assert.ok(path.resolve(root).startsWith(path.resolve(os.tmpdir()) + path.sep));
      assert.match(path.basename(root), /^commit-policy-/);
      fs.rmSync(root, { recursive: true, force: true });
    });
    assert.equal(spawnSync('git', ['init', '-q'], { cwd: root }).status, 0);
    for (let index = 0; index < 3; index++) fs.writeFileSync(path.join(root, index + '.txt'), 'example\n'.repeat(40));
    assert.equal(spawnSync('git', ['add', '0.txt', '1.txt', '2.txt'], { cwd: root }).status, 0);
    const transcript = path.join(root, 'session.jsonl');
    fs.writeFileSync(transcript, JSON.stringify({ type: 'text', text: 'No skill invocation.' }));
    const command = 'git commit -m "fix(policy): 保持逻辑单元完整" -m "【改动】移除体量门禁。\\n【原因】规模不等于风险。\\n【结果】按消息合同校验。" -m "Author: Test <test@example.com>"';
    const payload = { cwd: root, transcript_path: transcript, tool_name: tool,
      tool_input: tool === 'Bash' ? { command } : { cmd: command, workdir: root } };
    const registered = run('check-commit-no-ai-signature.js', payload);
    assert.equal(registered.status, 0, registered.stderr);
    const legacy = run('check-git-commit-skill.js', payload);
    assert.equal(legacy.status, 0, legacy.stderr);
    assert.equal(legacy.stderr, '');
    assert.equal(spawnSync('git', ['rev-parse', '--verify', 'HEAD'], { cwd: root }).status, 128,
      'Hook must inspect payloads without executing the proposed commit');
  });
}
