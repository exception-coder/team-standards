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
