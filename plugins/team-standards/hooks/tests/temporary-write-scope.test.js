const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

function fixture(t) {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'temporary-write-scope-'));
  const repo = path.join(home, 'project');
  fs.mkdirSync(path.join(repo, 'openspec'), { recursive: true });
  fs.writeFileSync(path.join(repo, 'openspec', 'config.yaml'), 'schema: spec-driven\n');
  t.after(() => {
    assert.equal(path.dirname(home), path.resolve(os.tmpdir()));
    fs.rmSync(home, { recursive: true, force: true });
  });
  return { home, repo };
}

function run(script, repo, tool_name, tool_input) {
  const env = Object.fromEntries(Object.entries(process.env)
    .filter(([key]) => !key.startsWith('TEAM_STANDARDS_') && !key.startsWith('FORGE_')));
  return spawnSync(process.execPath, [path.resolve(__dirname, '..', script)], {
    input: JSON.stringify({ tool_name, tool_input, cwd: repo, session_id: 'temporary-scope-test' }), encoding: 'utf8',
    env: { ...env, TEAM_STANDARDS_OPENSPEC_GOVERNANCE_HOOK: 'block' },
  });
}

const entries = ['check-change-readiness.js', 'check-openspec-governance.js', 'write-guard-dispatcher.js'];
for (const entry of entries) {
  test(`${entry}: external temporary helpers do not inherit cwd governance`, t => {
    const { home, repo } = fixture(t);
    // 与项目同前缀的兄弟目录仍属于项目外部。
    const file_path = path.join(home, 'project-helper', 'neutral.py');
    for (const tool of ['Write', 'Edit', 'MultiEdit', 'apply_patch']) {
      const input = tool === 'apply_patch'
        ? { command: `*** Begin Patch\n*** Add File: ${file_path}\n+print('helper')\n*** End Patch` }
        : { file_path, content: "print('helper')", new_string: "print('helper')", edits: [] };
      const result = run(entry, repo, tool, input);
      assert.equal(result.status, 0, `${tool}: ${result.stderr}`);
      assert.equal(result.stderr, '');
    }
  });
}

test('legacy readiness also allows external temporary helpers without OpenSpec', t => {
  const { home, repo } = fixture(t);
  fs.unlinkSync(path.join(repo, 'openspec', 'config.yaml'));
  const result = run('check-change-readiness.js', repo, 'Write', {
    file_path: path.join(home, 'neutral.py'), content: "print('helper')",
  });
  assert.equal(result.status, 0, result.stderr);
});

test('project-local temporary scripts and markerless cwd sources remain guarded', t => {
  const { repo } = fixture(t);
  fs.unlinkSync(path.join(repo, 'openspec', 'config.yaml'));
  for (const relative of ['src/main.py', '.tmp/neutral.py']) {
    const result = run('check-change-readiness.js', repo, 'Write', { file_path: relative, content: '' });
    assert.equal(result.status, 2, relative);
    assert.match(result.stderr, /未检测到可用设计依据/);
  }
});

test('other projects under the system temporary directory retain their own design checks', t => {
  const { home, repo } = fixture(t);
  fs.unlinkSync(path.join(repo, 'openspec', 'config.yaml'));
  for (const marker of ['.git', 'pyproject.toml', 'openspec/config.yaml']) {
    const other = path.join(home, marker.replace(/[^a-z]/g, '') + '-project');
    fs.mkdirSync(path.dirname(path.join(other, marker)), { recursive: true });
    fs.writeFileSync(path.join(other, marker), marker === '.git' ? 'gitdir: placeholder' : '');
    const result = run('check-change-readiness.js', repo, 'Write', {
      file_path: path.join(other, 'main.py'), content: '',
    });
    assert.equal(result.status, 2, `${marker}: ${result.stderr}`);
    if (marker === 'openspec/config.yaml') assert.match(result.stderr, /GIT_ERROR/);
    else assert.ok(result.stderr.includes(other), result.stderr);
  }
});

test('mixed patches still check project files after an external helper', t => {
  const { home, repo } = fixture(t);
  fs.unlinkSync(path.join(repo, 'openspec', 'config.yaml'));
  const command = `*** Begin Patch\n*** Add File: ${path.join(home, 'neutral.py')}\n+print('helper')\n*** Add File: src/main.py\n+print('app')\n*** End Patch`;
  const result = run('write-guard-dispatcher.js', repo, 'apply_patch', { command });
  assert.equal(result.status, 2, result.stderr);
  assert.match(result.stderr, /main\.py/);
});

test('legacy readiness still guards source moved to an external temporary file', t => {
  const { home, repo } = fixture(t);
  fs.unlinkSync(path.join(repo, 'openspec', 'config.yaml'));
  const command = `*** Begin Patch\n*** Update File: src/main.py\n*** Move to: ${path.join(home, 'neutral.py')}\n@@\n-old\n+new\n*** End Patch`;
  const result = run('check-change-readiness.js', repo, 'apply_patch', { command });
  assert.equal(result.status, 2, result.stderr);
  assert.match(result.stderr, /main\.py/);
});

test('an external temporary junction into a project does not bypass readiness', t => {
  const { home, repo } = fixture(t);
  const link = path.join(home, 'helper-link');
  fs.symlinkSync(repo, link, process.platform === 'win32' ? 'junction' : 'dir');
  const result = run('check-change-readiness.js', repo, 'Write', {
    file_path: path.join(link, 'main.py'), content: '',
  });
  assert.equal(result.status, 2, result.stderr);
});

test('a project-local junction to temporary storage remains guarded', t => {
  const { home, repo } = fixture(t);
  fs.unlinkSync(path.join(repo, 'openspec', 'config.yaml'));
  const storage = path.join(home, 'storage');
  fs.mkdirSync(storage);
  fs.symlinkSync(storage, path.join(repo, 'scratch'), process.platform === 'win32' ? 'junction' : 'dir');
  const result = run('check-change-readiness.js', repo, 'Write', {
    file_path: path.join(repo, 'scratch', 'main.py'), content: '',
  });
  assert.equal(result.status, 2, result.stderr);
});

test('moving project source to an external helper still checks the original path', t => {
  const { home, repo } = fixture(t);
  for (const args of [['init'], ['-c', 'user.name=Scope Test', '-c', 'user.email=scope@example.invalid',
    'commit', '--allow-empty', '-m', 'fixture']]) {
    const result = spawnSync('git', args, { cwd: repo, encoding: 'utf8', windowsHide: true });
    assert.equal(result.status, 0, result.stderr);
  }
  const command = `*** Begin Patch\n*** Update File: src/main.py\n*** Move to: ${path.join(home, 'neutral.py')}\n@@\n-old\n+new\n*** End Patch`;
  const result = run('check-openspec-governance.js', repo, 'apply_patch', { command });
  assert.equal(result.status, 2, result.stderr);
  assert.match(result.stderr, /BINDING_REQUIRED/);
});
