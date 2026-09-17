const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const service = require('../governance/service');
const storage = require('../governance/storage');
const { handle } = require('../check-openspec-governance');
const cliEntry = path.resolve(__dirname, '../../scripts/openspec-governance.js');
const change = 'add-greeting';
const changeDir = `openspec/changes/${change}`;
const baselines = require('../governance/baselines');

function runGit(root, args) {
  const output = spawnSync('git', args, { cwd: root, encoding: 'utf8', windowsHide: true });
  assert.equal(output.status, 0, output.stderr);
  return output.stdout.trim();
}

function write(root, file, body) {
  const target = path.join(root, file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, body);
}

function fixture(t, realCli) {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'governance 中文 '));
  const root = path.join(home, 'repo with spaces');
  fs.mkdirSync(root);
  const oldData = process.env.TEAM_STANDARDS_GOVERNANCE_DATA;
  const oldMode = process.env.TEAM_STANDARDS_OPENSPEC_GOVERNANCE_HOOK;
  process.env.TEAM_STANDARDS_GOVERNANCE_DATA = path.join(home, 'state');
  process.env.TEAM_STANDARDS_OPENSPEC_GOVERNANCE_HOOK = 'block';
  t.after(() => {
    if (oldData === undefined) delete process.env.TEAM_STANDARDS_GOVERNANCE_DATA;
    else process.env.TEAM_STANDARDS_GOVERNANCE_DATA = oldData;
    if (oldMode === undefined) delete process.env.TEAM_STANDARDS_OPENSPEC_GOVERNANCE_HOOK;
    else process.env.TEAM_STANDARDS_OPENSPEC_GOVERNANCE_HOOK = oldMode;
    assert.ok(home.startsWith(os.tmpdir()));
    fs.rmSync(home, { recursive: true, force: true });
  });
  runGit(root, ['init', '-b', 'main']);
  runGit(root, ['config', 'user.name', 'Governance Test']);
  runGit(root, ['config', 'user.email', 'governance@example.invalid']);
  write(root, 'openspec/config.yaml', 'schema: spec-driven\ncontext: |\n  A greeting application used for isolated governance testing.\n');
  write(root, `${changeDir}/.openspec.yaml`, 'schema: spec-driven\n');
  write(root, `${changeDir}/proposal.md`, '## Why\n\nProvide a predictable greeting for callers.\n\n## What Changes\n\n- Return hello to callers.\n\n## Capabilities\n\n### New Capabilities\n\n- `greeting`: stable greeting result\n\n### Modified Capabilities\n\nNone.\n\n## Impact\n\nThe greeting module and its tests change.\n');
  write(root, `${changeDir}/design.md`, '## Design\n\nThe module returns a fixed greeting string without external dependencies.\n');
  write(root, `${changeDir}/tasks.md`, '## 1. Implementation\n\n- [ ] 1.1 Return a greeting and verify its observable result\n- [ ] 1.2 Future independent task outside this delivery slice\n');
  write(root, `${changeDir}/specs/greeting/spec.md`, '## ADDED Requirements\n\n### Requirement: Stable greeting\nThe application SHALL return hello to a caller.\n\n#### Scenario: Greeting requested\n- **WHEN** a caller requests a greeting\n- **THEN** the application returns hello\n');
  write(root, `${changeDir}/validation.md`, '## Review\n\nThe scenario and design cover this slice; this is an Agent review, not human approval.\n\n## Dedup\n\nExisting specs and changes were searched; no equivalent greeting capability exists.\n\n## Handoff\n\nImplement task 1.1 and validate the greeting. Task 1.2 is outside the current slice.\n\n## Verification\n\nExecuted node --test in an isolated local repository; greeting assertions passed.\n\n## Sync\n\nNo main spec has been promoted yet; this is a current-slice delivery only.\n');
  write(root, 'src/greet.js', 'module.exports = () => "old";\n');
  runGit(root, ['add', '.']);
  runGit(root, ['commit', '-qm', 'fixture baseline']);
  const ref = (file, heading) => ({ path: `${changeDir}/${file}`, heading });
  const plan = {
    files: ['src/greet.js'], taskIds: ['1.1'],
    views: [{ id: 'implementation', files: ['src/greet.js'], disposition: 'updated',
      reason: 'A deterministic greeting with no external contract changes beyond this scenario.', reference: ref('design.md', '## Design') }],
    scenarios: [{ id: 'greeting-requested', files: ['src/greet.js'], taskIds: ['1.1'], verificationIds: ['test'],
      reference: ref('specs/greeting/spec.md', '#### Scenario: Greeting requested') }],
    review: { type: 'agent', actor: 'test-agent', result: 'PASS', reference: ref('validation.md', '## Review') },
    dedup: { query: 'greeting capability and active changes', decision: 'new capability', reference: ref('validation.md', '## Dedup') },
    handoff: { stage: 'design-ready', nextTask: '1.1', blockers: [], reference: ref('validation.md', '## Handoff') },
    verifications: [{ id: 'test', command: 'node --test', environment: 'isolated local repository', result: 'PASS', reference: ref('validation.md', '## Verification') }],
  };
  const planFile = path.join(home, 'plan.json');
  const cli = realCli || path.join(home, 'fake-openspec.cjs');
  if (!realCli) fs.writeFileSync(cli, `
    const fs = require('fs'), path = require('path');
    const change = '${change}', dir = path.resolve('${changeDir}');
    const paths = ['proposal.md', 'design.md', 'tasks.md', 'specs/greeting/spec.md'].map(p => path.join(dir, p));
    const tasks = fs.readFileSync(path.join(dir, 'tasks.md'), 'utf8');
    const args = process.argv.slice(2);
    let value;
    if (args[0] === 'status') value = {changeName:change,schemaName:'spec-driven',isComplete:true,changeRoot:dir};
    if (args[0] === 'instructions') value = {changeName:change,changeDir:dir,state:'ready',contextFiles:{customArtifacts:paths},tasks:[
      {id:'1.1',done:tasks.includes('[x] 1.1')},{id:'1.2',done:tasks.includes('[x] 1.2')}]};
    if (args[0] === 'validate') value = {items:[{id:change,valid:true}]};
    if (args[0] === 'list') value = {changes:[{name:change}]};
    console.log(JSON.stringify(value));
  `);
  const options = { repo: root, session: 'session-a', change, plan: planFile, cli };
  const save = () => fs.writeFileSync(planFile, JSON.stringify(plan));
  save();
  return { root, home, options, plan, save, ref };
}

