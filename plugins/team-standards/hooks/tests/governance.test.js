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
const repoApi = require('../governance/repository');

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

function useLegacyForgeProtocol(t) {
  // These cases exercise local bindings, independent of an installed Forge v2 host.
  const previous = process.env.FORGE_EXECUTION_PROTOCOL;
  process.env.FORGE_EXECUTION_PROTOCOL = '1';
  t.after(() => {
    if (previous === undefined) delete process.env.FORGE_EXECUTION_PROTOCOL;
    else process.env.FORGE_EXECUTION_PROTOCOL = previous;
  });
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
  useLegacyForgeProtocol(t);
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
  useLegacyForgeProtocol(t);
  const f = fixture(t);
  const output = handle({ cwd: f.root, session_id: 'not-bound', tool_name: 'Edit',
    tool_input: { file_path: 'src/greet.js' }, transcript_path: 'mentions any complete change' });
  assert.equal(output.code, 2);
  assert.match(output.stderr, /BINDING_REQUIRED/);
});

test('dirty owned files are rejected; unrelated initial edits are retained', t => {
  const f = fixture(t);
  write(f.root, 'src/other.js', 'baseline');
  runGit(f.root, ['add', 'src/other.js']);
  runGit(f.root, ['commit', '-qm', 'track unrelated source']);
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
  useLegacyForgeProtocol(t);
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
  assert.equal(recorded.policyVersion, 5);
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

test('unrelated untracked junction does not block, explicit input still fails', t => {
  const f = fixture(t);
  const external = path.join(f.home, 'external-dependencies');
  fs.mkdirSync(external);
  fs.writeFileSync(path.join(external, '.modules.yaml'), 'outside: true\n');
  const junction = path.join(f.root, '.codex-work', 'node_modules');
  fs.mkdirSync(path.dirname(junction), { recursive: true });
  try { fs.symlinkSync(external, junction, process.platform === 'win32' ? 'junction' : 'dir'); }
  catch (error) {
    if (['EPERM', 'EACCES'].includes(error.code)) return t.skip('directory links unavailable');
    throw error;
  }
  const linked = '.codex-work/node_modules/.modules.yaml';
  assert.match(runGit(f.root, ['ls-files', '--others', '--exclude-standard']), /\.modules\.yaml/);
  assert.ok(!repoApi.changedFiles(f.root, runGit(f.root, ['rev-parse', 'HEAD'])).includes(linked));
  assert.equal(service.guarded(() => service.bind(f.options)).status, 'PASS');
  assert.throws(() => storage.fingerprints(f.root, [linked]), error => error.rule === 'PATH_SYMLINK');
  write(f.root, '.gitignore', '.codex-work/\n');
  assert.equal(runGit(f.root, ['ls-files', '--others', '--exclude-standard']).includes('.modules.yaml'), false);
  assert.throws(() => storage.fingerprints(f.root, [linked]), error => error.rule === 'PATH_SYMLINK');
});

test('large unrelated untracked cache stays outside preparation and task baseline', t => {
  const f = fixture(t);
  const cache = path.join(f.root, '.codex-work', 'dependencies');
  fs.mkdirSync(cache, { recursive: true });
  for (let i = 0; i < 1002; i++) fs.writeFileSync(path.join(cache, `generated-${i}.js`), 'generated');
  const prepare = require('../governance/design-preparation');
  const prepared = prepare.prepare({ root: f.root, session: f.options.session });
  assert.deepEqual(prepared.preparation.initialDirty, []);
  assert.equal(service.guarded(() => service.bind(f.options)).status, 'PASS');
  assert.equal(service.guarded(() => service.check({ ...f.options, phase: 'preflight' })).status, 'PASS');
});

test('preexisting untracked task input still cannot be claimed by a new binding', t => {
  const f = fixture(t);
  const file = 'src/new.js';
  write(f.root, file, 'existing work');
  f.plan.files = [file];
  f.plan.views[0].files = [file];
  f.plan.scenarios[0].files = [file];
  f.save();
  assert.equal(service.guarded(() => service.bind(f.options)).findings[0].rule, 'DIRTY_OWNERSHIP');
});

test('staged external symlink remains a hard failure', t => {
  const f = fixture(t);
  const external = path.join(f.home, 'external-dependencies');
  fs.mkdirSync(external);
  const linked = 'src/deps/external.txt';
  fs.writeFileSync(path.join(external, 'external.txt'), 'outside');
  try { fs.symlinkSync(external, path.join(f.root, 'src', 'deps'), process.platform === 'win32' ? 'junction' : 'dir'); }
  catch (error) {
    if (['EPERM', 'EACCES'].includes(error.code)) return t.skip('directory links unavailable');
    throw error;
  }
  const blob = runGit(f.root, ['hash-object', '-w', path.join(external, 'external.txt')]);
  runGit(f.root, ['update-index', '--add', '--cacheinfo', `100644,${blob},${linked}`]);
  assert.throws(() => repoApi.changedFiles(f.root, runGit(f.root, ['rev-parse', 'HEAD'])),
    error => error.rule === 'PATH_SYMLINK');
});

test('in-repo linked input fingerprint changes with its target', t => {
  const f = fixture(t);
  const target = path.join(f.root, 'shared');
  fs.mkdirSync(target);
  fs.writeFileSync(path.join(target, 'input.txt'), 'before');
  const linked = path.join(f.root, 'src', 'shared-link');
  try { fs.symlinkSync(target, linked, process.platform === 'win32' ? 'junction' : 'dir'); }
  catch (error) {
    if (['EPERM', 'EACCES'].includes(error.code)) return t.skip('directory links unavailable');
    throw error;
  }
  const file = 'src/shared-link/input.txt';
  const before = storage.fingerprint(f.root, file);
  fs.writeFileSync(path.join(target, 'input.txt'), 'after');
  assert.notEqual(storage.fingerprint(f.root, file), before);
});

test('automatic preparation feeds governance bind and delivery without a user-authored registry', t => {
  const f = fixture(t);
  write(f.root, 'docs/other.md', '# Other task baseline\n');
  runGit(f.root, ['add', 'docs/other.md']); runGit(f.root, ['commit', '-qm', 'other task baseline']);
  write(f.root, 'docs/other.md', '# Other task\n');
  const prepare = require('../governance/design-preparation');
  prepare.prepare({ root: f.root, session: f.options.session, module: 'greeting' });
  const docs = require('./helpers/design-content').setup(f.root, changeDir + '/specs/greeting/spec.md');
  docs.module.content.functions[0].scenarios[0].verification = f.ref('validation.md', '## Verification');
  const contentFile = path.join(f.home, 'content.json');
  fs.writeFileSync(contentFile, JSON.stringify(docs.module.content));
  prepare.upsert({ root: f.root, session: f.options.session, module: 'greeting', scopes: ['src/'], capabilities: ['greeting'],
    owner: 'fixture owner', overview: 'docs/current.md', overviewHeading: '## Overview', detailed: 'docs/current.md', detailedHeading: '## Detailed',
    codeVersion: 'planned slice, not deployed', content: contentFile });
  f.plan.files.push(baselines.REGISTRY); f.plan.views[0].files.push(baselines.REGISTRY); f.plan.scenarios[0].files.push(baselines.REGISTRY);
  f.plan.baselines = ['overview', 'detailed'].map(id => ({ module: 'greeting', id, disposition: 'updated', reason: 'New baseline for this accepted slice.',
    reference: docs.module[id], implemented: true, codeVersion: 'verified fixture slice' }));
  f.plan.dedup = { ...f.plan.dedup, selection: 'new', originalGoal: 'Greeting behavior', acceptanceBoundary: 'Return hello', stage: 'design' };
  f.plan.sync = { status: 'not-applicable', reason: 'Internal fixture slice, not a published capability.', reference: f.ref('validation.md', '## Sync'), targets: [] };
  f.plan.functionImpacts = [{ module: 'greeting', id: 'GS-001', disposition: 'added', reason: 'First accepted function.', scenarioIds: ['greeting-requested'] }];
  f.save(); assert.equal(service.bind(f.options).status, 'PASS');
  implement(f); docs.update();
  f.plan.review.content = [{ module: 'greeting', result: 'PASS', reason: 'Named fixture content review.', inputFingerprint: service.snapshot(f.options).contentFingerprints.greeting }];
  f.save(); const recorded = service.record(f.options); assert.equal(service.check(f.options).status, 'PASS');
  const base = runGit(f.root, ['rev-parse', 'HEAD']);
  runGit(f.root, ['add', '.']); runGit(f.root, ['reset', '-q', '--', 'docs/evidence.md', 'docs/other.md']);
  runGit(f.root, ['commit', '-qm', 'verified automatic preparation']);
  const head = runGit(f.root, ['rev-parse', 'HEAD']);
  assert.throws(() => prepare.prepare({ root: f.root, session: f.options.session }), { rule: 'DESIGN_PREPARATION_STALE' });
  const files = repoApi.changedFiles(f.root, base, head);
  runGit(f.root, ['checkout', '-qb', 'other-branch']);
  assert.throws(() => prepare.resume({ root: f.root, session: f.options.session, change: f.options.change, files }),
    { rule: 'DESIGN_PREPARATION_STALE' });
  runGit(f.root, ['checkout', '-q', 'main']);
  write(f.root, 'unrelated.txt', 'another task\n');
  runGit(f.root, ['add', 'unrelated.txt']); runGit(f.root, ['commit', '-qm', 'unrelated commit']);
  assert.throws(() => prepare.resume({ root: f.root, session: f.options.session, change: f.options.change, files }),
    { rule: 'DESIGN_RESUME_SCOPE' });
  runGit(f.root, ['reset', '--hard', head]);
  write(f.root, 'src/greet.js', 'module.exports = () => "mixed";\n');
  assert.throws(() => prepare.resume({ root: f.root, session: f.options.session, change: f.options.change, files }),
    { rule: 'DESIGN_RESUME_EVIDENCE' });
  runGit(f.root, ['checkout', '--', 'src/greet.js']);
  const evidenceFile = path.join(f.root, recorded.evidence);
  const staleEvidence = JSON.parse(fs.readFileSync(evidenceFile, 'utf8'));
  staleEvidence.inputs['src/greet.js'] = 'expired';
  fs.writeFileSync(evidenceFile, JSON.stringify(staleEvidence));
  assert.throws(() => prepare.resume({ root: f.root, session: f.options.session, change: f.options.change, files }),
    { rule: 'DESIGN_RESUME_EVIDENCE' });
  runGit(f.root, ['checkout', '--', recorded.evidence]);
  write(f.root, 'docs/other.md', '# Other task changed\n');
  assert.throws(() => prepare.resume({ root: f.root, session: f.options.session, change: f.options.change, files }),
    { rule: 'DESIGN_INITIAL_CHANGED' });
  write(f.root, 'docs/other.md', '# Other task\n');
  const resumed = prepare.resume({ root: f.root, session: f.options.session, change: f.options.change, files });
  assert.equal(resumed.origin, base);
  assert.equal(resumed.base, head);
  assert.equal(prepare.prepare({ root: f.root, session: f.options.session }).preparation.base, head);
  assert.equal(service.bind(f.options).base, head);
  assert.equal(service.check({ ...f.options, phase: 'preflight' }).status, 'PASS');
});

test('unbound preparation recovers only with current review and verification', t => {
  const f = fixture(t);
  const preparation = require('../governance/design-preparation');
  write(f.root, 'docs/other.md', '# Other task baseline\n');
  runGit(f.root, ['add', 'docs/other.md']); runGit(f.root, ['commit', '-qm', 'other baseline']);
  write(f.root, 'docs/other.md', '# Other task pending\n');
  preparation.prepare({ root: f.root, session: f.options.session });
  const legacyBinding = storage.statePath(f.root, f.options.session);
  const legacyPreparation = path.join(path.dirname(legacyBinding), 'design-preparation', path.basename(legacyBinding));
  const legacy = JSON.parse(fs.readFileSync(legacyPreparation, 'utf8'));
  delete legacy.origin;
  fs.writeFileSync(legacyPreparation, JSON.stringify(legacy));
  const base = runGit(f.root, ['rev-parse', 'HEAD']);
  write(f.root, 'src/greet.js', 'module.exports = () => "hello";\n');
  const taskFile = path.join(f.root, changeDir, 'tasks.md');
  fs.writeFileSync(taskFile, fs.readFileSync(taskFile, 'utf8').replace('[ ] 1.1', '[x] 1.1'));
  const digest = storage.hash(JSON.stringify(storage.fingerprints(f.root, f.plan.files)));
  f.plan.review.inputFingerprint = digest;
  f.plan.verifications[0].inputFingerprint = digest;
  f.save();
  runGit(f.root, ['add', 'src/greet.js', `${changeDir}/tasks.md`]);
  runGit(f.root, ['commit', '-qm', 'verified greeting implementation']);
  write(f.root, 'unrelated.txt', 'separate committed task\n');
  runGit(f.root, ['add', 'unrelated.txt']);
  runGit(f.root, ['commit', '-qm', 'separate task']);
  const head = runGit(f.root, ['rev-parse', 'HEAD']);
  const files = repoApi.changedFiles(f.root, base, head);
  const options = { root: f.root, session: f.options.session, change, files,
    ownedFiles: ['src/greet.js'], plan: f.options.plan, cli: f.options.cli };
  const stateFile = storage.statePath(f.root, f.options.session);
  const preparationFile = path.join(path.dirname(stateFile), 'design-preparation', path.basename(stateFile));
  const original = fs.readFileSync(preparationFile);
  assert.throws(() => preparation.recover({ ...options, session: 'made-up' }), { rule: 'DESIGN_PREPARATION_REQUIRED' });
  assert.throws(() => preparation.recover({ ...options, files: files.slice(1) }), { rule: 'DESIGN_RESUME_SCOPE' });
  assert.throws(() => preparation.recover({ ...options, ownedFiles: [...options.ownedFiles, 'docs/other.md'] }),
    { rule: 'DESIGN_RECOVERY_OWNERSHIP' });
  runGit(f.root, ['checkout', '-qb', 'other-branch']);
  assert.throws(() => preparation.recover(options), { rule: 'DESIGN_PREPARATION_STALE' });
  runGit(f.root, ['checkout', '-q', 'main']);
  write(f.root, 'src/greet.js', 'module.exports = () => "mixed";\n');
  assert.throws(() => preparation.recover(options), { rule: 'REVIEW_INPUTS_STALE' });
  runGit(f.root, ['checkout', '--', 'src/greet.js']);
  f.plan.review.inputFingerprint = 'expired'; f.save();
  assert.throws(() => preparation.recover(options), { rule: 'REVIEW_INPUTS_STALE' });
  f.plan.review.inputFingerprint = digest; f.save();
  assert.deepEqual(fs.readFileSync(preparationFile), original);
  const recovered = preparation.recover(options);
  assert.equal(recovered.origin, base);
  assert.equal(recovered.base, head);
  assert.equal(recovered.committedFiles, 3);
  const audit = JSON.parse(fs.readFileSync(preparationFile, 'utf8'));
  assert.equal(audit.origin, base);
  assert.ok(Object.hasOwn(audit.originInitial, 'docs/other.md'));
  assert.equal(audit.checkpoints.at(-1).kind, 'unbound-recovery');
  assert.equal(fs.existsSync(stateFile), false);
  assert.equal(service.bind(f.options).status, 'PASS');
  assert.equal(service.check({ ...f.options, phase: 'preflight' }).status, 'PASS');
  assert.equal(fs.readFileSync(path.join(f.root, 'docs/other.md'), 'utf8'), '# Other task pending\n');
});

function writerFixture(t, enrolled = false) {
  const f = fixture(t);
  const preparation = require('../governance/design-preparation');
  const registry = enrolled ? enrollBaseline(f) : null;
  write(f.root, 'other/task.js', 'original other task\n');
  runGit(f.root, ['add', 'other/task.js']); runGit(f.root, ['commit', '-qm', 'other task baseline']);
  write(f.root, 'other/task.js', 'uncommitted other task\n');
  write(f.root, 'src/greet.js', 'module.exports = () => "work in progress";\n');
  write(f.root, 'src/new.js', 'module.exports = "untracked writer file";\n');
  f.plan.files.push('src/new.js'); f.plan.views[0].files.push('src/new.js'); f.plan.scenarios[0].files.push('src/new.js');
  if (enrolled) {
    syncBaseline(f);
    f.plan.files.push('docs/current.md'); f.plan.views[0].files.push('docs/current.md'); f.plan.scenarios[0].files.push('docs/current.md');
    registry.modules.push({ ...registry.modules[0], id: 'other-module', scopes: ['unrelated/'] });
    registry.managed.push('unrelated/');
    write(f.root, baselines.REGISTRY, JSON.stringify(registry));
  }
  f.save();
  f.plan.review.inputFingerprint = service.snapshot({ ...f.options, phase: 'preflight' }).inputFingerprint;
  f.plan.verifications = []; f.save();
  const options = { ...f.options, root: f.root, ownedFiles: [...f.plan.files] };
  preparation.prepare(options);
  const repo = repoApi.repository(f.root);
  const execution = { executionId: 'real-writer', taskId: '1.1', changeId: change,
    ownsWriter: true, state: 'BOUND', branch: repo.branch, files: [...f.plan.files] };
  const writer = { executionId: execution.executionId, ownerSessionId: options.session,
    assignedBranch: repo.branch, baselineHead: repo.head, scopes: [`change:${change}`],
    scopedPaths: [...execution.files, changeDir], scopeFingerprint: 'live-writer-scope' };
  const session = { protocolVersion: 2, project: repo.root, sessionId: options.session, branch: repo.branch, execution };
  const workspace = { project: repo.root, branch: repo.branch, head: repo.head, writers: [writer] };
  const client = require('../forge/client');
  t.mock.method(client, 'runtime', () => ({ protocolVersion: 2 }));
  t.mock.method(client, 'callForge', (config, name) => ({ status: 0,
    response: name === 'session_init' ? session : workspace }));
  const bindingFile = storage.statePath(repo.root, options.session);
  const preparationFile = path.join(path.dirname(bindingFile), 'design-preparation', path.basename(bindingFile));
  return { ...f, options, repo, execution, writer, session, workspace, preparation, preparationFile, bindingFile,
    recover: () => preparation.recoverWriter(options) };
}

test('writer recovery binds dirty work without commits or completed tasks and never creates delivery evidence', t => {
  const f = writerFixture(t);
  const before = runGit(f.root, ['diff']);
  assert.throws(() => service.bind(f.options), { rule: 'DESIGN_EARLY_CODE' });
  const recovered = f.recover();
  assert.equal(recovered.phase, 'preflight'); assert.equal(recovered.base, f.repo.head);
  const audit = storage.readJson(f.preparationFile);
  assert.equal(audit.origin, f.repo.head);
  assert.equal(audit.checkpoints.at(-1).kind, 'writer-recovery');
  assert.deepEqual(audit.checkpoints.at(-1).commits, []);
  assert.ok(Object.hasOwn(audit.originInitial, 'src/greet.js'));
  assert.ok(Object.hasOwn(audit.initial, 'other/task.js'));
  assert.equal(service.bind(f.options).status, 'PASS');
  assert.equal(service.check({ ...f.options, phase: 'preflight' }).status, 'PASS');
  assert.equal(storage.readJson(f.bindingFile).evidence, null);
  assert.throws(() => service.check(f.options), { rule: 'EVIDENCE_REQUIRED' });
  assert.throws(() => service.record(f.options), { rule: 'VERIFICATION_GAP' });
  assert.match(fs.readFileSync(path.join(f.root, changeDir, 'tasks.md'), 'utf8'), /\[ \] 1.1/);
  assert.equal(runGit(f.root, ['diff']), before);
  write(f.root, 'other/task.js', 'other task changed after bind');
  assert.throws(() => service.check({ ...f.options, phase: 'preflight' }), { rule: 'MIXED_CHANGES' });
});

for (const [name, mutate, rule] of [
  ['fabricated session', f => { f.options.session = 'made-up'; }, 'DESIGN_PREPARATION_REQUIRED'],
  ['wrong writer owner', f => { f.writer.ownerSessionId = 'another-session'; }, 'DESIGN_WRITER_IDENTITY'],
  ['wrong change', f => { f.execution.changeId = 'another-change'; }, 'DESIGN_WRITER_IDENTITY'],
  ['branch drift', f => { runGit(f.root, ['checkout', '-qb', 'other-branch']); }, 'DESIGN_PREPARATION_STALE'],
  ['missing writer', f => { f.workspace.writers = []; }, 'DESIGN_WRITER_IDENTITY'],
  ['omitted dirty file', f => { f.execution.files.push('src/omitted.js'); f.writer.scopedPaths.push('src/omitted.js');
    write(f.root, 'src/omitted.js', 'untracked omitted file'); }, 'DESIGN_WRITER_SCOPE'],
  ['foreign file', f => { f.options.ownedFiles.push('other/task.js'); }, 'DESIGN_WRITER_SCOPE'],
  ['overlapping writer', f => { f.workspace.writers.push({ executionId: 'other', scopedPaths: ['src/new.js'] }); }, 'DESIGN_WRITER_MIXED'],
  ['stale review', f => { f.plan.review.inputFingerprint = 'expired'; f.save(); }, 'REVIEW_INPUTS_STALE'],
  ['unrelated commit', f => { write(f.root, 'unrelated.txt', 'another task'); runGit(f.root, ['add', 'unrelated.txt']);
    runGit(f.root, ['commit', '-qm', 'other commit']); f.workspace.head = repoApi.repository(f.root).head;
    f.options.files = ['unrelated.txt']; }, 'DESIGN_WRITER_SCOPE'],
]) {
  test(`writer recovery rejects ${name} and preserves preparation`, t => {
    const f = writerFixture(t); const original = fs.readFileSync(f.preparationFile);
    mutate(f);
    assert.throws(f.recover, { rule });
    assert.deepEqual(fs.readFileSync(f.preparationFile), original);
    assert.equal(fs.existsSync(f.bindingFile), false);
  });
}

for (const [name, mutate] of [
  ['writer reassignment', f => { f.writer.ownerSessionId = 'another-session'; }],
  ['owned input', f => { write(f.root, 'src/new.js', 'changed after recovery'); }],
  ['index', f => { runGit(f.root, ['add', 'src/new.js']); }],
  ['external input', f => { write(f.root, 'other/task.js', 'changed after recovery'); }],
  ['design reference', f => { fs.appendFileSync(path.join(f.root, changeDir, 'design.md'), '\nDesign changed after review.'); }],
]) {
  test(`writer recovery rechecks ${name} before binding`, t => {
    const f = writerFixture(t); f.recover(); const original = fs.readFileSync(f.preparationFile);
    mutate(f);
    assert.throws(() => service.bind(f.options), error => ['DESIGN_RECOVERY_STALE', 'DESIGN_WRITER_IDENTITY'].includes(error.rule));
    assert.equal(fs.existsSync(f.bindingFile), false);
    assert.deepEqual(fs.readFileSync(f.preparationFile), original);
  });
}

test('writer recovery requires a live Forge v2 response', t => {
  const f = writerFixture(t);
  t.mock.method(require('../forge/client'), 'runtime', () => ({ protocolVersion: 1 }));
  assert.throws(f.recover, { rule: 'DESIGN_WRITER_REQUIRED' });
});

test('writer recovery keeps unrelated registry edits and binds current design sections', t => {
  const f = writerFixture(t, true);
  const registry = fs.readFileSync(path.join(f.root, baselines.REGISTRY));
  f.recover();
  assert.equal(service.bind(f.options).status, 'PASS');
  assert.equal(service.check({ ...f.options, phase: 'preflight' }).status, 'PASS');
  assert.deepEqual(fs.readFileSync(path.join(f.root, baselines.REGISTRY)), registry);
  assert.deepEqual(storage.readJson(f.preparationFile).ownedModules, ['greeting']);
});

test('writer recovery refuses existing edits to the target registry module', t => {
  const f = writerFixture(t, true);
  const original = fs.readFileSync(f.preparationFile);
  const registry = storage.readJson(path.join(f.root, baselines.REGISTRY));
  registry.modules[0].owner = 'another owner';
  write(f.root, baselines.REGISTRY, JSON.stringify(registry));
  assert.throws(f.recover, { rule: 'DESIGN_DIRTY_REGISTRY' });
  assert.deepEqual(fs.readFileSync(f.preparationFile), original);
});

test('writer recovery refuses a writer change during recovery without replacing original records', t => {
  const f = writerFixture(t);
  const original = fs.readFileSync(f.preparationFile);
  let reads = 0;
  t.mock.method(require('../forge/client'), 'callForge', (config, name) => {
    if (name === 'inspect_execution_writer' && ++reads === 2) f.writer.ownerSessionId = 'reassigned';
    return { status: 0, response: name === 'session_init' ? f.session : f.workspace };
  });
  assert.throws(f.recover, { rule: 'DESIGN_WRITER_IDENTITY' });
  assert.deepEqual(fs.readFileSync(f.preparationFile), original);
});

test('recover-writer CLI uses the current change namespace and preserves the old preparation', t => {
  const f = writerFixture(t);
  const original = fs.readFileSync(f.preparationFile);
  const run = require('../../skills/init-project-docs/scripts/design-baseline').run;
  run(['prepare', '--root', f.root, '--session', f.options.session]);
  const args = ['recover-writer', '--root', f.root, '--session', f.options.session,
    '--change', change, '--plan', f.options.plan, '--cli', f.options.cli];
  f.options.ownedFiles.forEach(file => args.push('--owned-file', file));
  assert.equal(run(args).phase, 'preflight');
  assert.deepEqual(fs.readFileSync(f.preparationFile), original);
  require('../governance/binding-context').withBindingContext(f.options, options => {
    assert.equal(service.bind(options).status, 'PASS');
    assert.equal(service.check({ ...options, phase: 'preflight' }).status, 'PASS');
  });
});

test('writer recovery maps the real checklist key to the unique OpenSpec apply ordinal', t => {
  const f = writerFixture(t);
  const cli = fs.readFileSync(f.options.cli, 'utf8').replace("{id:'1.1',done:", "{id:'1',description:'1.1 Return greeting',done:");
  fs.writeFileSync(f.options.cli, cli);
  f.plan.taskIds = ['1']; f.plan.scenarios.forEach(scenario => { scenario.taskIds = ['1']; }); f.save();
  assert.equal(f.recover().phase, 'preflight');
  assert.equal(service.bind(f.options).status, 'PASS');
  assert.equal(service.check({ ...f.options, phase: 'preflight' }).status, 'PASS');
  assert.match(fs.readFileSync(path.join(f.root, changeDir, 'tasks.md'), 'utf8'), /\[ \] 1.1/);
});

test('writer recovery rejects a plan for a different current task', t => {
  const f = writerFixture(t); f.execution.taskId = '1.2';
  assert.throws(f.recover, { rule: 'DESIGN_WRITER_TASK' });
});

test('canonical evidence output records repeatedly without self hashing and keeps source freshness', t => {
  const f = fixture(t); const output = `${changeDir}/governance-evidence.json`;
  f.plan.files.push(output); f.plan.views[0].files.push(output); f.plan.scenarios[0].files.push(output); f.save();
  service.bind(f.options); implement(f);
  const snapshot = service.snapshot(f.options);
  assert.deepEqual(snapshot.excludedOutputs, [output]);
  assert.equal(Object.hasOwn(snapshot.inputs, output), false);
  service.record(f.options); assert.equal(service.check(f.options).status, 'PASS');
  assert.equal(service.snapshot(f.options).inputFingerprint, snapshot.inputFingerprint);
  service.record(f.options); assert.equal(service.check(f.options).status, 'PASS');
  assert.ok(storage.readJson(storage.statePath(f.root, f.options.session)).plan.files.includes(output));
  write(f.root, 'src/greet.js', 'changed source');
  assert.throws(() => service.check(f.options), { rule: 'CODE_STALE' });
});

test('canonical evidence exclusion never ignores another JSON or accepts itself as a reference', t => {
  const f = fixture(t); const other = `${changeDir}/verification.json`;
  write(f.root, other, '{}'); runGit(f.root, ['add', other]); runGit(f.root, ['commit', '-qm', 'verification input']);
  f.plan.files.push(other); f.plan.views[0].files.push(other); f.plan.scenarios[0].files.push(other); f.save();
  service.bind(f.options); implement(f); service.record(f.options);
  assert.ok(Object.hasOwn(service.snapshot(f.options).inputs, other));
  write(f.root, other, '{"changed":true}');
  assert.throws(() => service.check(f.options), { rule: 'CODE_STALE' });
  f.plan.review.reference = { path: `${changeDir}/governance-evidence.json`, heading: '#' };
  f.save();
  assert.notEqual(service.guarded(() => service.bind(f.options)).status, 'PASS');
});

function boundWriterFixture(t) {
  const f = writerFixture(t); f.recover(); service.bind(f.options);
  runGit(f.root, ['add', 'src/greet.js', 'src/new.js']); runGit(f.root, ['commit', '-qm', 'previous implemented slice']);
  f.workspace.head = repoApi.repository(f.root).head;
  write(f.root, 'src/greet.js', 'current incomplete slice');
  f.options.files = ['src/greet.js', 'src/new.js'];
  f.plan.review.inputFingerprint = service.snapshot({ ...f.options, files: undefined, phase: 'preflight' }).inputFingerprint; f.save();
  return { ...f, resume: () => f.preparation.resumeWriter(f.options) };
}

test('bound writer recovery resumes unfinished work without delivery and preserves old binding until bind', t => {
  const f = boundWriterFixture(t); const old = fs.readFileSync(f.bindingFile);
  assert.throws(() => f.preparation.resume(f.options), { rule: 'DESIGN_RESUME_EVIDENCE' });
  assert.throws(f.recover, { rule: 'DESIGN_RECOVERY_BOUND' });
  f.resume(); assert.deepEqual(fs.readFileSync(f.bindingFile), old);
  const audit = storage.readJson(f.preparationFile);
  assert.equal(audit.origin, f.repo.head);
  assert.deepEqual(audit.recovery.previousBinding, JSON.parse(old));
  assert.equal(audit.recovery.previousBinding.evidence, null);
  assert.equal(service.bind(f.options).base, f.workspace.head);
  assert.equal(service.check({ ...f.options, phase: 'preflight' }).status, 'PASS');
  assert.equal(service.bind(f.options).base, f.workspace.head);
  assert.equal(storage.readJson(f.bindingFile).evidence, null);
  assert.throws(() => service.check(f.options), { rule: 'EVIDENCE_REQUIRED' });
  assert.match(fs.readFileSync(path.join(f.root, changeDir, 'tasks.md'), 'utf8'), /\[ \] 1.1/);
});

test('bound writer recovery retries a pending checkpoint and retains clean historical files', t => {
  const f = boundWriterFixture(t);
  f.execution.files = ['src/greet.js']; f.writer.scopedPaths = ['src/greet.js', changeDir];
  f.resume(); f.resume();
  assert.equal(service.bind(f.options).status, 'PASS');
  assert.ok(storage.readJson(f.bindingFile).plan.files.includes('src/new.js'));
});

for (const [name, mutate, rule] of [
  ['scope shrink', f => { f.plan.files.pop(); f.save(); }, 'SCOPE_SHRINK'],
  ['wrong change', f => { f.options.change = 'other-change'; }, 'DESIGN_RESUME_BINDING'],
  ['branch drift', f => { runGit(f.root, ['checkout', '-qb', 'other']); }, 'DESIGN_PREPARATION_STALE'],
  ['stale review', f => { write(f.root, 'src/greet.js', 'unreviewed'); }, 'REVIEW_INPUTS_STALE'],
  ['dirty historical file outside current writer', f => { f.execution.files = ['src/new.js'];
    f.writer.scopedPaths = ['src/new.js', changeDir]; }, 'DESIGN_WRITER_SCOPE'],
]) {
  test(`bound writer recovery rejects ${name} without changing either record`, t => {
    const f = boundWriterFixture(t); const preparation = fs.readFileSync(f.preparationFile); const binding = fs.readFileSync(f.bindingFile);
    mutate(f); assert.throws(f.resume, { rule });
    assert.deepEqual(fs.readFileSync(f.preparationFile), preparation);
    assert.deepEqual(fs.readFileSync(f.bindingFile), binding);
  });
}

test('bound writer recovery refuses changed binding before checkpoint adoption', t => {
  const f = boundWriterFixture(t); f.resume();
  const current = storage.readJson(f.bindingFile); current.retries++;
  write(path.dirname(f.bindingFile), path.basename(f.bindingFile), JSON.stringify(current));
  assert.throws(() => service.bind(f.options), { rule: 'DESIGN_RECOVERY_STALE' });
  assert.equal(storage.readJson(f.bindingFile).base, f.repo.head);
});

test('bound writer recovery permits formal upsert then reviewed adoption of a shared registry', t => {
  const f = writerFixture(t, true); f.recover(); service.bind(f.options);
  f.execution.files.push(baselines.REGISTRY); f.writer.scopedPaths.push(baselines.REGISTRY);
  runGit(f.root, ['add', 'src/greet.js', 'src/new.js']); runGit(f.root, ['commit', '-qm', 'previous slice']);
  f.workspace.head = repoApi.repository(f.root).head; f.options.files = ['src/greet.js', 'src/new.js'];
  const other = storage.readJson(path.join(f.root, baselines.REGISTRY)).modules[1];
  f.preparation.resumeWriter(f.options);
  f.preparation.upsert({ root: f.root, session: f.options.session, module: 'greeting', codeVersion: 'current reviewed slice',
    migrationReason: 'Current slice is reviewed; legacy content mapping remains explicit.', migrationDue: 'before module delivery' });
  f.plan.files.push(baselines.REGISTRY); f.plan.views[0].files.push(baselines.REGISTRY); f.plan.scenarios[0].files.push(baselines.REGISTRY);
  f.options.ownedFiles.push(baselines.REGISTRY); f.save();
  f.plan.review.inputFingerprint = service.snapshot({ ...f.options, files: undefined, phase: 'preflight' }).inputFingerprint; f.save();
  f.preparation.resumeWriter(f.options);
  assert.equal(service.bind(f.options).status, 'PASS');
  assert.equal(service.check({ ...f.options, phase: 'preflight' }).status, 'PASS');
  assert.deepEqual(storage.readJson(path.join(f.root, baselines.REGISTRY)).modules[1], other);
});

function commitExternal(f, file = 'other/task.js') {
  runGit(f.root, ['add', file]); runGit(f.root, ['commit', '-qm', 'independent task']);
  f.workspace.head = repoApi.repository(f.root).head;
  f.options.externalCommits = [f.workspace.head];
}

test('writer external commit is explicitly audited through CLI without claiming it or completing tasks', t => {
  const f = writerFixture(t);
  const run = require('../../skills/init-project-docs/scripts/design-baseline').run;
  run(['prepare', '--root', f.root, '--session', f.options.session]);
  commitExternal(f);
  const args = ['recover-writer', '--root', f.root, '--session', f.options.session, '--change', change,
    '--plan', f.options.plan, '--cli', f.options.cli, '--external-commit', f.workspace.head];
  f.options.ownedFiles.forEach(file => args.push('--owned-file', file));
  assert.equal(run(args).base, f.workspace.head);
  require('../governance/binding-context').withBindingContext(f.options, options => {
    const binding = storage.statePath(f.repo.root, options.session);
    const audit = storage.readJson(path.join(path.dirname(binding), 'design-preparation', path.basename(binding)));
    assert.equal(audit.origin, f.repo.head);
    assert.deepEqual(audit.recovery.externalCommits, [{ commit: f.workspace.head, files: ['other/task.js'] }]);
    assert.deepEqual(audit.recovery.files, []);
    assert.equal(audit.recovery.ownedFiles.includes('other/task.js'), false);
    assert.equal(service.bind(options).status, 'PASS');
    assert.equal(service.check({ ...options, phase: 'preflight' }).status, 'PASS');
    assert.equal(storage.readJson(binding).evidence, null);
  });
  assert.match(fs.readFileSync(path.join(f.root, changeDir, 'tasks.md'), 'utf8'), /\[ \] 1.1/);
});

for (const [name, mutate] of [
  ['writer file', f => { commitExternal(f, 'src/greet.js'); }],
  ['design input', f => { fs.appendFileSync(path.join(f.root, changeDir, 'design.md'), '\nAnother change.');
    commitExternal(f, `${changeDir}/design.md`); }],
  ['other file in writer module', f => { f.writer.scopes.push('module:src'); write(f.root, 'src/dependency.js', 'changed dependency');
    commitExternal(f, 'src/dependency.js'); }],
  ['omitted commit with the same file', f => { commitExternal(f); write(f.root, 'other/task.js', 'another commit'); commitExternal(f); }],
  ['out of range commit', f => { commitExternal(f); f.options.externalCommits = [f.repo.head]; }],
  ['duplicate ownership', f => { commitExternal(f); f.options.files = ['other/task.js']; }],
]) {
  test(`writer external commit rejects ${name} and preserves preparation`, t => {
    const f = writerFixture(t); const original = fs.readFileSync(f.preparationFile); mutate(f);
    assert.throws(f.recover, { rule: 'DESIGN_EXTERNAL_COMMIT' });
    assert.deepEqual(fs.readFileSync(f.preparationFile), original);
    assert.equal(fs.existsSync(f.bindingFile), false);
  });
}

test('automatic migration synchronizes the current slice while preserving explicit legacy content gaps', t => {
  const f = fixture(t); enrollBaseline(f);
  const prepare = require('../governance/design-preparation');
  prepare.prepare({ root: f.root, session: f.options.session, module: 'greeting' });
  syncBaseline(f);
  prepare.upsert({ root: f.root, session: f.options.session, module: 'greeting',
    migrationReason: 'This slice updates the greeting result; legacy functional chapter and ID inventory remain to be reviewed.',
    migrationDue: 'Before module-wide strict enrollment' });
  f.plan.files.push(baselines.REGISTRY); f.plan.views[0].files.push(baselines.REGISTRY); f.plan.scenarios[0].files.push(baselines.REGISTRY);
  f.save(); service.bind(f.options); implement(f); service.record(f.options);
  assert.equal(service.check(f.options).status, 'PASS');
  const inspection = baselines.inspect(f.root);
  assert.equal(inspection.contentCoverage[0].mode, 'migrate');
  assert.equal(inspection.state, 'needs-work');
  assert.match(inspection.contentCoverage[0].migration.reason, /legacy functional chapter/);
  assert.match(fs.readFileSync(path.join(f.root, 'docs/current.md'), 'utf8'), /hello greeting/);
});

 test('baseline scans more than 100 changes and retains late conflicts', t => {
  const f = fixture(t); enrollBaseline(f);
  for (let i = 0; i < 120; i++) write(f.root, 'openspec/changes/unrelated-' + i + '/specs/other/spec.md', '### Requirement: Other\n');
  assert.equal(service.bind(f.options).status, 'PASS');
  write(f.root, 'openspec/changes/zzz-conflict/specs/greeting/spec.md', '### Requirement: Stable greeting\n');
  assert.equal(service.guarded(() => service.bind(f.options)).findings[0].rule, 'BASELINE_CONFLICT');
  f.plan.conflicts = [{ change: 'zzz-conflict', order: 'current before other', reason: 'Rebase the later change after this validated delivery.' }];
  f.save();
  assert.equal(service.bind(f.options).status, 'PASS');
});
