import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';

const root = fileURLToPath(new URL('../../', import.meta.url));
const pkg = resolve(root, 'plugins/yoooni-ponytail');
const json = path => JSON.parse(readFileSync(path, 'utf8'));

test('pilot package versions and marketplace paths resolve independently', () => {
  const claude = json(resolve(pkg, '.claude-plugin/plugin.json'));
  const codex = json(resolve(pkg, '.codex-plugin/plugin.json'));
  const market = json(resolve(root, '.claude-plugin/marketplace.json')).plugins.filter(p => p.name === claude.name);
  assert.equal(market.length, 1);
  assert.equal(market[0].version, claude.version);
  assert.equal(codex.version, claude.version);
  assert.equal(resolve(root, market[0].source), pkg);
  const agent = json(resolve(root, '.agents/plugins/marketplace.json')).plugins.find(p => p.name === claude.name);
  assert.equal(resolve(root, agent.source.path), pkg);
  assert.equal(agent.policy.installation, 'AVAILABLE');
});

test('vendored source is pinned, licensed and byte-identical to recorded hashes', () => {
  const source = json(resolve(pkg, 'upstream/source.json'));
  assert.match(source.commit, /^[0-9a-f]{40}$/);
  assert.equal(source.license, 'MIT');
  for (const file of source.files) {
    assert.ok(file.url.includes(`/${source.commit}/`));
    assert.equal(createHash('sha256').update(readFileSync(resolve(pkg, 'upstream', file.localPath))).digest('hex'), file.sha256);
  }
  assert.match(readFileSync(resolve(pkg, 'upstream/LICENSE'), 'utf8'), /Copyright.*DietrichGebert/);
});

test('only adapter is discoverable; payload has no hooks and all relative links resolve', () => {
  const files = readdirSync(pkg, { recursive: true }).map(String);
  assert.deepEqual(files.filter(f => /(^|[\\/])SKILL\.md$/.test(f)), ['skills/yoooni-ponytail/SKILL.md'].map(p => p.replaceAll('/', process.platform === 'win32' ? '\\' : '/')));
  assert.ok(!files.some(f => /(^|[\\/])hooks([\\/]|$)/.test(f)));
  assert.match(readFileSync(resolve(pkg, 'skills/yoooni-ponytail/SKILL.md'), 'utf8'), /disable-model-invocation: true/);
  assert.match(readFileSync(resolve(pkg, 'skills/yoooni-ponytail/agents/openai.yaml'), 'utf8'), /allow_implicit_invocation: false/);
  for (const file of files.filter(f => f.endsWith('.md'))) {
    for (const [, target] of readFileSync(resolve(pkg, file), 'utf8').matchAll(/\]\(([^)]+)\)/g)) {
      if (!/^https?:/.test(target)) assert.ok(existsSync(resolve(dirname(resolve(pkg, file)), target)), `${file}: ${target}`);
    }
  }
});
