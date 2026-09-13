#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { contractFiles, multiRepositoryContracts } from './shared-contracts.mjs';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));

export function planSync(workspace) {
  const root = fs.realpathSync(workspace);
  const groups = [
    ...contractFiles.map(({ team, profile }) => [team, profile]),
    ...multiRepositoryContracts.map(({ files }) => files),
  ];
  return groups.flatMap(([source, ...targets]) => {
    const sourcePath = checkedFile(root, source);
    const content = fs.readFileSync(sourcePath);
    return targets.flatMap((target) => {
      const targetPath = checkedFile(root, target);
      const previous = fs.readFileSync(targetPath);
      if (normalized(content) === normalized(previous)) return [];
      return [{ source, target, targetPath, content, previous }];
    });
  });
}

export function applySync(workspace, changes) {
  // Preflight every destination before changing any file; never discard local work.
  for (const change of changes) {
    const repository = path.join(workspace, change.target.split('/')[0]);
    const relative = path.relative(repository, change.targetPath);
    const result = spawnSync('git', ['status', '--porcelain', '--untracked-files=all', '--ignored', '--', relative], {
      cwd: repository, encoding: 'utf8', timeout: 10000,
    });
    if (result.error || result.status !== 0) throw new Error(`cannot inspect ${change.target}: ${result.error?.message || result.stderr}`);
    if (result.stdout.trim()) throw new Error(`local changes in ${change.target}; reconcile them before syncing`);
    if (!fs.readFileSync(change.targetPath).equals(change.previous)) throw new Error(`destination changed during preflight: ${change.target}`);
  }
  for (const change of changes) fs.writeFileSync(change.targetPath, change.content);
}

function checkedFile(root, relative) {
  const absolute = path.resolve(root, relative);
  const real = fs.realpathSync(absolute);
  if (real !== absolute || !real.startsWith(`${root}${path.sep}`) || !fs.statSync(real).isFile()) {
    throw new Error(`unsafe contract path: ${relative}; symlinks and paths outside the workspace are unsupported`);
  }
  return real;
}

function normalized(bytes) { return bytes.toString('utf8').replace(/\r\n/g, '\n'); }

function main() {
  const args = process.argv.slice(2);
  const index = args.indexOf('--workspace');
  if (index >= 0 && (!args[index + 1] || args[index + 1].startsWith('--'))) throw new Error('--workspace requires a path');
  const workspace = path.resolve(index >= 0 ? args[index + 1] : path.join(scriptDirectory, '..', '..'));
  const integrity = spawnSync(process.execPath, [path.join(scriptDirectory, 'check-workspace-contracts.mjs'), '--workspace', workspace, '--canonical-only'], { encoding: 'utf8' });
  if (integrity.status !== 0) throw new Error(integrity.stderr || 'canonical integrity check failed');
  const changes = planSync(workspace);
  for (const { source, target } of changes) console.log(`[sync] ${source} -> ${target}`);
  if (args.includes('--write')) applySync(workspace, changes);
  console.log(`[sync] ${args.includes('--write') ? 'written' : 'preview'}: ${changes.length} file(s); consumer payload changes require their own validation, version bump and commit`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(); } catch (error) { console.error(`[sync] ${error.message}`); process.exitCode = 1; }
}
