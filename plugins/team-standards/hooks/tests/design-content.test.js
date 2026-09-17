const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const content = require('../governance/design-content');
const baselines = require('../governance/baselines');
const { setup } = require('./helpers/design-content');

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'design-content-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const git = args => {
    const result = spawnSync('git', args, { cwd: root, encoding: 'utf8', windowsHide: true });
    assert.equal(result.status, 0, result.stderr);
    return result.stdout.trim();
  };
  git(['init', '-q']); git(['config', 'user.name', 'Fixture']); git(['config', 'user.email', 'fixture@example.invalid']);
  const f = setup(root);
  const registry = { schemaVersion: 1, managed: ['src/'], modules: [f.module] };
  f.write(baselines.REGISTRY, JSON.stringify(registry));
  git(['add', '.']); git(['commit', '-qm', 'baseline']);
  const base = git(['rev-parse', 'HEAD']);
  const plan = { scenarios: [{ id: 'greet', files: ['src/greet.js'], reference: f.scenario, verificationIds: ['test'] }],
    verifications: [{ id: 'test', result: 'PASS', reference: { path: 'docs/evidence.md', heading: '## Test' } }],
    functionImpacts: [{ module: 'greeting', id: 'GS-001', disposition: 'updated', reason: 'Greeting result changes.', scenarioIds: ['greet'] }],
    review: { actor: 'test-agent', content: [] } };
  const review = () => { plan.review.content = [{ module: 'greeting', result: 'PASS', reason: 'Fixture review only.', inputFingerprint: content.fingerprint(root, f.module) }]; };
  const validate = () => content.validateDelivery(root, f.module, plan, 'delivery', base, () => {});
  const replace = (from, to) => {
    const file = path.join(root, 'docs/current.md');
    fs.writeFileSync(file, fs.readFileSync(file, 'utf8').replace(from, to));
  };
  return { ...f, root, registry, plan, review, validate, replace };
}

test('content: shared-file binding validates eight overview chapters and nine functional chapters', t => {
  const f = fixture(t); const result = content.inspectModule(f.root, f.module);
  assert.equal(result.functions.size, 1);
  f.update(); f.review(); assert.doesNotThrow(f.validate);
});

