#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const pluginNames = ['team-standards', 'project-coding-profiles', 'yoooni-daily-plugin'];

export function readComponents(workspace) {
  return pluginNames.map((name) => {
    const root = path.join(workspace, name);
    const pluginRoot = path.join(root, 'plugins', name);
    const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
    const versions = [
      readJson(path.join(pluginRoot, '.claude-plugin', 'plugin.json')).version,
      readJson(path.join(pluginRoot, '.codex-plugin', 'plugin.json')).version,
      readJson(path.join(root, '.claude-plugin', 'marketplace.json')).plugins.find((item) => item.name === name)?.version,
    ];
    if (!versions[0] || new Set(versions).size !== 1) throw new Error(`${name}: manifest versions disagree`);
    const skills = fs.readdirSync(path.join(pluginRoot, 'skills'), { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && fs.existsSync(path.join(pluginRoot, 'skills', entry.name, 'SKILL.md'))).length;
    return { name, version: versions[0], skills };
  });
}

export function renderOverview(text, components, domainVersion) {
  let result = text;
  for (const { name, version } of components) {
    result = replaceOnce(result, new RegExp('(\\| `' + name + '` \\| )`[^`]+`( \\|)'), `$1\`${version}\`$2`);
  }
  result = replaceOnce(result, /(\| `project-domain-knowledge` \| )`[^`]+`( \|)/g, `$1\`${domainVersion}\`$2`);
  const teamCount = components[0].skills;
  result = result.replace(/\d+ 个工程治理 Skill/g, `${teamCount} 个工程治理 Skill`)
    .replace(/#\d+-个工程治理-skill/g, `#${teamCount}-个工程治理-skill`);
  const total = components.reduce((sum, item) => sum + item.skills, 0);
  const summary = components.map(({ name, skills }) => `\`${name}\` ${skills} 个`).join('、');
  return replaceOnce(result, /公共层合计 \*\*\d+ 个 Skill\*\*：[^。]+。/g, `公共层合计 **${total} 个 Skill**：${summary}。`);
}

function replaceOnce(text, pattern, replacement) {
  const matches = [...text.matchAll(new RegExp(pattern.source, 'g'))];
  if (matches.length !== 1) throw new Error(`expected one metadata field, found ${matches.length}: ${pattern.source}`);
  return text.replace(pattern, replacement);
}

function main() {
  const index = process.argv.indexOf('--workspace');
  if (index < 0 || !process.argv[index + 1] || process.argv[index + 1].startsWith('--')) throw new Error('explicit --workspace <team-tools> is required');
  const workspace = fs.realpathSync(process.argv[index + 1]);
  const file = path.join(workspace, 'README.md');
  if (fs.realpathSync(file) !== file) throw new Error('README symlinks are unsupported');
  const components = readComponents(workspace);
  const domainVersion = JSON.parse(fs.readFileSync(path.join(workspace, 'project-domain-knowledge', 'package.json'), 'utf8')).version;
  if (!domainVersion) throw new Error('domain package version is missing');
  const before = fs.readFileSync(file, 'utf8');
  const after = renderOverview(before, components, domainVersion);
  if (before !== after) {
    if (!process.argv.includes('--write')) throw new Error('workspace README metadata is stale; run with --write to synchronize only metadata');
    fs.writeFileSync(file, after);
  }
  console.log(`[overview] ${before === after ? 'current' : 'updated'}: ${components.map((item) => `${item.name}@${item.version} (${item.skills})`).join(', ')}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(); } catch (error) { console.error(`[overview] ${error.message}`); process.exitCode = 1; }
}
