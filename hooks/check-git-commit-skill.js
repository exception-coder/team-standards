#!/usr/bin/env node
// =============================================================
// PreToolUse hook: 强制 git commit / git push 之前必须先调用
// team-standards:git-commit-standards skill。
//
// 触发时机：matcher = "Bash"
// 退出码：
//   0 = 放行
//   2 = 阻断，stderr 内容回灌给 Claude
//
// 跨平台：使用 Node.js（Claude Code 自带运行时，必有）
// =============================================================

const fs = require('fs');

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
  if (!/\bgit\s+(commit|push)\b/.test(command)) {
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

  // 只匹配 Skill 工具的真实调用，不匹配普通文字提及
  if (/"skill"\s*:\s*"team-standards:git-commit-standards"/.test(content)) {
    process.exit(0);
  }

  process.stderr.write(
    '[team-standards] git commit/push 被拦截：本次会话尚未调用 team-standards:git-commit-standards skill。\n' +
    '请先用 Skill 工具调用 team-standards:git-commit-standards，按五步清单完成 commit 信息生成与确认后再继续。\n'
  );
  process.exit(2);
});