test('content: deeply bound detailed design accepts valid level-six functional subsections', t => {
  const f = fixture(t);
  const original = fs.readFileSync(path.join(f.root, 'docs/current.md'), 'utf8');
  const deep = content.section(original, '## Detailed').replace(/^### /gm, '##### ').replace(/^#### /gm, '###### ');
  f.write('docs/deep.md', '# Container\n\n#### Detailed\n' + deep);
  f.module.detailed = { path: 'docs/deep.md', heading: '#### Detailed' };
  f.module.content.functions[0].heading = '##### GS-001 问候';
  f.replace('[问候](#gs-001-问候)', '[问候](deep.md#gs-001-问候)');
  assert.doesNotThrow(() => content.inspectModule(f.root, f.module));
});

test('content: missing business chapter and fenced pseudo-heading are rejected', t => {
  const f = fixture(t);
  f.replace('### 用户角色与职责', '```md\n### 用户角色与职责\n```');
  assert.throws(() => content.inspectModule(f.root, f.module), { rule: 'CONTENT_COVERAGE' });
});

test('content: empty subsection and unexplained not-applicable do not count', t => {
  const f = fixture(t);
  f.replace('#### 操作权限与数据范围\n\n调用方发出问候请求，收到固定结果；失败时提供可理解的反馈。', '#### 操作权限与数据范围\n\n不适用');
  assert.throws(() => content.inspectModule(f.root, f.module), { rule: 'CONTENT_EMPTY' });
  f.replace('#### 操作权限与数据范围\n\n不适用', '#### 操作权限与数据范围\n\n不适用：匿名公开读取固定问候，不访问任何租户或个人数据。');
  assert.doesNotThrow(() => content.inspectModule(f.root, f.module));
});

test('content: panorama ID and detail links must resolve to the authoritative function', t => {
  const f = fixture(t); f.replace('#gs-001-问候', '#gs-002-问候');
  assert.throws(() => content.inspectModule(f.root, f.module), { rule: 'CONTENT_DETAIL_LINK' });
  f.replace('#gs-002-问候', '#gs-001-问候'); f.module.content.functions.push(structuredClone(f.module.content.functions[0]));
  assert.throws(() => content.inspectModule(f.root, f.module), { rule: 'CONTENT_FUNCTION' });
});

test('content: scenario in another requirement cannot satisfy traceability', t => {
  const f = fixture(t);
  f.write(f.scenario.path, '### Requirement: Stable greeting\n\nThe system SHALL provide a stable greeting.\n\n### Requirement: Other\n\nAnother independent requirement exists.\n\n#### Scenario: Greeting requested\n\nThis scenario belongs to another requirement entirely.\n');
  assert.throws(() => content.inspectModule(f.root, f.module), { rule: 'CONTENT_HEADING' });
});

test('content: verified requires verification; production additionally requires release evidence', t => {
  const f = fixture(t); delete f.module.content.functions[0].scenarios[0].verification;
  assert.throws(() => content.inspectModule(f.root, f.module), { rule: 'CONTENT_REFERENCE' });
  f.module.content.functions[0].scenarios[0].verification = { path: 'docs/evidence.md', heading: '## Test' };
  f.replace('| 已验证 |', '| 已上线 |');
  assert.throws(() => content.inspectModule(f.root, f.module), { rule: 'CONTENT_REFERENCE' });
  f.write('docs/release.md', '## Production\n\nTest fixture release record, not a real production deployment.\n');
  f.module.content.functions[0].release = { path: 'docs/release.md', heading: '## Production' };
  assert.doesNotThrow(() => content.inspectModule(f.root, f.module));
});

test('content: planned function needs active change and explicit target label', t => {
  const f = fixture(t); f.replace('| 已验证 |', '| 规划中 |');
  assert.throws(() => content.inspectModule(f.root, f.module), { rule: 'CONTENT_PLAN' });
  f.write('openspec/changes/future/design.md', '## Target\n\nA proposed future greeting, not yet verified or released.\n');
  f.module.content.functions[0].change = { path: 'openspec/changes/future/design.md', heading: '## Target' };
  assert.throws(() => content.inspectModule(f.root, f.module), { rule: 'CONTENT_PLAN' });
  f.replace('当前返回 old', '规划中：未来返回 old');
  assert.doesNotThrow(() => content.inspectModule(f.root, f.module));
});

test('content: changing unrelated overview or timestamps cannot satisfy a functional update', t => {
  const f = fixture(t); f.replace('### 一页总览', '### 一页总览\n\n补充读者说明：这里可以快速了解模块。');
  f.replace('当前返回 old', '日期：2026-09-17\n当前返回 old'); f.review();
  assert.throws(f.validate, { rule: 'CONTENT_NO_CHANGE' });
});

test('content: named review must cover current documents and evidence', t => {
  const f = fixture(t); f.update(); f.review(); f.validate();
  f.replace('当前返回 hello', '当前返回 hello world');
  assert.throws(f.validate, { rule: 'CONTENT_REVIEW' });
  f.review(); f.validate();
  f.write('docs/evidence.md', '## Test\n\nChanged evidence invalidates the previous content review fingerprint.\n');
  assert.throws(f.validate, { rule: 'CONTENT_REVIEW' });
});

test('content: all scoped scenarios need a functional mapping', t => {
  const f = fixture(t); f.update(); f.review();
  f.plan.scenarios.push({ id: 'unmapped', files: ['src/greet.js'], reference: f.scenario });
  assert.throws(f.validate, { rule: 'CONTENT_TRACE' });
});

test('content: one business function may link scenarios from multiple requirements', t => {
  const f = fixture(t);
  const other = 'openspec/specs/recovery/spec.md';
  f.write(other, '### Requirement: Recovery\n\nThe system SHALL recover after transient failures.\n\n#### Scenario: Retry succeeds\n\nWHEN retrying THEN return the same result without duplicate effects.\n');
  f.module.content.functions[0].scenarios.push({ requirement: { path: other, heading: '### Requirement: Recovery' },
    reference: { path: other, heading: '#### Scenario: Retry succeeds' }, verification: { path: 'docs/evidence.md', heading: '## Test' } });
  assert.doesNotThrow(() => content.inspectModule(f.root, f.module));
});

test('content: legacy projects reuse local acceptance references without initializing OpenSpec', t => {
  const f = fixture(t); f.module.content.specMode = 'local';
  f.write('docs/acceptance.md', '## Greeting rules\n\nCallers receive a stable greeting from this local feature.\n\n### Greeting accepted\n\nCall the feature and assert that its greeting matches the accepted result.\n');
  f.module.content.functions[0].requirement = { path: 'docs/acceptance.md', heading: '## Greeting rules' };
  f.module.content.functions[0].scenarios[0].reference = { path: 'docs/acceptance.md', heading: '### Greeting accepted' };
  assert.doesNotThrow(() => content.inspectModule(f.root, f.module));
  assert.equal(fs.existsSync(path.join(f.root, 'openspec/config.yaml')), false);
  f.write('openspec/config.yaml', 'schema: spec-driven\n');
  assert.throws(() => content.inspectModule(f.root, f.module), { rule: 'CONTENT_SPEC_MODE' });
});

test('content: an old evidence link cannot replace current slice verification', t => {
  const f = fixture(t); f.update(); f.review();
  f.plan.verifications[0].reference = { path: 'docs/other-evidence.md', heading: '## Test' };
  assert.throws(f.validate, { rule: 'CONTENT_TRACE' });
});

test('content: changed functional body cannot be declared unchanged', t => {
  const f = fixture(t); f.update(); f.review(); f.plan.functionImpacts[0].disposition = 'unchanged';
  assert.throws(f.validate, { rule: 'CONTENT_NO_CHANGE' });
});

test('content: deleting a function requires removal impact and no live references', t => {
  const f = fixture(t); const original = f.module.content.functions[0];
  f.module.content.functions = [{ ...original, id: 'GS-002', heading: '### GS-002 问候' }];
  f.replace('| GS-001 |', '| GS-002 |'); f.replace('#gs-001-问候', '#gs-002-问候'); f.replace('### GS-001 问候', '### GS-002 问候');
  f.plan.functionImpacts = [{ module: 'greeting', id: 'GS-002', disposition: 'added', reason: 'Replacement.', scenarioIds: ['greet'] }];
  f.review(); assert.throws(f.validate, { rule: 'CONTENT_IMPACT' });
  f.plan.functionImpacts.push({ module: 'greeting', id: 'GS-001', disposition: 'removed', reason: 'Replaced after acceptance.', scenarioIds: ['greet'], replacedBy: 'GS-002' });
  f.review(); f.validate();
  f.replace('### 一页总览', '### 一页总览\n\n仍引用旧功能 GS-001 的说明必须清理。');
  assert.throws(f.validate, { rule: 'CONTENT_REMOVAL' });
});

test('content: legacy not-enrolled stays compatible, migration explicitly reports its gaps', t => {
  const f = fixture(t); delete f.module.content;
  f.write(baselines.REGISTRY, JSON.stringify(f.registry));
  assert.equal(baselines.inspect(f.root).contentCoverage[0].mode, 'not-enrolled');
  f.module.content = { version: 1, mode: 'migrate', functions: [], migration: { owner: 'maintainer', due: 'next reviewed slice', reason: 'Inventory existing functions first.' } };
  f.write(baselines.REGISTRY, JSON.stringify(f.registry));
  assert.equal(baselines.inspect(f.root).state, 'needs-work');
  delete f.module.content.migration;
  assert.throws(() => baselines.validateRegistry(f.root, f.registry), { rule: 'CONTENT_MIGRATION' });
});

test('content: adding an independently accepted function synchronizes inventory and detailed body', t => {
  const f = fixture(t);
  const first = f.module.content.functions[0];
  const second = { ...structuredClone(first), id: 'GS-002', heading: '### GS-002 第二问候' };
  f.module.content.functions.push(second);
  const file = path.join(f.root, 'docs/current.md');
  const body = fs.readFileSync(file, 'utf8');
  const row = body.split('\n').find(line => line.startsWith('| GS-001 |'));
  f.replace(row, row + '\n' + row.replace('GS-001', 'GS-002').replace('#gs-001-问候', '#gs-002-第二问候'));
  fs.appendFileSync(file, '\n' + second.heading + '\n' + content.section(body, first.heading));
  f.plan.functionImpacts = [{ module: 'greeting', id: 'GS-002', disposition: 'added', reason: 'Independent additional accepted function.', scenarioIds: ['greet'] }];
  f.review(); f.validate();
  f.plan.functionImpacts = [{ module: 'greeting', id: 'GS-001', disposition: 'unchanged', reason: 'Existing behavior preserved.', scenarioIds: ['greet'] }];
  assert.throws(f.validate, { rule: 'CONTENT_IMPACT' });
});

test('content: shipped garment example passes structural inspection without claiming business verification', t => {
  const f = fixture(t);
  const examples = path.resolve(__dirname, '../../skills/change-readiness/references/examples');
  for (const file of ['garment-sample-overview.md', 'garment-sample-detail.md']) f.write('docs/' + file, fs.readFileSync(path.join(examples, file), 'utf8'));
  f.module.overview = { path: 'docs/garment-sample-overview.md', heading: '# 样衣使用工作区概要设计' };
  f.module.detailed = { path: 'docs/garment-sample-detail.md', heading: '# 样衣使用工作区详细设计' };
  f.write('openspec/changes/example/proposal.md', '## Target\n\nStructural test fixture only; no actual business acceptance is asserted.\n');
  const first = f.module.content.functions[0];
  f.module.content.functions = ['可见样衣查阅', '本人领借还'].map((name, i) => ({ ...structuredClone(first),
    id: `GS-00${i + 1}`, heading: `## GS-00${i + 1} ${name}`, change: { path: 'openspec/changes/example/proposal.md', heading: '## Target' } }));
  const result = content.inspectModule(f.root, f.module);
  assert.deepEqual([...result.functions.values()].map(item => item.row[6]), ['实现中', '实现中']);
});
