#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const workspace = path.resolve(readOption('--workspace') || path.resolve(scriptDirectory, '..', '..'));
const output = path.resolve(readOption('--out') || path.join(os.tmpdir(), `team-tools-release-${releaseStamp()}`));
const skipTests = process.argv.includes('--skip-tests');
const pluginValidator = readOption('--plugin-validator');
const commandTimeoutMs = readCommandTimeout();

const plugins = [
  plugin('team-standards', 'team-standards'),
  plugin('project-coding-profiles', 'project-coding-profiles'),
  plugin('yoooni-daily-plugin', 'yoooni-daily-plugin'),
];

assertOutputDirectory(output);
validateWorkspaceContracts();

for (const item of plugins) {
  validatePluginMetadata(item);
  if (pluginValidator) run(process.platform === 'win32' ? 'python' : 'python3', [pluginValidator, item.pluginRoot], workspace);
}

if (!skipTests) runRepositoryTests();

fs.mkdirSync(output, { recursive: true });
const releaseManifest = {
  generatedAt: new Date().toISOString(),
  dryRun: true,
  workspace,
  plugins: [],
};

for (const item of plugins) releaseManifest.plugins.push(buildArtifact(item));
fs.writeFileSync(path.join(output, 'release-manifest.json'), `${JSON.stringify(releaseManifest, null, 2)}\n`);
console.log(`[release] dry-run complete: ${output}`);

function plugin(repositoryName, pluginName) {
  const repositoryRoot = path.join(workspace, repositoryName);
  return {
    name: pluginName,
    repositoryRoot,
    pluginRoot: path.join(repositoryRoot, 'plugins', pluginName),
  };
}

function validateWorkspaceContracts() {
  run(process.execPath, [path.join(scriptDirectory, 'check-workspace-contracts.mjs'), '--workspace', workspace], workspace);
}

function validatePluginMetadata(item) {
  assertDirectory(item.repositoryRoot);
  assertDirectory(item.pluginRoot);
  const codexManifest = readJson(path.join(item.pluginRoot, '.codex-plugin', 'plugin.json'));
  const claudeManifest = readJson(path.join(item.pluginRoot, '.claude-plugin', 'plugin.json'));
  const marketplace = readJson(path.join(item.repositoryRoot, '.claude-plugin', 'marketplace.json'));
  const personalMarketplace = readJson(path.join(item.repositoryRoot, '.agents', 'plugins', 'marketplace.json'));
  const marketplaceEntry = marketplace.plugins?.find((entry) => entry.name === item.name);
  const personalEntry = personalMarketplace.plugins?.find((entry) => entry.name === item.name);
  const versions = [codexManifest.version, claudeManifest.version, marketplaceEntry?.version];

  if (codexManifest.name !== item.name || claudeManifest.name !== item.name) {
    fail(`${item.name}: manifest name does not match the plugin directory`);
  }
  if (versions.some((version) => !version) || new Set(versions).size !== 1) {
    fail(`${item.name}: version mismatch (${versions.join(', ')})`);
  }
  if (Object.hasOwn(codexManifest, 'hooks')) fail(`${item.name}: unsupported Codex manifest hooks override`);
  if (!fs.statSync(path.join(item.pluginRoot, 'hooks', 'hooks.json'), { throwIfNoEntry: false })?.isFile()) {
    fail(`${item.name}: hooks/hooks.json is missing`);
  }
  if (personalEntry?.source?.path !== `./plugins/${item.name}`) fail(`${item.name}: personal marketplace source path is invalid`);
  if (personalEntry?.policy?.installation !== 'AVAILABLE' || personalEntry?.policy?.authentication !== 'ON_INSTALL') {
    fail(`${item.name}: personal marketplace policy is incomplete`);
  }
  item.version = versions[0];
  console.log(`[release] metadata OK: ${item.name}@${item.version}`);
}

function runRepositoryTests() {
  const team = plugins[0];
  run(process.execPath, ['--test'], path.join(team.pluginRoot, 'hooks'));
  for (const script of ['sync-agents.js', 'check-cross-refs.js', 'check-version-sync.js', 'audit-skills.js']) {
    const args = [path.join(team.repositoryRoot, 'scripts', script)];
    if (script === 'sync-agents.js') args.push('--check');
    if (script === 'audit-skills.js') args.push('--warnings', '--ci');
    run(process.execPath, args, team.repositoryRoot);
  }

  run(process.execPath, ['--test'], path.join(plugins[1].pluginRoot, 'hooks'));
  run(process.execPath, ['--test'], path.join(plugins[2].pluginRoot, 'hooks'));
  for (const plugin of plugins) {
    run(process.execPath, [path.join(plugin.repositoryRoot, 'scripts', 'check-runtime-version-bump.js'), '--base', 'HEAD'], plugin.repositoryRoot);
  }

  if (process.platform === 'win32') {
    const daily = plugins[2];
    run('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', path.join(daily.pluginRoot, 'skills', 'yoooni-prod-log-query', 'query-prod-log.ps1'), '-SelfTest'], daily.repositoryRoot);
    run('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', path.join(daily.pluginRoot, 'scripts', 'tests', 'update-lock.tests.ps1')], daily.repositoryRoot);
  }
}

