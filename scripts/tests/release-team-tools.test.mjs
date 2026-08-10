import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import test from 'node:test';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const releaseScript = path.resolve(scriptDirectory, '..', 'release-team-tools.mjs');
const workspace = path.resolve(scriptDirectory, '..', '..', '..');

test('release dry-run builds three verified artifacts without changing repositories', () => {
  const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'team-tools-release-test-'));
  const output = path.join(temporaryRoot, 'output');
  try {
    const result = spawnSync(process.execPath, [releaseScript, '--workspace', workspace, '--out', output, '--skip-tests'], {
      encoding: 'utf8',
    });
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
    const manifest = JSON.parse(fs.readFileSync(path.join(output, 'release-manifest.json'), 'utf8'));
    assert.equal(manifest.dryRun, true);
    assert.equal(manifest.plugins.length, 3);
    for (const plugin of manifest.plugins) {
      assert.ok(fs.existsSync(path.join(output, plugin.archive)));
      assert.ok(fs.existsSync(path.join(output, `${plugin.archive}.sha256`)));
      assert.match(plugin.sha256, /^[a-f0-9]{64}$/);
    }
  } finally {
    removeTemporaryRoot(temporaryRoot);
  }
});

test('release dry-run rejects an incomplete workspace', () => {
  const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'team-tools-release-test-'));
  try {
    const result = spawnSync(process.execPath, [releaseScript, '--workspace', temporaryRoot, '--out', path.join(temporaryRoot, 'output'), '--skip-tests'], {
      encoding: 'utf8',
    });
    assert.notEqual(result.status, 0);
    assert.match(`${result.stdout}\n${result.stderr}`, /required file is missing|required directory is missing/);
  } finally {
    removeTemporaryRoot(temporaryRoot);
  }
});

function removeTemporaryRoot(temporaryRoot) {
  const resolved = path.resolve(temporaryRoot);
  assert.ok(resolved.startsWith(`${path.resolve(os.tmpdir())}${path.sep}`));
  assert.match(path.basename(resolved), /^team-tools-release-test-/);
  fs.rmSync(resolved, { recursive: true, force: true });
}
