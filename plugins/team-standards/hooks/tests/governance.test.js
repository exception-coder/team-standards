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
  const context = require('../governance/openspec').loadContext(f.root, change, f.options);
  f.plan.taskIds = [context.tasks[0].id];
  f.plan.scenarios[0].taskIds = [...f.plan.taskIds];
  f.save();
  service.bind(f.options);
  implement(f);
  service.record(f.options);
  assert.equal(service.check(f.options).status, 'PASS');
});
