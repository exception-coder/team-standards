const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const hooksRoot = path.resolve(__dirname, '..');

test('default registration has no readiness, Forge or delivery lifecycle gates', () => {
  const config = JSON.parse(fs.readFileSync(path.join(hooksRoot, 'hooks.json'), 'utf8'));
  assert.equal(config.hooks.Stop, undefined);
  assert.equal(config.hooks.SessionStart, undefined);
  assert.doesNotMatch(JSON.stringify(config), /check-spec-resolution|check-change-readiness|check-openspec-governance|check-delivery-verification/);
});

test('source edits proceed without design or Forge even with legacy block settings', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'guidance-default-'));
  t.after(() => {
    assert.ok(path.resolve(root).startsWith(path.resolve(os.tmpdir()) + path.sep));
    fs.rmSync(root, { recursive: true, force: true });
  });
  fs.mkdirSync(path.join(root, 'openspec'));
  fs.writeFileSync(path.join(root, 'openspec', 'config.yaml'), 'schema: spec-driven\n');
  const outcome = spawnSync(process.execPath, [path.join(hooksRoot, 'write-guard-dispatcher.js')], {
    cwd: root, encoding: 'utf8', timeout: 20000,
    input: JSON.stringify({ cwd: root, session_id: 'unbound', tool_name: 'Write',
      tool_input: { file_path: path.join(root, 'src', 'greet.js'), content: 'module.exports = () => "hello";\n' } }),
    env: { ...process.env, FORGE_EXECUTION_PROTOCOL: '2', FORGE_SPEC_RESOLUTION_CLI: path.join(root, 'missing.cjs'),
      TEAM_STANDARDS_CHANGE_READINESS_HOOK: 'block', TEAM_STANDARDS_SPEC_RESOLUTION_HOOK: 'block',
      TEAM_STANDARDS_OPENSPEC_GOVERNANCE_HOOK: 'block', TEAM_STANDARDS_DELIVERY_VERIFICATION_HOOK: 'block' },
  });
  assert.equal(outcome.status, 0, outcome.stderr);
  assert.doesNotMatch(outcome.stderr, /EXECUTION_NOT_READY|BINDING_REQUIRED|设计依据|Forge/);
  assert.equal(fs.existsSync(path.join(root, '.team-standards')), false);
  assert.equal(fs.existsSync(path.join(root, '.forge')), false);
});