function buildArtifact(item) {
  const stagingName = `${item.name}-${item.version}`;
  const stagingRoot = path.join(output, stagingName);
  fs.cpSync(item.pluginRoot, stagingRoot, { recursive: true });
  const inventory = inventoryFiles(stagingRoot);
  const source = gitSource(item.repositoryRoot);
  const artifactManifest = {
    name: item.name,
    version: item.version,
    source,
    files: inventory,
  };
  fs.writeFileSync(path.join(stagingRoot, 'artifact-manifest.json'), `${JSON.stringify(artifactManifest, null, 2)}\n`);

  const archiveName = `${stagingName}.tar.gz`;
  const archivePath = path.join(output, archiveName);
  run('tar', ['-czf', archivePath, '-C', output, stagingName], workspace);
  const archiveHash = sha256(fs.readFileSync(archivePath));
  fs.writeFileSync(path.join(output, `${archiveName}.sha256`), `${archiveHash}  ${archiveName}\n`);
  console.log(`[release] artifact: ${archiveName} (${inventory.length} files)`);
  return { name: item.name, version: item.version, archive: archiveName, sha256: archiveHash, source };
}

function inventoryFiles(root) {
  const files = [];
  visit(root);
  return files.sort((left, right) => left.path.localeCompare(right.path));

  function visit(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        visit(absolute);
      } else if (entry.isFile()) {
        const bytes = fs.readFileSync(absolute);
        files.push({
          path: path.relative(root, absolute).split(path.sep).join('/'),
          bytes: bytes.length,
          sha256: sha256(bytes),
        });
      }
    }
  }
}

function gitSource(repositoryRoot) {
  const revision = runCapture('git', ['-c', `safe.directory=${repositoryRoot}`, 'rev-parse', 'HEAD'], repositoryRoot).trim();
  const status = runCapture('git', ['-c', `safe.directory=${repositoryRoot}`, 'status', '--porcelain'], repositoryRoot);
  return { revision, dirty: Boolean(status.trim()) };
}

function run(command, args, cwd) {
  console.log(`[release] run: ${command} ${args.join(' ')}`);
  const result = spawnSync(command, args, { cwd, encoding: 'utf8', stdio: 'inherit', timeout: commandTimeoutMs });
  if (result.error) fail(`${command} failed to start: ${result.error.message}`);
  if (result.status !== 0) fail(`${command} exited with ${result.status}`);
}

function runCapture(command, args, cwd) {
  const result = spawnSync(command, args, { cwd, encoding: 'utf8', timeout: commandTimeoutMs });
  if (result.error) fail(`${command} failed to start: ${result.error.message}`);
  if (result.status !== 0) fail(`${command} exited with ${result.status}: ${result.stderr}`);
  return result.stdout;
}

function assertOutputDirectory(directory) {
  const existing = fs.statSync(directory, { throwIfNoEntry: false });
  if (existing && (!existing.isDirectory() || fs.readdirSync(directory).length > 0)) {
    fail(`output directory must be absent or empty: ${directory}`);
  }
}

function assertDirectory(directory) {
  if (!fs.statSync(directory, { throwIfNoEntry: false })?.isDirectory()) fail(`required directory is missing: ${directory}`);
}

function readJson(filePath) {
  try { return JSON.parse(fs.readFileSync(filePath, 'utf8')); }
  catch (error) { fail(`invalid JSON ${filePath}: ${error.message}`); }
}

function readOption(name) {
  const index = process.argv.indexOf(name);
  if (index < 0) return '';
  if (!process.argv[index + 1]) fail(`${name} requires a value`);
  return process.argv[index + 1];
}

function releaseStamp() {
  return new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

function readCommandTimeout() {
  const value = Number.parseInt(process.env.TEAM_TOOLS_RELEASE_COMMAND_TIMEOUT_MS || '120000', 10);
  return Number.isInteger(value) && value >= 1000 && value <= 900000 ? value : 120000;
}

function sha256(bytes) {
  return crypto.createHash('sha256').update(bytes).digest('hex');
}

function fail(message) {
  console.error(`[release] ${message}`);
  process.exit(1);
}
