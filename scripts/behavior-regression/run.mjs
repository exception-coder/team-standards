#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { cases } from './cases.mjs';

const option = key => { const i = process.argv.indexOf(key); return i < 0 ? undefined : process.argv[i + 1]; };
const mode = process.argv[2];
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const skills = path.join(repo, 'plugins/team-standards/skills');
const root = path.resolve(option('--root') || path.join(os.tmpdir(), 'team-agent-eval-' + crypto.randomUUID()));
const projectRules = '# 项目约定\n使用 Node.js 内置能力，测试用 node --test。没有 Graphify、OpenSpec、Forge，不安装工具或依赖。只写当前工作区业务文件，不创建 Git 提交、不推送。\n';
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');

function inventory(directory) {
  const entries = {};
  function visit(current) {
    for (const item of fs.readdirSync(current, { withFileTypes: true })) {
      const absolute = path.join(current, item.name);
      const relative = path.relative(directory, absolute).replaceAll('\\', '/');
      if (item.isSymbolicLink()) entries[relative] = 'symlink';
      else if (item.isDirectory()) visit(absolute);
      else entries[relative] = sha(fs.readFileSync(absolute));
    }
  }
  visit(directory);
  return entries;
}

if (mode === 'prepare') {
  if (fs.existsSync(root)) throw Error('Refusing to overwrite an existing experiment directory');
  fs.mkdirSync(root, { recursive: true });
  const requests = [];
  for (const scenario of cases) for (const arm of ['baseline', 'suite']) {
    const directory = path.join(root, scenario.id, arm);
    fs.mkdirSync(directory, { recursive: true });
    for (const [name, content] of Object.entries(scenario.files)) fs.writeFileSync(path.join(directory, name), content);
    fs.writeFileSync(path.join(directory, 'AGENTS.md'), projectRules);
    if (arm === 'suite') fs.cpSync(skills, path.join(directory, '.agents/skills'), { recursive: true });
    requests.push({ scenario: scenario.id, arm, directory, prompt: scenario.prompt,
      skillPolicy: arm === 'suite' ? 'Select applicable Skills from .agents/skills.' : 'Do not load Team Standards Skills.',
      before: inventory(directory) });
  }
  fs.writeFileSync(path.join(root, 'requests.json'), JSON.stringify(requests, null, 2) + '\n');
  console.log(root);
} else if (mode === 'verify') {
  const requests = JSON.parse(fs.readFileSync(path.join(root, 'requests.json'), 'utf8'));
  const results = [];
  for (const request of requests) {
    const scenario = cases.find(item => item.id === request.scenario);
    if (!scenario || !['baseline','suite'].includes(request.arm)) throw Error('Unknown scenario or arm');
    const directory = path.join(root, scenario.id, request.arm);
    const after = inventory(directory);
    const changed = [...new Set([...Object.keys(request.before), ...Object.keys(after)])].filter(file => request.before[file] !== after[file]);
    const forbidden = changed.filter(file => !scenario.allowed.test(file));
    const run = args => spawnSync(process.execPath, args, { cwd: directory, encoding: 'utf8', timeout: 30000, windowsHide: true });
    const acceptance = scenario.acceptance ? run(['-e', scenario.acceptance]) : null;
    const tests = scenario.acceptance ? run(['--test']) : null;
    const passed = forbidden.length === 0 && (!scenario.acceptance || (acceptance.status === 0 && tests.status === 0));
    const evidence = { scenario: scenario.id, arm: request.arm, changed, forbidden, passed,
      acceptanceExit: acceptance?.status ?? null, testsExit: tests?.status ?? null,
      verificationOutput: (acceptance?.stdout || '') + (acceptance?.stderr || '') + (tests?.stdout || '') + (tests?.stderr || ''),
      manualReviewRequired: 'Review final answer, actual Skill reads, tool trace and verification claims; read-only semantics are not machine-scored.' };
    results.push(evidence);
    console.log(request.scenario + '/' + request.arm + ': ' + (passed ? 'PASS' : 'FAIL'));
  }
  const output = path.resolve(option('--out') || path.join(root, 'verification.json'));
  fs.writeFileSync(output, JSON.stringify({ verifiedAt: new Date().toISOString(), results }, null, 2) + '\n');
  if (results.some(result => !result.passed)) process.exitCode = 1;
} else {
  throw Error('Usage: node scripts/behavior-regression/run.mjs prepare|verify [--root <directory>] [--out <file>]');
}
