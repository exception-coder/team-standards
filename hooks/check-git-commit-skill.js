#!/usr/bin/env node
// =============================================================
// PreToolUse hook: git commit 之前按 staged diff 大小判定
//   - 小改（≤2 文件 / ≤30 行 / 全部为 M 修改）→ 放行
//   - 大改 → 必须先调用 team-standards:git-commit-standards skill
//   - git push 不再拦截（commit 已落地，push 不需要再门禁）
//
// 触发时机：matcher = "Bash"
// 退出码：
//   0 = 放行
//   2 = 阻断，stderr 内容回灌给 Claude
//
// 跨平台：使用 Node.js（Claude Code 自带运行时，必有）
//
// 阈值可通过环境变量调整：
//   TEAM_STANDARDS_TRIVIAL_FILES（默认 2）
//   TEAM_STANDARDS_TRIVIAL_LINES（默认 30，insertions + deletions）
// =============================================================

const fs = require('fs');
const { execSync } = require('child_process');

const TRIVIAL_FILES = parseInt(process.env.TEAM_STANDARDS_TRIVIAL_FILES || '2', 10);
const TRIVIAL_LINES = parseInt(process.env.TEAM_STANDARDS_TRIVIAL_LINES || '30', 10);

let raw = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => { raw += chunk; });
process.stdin.on('end', () => {
  let payload;
  try {
    payload = JSON.parse(raw);
  } catch (e) {
    process.exit(0);
  }

  if (payload.tool_name !== 'Bash') {
    process.exit(0);
  }

  const command = (payload.tool_input && payload.tool_input.command) || '';
  if (!/\bgit\s+commit\b/.test(command)) {
    process.exit(0);
  }

  const cwd = payload.cwd || process.cwd();

  if (isTrivialChange(cwd)) {
    process.exit(0);
  }

  const transcriptPath = payload.transcript_path;
  if (!transcriptPath || !fs.existsSync(transcriptPath)) {
    process.exit(0);
  }

  let content;
  try {
    content = fs.readFileSync(transcriptPath, 'utf8');
  } catch (e) {
    process.exit(0);
  }

  if (/"skill"\s*:\s*"team-standards:git-commit-standards"/.test(content)) {
    process.exit(0);
  }

  process.stderr.write(
    '[team-standards] git commit 被拦截：本次会话尚未调用 team-standards:git-commit-standards skill，' +
    `且 staged diff 不属于「小改」（阈值：≤${TRIVIAL_FILES} 文件 / ≤${TRIVIAL_LINES} 行 / 仅修改现有文件）。\n` +
    '解决方式（任选其一）：\n' +
    '  1. 若改动确实较大：先用 Skill 工具调用 team-standards:git-commit-standards 走五步清单。\n' +
    '  2. 若是误判：把改动拆小到阈值以内再 commit；或临时调高 TEAM_STANDARDS_TRIVIAL_FILES / TEAM_STANDARDS_TRIVIAL_LINES。\n'
  );
  process.exit(2);
});

function isTrivialChange(cwd) {
  let nameStatus;
  let shortstat;
  try {
    nameStatus = execSync('git diff --staged --name-status', { cwd, encoding: 'utf8' }).trim();
    shortstat = execSync('git diff --staged --shortstat', { cwd, encoding: 'utf8' }).trim();
  } catch (e) {
    return false;
  }

  if (!nameStatus || !shortstat) {
    return false;
  }

  const lines = nameStatus.split(/\r?\n/).filter(Boolean);
  const hasNonModify = lines.some((line) => !/^M\b|^M\t/.test(line));
  if (hasNonModify) {
    return false;
  }

  if (lines.length > TRIVIAL_FILES) {
    return false;
  }

  const insMatch = shortstat.match(/(\d+)\s+insertion/);
  const delMatch = shortstat.match(/(\d+)\s+deletion/);
  const totalLines = (insMatch ? parseInt(insMatch[1], 10) : 0)
    + (delMatch ? parseInt(delMatch[1], 10) : 0);
  if (totalLines > TRIVIAL_LINES) {
    return false;
  }

  return true;
}