function implement(f) {
  write(f.root, 'src/greet.js', 'module.exports = () => "hello";\n');
  const taskFile = path.join(f.root, changeDir, 'tasks.md');
  fs.writeFileSync(taskFile, fs.readFileSync(taskFile, 'utf8').replace('[ ] 1.1', '[x] 1.1'));
  const inputFingerprint = service.snapshot(f.options).inputFingerprint;
  f.plan.review.inputFingerprint = inputFingerprint;
  f.plan.verifications[0].inputFingerprint = inputFingerprint;
  f.save();
}

function enrollBaseline(f) {
  write(f.root, 'docs/current.md', '## Overview\n\nThe greeting module owns the synchronous greeting operation and has no external dependencies.\n\n## Detailed\n\nThe current implementation returns the old greeting to every caller without accessing storage.\n');
  const registry = { schemaVersion: 1, managed: ['src/'], modules: [{ id: 'greeting', scopes: ['src/'],
    capabilities: ['greeting'], owner: 'fixture maintainer', status: 'active', codeVersion: 'fixture baseline',
    overview: { path: 'docs/current.md', heading: '## Overview' }, detailed: { path: 'docs/current.md', heading: '## Detailed' } }] };
  write(f.root, baselines.REGISTRY, JSON.stringify(registry));
  runGit(f.root, ['add', '.']);
  runGit(f.root, ['commit', '-qm', 'bind current design']);
  f.plan.dedup = { ...f.plan.dedup, selection: 'new', originalGoal: 'Replace old greeting', acceptanceBoundary: 'Greeting caller receives hello', stage: 'planning' };
  f.plan.baselines = ['overview', 'detailed'].map(id => ({ module: 'greeting', id,
    disposition: id === 'overview' ? 'already-covered' : 'updated', reason: 'Only the greeting result changes; ownership stays stable.',
    reference: registry.modules[0][id], implemented: true, codeVersion: 'bound baseline plus this verified slice' }));
  f.plan.sync = { status: 'not-applicable', reason: 'Internal slice; not yet accepted as a public capability.', reference: f.ref('validation.md', '## Sync'), targets: [] };
  f.save();
  return registry;
}

function syncBaseline(f) {
  const target = path.join(f.root, 'docs/current.md');
  fs.writeFileSync(target, fs.readFileSync(target, 'utf8').replace('returns the old greeting', 'returns the hello greeting'));
}

test('baseline A3/A8/A9: shared long-lived file, independent slice delivery, pending change cannot archive', t => {
  const f = fixture(t); enrollBaseline(f);
  service.bind(f.options); implement(f); syncBaseline(f);
  service.record(f.options);
  assert.equal(service.check(f.options).status, 'PASS');
  assert.equal(service.guarded(() => service.record({ ...f.options, phase: 'archive' })).findings[0].rule, 'CHANGE_INCOMPLETE');
});

