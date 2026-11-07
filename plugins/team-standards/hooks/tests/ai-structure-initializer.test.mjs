import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const INITIALIZER = fileURLToPath(new URL('../../skills/init-project-docs/init-ai-structure.mjs', import.meta.url));
const REQUIRED_FILES = [
  'AGENTS.md',
  'CLAUDE.md',
  'docs/INDEX.md',
];

function createProject(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-structure-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return root;
}

function run(root, command, ...args) {
  return spawnSync(process.execPath, [INITIALIZER, command, '--root', root, ...args], { encoding: 'utf8' });
}

function snapshot(root) {
  return Object.fromEntries(REQUIRED_FILES.map((relativePath) => {
    const content = fs.readFileSync(path.join(root, relativePath));
    return [relativePath, crypto.createHash('sha256').update(content).digest('hex')];
  }));
}

test('plan reports the structure without writing files', (t) => {
  const root = createProject(t);
  const result = run(root, 'plan', '--name', 'Demo Project');

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /missing\s+AGENTS\.md/);
  assert.equal(fs.readdirSync(root).length, 0);
});

test('default apply creates only local entrypoints without graph or spec prerequisites', (t) => {
  const root = createProject(t);
  const result = run(root, 'apply', '--name', 'Demo Project');

  assert.equal(result.status, 0, result.stderr);
  for (const relativePath of REQUIRED_FILES) assert.equal(fs.existsSync(path.join(root, relativePath)), true);
  assert.match(fs.readFileSync(path.join(root, 'AGENTS.md'), 'utf8'), /Demo Project Agent Guide/);
  for (const optional of ['openspec', '.graphifyignore', '.gitignore', 'docs/README.md', 'docs/ai-coding-architecture.md']) {
    assert.equal(fs.existsSync(path.join(root, optional)), false, optional);
  }
  assert.equal(fs.existsSync(path.join(root, 'graphify-out')), false);
  assert.equal(fs.existsSync(path.join(root, '.codex', 'skills')), false);
  assert.equal(fs.existsSync(path.join(root, 'docs', 'domain')), false);
});

test('apply is idempotent and preserves existing project documents', (t) => {
  const root = createProject(t);
  fs.mkdirSync(path.join(root, 'docs'), { recursive: true });
  fs.writeFileSync(path.join(root, 'docs', 'INDEX.md'), '# Human index\n', 'utf8');
  fs.writeFileSync(path.join(root, '.graphifyignore'), '# Project-owned Graphify scope\nspecial-generated/\n', 'utf8');

  const first = run(root, 'apply', '--name', 'Stable Project');
  const firstSnapshot = snapshot(root);
  const second = run(root, 'apply', '--name', 'Stable Project');

  assert.equal(first.status, 0, first.stderr);
  assert.equal(second.status, 0, second.stderr);
  assert.deepEqual(snapshot(root), firstSnapshot);
  assert.equal(fs.readFileSync(path.join(root, 'docs', 'INDEX.md'), 'utf8'), '# Human index\n');
  assert.equal(fs.readFileSync(path.join(root, '.graphifyignore'), 'utf8'), '# Project-owned Graphify scope\nspecial-generated/\n');
  assert.equal(fs.existsSync(path.join(root, '.gitignore')), false);
  assert.match(second.stdout, /changes: 0/);
});

test('status fails when required entry files are missing and succeeds after apply', (t) => {
  const root = createProject(t);
  const before = run(root, 'status');
  assert.equal(before.status, 2);

  assert.equal(run(root, 'apply').status, 0);
  const after = run(root, 'status');
  assert.equal(after.status, 0, after.stderr);
  assert.doesNotMatch(after.stdout, /pending|graphify-out/);
});

test('optional graph and spec support are independent and preserve existing configuration', (t) => {
  const root = createProject(t);
  fs.writeFileSync(path.join(root, '.gitignore'), '# existing\nsecrets/\n', 'utf8');
  assert.equal(run(root, 'apply', '--with-openspec').status, 0);
  assert.ok(fs.existsSync(path.join(root, 'openspec/config.yaml')));
  assert.equal(fs.existsSync(path.join(root, '.graphifyignore')), false);
  assert.equal(fs.readFileSync(path.join(root, '.gitignore'), 'utf8'), '# existing\nsecrets/\n');
  assert.equal(run(root, 'apply', '--with-graphify').status, 0);
  const gitignore = fs.readFileSync(path.join(root, '.gitignore'), 'utf8');
  assert.ok(gitignore.startsWith('# existing\nsecrets/\n'));
  assert.match(gitignore, /!graphify-out\/graph\.json/);
  assert.equal(run(root, 'apply', '--with-graphify').status, 0);
  assert.equal(fs.readFileSync(path.join(root, '.gitignore'), 'utf8'), gitignore);
  assert.equal(fs.existsSync(path.join(root, 'graphify-out')), false);
});

test('explicit full initialization retains the expanded entrypoints without fabricating knowledge', (t) => {
  const root = createProject(t);
  assert.equal(run(root, 'apply', '--full').status, 0);
  for (const p of ['.graphifyignore', '.gitignore', 'openspec/config.yaml', 'docs/ai-coding-architecture.md']) {
    assert.ok(fs.existsSync(path.join(root, p)), p);
  }
  assert.equal(run(root, 'status', '--full').status, 0);
  assert.equal(fs.existsSync(path.join(root, 'docs/domain')), false);
});
