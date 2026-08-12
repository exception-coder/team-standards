import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const source = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'check-runtime-version-bump.js');

test('blocks runtime payload changes without a version bump', () => {
  withRepository((root) => {
    fs.writeFileSync(path.join(root, 'plugins/team-standards/skills/sample/SKILL.md'), '# changed\n');
    const result = run(root);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /version did not increase/);
  });
});

test('allows documentation-only changes without a version bump', () => {
  withRepository((root) => {
    fs.writeFileSync(path.join(root, 'README.md'), '# changed\n');
    const result = run(root);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /no plugin runtime payload changes/);
  });
});

function withRepository(callback) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'version-bump-'));
  try {
    fs.mkdirSync(path.join(root, 'scripts'), { recursive: true });
    fs.copyFileSync(source, path.join(root, 'scripts/check-runtime-version-bump.js'));
    writeJson(root, 'plugins/team-standards/.claude-plugin/plugin.json', { version: '1.0.0' });
    writeJson(root, 'plugins/team-standards/.codex-plugin/plugin.json', { version: '1.0.0' });
    writeJson(root, '.claude-plugin/marketplace.json', { plugins: [{ version: '1.0.0' }] });
    fs.mkdirSync(path.join(root, 'plugins/team-standards/skills/sample'), { recursive: true });
    fs.writeFileSync(path.join(root, 'plugins/team-standards/skills/sample/SKILL.md'), '# baseline\n');
    fs.writeFileSync(path.join(root, 'README.md'), '# baseline\n');
    git(root, ['init']);
    git(root, ['config', 'user.name', 'Test']);
    git(root, ['config', 'user.email', 'test@example.com']);
    git(root, ['add', '-A']);
    git(root, ['commit', '-m', 'baseline']);
    callback(root);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

function writeJson(root, relative, value) {
  const file = path.join(root, relative);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value)}\n`);
}

function run(root) {
  return spawnSync(process.execPath, [path.join(root, 'scripts/check-runtime-version-bump.js'), '--base', 'HEAD'], { cwd: root, encoding: 'utf8' });
}

function git(root, args) {
  execFileSync('git', ['-C', root, ...args], { stdio: 'ignore' });
}
