import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { contractFiles, multiRepositoryContracts } from '../shared-contracts.mjs';
import { planSync, applySync } from '../sync-shared-contracts.mjs';
import { readComponents, renderOverview } from '../sync-workspace-overview.mjs';

const repository = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const groups = [...contractFiles.map(({ team, profile }) => [team, profile]), ...multiRepositoryContracts.map(({ files }) => files)];

function temporary(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'suite-maintenance-'));
  t.after(() => {
    assert.ok(root.startsWith(`${fs.realpathSync(os.tmpdir())}${path.sep}`) || root.startsWith(`${path.resolve(os.tmpdir())}${path.sep}`));
    fs.rmSync(root, { recursive: true, force: true });
  });
  return fs.realpathSync(root);
}

function write(root, file, content) {
  const target = path.join(root, file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content);
}

function git(root, ...args) {
  const result = spawnSync('git', args, { cwd: root, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout;
}

function mirrorFixture(t) {
  const root = temporary(t);
  for (const files of groups) for (const file of files) write(root, file, fs.readFileSync(path.join(repository, files[0].replace('team-standards/', ''))));
  for (const name of ['project-coding-profiles', 'yoooni-daily-plugin']) {
    const directory = path.join(root, name);
    git(directory, 'init');
    git(directory, 'add', '.');
    git(directory, '-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid', '-c', 'core.hooksPath=/dev/null', 'commit', '-m', 'fixture');
  }
  return root;
}

test('preview is read-only; canonical changes copy once and then become idempotent', (t) => {
  const root = mirrorFixture(t);
  const source = groups[3][0];
  const target = groups[3][1];
  const original = fs.readFileSync(path.join(root, target));
  fs.appendFileSync(path.join(root, source), '\n// changed canonical fixture\n');
  const changes = planSync(root);
  assert.equal(changes.length, 1);
  assert.deepEqual(fs.readFileSync(path.join(root, target)), original);
  applySync(root, changes);
  assert.deepEqual(fs.readFileSync(path.join(root, target)), fs.readFileSync(path.join(root, source)));
  assert.equal(planSync(root).length, 0);
});

test('all destinations are checked before writing; dirty consumer blocks the batch', (t) => {
  const root = mirrorFixture(t);
  const original = fs.readFileSync(path.join(root, groups[3][1]));
  fs.appendFileSync(path.join(root, groups[3][0]), '\n// canonical A\n');
  fs.appendFileSync(path.join(root, groups[4][0]), '\n// canonical B\n');
  fs.appendFileSync(path.join(root, groups[4][1]), '\n// consumer work\n');
  assert.throws(() => applySync(root, planSync(root)), /local changes/);
  assert.deepEqual(fs.readFileSync(path.join(root, groups[3][1])), original);
});

test('missing mirrors and corrupted canonical integrity fail without writes', (t) => {
  const root = mirrorFixture(t);
  fs.unlinkSync(path.join(root, groups[3][1]));
  assert.throws(() => planSync(root), /ENOENT/);
  fs.appendFileSync(path.join(root, groups[0][0]), '\n// corrupted\n');
  const result = spawnSync(process.execPath, [path.join(repository, 'scripts/sync-shared-contracts.mjs'), '--workspace', root, '--write'], { encoding: 'utf8' });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /integrity/);
});

test('line endings do not create drift', (t) => {
  const root = mirrorFixture(t);
  for (const [, ...targets] of groups) for (const file of targets) {
    const target = path.join(root, file);
    fs.writeFileSync(target, fs.readFileSync(target, 'utf8').replace(/\r?\n/g, '\r\n'));
  }
  assert.deepEqual(planSync(root), []);
});

test('staged consumer edits and linked directories are not overwritten', (t) => {
  const root = mirrorFixture(t);
  const target = groups[3][1];
  fs.appendFileSync(path.join(root, groups[3][0]), '\n// canonical\n');
  fs.appendFileSync(path.join(root, target), '\n// staged work\n');
  git(path.join(root, 'project-coding-profiles'), 'add', '.');
  assert.throws(() => applySync(root, planSync(root)), /local changes/);
  const hooks = path.dirname(path.join(root, target));
  const relocated = `${hooks}-original`;
  fs.renameSync(hooks, relocated);
  fs.symlinkSync(relocated, hooks, process.platform === 'win32' ? 'junction' : 'dir');
  assert.throws(() => planSync(root), /unsafe contract path/);
});

test('ignored untracked consumer content is protected', (t) => {
  const root = mirrorFixture(t);
  const consumer = path.join(root, 'project-coding-profiles');
  const target = groups[3][1].replace('project-coding-profiles/', '');
  git(consumer, 'rm', '--cached', '--', target);
  git(consumer, '-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid', '-c', 'core.hooksPath=/dev/null', 'commit', '-m', 'untrack fixture');
  write(consumer, '.gitignore', `${target}\n`);
  fs.appendFileSync(path.join(root, groups[3][0]), '\n// canonical\n');
  assert.throws(() => applySync(root, planSync(root)), /local changes/);
});

const components = [
  { name: 'team-standards', version: '9.0.0', skills: 16 },
  { name: 'project-coding-profiles', version: '1.1.0', skills: 1 },
  { name: 'yoooni-daily-plugin', version: '2.0.0', skills: 2 },
];
const overview = '# Suite\n\n[21 个工程治理 Skill](#21-个工程治理-skill)\n' +
  components.map(({ name }) => `| \`${name}\` | \`0.0.0\` | summary |`).join('\n') +
  '\n| `project-domain-knowledge` | `0.0.0` | MCP |\n公共层合计 **24 个 Skill**：旧摘要。\n\nUser prose stays.\n';

test('overview updates versions/counts/anchors, preserves prose, and is idempotent', () => {
  const output = renderOverview(overview, components, '0.5.0');
  assert.match(output, /\*\*19 个 Skill\*\*/);
  assert.match(output, /#16-个工程治理-skill/);
  assert.match(output, /`team-standards` \| `9.0.0`/);
  assert.match(output, /`project-domain-knowledge` \| `0.5.0`/);
  assert.ok(output.endsWith('User prose stays.\n'));
  assert.equal(renderOverview(output, components, '0.5.0'), output);
  assert.throws(() => renderOverview(overview + overview, components, '0.5.0'), /expected one/);
  assert.throws(() => renderOverview('', components, '0.5.0'), /expected one/);
});

test('metadata comes from manifests and real Skill directories; disagreement is rejected', (t) => {
  const root = temporary(t);
  for (const { name, version } of components) {
    for (const host of ['.claude-plugin', '.codex-plugin']) write(root, `${name}/plugins/${name}/${host}/plugin.json`, JSON.stringify({ name, version }));
    write(root, `${name}/.claude-plugin/marketplace.json`, JSON.stringify({ plugins: [{ name, version }] }));
    write(root, `${name}/plugins/${name}/skills/actual/SKILL.md`, 'skill');
    write(root, `${name}/plugins/${name}/skills/reference/notes.md`, 'not a Skill');
  }
  assert.deepEqual(readComponents(root).map((item) => item.skills), [1, 1, 1]);
  write(root, 'team-standards/plugins/team-standards/.codex-plugin/plugin.json', JSON.stringify({ version: 'different' }));
  assert.throws(() => readComponents(root), /versions disagree/);
});

test('overview CLI detects drift, writes explicitly, and preserves the root README', (t) => {
  const root = temporary(t);
  for (const { name, version } of components) {
    for (const host of ['.claude-plugin', '.codex-plugin']) write(root, `${name}/plugins/${name}/${host}/plugin.json`, JSON.stringify({ name, version }));
    write(root, `${name}/.claude-plugin/marketplace.json`, JSON.stringify({ plugins: [{ name, version }] }));
    write(root, `${name}/plugins/${name}/skills/only/SKILL.md`, 'skill');
  }
  write(root, 'project-domain-knowledge/package.json', JSON.stringify({ version: '0.5.0' }));
  write(root, 'README.md', overview);
  const run = (...args) => spawnSync(process.execPath, [path.join(repository, 'scripts/sync-workspace-overview.mjs'), '--workspace', root, ...args], { encoding: 'utf8' });
  assert.notEqual(run().status, 0);
  assert.equal(fs.readFileSync(path.join(root, 'README.md'), 'utf8'), overview);
  const result = run('--write');
  assert.equal(result.status, 0, result.stderr);
  assert.equal(run().status, 0);
  assert.match(fs.readFileSync(path.join(root, 'README.md'), 'utf8'), /\*\*3 个 Skill\*\*/);
});
