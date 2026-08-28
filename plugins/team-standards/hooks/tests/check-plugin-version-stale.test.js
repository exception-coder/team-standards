const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const hookScript = path.join(__dirname, '..', 'check-plugin-version-stale.js');

function prepareLayout(root, pluginName = 'team-standards') {
  const pluginRoot = path.join(root, 'loaded-plugin');
  const marketplaceRoot = path.join(root, '.claude', 'plugins', 'marketplaces', pluginName, '.claude-plugin');
  fs.mkdirSync(path.join(pluginRoot, '.claude-plugin'), { recursive: true });
  fs.mkdirSync(marketplaceRoot, { recursive: true });
  fs.writeFileSync(
    path.join(pluginRoot, '.claude-plugin', 'plugin.json'),
    JSON.stringify({ name: pluginName, version: '1.0.0' }),
    'utf8'
  );
  fs.writeFileSync(
    path.join(marketplaceRoot, 'marketplace.json'),
    JSON.stringify({ plugins: [{ name: pluginName, version: '1.1.0' }] }),
    'utf8'
  );
  return pluginRoot;
}

function runHook(home, pluginRoot, sessionId, overrides = {}) {
  return spawnSync(process.execPath, [hookScript], {
    input: JSON.stringify({ session_id: sessionId }),
    encoding: 'utf8',
    env: {
      ...process.env,
      HOME: home,
      USERPROFILE: home,
      CLAUDE_PLUGIN_ROOT: pluginRoot,
      ...overrides,
    },
  });
}

test('stale-version hook derives plugin identity and reminds only once', (t) => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'version-stale-'));
  t.after(() => fs.rmSync(home, { recursive: true, force: true }));
  const pluginRoot = prepareLayout(home);

  const first = runHook(home, pluginRoot, 'same-session');
  assert.equal(first.status, 0);
  assert.match(first.stderr, /team-standards 1\.0\.0→1\.1\.0/);

  const second = runHook(home, pluginRoot, 'same-session');
  assert.equal(second.status, 0);
  assert.equal(second.stderr, '');
});

test('common and legacy environment switches disable reminders', (t) => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'version-stale-off-'));
  t.after(() => fs.rmSync(home, { recursive: true, force: true }));
  const pluginRoot = prepareLayout(home);

  const common = runHook(home, pluginRoot, 'common-off', { TEAM_TOOLS_VERSION_REMINDER: 'off' });
  assert.equal(common.status, 0);
  assert.equal(common.stderr, '');

  const legacy = runHook(home, pluginRoot, 'legacy-off', { TEAM_STANDARDS_VERSION_REMINDER: 'off' });
  assert.equal(legacy.status, 0);
  assert.equal(legacy.stderr, '');
});
