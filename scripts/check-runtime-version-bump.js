#!/usr/bin/env node
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const ROOT = path.resolve(__dirname, '..');
const PLUGIN = 'team-standards';
const BASE = argument('--base') || process.env.VERSION_CHECK_BASE || 'HEAD^';
const TARGET = argument('--target');
const MANIFESTS = [`plugins/${PLUGIN}/.claude-plugin/plugin.json`, `plugins/${PLUGIN}/.codex-plugin/plugin.json`, '.claude-plugin/marketplace.json'];
const changed = git(['diff', '--name-only', BASE, ...(TARGET ? [TARGET] : [])]).split(/\r?\n/).filter(Boolean);
const runtime = changed.filter(isRuntimePayload);
if (runtime.length === 0) { console.log('[version-bump] no plugin runtime payload changes'); process.exit(0); }
const current = currentVersion();
const previous = JSON.parse(git(['show', `${BASE}:${MANIFESTS[0]}`])).version;
if (!greaterThan(current, previous)) fail(`runtime payload changed but version did not increase (${previous} -> ${current})`, runtime);
console.log(`[version-bump] OK ${previous} -> ${current}; runtime files: ${runtime.length}`);
function isRuntimePayload(file) {
  const prefix = `plugins/${PLUGIN}/`;
  if (!file.startsWith(prefix)) return false;
  const relative = file.slice(prefix.length);
  if (relative === '.claude-plugin/plugin.json' || relative === '.codex-plugin/plugin.json') return false;
  if (/^(?:hooks\/tests|hooks\/benchmarks)\//.test(relative) || relative === 'hooks/package.json') return false;
  return /^(?:skills|hooks|commands|agents|apps|mcp)\//.test(relative);
}
function currentVersion() {
  const values = MANIFESTS.map((file, index) => { const json = JSON.parse(fs.readFileSync(path.join(ROOT, file), 'utf8')); return index === 2 ? json.plugins[0].version : json.version; });
  if (new Set(values).size !== 1) fail(`manifest versions differ: ${values.join(', ')}`);
  return values[0];
}
function greaterThan(current, previous) { const a = parse(current); const b = parse(previous); for (let i = 0; i < 3; i += 1) { if (a[i] !== b[i]) return a[i] > b[i]; } return false; }
function parse(version) { const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version); if (!match) fail(`invalid SemVer: ${version}`); return match.slice(1).map(Number); }
function argument(name) { const index = process.argv.indexOf(name); return index >= 0 ? process.argv[index + 1] : ''; }
function git(args) { try { return execFileSync('git', ['-C', ROOT, ...args], { encoding: 'utf8' }).trim(); } catch (error) { fail(`cannot inspect git baseline ${BASE}: ${error.message}`); } }
function fail(message, files = []) { console.error(`[version-bump] ${message}`); for (const file of files) console.error(`  - ${file}`); process.exit(1); }
