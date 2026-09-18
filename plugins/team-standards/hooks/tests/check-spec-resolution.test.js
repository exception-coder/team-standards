const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { handle } = require('../check-spec-resolution');

function fixture(t, response = { allowed: true, code: 'PASS' }) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'spec hook '));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, 'openspec')); fs.writeFileSync(path.join(root, 'openspec/config.yaml'), 'context: test');
  const cli = path.join(root, 'fake forge.cjs');
  fs.writeFileSync(cli, `let raw='';process.stdin.on('data', c=>raw+=c);process.stdin.on('end',()=>{ const input=JSON.parse(raw); if(input.project!==process.cwd())process.exit(1); console.log(${JSON.stringify(JSON.stringify(response))}); });`);
  const env = { ...process.env, USERPROFILE: root, HOME: root, TEAM_STANDARDS_SPEC_RESOLUTION_HOOK: 'block', FORGE_SPEC_RESOLUTION_CLI: cli, FORGE_OPENSPEC_CHANGE: 'test', TEAM_STANDARDS_HOOK_EVENT_DIR: path.join(root, 'audit') };
  const payload = { cwd: root, tool_name: 'Write', tool_input: { file_path: path.join(root, 'src/file.ts'), content: 'test' } };
  return { root, cli, env, payload };
}
test('successful Forge readiness supports spaced paths', t => {
  const { env, payload } = fixture(t); assert.equal(handle(payload, env).code, 0);
});
test('unconfirmed result blocks, warn preserves diagnostic', t => {
  const { env, payload } = fixture(t, { allowed: false, code: 'SPEC_RESOLUTION_UNCONFIRMED', actions: ['confirm'] });
  assert.equal(handle(payload, env).code, 2);
  const warning = handle(payload, { ...env, TEAM_STANDARDS_SPEC_RESOLUTION_HOOK: 'warn' });
  assert.equal(warning.code, 0); assert.match(warning.stderr, /SPEC_RESOLUTION_UNCONFIRMED/);
});
test('unavailable and malformed service obey failure policy', t => {
  const { env, payload } = fixture(t, { allowed: true });
  assert.equal(handle(payload, env).code, 2);
  assert.equal(handle(payload, { ...env, FORGE_SPEC_RESOLUTION_CLI: '' }).code, 2);
  const warning = handle(payload, { ...env, FORGE_SPEC_RESOLUTION_CLI: '', TEAM_STANDARDS_SPEC_RESOLUTION_FAILURE: 'warn' });
  assert.equal(warning.code, 0); assert.match(warning.stderr, /FORGE_UNAVAILABLE/);
  const events = fs.readFileSync(path.join(env.TEAM_STANDARDS_HOOK_EVENT_DIR, 'hook-events.jsonl'), 'utf8');
  assert.match(events, /FORGE_UNAVAILABLE/); assert.match(events, /"mode":"warn"/);
});
test('planning documents remain editable and off skips checks', t => {
  const { root, env, payload } = fixture(t);
  payload.tool_input.file_path = path.join(root, 'openspec/changes/test/design.md');
  assert.equal(handle(payload, { ...env, FORGE_SPEC_RESOLUTION_CLI: '' }).code, 0);
  assert.equal(handle(payload, { ...env, TEAM_STANDARDS_SPEC_RESOLUTION_HOOK: 'off' }).code, 0);
});
test('commit uses readiness and archive refresh does not require active change', t => {
  const { root, env } = fixture(t, { allowed: false, code: 'DELTA_MISSING' });
  assert.equal(handle({ cwd: root, tool_name: 'Bash', tool_input: { command: 'git commit -F msg' } }, env).code, 2);
  const next = fixture(t, { specRevision: 'a'.repeat(64) });
  assert.equal(handle({ cwd: next.root, hook_event_name: 'PostToolUse', tool_name: 'Bash', tool_input: { command: 'openspec archive test --yes' } },
    { ...next.env, FORGE_OPENSPEC_CHANGE: '' }).code, 0);
});
test('CLI timeout cannot allow a blocking write', t => {
  const { cli, payload, env } = fixture(t); fs.writeFileSync(cli, 'setInterval(()=>{}, 1000)');
  assert.equal(handle(payload, env).code, 2);
});

test('local runtime discovery and session-scoped routing preserve project context', t => {
  const { root, cli, env, payload } = fixture(t);
  const { createHash } = require('node:crypto');
  fs.mkdirSync(path.join(root, '.kai-toolbox'));
  fs.writeFileSync(path.join(root, '.kai-toolbox/forge-spec-resolution.json'), JSON.stringify({ protocolVersion: 1, cli }));
  fs.mkdirSync(path.join(root, '.forge/spec-resolution'), { recursive: true });
  const binding = path.join(root, '.forge/spec-resolution', `session-${createHash('sha256').update('s1').digest('hex')}.json`);
  fs.writeFileSync(binding, JSON.stringify({ project: root, changeId: 'test', branch: 'main' }));
  const options = { ...env, FORGE_SPEC_RESOLUTION_CLI: '', FORGE_OPENSPEC_CHANGE: '' };
  assert.equal(handle({ ...payload, session_id: 's1' }, options).code, 0);
  assert.equal(handle({ ...payload, session_id: 'other' }, options).code, 2);
  fs.writeFileSync(binding, JSON.stringify({ project: path.dirname(root), changeId: 'test' }));
  assert.equal(handle({ ...payload, session_id: 's1' }, options).code, 2);
});

