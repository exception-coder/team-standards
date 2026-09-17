const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const api = require('../governance/design-preparation');
const baselines = require('../governance/baselines');
const storage = require('../governance/storage');
const { setup } = require('./helpers/design-content');
const cli = path.resolve(__dirname, '../../skills/init-project-docs/scripts/design-baseline.js');

function fixture(t) {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'design-auto-'));
  const root = path.join(home, 'project'); fs.mkdirSync(root);
  const previous = process.env.TEAM_STANDARDS_GOVERNANCE_DATA;
  process.env.TEAM_STANDARDS_GOVERNANCE_DATA = path.join(home, 'state');
  t.after(() => {
    if (previous === undefined) delete process.env.TEAM_STANDARDS_GOVERNANCE_DATA; else process.env.TEAM_STANDARDS_GOVERNANCE_DATA = previous;
    assert.ok(path.resolve(home).startsWith(path.resolve(os.tmpdir()) + path.sep));
    fs.rmSync(home, { recursive: true, force: true });
  });
  const git = args => {
    const result = spawnSync('git', args, { cwd: root, encoding: 'utf8', windowsHide: true });
    assert.equal(result.status, 0, result.stderr); return result.stdout.trim();
  };
  git(['init', '-q']); git(['config', 'user.name', 'Test']); git(['config', 'user.email', 'test@example.invalid']);
  fs.writeFileSync(path.join(root, 'README.md'), '# Example\nA real fixture entry for design preparation.\n');
  git(['add', '.']); git(['commit', '-qm', 'starting point']);
  const options = { root, session: 'task-one', module: 'greeting', scopes: ['src/'], capabilities: ['greeting'], owner: 'fixture maintainer',
    overview: 'docs/current.md', overviewHeading: '## Overview', detailed: 'docs/current.md', detailedHeading: '## Detailed',
    codeVersion: 'planning; not verified or deployed', migrationReason: 'Review function mapping before independent delivery.', migrationDue: 'before this slice delivery' };
  const commit = () => { git(['add', '.']); git(['commit', '-qm', 'existing design']); };
  return { root, home, options, git, commit, docs: () => setup(root) };
}

test('automatic design: discover is read-only and missing registry is not an error', t => {
  const f = fixture(t); const before = f.git(['status', '--porcelain']);
  const result = api.discover(f.options);
  assert.equal(result.registry, null); assert.equal(result.mode, 'legacy');
  assert.equal(f.git(['status', '--porcelain']), before);
  assert.equal(fs.existsSync(path.join(f.home, 'state')), false);
});

test('automatic design: blank module prepares, binds real documents, and repeats idempotently', t => {
  const f = fixture(t); api.prepare(f.options); f.docs();
  assert.equal(api.upsert(f.options).action, 'created');
  const file = path.join(f.root, baselines.REGISTRY); const bytes = fs.readFileSync(file);
  assert.equal(api.upsert(f.options).action, 'unchanged');
  assert.deepEqual(fs.readFileSync(file), bytes);
  assert.equal(fs.existsSync(path.join(f.root, 'openspec/config.yaml')), false);
});

test('automatic design: existing unbound shared document is discovered and reused without rewriting', t => {
  const f = fixture(t); f.docs(); f.commit();
  const body = fs.readFileSync(path.join(f.root, 'docs/current.md'));
  const result = api.prepare(f.options);
  assert.ok(result.candidates.some(item => item.path === 'docs/current.md'));
  api.upsert(f.options);
  assert.deepEqual(fs.readFileSync(path.join(f.root, 'docs/current.md')), body);
});

test('automatic design: another module and historical evidence survive targeted merge', t => {
  const f = fixture(t); api.prepare(f.options); f.docs(); api.upsert(f.options);
  const first = baselines.loadRegistry(f.root).modules[0];
  fs.writeFileSync(path.join(f.root, 'history.txt'), 'existing evidence');
  api.upsert({ ...f.options, module: 'other', scopes: ['other/'] });
  assert.deepEqual(baselines.loadRegistry(f.root).modules[0], first);
  assert.equal(fs.readFileSync(path.join(f.root, 'history.txt'), 'utf8'), 'existing evidence');
});