test('baseline A5/A9/A10: unbound, ambiguous, shared and change references', t => {
  const f = fixture(t); const registry = enrollBaseline(f);
  registry.modules[0].scopes = ['src/other/'];
  assert.throws(() => baselines.affected(registry, ['src/greet.js']), { rule: 'MODULE_UNBOUND' });
  registry.modules[0].scopes = ['src/'];
  registry.modules.push({ ...registry.modules[0], id: 'consumer' });
  assert.throws(() => baselines.affected(registry, ['src/greet.js']), { rule: 'MODULE_AMBIGUOUS' });
  registry.modules.forEach(module => { module.shared = true; });
  assert.equal(baselines.affected(registry, ['src/greet.js']).length, 2);
  registry.modules[0].overview = f.ref('design.md', '## Design');
  assert.throws(() => baselines.validateRegistry(f.root, registry), { rule: 'BASELINE_REFERENCE' });
});

test('baseline A6/A7: timestamp-only sync and unimplemented promotion are rejected', t => {
  const f = fixture(t); enrollBaseline(f); service.bind(f.options); implement(f);
  fs.appendFileSync(path.join(f.root, 'docs/current.md'), '\n更新时间：2026-09-16\n## Empty\n');
  assert.equal(service.guarded(() => service.record(f.options)).findings[0].rule, 'BASELINE_NO_CHANGE');
  syncBaseline(f); f.plan.baselines[1].implemented = false; f.save();
  assert.equal(service.guarded(() => service.record(f.options)).findings[0].rule, 'BASELINE_UNVERIFIED');
});

test('baseline A11: concurrent Requirement and baseline targets require explicit ordering', t => {
  const f = fixture(t); enrollBaseline(f);
  write(f.root, 'openspec/changes/other/specs/greeting/spec.md', '### Requirement: Stable greeting\nA second change modifies this same requirement.\n');
  assert.equal(service.guarded(() => service.bind(f.options)).findings[0].rule, 'BASELINE_CONFLICT');
  f.plan.conflicts = [{ change: 'other', order: 'this change before other', reason: 'Other must rebase and revalidate its behavior and design after this delivery.' }];
  f.save(); assert.equal(service.bind(f.options).status, 'PASS');
});

test('baseline A12: committed diff persists; changed baseline evidence becomes stale', t => {
  const f = fixture(t); enrollBaseline(f); service.bind(f.options); implement(f); syncBaseline(f);
  const recorded = service.record(f.options); const base = runGit(f.root, ['rev-parse', 'HEAD']);
  runGit(f.root, ['add', '.']); runGit(f.root, ['commit', '-qm', 'verified slice']);
  const head = runGit(f.root, ['rev-parse', 'HEAD']);
  assert.equal(service.check({ repo: f.root, evidence: recorded.evidence, base, head }).status, 'PASS');
  fs.appendFileSync(path.join(f.root, 'docs/current.md'), '\nThe documented behavior has now changed independently.\n');
  assert.equal(service.guarded(() => service.check(f.options)).findings[0].rule, 'REVIEW_STALE');
});

test('baseline A12: preexisting baseline edits cannot be claimed as this slice update', t => {
  const f = fixture(t); enrollBaseline(f);
  syncBaseline(f);
  assert.equal(service.guarded(() => service.bind(f.options)).findings[0].rule, 'DIRTY_BASELINE_OWNERSHIP');
  assert.match(fs.readFileSync(path.join(f.root, 'docs/current.md'), 'utf8'), /hello greeting/);
});

test('baseline A13: wording edits preserve runtime input fingerprint', t => {
  const f = fixture(t); enrollBaseline(f); service.bind(f.options); implement(f); syncBaseline(f);
  service.record(f.options);
  const before = f.plan.verifications[0].inputFingerprint;
  fs.appendFileSync(path.join(f.root, 'docs/current.md'), '\nClarification: this describes code and does not assert a production deployment.\n');
  assert.equal(service.record(f.options).status, 'PASS');
  assert.equal(f.plan.verifications[0].inputFingerprint, before);
});

