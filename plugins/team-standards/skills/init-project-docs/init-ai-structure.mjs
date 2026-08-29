#!/usr/bin/env node

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATE_ROOT = path.join(SCRIPT_DIR, 'assets', 'project-ai-structure');
const TEMPLATE_TARGETS = [
  'AGENTS.md',
  'CLAUDE.md',
  'docs/README.md',
  'docs/INDEX.md',
  'docs/ai-coding-architecture.md',
  'openspec/AGENTS.md',
  'openspec/config.yaml',
];
const GRAPHIFY_OUTPUTS = [
  'graphify-out/graph.json',
  'graphify-out/GRAPH_REPORT.md',
  'graphify-out/manifest.json',
];
const GRAPHIFY_MARKER_START = '# team-standards:graphify:start';
const GRAPHIFY_MARKER_END = '# team-standards:graphify:end';
const GRAPHIFY_BLOCK = `${GRAPHIFY_MARKER_START}
graphify-out/*
!graphify-out/graph.json
!graphify-out/GRAPH_REPORT.md
!graphify-out/manifest.json
${GRAPHIFY_MARKER_END}`;

function readOption(argv, name) {
  const index = argv.indexOf(name);
  return index >= 0 ? argv[index + 1] : undefined;
}

function parseArguments(argv) {
  const command = argv[0] && !argv[0].startsWith('-') ? argv[0] : 'plan';
  if (!['plan', 'apply', 'status'].includes(command)) {
    throw new Error(`未知命令：${command}；可用命令为 plan、apply、status`);
  }
  return {
    command,
    root: path.resolve(readOption(argv, '--root') || process.cwd()),
    projectName: readOption(argv, '--name'),
    json: argv.includes('--json'),
  };
}

function assertSafeRoot(root) {
  if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) {
    throw new Error(`项目根目录不存在或不是目录：${root}`);
  }
  const normalized = path.resolve(root);
  const unsafeRoots = new Set([path.parse(normalized).root, path.resolve(os.homedir())]);
  if (unsafeRoots.has(normalized)) {
    throw new Error(`拒绝在过宽目录初始化：${normalized}`);
  }
}

function resolveProjectName(root, requestedName) {
  const projectName = (requestedName || path.basename(root)).trim();
  if (!projectName || /[{}\r\n]/.test(projectName)) {
    throw new Error('项目名不能为空，且不能包含花括号或换行');
  }
  return projectName;
}

function renderTemplate(relativePath, projectName) {
  const templatePath = path.join(TEMPLATE_ROOT, relativePath);
  return fs.readFileSync(templatePath, 'utf8').replaceAll('{{PROJECT_NAME}}', projectName);
}

function inspectTemplateTarget(root, relativePath, projectName) {
  const targetPath = path.join(root, relativePath);
  const expected = renderTemplate(relativePath, projectName);
  if (!fs.existsSync(targetPath)) return { path: relativePath, state: 'missing', expected };
  const current = fs.readFileSync(targetPath, 'utf8');
  return { path: relativePath, state: current === expected ? 'managed' : 'preserved', expected };
}

function inspectGitignore(root) {
  const targetPath = path.join(root, '.gitignore');
  if (!fs.existsSync(targetPath)) return { path: '.gitignore', state: 'missing' };
  const content = fs.readFileSync(targetPath, 'utf8');
  if (content.includes(GRAPHIFY_MARKER_START) && content.includes(GRAPHIFY_MARKER_END)) {
    return { path: '.gitignore', state: content.includes(GRAPHIFY_BLOCK) ? 'managed' : 'update' };
  }
  const rules = GRAPHIFY_BLOCK.split('\n').slice(1, -1);
  return { path: '.gitignore', state: rules.every((rule) => content.includes(rule)) ? 'preserved' : 'update' };
}

function inspectGraphify(root) {
  return GRAPHIFY_OUTPUTS.map((relativePath) => ({
    path: relativePath,
    state: fs.existsSync(path.join(root, relativePath)) ? 'ready' : 'pending',
  }));
}

function inspectStructure(root, projectName) {
  return {
    root,
    projectName,
    files: [
      ...TEMPLATE_TARGETS.map((target) => inspectTemplateTarget(root, target, projectName)),
      inspectGitignore(root),
    ],
    generated: inspectGraphify(root),
  };
}

function replaceManagedBlock(content) {
  const start = content.indexOf(GRAPHIFY_MARKER_START);
  const end = content.indexOf(GRAPHIFY_MARKER_END);
  if (start >= 0 && end >= start) {
    return `${content.slice(0, start)}${GRAPHIFY_BLOCK}${content.slice(end + GRAPHIFY_MARKER_END.length)}`;
  }
  const separator = content.length === 0 || content.endsWith('\n') ? '' : '\n';
  return `${content}${separator}\n${GRAPHIFY_BLOCK}\n`;
}

function applyStructure(root, projectName) {
  const before = inspectStructure(root, projectName);
  const changes = [];
  for (const entry of before.files.filter((item) => item.path !== '.gitignore')) {
    if (entry.state !== 'missing') continue;
    const targetPath = path.join(root, entry.path);
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.writeFileSync(targetPath, entry.expected, 'utf8');
    changes.push({ path: entry.path, action: 'created' });
  }
  const gitignore = before.files.find((entry) => entry.path === '.gitignore');
  if (gitignore.state === 'missing' || gitignore.state === 'update') {
    const targetPath = path.join(root, '.gitignore');
    const current = fs.existsSync(targetPath) ? fs.readFileSync(targetPath, 'utf8') : '';
    fs.writeFileSync(targetPath, replaceManagedBlock(current), 'utf8');
    changes.push({ path: '.gitignore', action: gitignore.state === 'missing' ? 'created' : 'updated' });
  }
  return { ...inspectStructure(root, projectName), changes };
}

function summarize(result, command) {
  const lines = [`AI structure ${command}: ${result.root}`, `project: ${result.projectName}`];
  for (const entry of result.files) lines.push(`- ${entry.state.padEnd(9)} ${entry.path}`);
  for (const entry of result.generated) lines.push(`- ${entry.state.padEnd(9)} ${entry.path}`);
  if (result.changes) lines.push(`changes: ${result.changes.length}`);
  if (result.generated.some((entry) => entry.state === 'pending')) {
    lines.push('next: run Graphify in the project root, then validate OpenSpec.');
  }
  return lines.join('\n');
}

function run(argv = process.argv.slice(2)) {
  const options = parseArguments(argv);
  assertSafeRoot(options.root);
  const projectName = resolveProjectName(options.root, options.projectName);
  const result = options.command === 'apply'
    ? applyStructure(options.root, projectName)
    : inspectStructure(options.root, projectName);
  process.stdout.write(options.json ? `${JSON.stringify(result, null, 2)}\n` : `${summarize(result, options.command)}\n`);
  if (options.command === 'status' && result.files.some((entry) => entry.state === 'missing')) {
    process.exitCode = 2;
  }
  return result;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    run();
  } catch (error) {
    process.stderr.write(`[init-ai-structure] ${error.message}\n`);
    process.exitCode = 2;
  }
}

export { GRAPHIFY_BLOCK, TEMPLATE_TARGETS, applyStructure, inspectStructure, run };
