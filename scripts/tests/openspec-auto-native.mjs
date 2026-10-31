// Optional discovery-only integration check. No model request or global config writes.
// Usage: node scripts/tests/openspec-auto-native.mjs <codex executable> [claude executable or cli.js]
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { installSkill, codexConfig, prepareClaude } from '../../plugins/team-standards/scripts/openspec-auto.mjs';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const plugin = path.join(repo, 'plugins/team-standards');
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-native-'));
const project = path.join(root, 'project');
const codexHome = path.join(root, 'codex');
const claudeHome = path.join(root, 'claude');
for (const dir of [project, codexHome, claudeHome]) fs.mkdirSync(dir);
const env = { ...process.env, CODEX_HOME: codexHome, CLAUDE_CONFIG_DIR: claudeHome,
  CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: '1' };
const codex = process.argv[2];
if (!codex) throw new Error('Pass the Codex executable path');

function command(args) {
  const result = spawnSync(codex, args, { env, cwd: project, encoding: 'utf8', timeout: 30000, windowsHide: true });
  if (result.status !== 0) throw new Error(`Codex command failed: ${args.slice(0, 3).join(' ')}: ${result.error?.message || result.status}: ${result.stderr}`);
}

function connection(executable, args) {
  const child = spawn(executable, args, { env, cwd: project, stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true });
  const pending = new Map();
  let outputLines = 0;
  let errorBytes = 0;
  const rejectPending = message => {
    for (const handler of pending.values()) handler({ error: { message } });
    pending.clear();
  };
  child.on('error', () => rejectPending('Host process could not start'));
  child.on('exit', code => rejectPending(`Host exited before discovery response (${code})`));
  let buffer = '';
  child.stdout.on('data', chunk => {
    buffer += chunk;
    while (buffer.includes('\n')) {
      const index = buffer.indexOf('\n');
      const line = buffer.slice(0, index); buffer = buffer.slice(index + 1);
      outputLines += 1;
      let value;
      try { value = JSON.parse(line); } catch { continue; }
      const id = value.id ?? value.response?.request_id;
      if (pending.has(id)) { pending.get(id)(value); pending.delete(id); }
    }
  });
  // Consume stderr, but don't print host diagnostics that might contain user configuration.
  child.stderr.on('data', chunk => { errorBytes += chunk.length; });
  return {
    request(value) {
      return new Promise((resolve, reject) => {
        const id = value.id ?? value.request_id;
        const timer = setTimeout(() => { pending.delete(id); reject(new Error(`Host discovery timed out: stdout lines=${outputLines}, stderr bytes=${errorBytes}`)); }, 60000);
        pending.set(id, response => { clearTimeout(timer); response.error ? reject(new Error(JSON.stringify(response.error))) : resolve(response); });
        child.stdin.write(JSON.stringify(value) + '\n');
      });
    },
    async close() {
      child.stdin.end();
      await new Promise(resolve => {
        if (child.exitCode !== null) return resolve();
        const timer = setTimeout(() => child.kill(), 1500);
        child.once('exit', () => { clearTimeout(timer); resolve(); });
      });
    },
  };
}

async function skills(args = []) {
  const rpc = connection(codex, [...args, 'app-server']);
  try {
    await rpc.request({ id: 1, method: 'initialize', params: { clientInfo: { name: 'skill-discovery-test', version: '1.0.0' } } });
    const response = await rpc.request({ id: 2, method: 'skills/list', params: { cwds: [project], forceReload: true } });
    return response.result.data.flatMap(item => item.skills).filter(item => item.name.endsWith('openspec-auto'));
  } finally { await rpc.close(); }
}

try {
  // Minimal marketplace isolates discovery from unrelated plugin assets and hooks.
  const market = path.join(root, 'marketplace');
  const payload = path.join(market, 'plugins/team-standards');
  fs.mkdirSync(path.join(market, '.claude-plugin'), { recursive: true });
  fs.cpSync(path.join(repo, '.claude-plugin/marketplace.json'), path.join(market, '.claude-plugin/marketplace.json'));
  for (const directory of ['.codex-plugin', '.claude-plugin', 'skills/openspec-auto']) {
    fs.cpSync(path.join(plugin, directory), path.join(payload, directory), { recursive: true });
  }
  command(['plugin', 'marketplace', 'add', market]);
  command(['plugin', 'add', 'team-standards@team-standards']);
  const fallback = await skills();
  assert.equal(fallback.filter(item => item.enabled).length, 1, 'Plugin fallback should be enabled');
  const globalPaths = fallback.map(item => item.path);
  installSkill(project, 'codex');
  const both = await skills();
  assert.equal(both.filter(item => item.enabled).length, 2, 'Demonstrate duplicate before adapter');
  const adapted = codexConfig(project, plugin, [], globalPaths);
  const filtered = await skills(adapted.args);
  assert.equal(filtered.filter(item => item.enabled).length, 1);
  assert.ok(filtered.find(item => item.enabled).path.replaceAll('\\', '/').includes('/.agents/skills/'));
  console.log('PASS: native Codex plugin fallback, duplicate reproduction and project-only enabled discovery');

  if (process.argv[3]) {
    installSkill(project, 'claude');
    const projection = prepareClaude(project, plugin, path.join(root, 'filtered'));
    async function claudeCommands(args) {
      const isScript = /\.[cm]?js$/.test(process.argv[3]);
      const rpc = connection(isScript ? process.execPath : process.argv[3], [...(isScript ? [process.argv[3]] : []), '-p', '--verbose', '--input-format', 'stream-json',
        '--output-format', 'stream-json', ...args]);
      try {
        const response = await rpc.request({ type: 'control_request', request_id: 'init', request: { subtype: 'initialize' } });
        assert.equal(response.response.subtype, 'success');
        return response.response.response.commands;
      } finally { await rpc.close(); }
    }
    const unfiltered = await claudeCommands(['--plugin-dir', plugin]);
    assert.ok(unfiltered.some(item => item.name === 'openspec-auto'));
    assert.ok(unfiltered.some(item => item.name === 'team-standards:openspec-auto'));
    const filteredCommands = await claudeCommands(projection.args);
    assert.ok(filteredCommands.some(item => item.name === 'openspec-auto'));
    assert.equal(filteredCommands.some(item => item.name === 'team-standards:openspec-auto'), false);
    assert.ok(filteredCommands.some(item => item.name === 'team-standards:change-readiness'));
    console.log('PASS: native Claude project skill discovery and physically filtered plugin command inventory');
  }
} finally {
  fs.rmSync(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
}