test('baseline A5/A15: explicit legacy gap may plan but cannot deliver; unknown versions fail', t => {
  const f = fixture(t); const registry = enrollBaseline(f);
  registry.modules[0].status = 'gap'; registry.modules[0].plan = 'maintainer completes both views before strict delivery';
  write(f.root, baselines.REGISTRY, JSON.stringify(registry));
  runGit(f.root, ['add', '.']); runGit(f.root, ['commit', '-qm', 'register baseline debt']);
  service.bind(f.options); implement(f);
  assert.equal(service.guarded(() => service.record(f.options)).findings[0].rule, 'BASELINE_MISSING');
  registry.schemaVersion = 99;
  assert.throws(() => baselines.validateRegistry(f.root, registry), { rule: 'BASELINE_VERSION' });
});

test('baseline A4: reviewed small change uses existing governance without an OpenSpec change', t => {
  const f = fixture(t);
  delete f.options.change;
  f.plan.taskIds = ['small']; f.plan.scenarios[0].taskIds = ['small'];
  f.plan.smallChange = { reason: 'Restore the already accepted greeting behavior.', behaviorUnchanged: true };
  f.save(); service.bind(f.options); implement(f);
  const recorded = service.record(f.options);
  assert.match(recorded.evidence, /^\.team-standards\/evidence\//);
  assert.equal(service.check(f.options).status, 'PASS');
});

test('baseline A14: initializer status/plan are read-only; apply preserves existing bytes', async t => {
  const f = fixture(t); const registry = enrollBaseline(f);
  const { baselineEnrollment } = await import('../../skills/init-project-docs/init-ai-structure.mjs');
  const candidate = path.join(f.home, 'bindings.json'); fs.writeFileSync(candidate, JSON.stringify(registry));
  const target = path.join(f.root, baselines.REGISTRY); fs.unlinkSync(target);
  const opts = { root: f.root, bindings: candidate };
  assert.equal(baselineEnrollment({ ...opts, command: 'plan' }).action, 'create');
  assert.equal(fs.existsSync(target), false);
  assert.equal(baselineEnrollment({ ...opts, command: 'apply' }).changes.length, 1);
  const bytes = fs.readFileSync(target);
  registry.modules[0].owner = 'different proposed owner'; fs.writeFileSync(candidate, JSON.stringify(registry));
  assert.equal(baselineEnrollment({ ...opts, command: 'apply' }).proposedDifference, true);
  assert.deepEqual(fs.readFileSync(target), bytes);
  assert.equal(baselineEnrollment({ ...opts, command: 'status' }).changes.length, 0);
  const cli = path.resolve(__dirname, '../../skills/init-project-docs/init-ai-structure.mjs');
  for (const command of ['status', 'plan', 'apply']) {
    const output = spawnSync(process.execPath, [cli, command, '--root', f.root, '--baselines', '--bindings', candidate, '--json'], { encoding: 'utf8', windowsHide: true });
    assert.equal(output.status, 0, output.stderr);
    assert.equal(JSON.parse(output.stdout).changes.length, 0);
    assert.deepEqual(fs.readFileSync(target), bytes);
  }
});

test('baseline A10: removing old ownership cannot hide renamed/deleted inputs', t => {
  const f = fixture(t); const registry = enrollBaseline(f); service.bind(f.options); implement(f); syncBaseline(f);
  registry.managed = ['other/'];
  write(f.root, baselines.REGISTRY, JSON.stringify(registry));
  assert.equal(service.guarded(() => service.record(f.options)).findings[0].rule, 'SCOPE_GAP');
  const refs = [];
  assert.throws(() => baselines.validateBaselines(f.root, f.plan, { artifacts: {} }, 'delivery',
    runGit(f.root, ['rev-parse', 'HEAD']), ref => refs.push(ref)), { rule: 'MODULE_MIGRATION' });
});

test('baseline A13: verification subsets cannot omit input coverage', t => {
  const f = fixture(t); service.bind(f.options); implement(f);
  f.plan.verifications[0].files = ['unrelated.js']; f.save();
  assert.equal(service.guarded(() => service.record(f.options)).findings[0].rule, 'VERIFICATION_SCOPE_GAP');
  f.plan.verifications[0].files = ['src/greet.js'];
  f.plan.verifications[0].inputFingerprint = service.snapshot({ ...f.options, files: 'src/greet.js' }).inputFingerprint;
  f.save(); assert.equal(service.record(f.options).status, 'PASS');
});

test('baseline A18: bounded registry and explicit small-change limits fail closed', t => {
  const f = fixture(t); const registry = enrollBaseline(f);
  registry.modules = Array.from({ length: 1001 }, (_, index) => ({ ...registry.modules[0], id: `module-${index}` }));
  assert.throws(() => baselines.validateRegistry(f.root, registry), { rule: 'BASELINE_FORMAT' });
  fs.unlinkSync(path.join(f.root, baselines.REGISTRY));
  runGit(f.root, ['add', '.']); runGit(f.root, ['commit', '-qm', 'remove enrollment for S fixture']);
  delete f.options.change; delete f.plan.baselines;
  f.plan.taskIds = ['small']; f.plan.scenarios[0].taskIds = ['small'];
  f.plan.smallChange = { reason: 'Only wording changes', behaviorUnchanged: true }; f.save();
  service.bind(f.options); implement(f);
  write(f.root, 'src/greet.js', Array.from({length: 35}, (_, index) => `// line ${index}`).join('\n'));
  const digest = service.snapshot(f.options).inputFingerprint;
  f.plan.review.inputFingerprint = digest; f.plan.verifications[0].inputFingerprint = digest; f.save();
  assert.equal(service.guarded(() => service.record(f.options)).findings[0].rule, 'SMALL_CHANGE_SCOPE');
});

test('baseline A16: Hook process keeps warn/off distinct from block without a host session ID', t => {
  const f = fixture(t);
  const hook = path.resolve(__dirname, '../check-openspec-governance.js');
  const payload = { cwd: f.root, tool_name: 'Edit', tool_input: { file_path: 'src/greet.js' } };
  for (const mode of ['warn', 'off', 'block']) {
    const output = spawnSync(process.execPath, [hook], { encoding: 'utf8', windowsHide: true,
      input: JSON.stringify(payload), env: { ...process.env, TEAM_STANDARDS_OPENSPEC_GOVERNANCE_HOOK: mode,
        TEAM_STANDARDS_GOVERNANCE_SESSION: 'explicit-task-id' } });
    assert.equal(output.status, mode === 'block' ? 2 : 0, output.stderr);
    if (mode !== 'off') assert.match(output.stderr, /BINDING_REQUIRED/);
    else assert.equal(output.stderr, '');
  }
});

test('bind → implement → record → delivery: clean committed changes remain checked and CI needs no local cache', t => {
  const f = fixture(t);
  assert.equal(service.bind(f.options).status, 'PASS');
  assert.equal(service.check({ ...f.options, phase: 'preflight' }).status, 'PASS');
  implement(f);
  assert.equal(service.guarded(() => service.check(f.options)).findings[0].rule, 'EVIDENCE_REQUIRED');
  const recorded = service.record(f.options);
  assert.equal(service.check(f.options).status, 'PASS');
  const base = runGit(f.root, ['rev-parse', 'HEAD']);
  runGit(f.root, ['add', '.']);
  runGit(f.root, ['commit', '-qm', 'implemented greeting']);
  assert.equal(service.check(f.options).status, 'PASS');
  const head = runGit(f.root, ['rev-parse', 'HEAD']);
  runGit(f.root, ['checkout', '--detach', head]);
  assert.equal(service.check({ repo: f.root, evidence: recorded.evidence, base, head }).status, 'PASS');
});

test('missing binding and transcript text never authorize implementation', t => {
  const f = fixture(t);
  const output = handle({ cwd: f.root, session_id: 'not-bound', tool_name: 'Edit',
    tool_input: { file_path: 'src/greet.js' }, transcript_path: 'mentions any complete change' });
  assert.equal(output.code, 2);
  assert.match(output.stderr, /BINDING_REQUIRED/);
});

test('dirty owned files are rejected; unrelated initial edits are retained', t => {
  const f = fixture(t);
  write(f.root, 'src/other.js', 'unrelated content');
  service.bind(f.options);
  implement(f);
  service.record(f.options);
  assert.equal(fs.readFileSync(path.join(f.root, 'src/other.js'), 'utf8'), 'unrelated content');
  write(f.root, 'src/other.js', 'changed by another task');
  assert.equal(service.guarded(() => service.check(f.options)).findings[0].rule, 'MIXED_CHANGES');
  const other = { ...f.options, session: 'session-b' };
  assert.equal(service.guarded(() => service.bind(other)).findings[0].rule, 'DIRTY_OWNERSHIP');
});

test('code, design and review changes invalidate only current evidence', t => {
  const f = fixture(t);
  service.bind(f.options);
  implement(f);
  service.record(f.options);
  write(f.root, 'src/greet.js', 'module.exports = () => "changed";');
  assert.equal(service.guarded(() => service.check(f.options)).findings[0].rule, 'CODE_STALE');
  assert.equal(service.guarded(() => service.record(f.options)).findings[0].rule, 'REVIEW_INPUTS_STALE');
  implement(f);
  service.record(f.options);
  fs.appendFileSync(path.join(f.root, changeDir, 'design.md'), '\nA different implementation decision.\n');
  assert.equal(service.guarded(() => service.check(f.options)).findings[0].rule, 'ARTIFACTS_STALE');
});

test('a view cannot cover unrelated source files or an empty design heading', t => {
  const f = fixture(t);
  f.plan.files.push('src/OrderRepository.java');
  f.save();
  assert.equal(service.guarded(() => service.bind(f.options)).findings[0].rule, 'VIEW_GAP');
  f.plan.files.pop();
  f.save();
  write(f.root, `${changeDir}/design.md`, '## Design\n\nTBD\n');
  assert.equal(service.guarded(() => service.bind(f.options)).findings[0].rule, 'REFERENCE_EMPTY');
});

test('partial slice may deliver, whole-change archive remains blocked', t => {
  const f = fixture(t);
  service.bind(f.options);
  implement(f);
  service.record(f.options);
  assert.equal(service.check(f.options).status, 'PASS');
  assert.equal(service.guarded(() => service.record({ ...f.options, phase: 'archive' })).findings[0].rule, 'CHANGE_INCOMPLETE');
});

test('failed verification and blocked handoff cannot produce delivery evidence', t => {
  const f = fixture(t);
  service.bind(f.options);
  implement(f);
  f.plan.verifications[0].result = 'FAIL';
  f.save();
  assert.equal(service.guarded(() => service.record(f.options)).status, 'NEEDS_WORK');
  f.plan.verifications[0].result = 'PASS';
  f.plan.handoff.blockers.push('business rule undecided');
  f.save();
  assert.equal(service.guarded(() => service.record(f.options)).findings[0].rule, 'SLICE_BLOCKED');
});

test('Stop repair budget survives plan updates and changing findings', t => {
  const f = fixture(t);
  service.bind(f.options);
  const payload = { cwd: f.root, session_id: f.options.session, hook_event_name: 'Stop' };
  assert.equal(handle(payload).json.decision, 'block');
  f.plan.handoff.nextTask = 'implement the same task';
  f.save();
  service.bind(f.options);
  assert.equal(handle(payload).json.decision, 'block');
  const last = handle(payload);
  assert.equal(last.json.decision, undefined);
  assert.match(last.json.systemMessage, /仍未完成/);
  assert.equal(service.guarded(() => service.check(f.options)).status, 'NEEDS_WORK');
});

test('unbound Stop and documentation repair remain non-blocking', t => {
  const f = fixture(t);
  assert.equal(handle({ cwd: f.root, session_id: 'unbound', hook_event_name: 'Stop' }).code, 0);
  assert.equal(handle({ cwd: f.root, tool_name: 'Write', tool_input: { file_path: `${changeDir}/design.md` } }).code, 0);
});

test('delete and rename check both source and destination scope', t => {
  const f = fixture(t);
  service.bind(f.options);
  const output = handle({ cwd: f.root, session_id: f.options.session, tool_name: 'apply_patch', tool_input: {
    command: '*** Begin Patch\n*** Update File: src/greet.js\n*** Move to: src/renamed.js\n@@\n-old\n+new\n*** End Patch' } });
  assert.equal(output.code, 2);
  assert.match(output.stderr, /SCOPE_GAP/);
  const deletion = handle({ cwd: f.root, session_id: f.options.session, tool_name: 'apply_patch', tool_input: {
    command: '*** Begin Patch\n*** Delete File: src/greet.js\n*** End Patch' } });
  assert.equal(deletion.code, 0);
});

test('CLI missing, malformed JSON and unsafe paths fail closed', t => {
  const f = fixture(t);
  assert.equal(service.guarded(() => service.bind({ ...f.options, cli: path.join(f.home, 'missing.js') })).status, 'CHECK_ERROR');
  fs.writeFileSync(f.options.cli, 'console.log("not json")');
  assert.equal(service.guarded(() => service.bind(f.options)).status, 'CHECK_ERROR');
  assert.throws(() => storage.safePath(f.root, '../outside'), /越界/);
  assert.throws(() => storage.safePath(f.root, f.home), /相对路径/);
});

test('concurrent binding lock cannot be treated as success', t => {
  const f = fixture(t);
  service.bind(f.options);
  const lock = `${storage.statePath(fs.realpathSync(f.root), f.options.session)}.lock`;
  fs.writeFileSync(lock, 'active');
  assert.equal(service.guarded(() => service.bind(f.options)).findings[0].rule, 'STATE_BUSY');
});

test('CLI emits one JSON result and nonzero exit on unresolved context', t => {
  const f = fixture(t);
  const output = spawnSync(process.execPath, [cliEntry, 'check', '--repo', f.root, '--session', 'missing'], { encoding: 'utf8' });
  assert.equal(output.status, 2);
  assert.equal(JSON.parse(output.stdout).status, 'CONTEXT_REQUIRED');
});

test('real OpenSpec CLI parses planning, selected tasks and strict validation', {
  skip: !process.env.OPENSPEC_TEST_CLI,
}, t => {
  const f = fixture(t, process.env.OPENSPEC_TEST_CLI);
  enrollBaseline(f);
  const context = require('../governance/openspec').loadContext(f.root, change, f.options);
  f.plan.taskIds = [context.tasks[0].id];
  f.plan.scenarios[0].taskIds = [...f.plan.taskIds];
  f.save();
  service.bind(f.options);
  implement(f);
  syncBaseline(f);
  service.record(f.options);
  assert.equal(service.check(f.options).status, 'PASS');
});


test('minimal plan delivers with existing design and a real raw test result, without validation Markdown', t => {
  const f = fixture(t);
  delete f.plan.dedup;
  delete f.plan.handoff;
  f.plan.review.reference = f.ref('design.md', '## Design');
  f.plan.verifications[0].reference = { path: `${changeDir}/test-result.log` };
  fs.unlinkSync(path.join(f.root, changeDir, 'validation.md'));
  f.save();
  service.bind(f.options);
  implement(f);
  const command = "require('node:assert/strict').equal(require('./src/greet'), undefined)";
  const success = "require('node:assert/strict').equal(require('./src/greet')(), 'hello'); console.log('greeting assertion passed')";
  const output = spawnSync(process.execPath, ['-e', success], { cwd: f.root, encoding: 'utf8', windowsHide: true });
  assert.equal(output.status, 0, output.stderr);
  f.plan.verifications[0].command = `node -e ${JSON.stringify(success)}`;
  write(f.root, `${changeDir}/test-result.log`, output.stdout);
  f.save();
  const recorded = service.record(f.options);
  assert.equal(service.check(f.options).status, 'PASS');
  assert.equal(recorded.policyVersion, 4);
  assert.equal(fs.existsSync(path.join(f.root, changeDir, 'validation.md')), false);
  // The recorded result cannot survive changes to its underlying raw evidence.
  write(f.root, `${changeDir}/test-result.log`, 'different execution result');
  assert.equal(service.guarded(() => service.check(f.options)).findings[0].rule, 'REVIEW_STALE');
  const failure = spawnSync(process.execPath, ['-e', command], { cwd: f.root, encoding: 'utf8', windowsHide: true });
  assert.notEqual(failure.status, 0);
  write(f.root, `${changeDir}/test-result.log`, failure.stderr);
  f.plan.verifications[0].result = 'FAIL';
  f.save();
  assert.equal(service.guarded(() => service.record(f.options)).status, 'NEEDS_WORK');
});

test('not-applicable views need a reason but no duplicate chapter; applicable views still require references', t => {
  const f = fixture(t);
  f.plan.views.push({ id: 'data', files: ['src/greet.js'], disposition: 'not-applicable', reason: 'No database access or persistence changes.' });
  f.save();
  assert.equal(service.bind(f.options).status, 'PASS');
  f.plan.views[1].reason = '';
  f.save();
  assert.equal(service.guarded(() => service.bind(f.options)).findings[0].rule, 'VIEW_INVALID');
  f.plan.views[1].reason = 'Changes persistence';
  f.plan.views[1].disposition = 'updated';
  f.save();
  assert.equal(service.guarded(() => service.bind(f.options)).findings[0].rule, 'REFERENCE_REQUIRED');
});

test('optional dedup and handoff accept inline facts but still reject blockers and malformed records', t => {
  const f = fixture(t);
  delete f.plan.dedup.reference;
  delete f.plan.handoff.reference;
  f.save();
  assert.equal(service.bind(f.options).status, 'PASS');
  f.plan.handoff.blockers = ['Unresolved business decision'];
  f.save();
  assert.equal(service.guarded(() => service.bind(f.options)).findings[0].rule, 'SLICE_BLOCKED');
  f.plan.handoff.blockers = [];
  f.plan.dedup = null;
  f.save();
  assert.equal(service.guarded(() => service.bind(f.options)).findings[0].rule, 'DEDUP_REQUIRED');
});

test('raw verification rejects empty files, unsafe paths and ambiguous supplied headings', t => {
  const f = fixture(t);
  const { reference } = require('../governance/evidence');
  write(f.root, `${changeDir}/empty.log`, '  \n');
  assert.throws(() => reference(f.root, { path: `${changeDir}/empty.log` }, true), /为空/);
  assert.throws(() => reference(f.root, { path: '../outside.log' }, true), /越界/);
  assert.throws(() => reference(f.root, { path: `${changeDir}/design.md`, heading: '' }, true), /唯一标题/);
  assert.throws(() => reference(f.root, { path: `${changeDir}/design.md` }), /唯一标题/);
});

test('policy migration preserves baseline, scope and retries without promoting old PASS evidence', t => {
  const f = fixture(t);
  service.bind(f.options);
  implement(f);
  service.record(f.options);
  const stateFile = storage.statePath(fs.realpathSync(f.root), f.options.session);
  const previous = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
  previous.policyVersion = 1;
  previous.retries = 2;
  fs.writeFileSync(stateFile, JSON.stringify(previous));
  assert.equal(service.guarded(() => service.check(f.options)).findings[0].rule, 'VERSION_MISMATCH');
  service.bind(f.options);
  const current = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
  assert.equal(current.base, previous.base);
  assert.deepEqual(current.initial, previous.initial);
  assert.deepEqual(current.plan.files, previous.plan.files);
  assert.equal(current.retries, 2);
  assert.equal(current.evidence, null);
  assert.equal(service.guarded(() => service.check(f.options)).findings[0].rule, 'EVIDENCE_REQUIRED');
  service.record(f.options);
  assert.equal(service.check(f.options).status, 'PASS');
  current.policyVersion = 99;
  fs.writeFileSync(stateFile, JSON.stringify(current));
  assert.equal(service.guarded(() => service.bind(f.options)).findings[0].rule, 'VERSION_MISMATCH');
});


test('archive records not-applicable promotion without duplicate prose and rejects missing applicable references', t => {
  const f = fixture(t);
  const { validatePlan } = require('../governance/evidence');
  const inputFingerprint = storage.hash(JSON.stringify(storage.fingerprints(f.root, f.plan.files)));
  f.plan.review.inputFingerprint = inputFingerprint;
  f.plan.verifications[0].inputFingerprint = inputFingerprint;
  f.plan.sync = { status: 'not-applicable', reason: 'No additional main spec synchronization in this unit fixture.',
    reference: f.ref('validation.md', '## Sync'), targets: [] };
  f.plan.promotion = [{ id: 'implementation', disposition: 'not-applicable', reason: 'Existing change design is sufficient; no separate long-term architecture document is needed.' }];
  const context = { tasks: [{ id: '1.1', done: true }, { id: '1.2', done: true }] };
  assert.doesNotThrow(() => validatePlan(f.root, f.plan, context, 'archive'));
  f.plan.promotion[0].disposition = 'updated';
  assert.throws(() => validatePlan(f.root, f.plan, context, 'archive'), /唯一标题/);
});


test('content integration: snapshot, slice sync, named review, stale references and downgrade guard', t => {
  const f = fixture(t);
  const registry = enrollBaseline(f);
  const contentFixture = require('./helpers/design-content').setup(f.root, changeDir + '/specs/greeting/spec.md');
  registry.modules[0] = contentFixture.module;
  contentFixture.module.content.functions[0].scenarios[0].verification = f.ref('validation.md', '## Verification');
  write(f.root, baselines.REGISTRY, JSON.stringify(registry));
  runGit(f.root, ['add', '.']); runGit(f.root, ['commit', '-qm', 'enroll content contract']);
  f.plan.functionImpacts = [{ module: 'greeting', id: 'GS-001', disposition: 'updated', reason: 'Change greeting result.', scenarioIds: ['greeting-requested'] }];
  f.save(); service.bind(f.options); implement(f); contentFixture.update();
  assert.equal(service.guarded(() => service.record(f.options)).findings[0].rule, 'CONTENT_REVIEW');
  f.plan.review.content = [{ module: 'greeting', result: 'PASS', reason: 'Agent reviewed business reading and design correctness.',
    inputFingerprint: service.snapshot(f.options).contentFingerprints.greeting }];
  f.save(); service.record(f.options);
  assert.equal(service.check(f.options).status, 'PASS');
  fs.appendFileSync(path.join(f.root, 'docs/current.md'), '\nAdditional business clarification changes the reviewed content.\n');
  assert.equal(service.guarded(() => service.record(f.options)).findings[0].rule, 'CONTENT_REVIEW');
  delete registry.modules[0].content; write(f.root, baselines.REGISTRY, JSON.stringify(registry));
  assert.equal(service.guarded(() => service.record(f.options)).findings[0].rule, 'SCOPE_GAP');
  assert.throws(() => baselines.validateBaselines(f.root, f.plan, { change }, 'delivery', runGit(f.root, ['rev-parse', 'HEAD']), () => {}),
    { rule: 'CONTENT_DOWNGRADE' });
});
