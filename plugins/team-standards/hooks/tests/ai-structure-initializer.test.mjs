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
  '.graphifyignore',
  '.gitignore',
  'docs/README.md',
  'docs/INDEX.md',
  'docs/ai-coding-architecture.md',
  'openspec/AGENTS.md',
  'openspec/config.yaml',
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

test('apply creates the minimal six-layer entry structure', (t) => {
  const root = createProject(t);
  const result = run(root, 'apply', '--name', 'Demo Project');

  assert.equal(result.status, 0, result.stderr);
  for (const relativePath of REQUIRED_FILES) assert.equal(fs.existsSync(path.join(root, relativePath)), true);
  assert.match(fs.readFileSync(path.join(root, 'AGENTS.md'), 'utf8'), /Demo Project Agent Guide/);
  assert.match(fs.readFileSync(path.join(root, 'openspec/config.yaml'), 'utf8'), /Demo Project uses AGENTS\.md/);
  assert.match(fs.readFileSync(path.join(root, '.graphifyignore'), 'utf8'), /graphify-out\//);
  assert.match(fs.readFileSync(path.join(root, '.graphifyignore'), 'utf8'), /\*\*\/target\//);
  assert.match(fs.readFileSync(path.join(root, '.gitignore'), 'utf8'), /!graphify-out\/graph\.json/);
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
  assert.equal((fs.readFileSync(path.join(root, '.gitignore'), 'utf8').match(/team-standards:graphify:start/g) || []).length, 1);
  assert.match(second.stdout, /changes: 0/);
});

test('status fails when required entry files are missing and succeeds after apply', (t) => {
  const root = createProject(t);
  const before = run(root, 'status');
  assert.equal(before.status, 2);

  assert.equal(run(root, 'apply').status, 0);
  const after = run(root, 'status');
  assert.equal(after.status, 0, after.stderr);
  assert.match(after.stdout, /pending\s+graphify-out\/graph\.json/);
});
