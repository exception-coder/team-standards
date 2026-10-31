import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { selectProvider, installSkill, codexConfig, prepareClaude } from '../../plugins/team-standards/scripts/openspec-auto.mjs';
import { riskFloor } from '../../plugins/team-standards/skills/openspec-auto/scripts/risk-floor.mjs';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const plugin = path.join(repo, 'plugins/team-standards');
const canonical = path.join(plugin, 'skills/openspec-auto');
function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-auto-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const project = path.join(root, 'project');
  fs.mkdirSync(project);
  return { root, project };
}

test('standalone template has complete identical skill and no plugin runtime requirement', t => {
  const { project } = fixture(t);
  fs.cpSync(path.join(repo, 'templates/project-foundation/template'), project, { recursive: true });
  for (const host of ['codex', 'claude']) {
    const result = selectProvider(project, host, null);
    assert.equal(result.provider, 'project');
    assert.equal(result.nativeDiscovery, true);
    assert.equal(fs.readFileSync(result.skillPath, 'utf8'), fs.readFileSync(path.join(canonical, 'SKILL.md'), 'utf8'));
    assert.equal(fs.readFileSync(path.join(path.dirname(result.skillPath), 'scripts/risk-floor.mjs'), 'utf8'),
      fs.readFileSync(path.join(canonical, 'scripts/risk-floor.mjs'), 'utf8'));
  }
});

test('Codex project wins; config disables only loaded duplicate and preserves other disabled skills', t => {
  const { project } = fixture(t);
  installSkill(project, 'codex', canonical);
  const global = path.join(canonical, 'SKILL.md');
  const original = [{ path: 'other/SKILL.md', enabled: false }];
  const result = codexConfig(project, plugin, original, [global]);
  assert.equal(result.provider, 'project');
  assert.equal(result.registerGlobal, false);
  assert.equal(result.skillConfig.length, 2);
  assert.deepEqual(original, [{ path: 'other/SKILL.md', enabled: false }]);
  assert.equal(result.skillConfig[1].enabled, false);
  assert.throws(() => codexConfig(project, plugin, original, [result.skillPath]), /project skill/);
  assert.throws(() => codexConfig(project, plugin, original, []), /paths required/);
});

test('Claude projection physically removes duplicate and retains other skills and hooks', t => {
  const { root, project } = fixture(t);
  installSkill(project, 'claude', canonical);
  const output = path.join(root, 'filtered');
  const result = prepareClaude(project, plugin, output);
  assert.equal(result.registerGlobal, false);
  assert.deepEqual(result.args, ['--plugin-dir', output]);
  assert.equal(fs.existsSync(path.join(output, 'skills/openspec-auto')), false);
  assert.ok(fs.existsSync(path.join(output, 'skills/change-readiness/SKILL.md')));
  assert.equal(fs.readFileSync(path.join(output, 'hooks/hooks.json'), 'utf8'), fs.readFileSync(path.join(plugin, 'hooks/hooks.json'), 'utf8'));
  assert.throws(() => prepareClaude(project, plugin, output), /already exists/);
});

test('missing project skill falls back to plugin; neither installed supplies nothing', t => {
  const { project } = fixture(t);
  for (const host of ['codex', 'claude']) {
    assert.equal(selectProvider(project, host, plugin).provider, 'plugin');
    assert.equal(selectProvider(project, host, null).provider, 'none');
  }
});

test('risk escalation preserves L3 and forces high-risk or project-required OpenSpec', () => {
  assert.equal(riskFloor({ proposed: 'L1' }), 'L1');
  assert.equal(riskFloor({ proposed: 'L2' }), 'L2');
  for (const risk of ['permission-boundary', 'data-security', 'data-integrity', 'sensitive-data',
    'irreversible-change', 'breaking-contract', 'architecture', 'major-data-model']) {
    assert.equal(riskFloor({ proposed: 'L1', previous: 'L2', risks: [risk] }), 'L3');
  }
  assert.equal(riskFloor({ proposed: 'L1', previous: 'L3' }), 'L3');
  assert.equal(riskFloor({ proposed: 'L2', projectRequiresOpenSpec: true }), 'L3');
  assert.throws(() => riskFloor({ proposed: 'L1', risks: ['unknown'] }), /Invalid assessment/);
});

test('installation never overwrites local customizations and second host copies project version', t => {
  const { project } = fixture(t);
  installSkill(project, 'codex', canonical);
  const local = selectProvider(project, 'codex', plugin).skillPath;
  fs.appendFileSync(local, '\nProject-specific rule.\n');
  assert.throws(() => installSkill(project, 'codex', canonical), /already exists/);
  assert.throws(() => installSkill(project, 'claude', canonical), /Project already provides/);
  installSkill(project, 'claude');
  assert.equal(fs.readFileSync(selectProvider(project, 'claude', plugin).skillPath, 'utf8'), fs.readFileSync(local, 'utf8'));
});

test('conflicting local versions and missing declared equivalent do not silently fall back', t => {
  const { project } = fixture(t);
  installSkill(project, 'codex', canonical);
  installSkill(project, 'claude');
  fs.appendFileSync(path.join(project, '.claude/skills/openspec-auto/SKILL.md'), '\nDifferent policy\n');
  assert.throws(() => selectProvider(project, 'claude', plugin), /Conflicting/);
  fs.writeFileSync(path.join(project, '.agents/skill-providers.json'), JSON.stringify({ 'openspec-auto': 'missing/SKILL.md' }));
  assert.throws(() => selectProvider(project, 'codex', plugin), /ENOENT/);
});

test('declared same capability uses project rule even with different skill name', t => {
  const { project } = fixture(t);
  fs.mkdirSync(path.join(project, '.agents/skills/local-flow'), { recursive: true });
  fs.writeFileSync(path.join(project, '.agents/skills/local-flow/SKILL.md'), '---\nname: local-flow\ndescription: local policy\n---\nRules');
  fs.writeFileSync(path.join(project, '.agents/skill-providers.json'), JSON.stringify({ 'openspec-auto': '.agents/skills/local-flow/SKILL.md' }));
  assert.equal(selectProvider(project, 'codex', plugin).registerGlobal, false);
  assert.throws(() => selectProvider(project, 'unsupported', plugin), /Supported hosts/);
});
