import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

test('optional freshness warning stays distinct from current evidence and strict rejection', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'team-graphify-freshness-'));
  t.after(() => {
    assert.ok(path.resolve(root).startsWith(path.resolve(os.tmpdir()) + path.sep));
    fs.rmSync(root, { recursive: true, force: true });
  });
  const script = path.join(root, 'scripts', 'check-graphify-freshness.mjs');
  fs.mkdirSync(path.dirname(script), { recursive: true });
  fs.mkdirSync(path.join(root, 'plugins', 'team-standards'), { recursive: true });
  fs.copyFileSync(fileURLToPath(new URL('../check-graphify-freshness.mjs', import.meta.url)), script);
  const source = path.join(root, 'plugins', 'team-standards', 'rule.md');
  fs.writeFileSync(source, '# Original rule\n');
  const run = (...args) => spawnSync(process.execPath, [script, ...args], { encoding: 'utf8' });
  assert.equal(run('--write').status, 0);
  assert.equal(run().status, 0);

  fs.writeFileSync(source, '# Changed rule\n');
  const strict = run();
  assert.equal(strict.status, 1);
  assert.match(strict.stderr, /stale/);
  const advisory = run('--advisory');
  assert.equal(advisory.status, 0);
  assert.match(advisory.stderr, /STALE \(advisory, not verified\)/);
  assert.doesNotMatch(advisory.stdout, /current/);
  assert.equal(run().status, 1, 'advisory must not rewrite fingerprints');

  fs.rmSync(path.join(root, 'graphify-out', 'source-fingerprint.json'));
  assert.equal(run('--advisory').status, 1, 'unreadable evidence is still an execution error');
});
