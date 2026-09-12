#!/usr/bin/env node
// 写前与 Stop 适配；只在绑定范围检查，不在 Hook 中调用模型、构建或归档。
const fs = require('node:fs');
const path = require('node:path');
const { normalizeChanges } = require('./change-input');
const service = require('./governance/service');
const { repository, isExecutable } = require('./governance/repository');
const { statePath, atomicUpdate, relativePath, MAX_BYTES, MAX_FILES, requireValue } = require('./governance/storage');

function handle(payload) {
  const mode = (process.env.TEAM_STANDARDS_OPENSPEC_GOVERNANCE_HOOK || 'warn').toLowerCase();
  if (mode === 'off') return { code: 0 };
  if ((process.env.TEAM_STANDARDS_OPENSPEC_LEGACY_APPROVED || '').toLowerCase() === 'on') return { code: 0 };
  const stop = payload.hook_event_name === 'Stop';
  const changes = stop ? [] : normalizeChanges(payload).flatMap(change => change.previousFilePath
    ? [change, { ...change, filePath: change.previousFilePath }] : [change]).filter(change => isExecutable(change.filePath));
  requireValue(changes.length <= MAX_FILES, 'INPUT_LIMIT', '写入范围超过检查上限', 'CHECK_ERROR');
  if (!stop && changes.length === 0) return { code: 0 };
  const session = process.env.TEAM_STANDARDS_GOVERNANCE_SESSION || payload.session_id;
  const outcomes = [];
  const roots = new Map();
  for (const change of changes) {
    const folder = nearestExisting(path.dirname(path.resolve(payload.cwd || process.cwd(), change.filePath)));
    const candidate = service.guarded(() => repository(folder));
    if (candidate.root) {
      const files = roots.get(candidate.root) || [];
      const relative = relativePath(candidate.root, path.resolve(payload.cwd || process.cwd(), change.filePath));
      if (/^openspec\/(?:config\.yaml$|schemas\/|changes\/[^/]+\/(?:\.openspec\.yaml|governance-evidence\.json)$)/.test(relative)) continue;
      files.push(relative);
      roots.set(candidate.root, files);
    } else if (hasConfig(payload.cwd || process.cwd())) outcomes.push(candidate);
  }
  if (stop) roots.set(path.resolve(payload.cwd || process.cwd()), []);
  for (const [cwd, files] of roots) {
    if (!hasConfig(cwd)) continue;
    const output = service.guarded(() => {
      const repo = repository(cwd);
      if (stop && (!session || !fs.existsSync(statePath(repo.root, session)))) return service.result('NOT_APPLICABLE');
      return service.check({ repo: repo.root, session, phase: stop ? 'delivery' : 'preflight', files });
    });
    if (!['PASS', 'NOT_APPLICABLE'].includes(output.status)) outcomes.push(output);
  }
  if (outcomes.length === 0) return { code: 0 };
  const message = `[team-standards] OpenSpec 文档推进未完成：${outcomes.flatMap(item => item.findings)
    .map(item => `${item.rule}: ${item.message}`).join('\n')}\n`;
  if (mode === 'warn') return { code: 0, stderr: message };
  if (!stop) return { code: 2, stderr: message };
  return stopDecision(payload, session, message);
}

function hasConfig(cwd) {
  let cursor = path.resolve(cwd);
  while (true) {
    if (fs.existsSync(path.join(cursor, 'openspec', 'config.yaml'))) return true;
    if (fs.existsSync(path.join(cursor, '.git'))) return false;
    const parent = path.dirname(cursor);
    if (parent === cursor) return false;
    cursor = parent;
  }
}

function nearestExisting(directory) {
  while (!fs.existsSync(directory)) directory = path.dirname(directory);
  return directory;
}

function stopDecision(payload, session, message) {
  const attempt = service.guarded(() => {
    const repo = repository(payload.cwd);
    const current = atomicUpdate(statePath(repo.root, session), previous => ({ ...previous, retries: (previous?.retries || 0) + 1 }));
    return current.retries;
  });
  if (typeof attempt !== 'number' || attempt > 2) {
    return { code: 0, stderr: message, json: { systemMessage: `${message}自动补齐预算已耗尽，当前任务仍未完成；需报告剩余缺口，CI 仍将失败。` } };
  }
  return { code: 0, json: { decision: 'block', reason: `${message}请继续补齐当前切片并重新验证（${attempt}/2）。` } };
}

if (require.main === module) {
  let raw = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', chunk => {
    if (Buffer.byteLength(raw) + Buffer.byteLength(chunk) > MAX_BYTES) {
      process.stderr.write('[team-standards] OpenSpec Hook INPUT_LIMIT\n');
      process.exit(2);
    }
    raw += chunk;
  });
  process.stdin.on('end', () => {
    try {
      const output = handle(JSON.parse(raw));
      if (output.json) process.stdout.write(`${JSON.stringify(output.json)}\n`);
      if (output.stderr) process.stderr.write(output.stderr);
      process.exitCode = output.code;
    } catch (error) {
      process.stderr.write(`[team-standards] OpenSpec Hook CHECK_ERROR: ${error.message}\n`);
      process.exitCode = 2;
    }
  });
}

module.exports = { handle, hasConfig };
