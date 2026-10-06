const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { withBindingContext } = require('../governance/binding-context');
const storage = require('../governance/storage');

test('真实会话跨 change 选择独立绑定，保留旧证据并拒绝错配', t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'governance-context-'));
  const root = fs.realpathSync.native(dir);
  const previous = process.env.TEAM_STANDARDS_GOVERNANCE_DATA;
  process.env.TEAM_STANDARDS_GOVERNANCE_DATA = path.join(dir, 'data');
  t.after(() => {
    if (previous === undefined) delete process.env.TEAM_STANDARDS_GOVERNANCE_DATA;
    else process.env.TEAM_STANDARDS_GOVERNANCE_DATA = previous;
    fs.rmSync(dir, { recursive: true, force: true });
  });
  const cli = path.join(dir, 'forge.cjs');
  fs.writeFileSync(cli, `let input='';process.stdin.on('data',d=>input+=d);process.stdin.on('end',()=>{const i=JSON.parse(input);console.log(JSON.stringify({protocolVersion:2,project:i.project,sessionId:i.sessionId,execution:process.env.TEST_CHANGE?{changeId:process.env.TEST_CHANGE,ownsWriter:true,state:'BOUND'}:null}));});`);
  const env = { ...process.env, FORGE_EXECUTION_PROTOCOL: '2', FORGE_SPEC_RESOLUTION_CLI: cli, TEST_CHANGE: 'access' };
  const options = { repo: root, session: 'real-session' };
  const legacy = storage.statePath(root, options.session);
  storage.atomicUpdate(legacy, () => ({ change: 'organization', session: options.session, evidence: 'old-evidence' }));
  const original = fs.readFileSync(legacy, 'utf8');
  const access = withBindingContext(options, scoped => {
    assert.equal(scoped.session, 'real-session');
    assert.equal(scoped.change, 'access');
    const file = storage.statePath(root, scoped.session);
    assert.notEqual(file, legacy);
    storage.atomicUpdate(file, () => ({ change: scoped.change, session: scoped.session, evidence: 'access-evidence' }));
    return file;
  }, env);
  assert.equal(fs.readFileSync(legacy, 'utf8'), original);
  assert.equal(withBindingContext(options, () => storage.statePath(root, options.session), env), access);
  assert.equal(withBindingContext(options, () => storage.statePath(root, options.session), { ...env, TEST_CHANGE: 'organization' }), legacy);
  assert.throws(() => withBindingContext({ ...options, change: 'organization' }, () => assert.fail('must not execute'), env), /当前 Forge change 为 access/);
  assert.equal(withBindingContext(options, () => storage.statePath(root, options.session), { ...env, TEST_CHANGE: '' }), legacy);
  assert.equal(storage.statePath(root, options.session), legacy, 'scope must not leak');
});

test('Forge 上下文读取失败不能静默复用旧绑定', () => {
  assert.throws(() => withBindingContext({ repo: process.cwd(), session: 'real' }, () => assert.fail(),
    { FORGE_EXECUTION_PROTOCOL: '2', FORGE_SPEC_RESOLUTION_CLI: 'missing' }), /FORGE_UNAVAILABLE/);
});
