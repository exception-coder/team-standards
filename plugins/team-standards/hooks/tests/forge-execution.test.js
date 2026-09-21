const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { handle } = require('../check-spec-resolution');
const { handle: init } = require('../session-init');
const { checkGovernance } = require('../forge/client');

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'forge v2 hooks '));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, '.git'));
  const cli = path.join(root, 'forge.cjs');
  const env = { ...process.env, USERPROFILE: root, HOME: root, FORGE_SPEC_RESOLUTION_CLI: cli,
    FORGE_EXECUTION_PROTOCOL: '2', TEAM_STANDARDS_SPEC_RESOLUTION_HOOK: 'warn', TEAM_STANDARDS_HOOK_EVENT_DIR: path.join(root, 'audit') };
  const payload = { cwd: root, session_id: 'host-1', tool_name: 'Write', tool_input: { file_path: path.join(root, 'source.js'), content: 'value' } };
  const respond = response => fs.writeFileSync(cli, `process.stdin.resume();process.stdin.on('end',()=>console.log(${JSON.stringify(JSON.stringify(response))}));`);
  return { root, cli, env, payload, respond };
}
const pass = { protocolVersion: 2, allowed: true, code: 'PASS', enforcement: 'block', legacyGovernanceRequired: false };

test('v2 uses Forge policy without local execution pointers, including branch operations', t => {
  const { root, env, payload, respond } = fixture(t);
  respond(pass);
  assert.equal(handle(payload, env).code, 0);
  assert.equal(checkGovernance(root, [], 'stop', 'block', env, 'host-1').legacyGovernanceRequired, false);
  respond({ ...pass, allowed: false, code: 'BRANCH_POLICY_DENIED' });
  assert.equal(handle({ ...payload, tool_name: 'exec_command', tool_input: { cmd: 'git switch -c task' } }, env).code, 2);
  assert.equal(fs.existsSync(path.join(root, '.forge')), false);
});

test('v2 enforces returned mode and fails closed on transport/protocol mismatch', t => {
  const { env, payload, respond } = fixture(t);
  respond({ ...pass, allowed: false, code: 'SPEC_RESOLUTION_UNCONFIRMED', enforcement: 'warn' });
  assert.equal(handle(payload, env).code, 0);
  respond({ allowed: true, code: 'PASS' });
  assert.equal(handle(payload, env).code, 2);
  assert.equal(handle(payload, { ...env, TEAM_STANDARDS_SPEC_RESOLUTION_FAILURE: 'warn' }).code, 0);
  respond({ allowed: false, code: 'TOOL_INVALID' });
  assert.match(handle(payload, env).stderr, /FORGE_UPGRADE_REQUIRED/);
  assert.equal(handle(payload, { ...env, TEAM_STANDARDS_SPEC_RESOLUTION_HOOK: 'off' }).code, 0);
});

test('SessionStart forwards identity and exposes only a valid current context', t => {
  const { root, cli, env, payload } = fixture(t);
  fs.writeFileSync(cli, `let raw='';process.stdin.on('data',c=>raw+=c);process.stdin.on('end',()=>{const i=JSON.parse(raw);if(process.argv[2]!=='session_init')process.exit(1);console.log(JSON.stringify({...i,protocolVersion:2,capabilities:{execution:{available:true,enforcement:'HOST_DEPENDENT'}}}));});`);
  const result = init(payload, env);
  assert.equal(result.hookSpecificOutput.hookEventName, 'SessionStart');
  assert.match(result.hookSpecificOutput.additionalContext, /host-1/);
  assert.match(init({ ...payload, session_id: '' }, env).systemMessage, /SESSION_ID_MISSING/);
  assert.deepEqual(init(payload, { ...env, FORGE_EXECUTION_PROTOCOL: '1' }), {});
  assert.deepEqual(init(payload, { ...env, TEAM_STANDARDS_SESSION_INIT_HOOK: 'off' }), {});
  assert.equal(fs.existsSync(path.join(root, '.forge')), false);
});
