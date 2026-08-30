#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

let raw = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => { raw += chunk; });
process.stdin.on('end', () => main(raw));

function main(input) {
  const mode = (process.env.TEAM_STANDARDS_DELIVERY_VERIFICATION_HOOK || 'block').toLowerCase();
  if (mode === 'off') return;
  const payload = parseJson(input);
  const projectRoot = resolveProjectRoot(payload.cwd || process.cwd());
  const changes = executableChanges(projectRoot);
  if (changes.length === 0) return;

  const transcript = readTranscript(payload.transcript_path || payload.transcriptPath);
  if (!sessionHasExecutableEdit(transcript)) return;
  const evidence = findVerificationEvidence(transcript);
  if (evidence.valid) return;

  const message = `[team-standards] 完成被阻止：${evidence.reason}\n`
    + `可执行改动：${changes.slice(0, 8).join(', ')}\n`
    + '请在最后一次修改后调用 forge_verify {"phase":"all"}；MCP 不可用时执行项目声明的 Forge CLI。\n';
  process.stderr.write(message);
  if (mode !== 'warn') process.exitCode = 2;
}

function executableChanges(projectRoot) {
  const result = spawnSync('git', ['status', '--porcelain', '--untracked-files=all'], {
    cwd: projectRoot,
    encoding: 'utf8',
    windowsHide: true,
  });
  if (result.status !== 0) return [];
  return result.stdout.split(/\r?\n/)
    .map((line) => line.length > 3 ? line.slice(3).trim() : '')
    .filter((file) => file && isExecutableChange(file));
}

function isExecutableChange(file) {
  const normalized = file.replace(/\\/g, '/').toLowerCase();
  if (normalized.startsWith('docs/') || normalized.endsWith('.md')) return false;
  return /(^|\/)(pom\.xml|package\.json|dockerfile|makefile)$/.test(normalized)
    || /\.(java|kt|kts|js|jsx|ts|tsx|py|go|rs|dart|sql|xml|ya?ml|toml|properties|gradle)$/.test(normalized);
}

function findVerificationEvidence(transcript) {
  if (!transcript) return { valid: false, reason: '没有可读取的当前会话验证证据' };
  const lastEdit = Math.max(
    transcript.lastIndexOf('"tool_name":"Write"'),
    transcript.lastIndexOf('"tool_name":"Edit"'),
    transcript.lastIndexOf('"tool_name":"MultiEdit"'),
    transcript.lastIndexOf('apply_patch'),
  );
  const lastMcp = transcript.lastIndexOf('forge_verify');
  const lastCli = Math.max(transcript.lastIndexOf('forge-quality.ps1'), transcript.lastIndexOf('forge-quality-cli'));
  const verification = Math.max(lastMcp, lastCli);
  if (verification < 0) return { valid: false, reason: '本轮未执行 forge_verify 或 Forge CLI' };
  if (verification < lastEdit) return { valid: false, reason: '最近一次验证发生在最后一次相关修改之前' };
  const resultText = transcript.slice(verification);
  if (!hasPass(resultText)) return { valid: false, reason: '最近一次 Forge 验证没有 PASS 证据' };
  if (lastMcp >= lastCli && !/"phase"\s*:\s*"all"/.test(resultText)) {
    return { valid: false, reason: 'forge_verify 未使用 phase=all' };
  }
  return { valid: true, reason: '' };
}

function sessionHasExecutableEdit(transcript) {
  if (!transcript || !/(Write|Edit|MultiEdit|apply_patch)/.test(transcript)) return false;
  return /(?:file_path|path|File)[^\r\n]{0,300}(?:\.(?:java|kt|kts|js|jsx|ts|tsx|py|go|rs|dart|sql|xml|ya?ml|toml|properties|gradle)|pom\.xml|package\.json|Dockerfile|Makefile)/i
    .test(transcript);
}

function hasPass(text) {
  return /"status"\s*:\s*"PASSED"/.test(text)
    || /Forge Verification:\s*PASSED/i.test(text);
}

function readTranscript(filePath) {
  if (typeof filePath !== 'string' || !filePath) return '';
  try { return fs.readFileSync(filePath, 'utf8'); } catch (_) { return ''; }
}

function resolveProjectRoot(cwd) {
  const result = spawnSync('git', ['rev-parse', '--show-toplevel'], {
    cwd: path.resolve(cwd), encoding: 'utf8', windowsHide: true,
  });
  return result.status === 0 ? result.stdout.trim() : path.resolve(cwd);
}

function parseJson(value) {
  try { return JSON.parse(value || '{}'); } catch (_) { return {}; }
}

module.exports = { executableChanges, findVerificationEvidence, isExecutableChange, sessionHasExecutableEdit };