test('Codex freeform apply_patch is checked before the write', t => {
  const { root, env } = fixture(t, { allowed: false, code: 'SPEC_RESOLUTION_MISSING' });
  const patch = '*** Begin Patch\n*** Add File: src/new.ts\n+export const x = 1\n*** End Patch';
  assert.equal(handle({ cwd: root, tool_name: 'apply_patch', tool_input: patch }, env).code, 2);
  assert.equal(handle({ cwd: root, tool_name: 'apply_patch', tool_input: { patch } }, env).code, 2);
});

test('execution binding routes no-change writes and branch commands through Forge', t => {
  const { root, cli, env, payload } = fixture(t);
  const { createHash } = require('node:crypto');
  fs.mkdirSync(path.join(root, '.forge/spec-resolution'), { recursive: true });
  fs.writeFileSync(path.join(root, '.forge/spec-resolution', `execution-session-${createHash('sha256').update('s1').digest('hex')}.json`), '{"executionId":"test"}');
  fs.writeFileSync(cli, `let raw='';process.stdin.on('data',c=>raw+=c);process.stdin.on('end',()=>{const input=JSON.parse(raw);if(process.argv[2]!=='check_execution_readiness'||input.sessionId!=='s1')process.exit(1);const denied=Boolean(input.command);console.log(JSON.stringify({allowed:!denied,code:denied?'BRANCH_POLICY_DENIED':'PASS',policy:{spec:'NO_SPEC_CHANGE'}}));if(denied)process.exitCode=2;});`);
  const options = { ...env, FORGE_OPENSPEC_CHANGE: '' };
  assert.equal(handle({ ...payload, session_id: 's1' }, options).code, 0);
  assert.equal(handle({ cwd: root, session_id: 's1', tool_name: 'exec_command', tool_input: { cmd: 'git -C . worktree add ../task-2' } }, options).code, 2);
  assert.equal(handle({ cwd: root, session_id: 's1', tool_name: 'exec_command', tool_input: { cmd: 'git switch -c task-2' } }, { ...options, TEAM_STANDARDS_SPEC_RESOLUTION_HOOK: 'warn' }).code, 2, 'an explicitly bound branch policy must not become a warning');
  fs.rmSync(path.join(root, 'openspec'), { recursive: true }); fs.mkdirSync(path.join(root, '.git'));
  assert.equal(handle({ ...payload, session_id: 's1' }, options).code, 0);
});

test('legacy governance accepts only machine-validated NO_SPEC_CHANGE executions', t => {
  const { root, cli, env, payload } = fixture(t);
  const { execFileSync } = require('node:child_process');
  const { createHash } = require('node:crypto');
  execFileSync('git', ['init', '-q'], { cwd: root });
  execFileSync('git', ['-c','user.name=Fixture','-c','user.email=fixture@example.invalid','commit','--allow-empty','-qm','baseline'], { cwd: root });
  fs.mkdirSync(path.join(root, '.forge/spec-resolution'), { recursive: true });
  fs.writeFileSync(path.join(root, '.forge/spec-resolution', `execution-session-${createHash('sha256').update('s1').digest('hex')}.json`), '{}');
  const run = () => require('node:child_process').spawnSync(process.execPath, [path.join(__dirname, '../check-openspec-governance.js')], {
    input: JSON.stringify({ ...payload, session_id: 's1' }), encoding: 'utf8',
    env: { ...env, FORGE_OPENSPEC_CHANGE: '', TEAM_STANDARDS_OPENSPEC_GOVERNANCE_HOOK: 'block' },
  });
  fs.writeFileSync(cli, `console.log(JSON.stringify({allowed:true,code:'PASS',policy:{spec:'NO_SPEC_CHANGE'}}))`);
  assert.equal(run().status, 0);
  fs.writeFileSync(cli, `console.log(JSON.stringify({allowed:false,code:'SPEC_INDEX_STALE'}));process.exitCode=2`);
  const failure = run(); assert.equal(failure.status, 2); assert.match(failure.stderr, /EXECUTION_NOT_READY/);
});

test('bound execution is strict even when the legacy specification mode is warn', t => {
  const { root, env, payload } = fixture(t, { allowed: false, code: 'VERIFICATION_NOT_RUN' });
  fs.mkdirSync(path.join(root, '.forge/spec-resolution'), { recursive: true });
  fs.writeFileSync(path.join(root, '.forge/spec-resolution/execution-writer.json'), '{}');
  const options = { ...env, TEAM_STANDARDS_SPEC_RESOLUTION_HOOK: 'warn' };
  assert.equal(handle({ ...payload, session_id: 'unbound' }, options).code, 2);
  assert.equal(handle({ ...payload, session_id: 'unbound' }, { ...options, FORGE_SPEC_RESOLUTION_CLI: '' }).code, 2);
});