test('automatic design: dirty documents cannot be claimed by preparation or repeated prepare', t => {
  const f = fixture(t); f.docs(); api.prepare(f.options); api.prepare(f.options);
  assert.throws(() => api.upsert(f.options), { rule: 'DESIGN_DIRTY_DOCUMENT' });
  assert.equal(fs.existsSync(path.join(f.root, baselines.REGISTRY)), false);
});

test('automatic design: concurrent registry changes are preserved and rejected', t => {
  const f = fixture(t); api.prepare(f.options); f.docs(); api.upsert(f.options);
  const file = path.join(f.root, baselines.REGISTRY);
  const data = JSON.parse(fs.readFileSync(file, 'utf8')); data.modules[0].owner = 'another task';
  fs.writeFileSync(file, JSON.stringify(data)); const bytes = fs.readFileSync(file);
  assert.throws(() => api.upsert(f.options), { rule: 'DESIGN_REGISTRY_CONCURRENT' });
  assert.deepEqual(fs.readFileSync(file), bytes);
});

test('automatic design: repair an invalid heading binding with confirmed real heading', t => {
  const f = fixture(t); const documents = f.docs();
  documents.module.overview.heading = '## Missing';
  fs.mkdirSync(path.join(f.root, '.team-standards'));
  fs.writeFileSync(path.join(f.root, baselines.REGISTRY), JSON.stringify({ schemaVersion: 1, managed: ['src/'], modules: [documents.module] }));
  f.commit(); api.prepare(f.options); api.upsert(f.options);
  assert.equal(baselines.loadRegistry(f.root).modules[0].overview.heading, '## Overview');
});

test('automatic design: retired modules are not silently reactivated', t => {
  const f = fixture(t); const docs = f.docs();
  const retired = { ...docs.module, status: 'retired', plan: 'Use the replacement feature after migration review.' };
  fs.mkdirSync(path.join(f.root, '.team-standards'));
  fs.writeFileSync(path.join(f.root, baselines.REGISTRY), JSON.stringify({ schemaVersion: 1, managed: ['src/'], modules: [retired] }));
  f.commit(); api.prepare(f.options);
  assert.throws(() => api.upsert(f.options), { rule: 'DESIGN_RETIRED' });
  assert.equal(baselines.loadRegistry(f.root).modules[0].status, 'retired');
});

test('automatic design: empty prose, missing preparation, early code and stale documents fail', t => {
  const f = fixture(t);
  assert.throws(() => api.upsert(f.options), { rule: 'DESIGN_PREPARATION_REQUIRED' });
  api.prepare(f.options); f.docs();
  fs.writeFileSync(path.join(f.root, 'docs/current.md'), '## Overview\nTODO\n## Detailed\nTODO\n');
  assert.throws(() => api.upsert(f.options), { rule: 'DESIGN_EMPTY' });
  f.docs(); api.upsert(f.options);
  const repo = { root: fs.realpathSync.native(f.root), branch: f.git(['rev-parse', '--abbrev-ref', 'HEAD']), head: f.git(['rev-parse', 'HEAD']) };
  assert.throws(() => api.bindingPreparation(repo, 'task-one', ['docs/current.md'], ['src/new.js']), { rule: 'DESIGN_EARLY_CODE' });
  fs.appendFileSync(path.join(f.root, 'docs/current.md'), '\nConcurrent document edits must be reviewed again.\n');
  assert.throws(() => api.bindingPreparation(repo, 'task-one', ['docs/current.md'], [baselines.REGISTRY]), { rule: 'DESIGN_DOCUMENT_STALE' });
});

test('automatic design: CLI discovery works with spaces; unsupported arguments do not mutate', t => {
  const f = fixture(t);
  const result = spawnSync(process.execPath, [cli, 'discover', '--root', f.root], { encoding: 'utf8', windowsHide: true });
  assert.equal(result.status, 0, result.stdout); assert.equal(JSON.parse(result.stdout).registry, null);
  const invalid = spawnSync(process.execPath, [cli, 'upsert', '--unknown', 'x', '--root', f.root], { encoding: 'utf8', windowsHide: true });
  assert.equal(invalid.status, 2); assert.equal(f.git(['status', '--porcelain']), '');
});
