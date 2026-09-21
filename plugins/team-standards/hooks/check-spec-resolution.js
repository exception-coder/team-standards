#!/usr/bin/env node
// Thin lifecycle adapter. Forge owns resolution, freshness and Delta decisions.
const fs = require('node:fs');
const path = require('node:path');
const { checkProject } = require('./forge/client');
const { normalizeChanges } = require('./change-input');
const { logHookEvent } = require('./event-log');

function projectRoot(directory) {
  let cursor = path.resolve(directory);
  while (true) {
    if (fs.existsSync(path.join(cursor, 'openspec', 'config.yaml'))) return cursor;
    if (fs.existsSync(path.join(cursor, '.git'))) return cursor;
    const parent = path.dirname(cursor);
    if (parent === cursor) return null;
    cursor = parent;
  }
}
function outcome(mode, message) {
  return { code: mode === 'block' ? 2 : 0, stderr: `[team-standards] Spec Resolution: ${message}\n` };
}
function handle(payload, env = process.env) {
  const mode = env.TEAM_STANDARDS_SPEC_RESOLUTION_HOOK || 'warn';
  if (mode === 'off') return { code: 0 };
  if (!['warn', 'block'].includes(mode)) return outcome('block', 'CONFIG_INVALID: mode must be warn/block/off');
  const command = payload.tool_input?.command || payload.tool_input?.cmd || '';
  const commit = ['Bash', 'exec_command'].includes(payload.tool_name) && /\bgit\s+(?:-[^\s]+\s+[^\s]+\s+)*commit\b/.test(command);
  const gitOperation = ['Bash', 'exec_command'].includes(payload.tool_name) && /\bgit(?:\.exe)?\b[^\r\n]*\b(?:switch|checkout|worktree|branch|symbolic-ref|update-ref)\b/i.test(command);
  const archive = payload.hook_event_name === 'PostToolUse' && /\bopenspec\s+archive\b/.test(command);
  if (payload.hook_event_name === 'PostToolUse' && !archive) return { code: 0 };
  const normalizedPayload = payload.tool_name === 'apply_patch' ? { ...payload, tool_input: {
    command: typeof payload.tool_input === 'string' ? payload.tool_input : payload.tool_input?.command || payload.tool_input?.patch || payload.tool_input?.input,
  } } : payload;
  const changes = normalizeChanges(normalizedPayload).flatMap(change => change.previousFilePath
    ? [change.filePath, change.previousFilePath] : [change.filePath]);
  const roots = new Map();
  if (commit || archive || gitOperation) { const root = projectRoot(payload.tool_input?.workdir || payload.cwd || process.cwd()); if (root) roots.set(root, []); }
  for (const file of changes) {
    const root = projectRoot(path.dirname(file));
    if (!root) continue;
    const relative = path.relative(root, file).replace(/\\/g, '/');
    if (/^(openspec\/|docs\/|\.forge\/spec-resolution\/)/.test(relative) || /\.(md|txt)$/i.test(relative)) continue;
    roots.set(root, [...(roots.get(root) || []), relative]);
  }
  const outputs = [...roots].map(([root, files]) => {
    const result = checkProject(root, files, archive ? 'archive' : commit ? 'commit' : gitOperation ? 'git' : 'write', mode, env, payload.session_id, command);
    if (result.stderr) {
      const logged = logHookEvent({ plugin: 'team-standards', hook: 'check-spec-resolution',
        rule: result.stderr.match(/Spec Resolution: ([A-Z_]+)/)?.[1] || 'CHECK_ERROR',
        mode: result.code === 2 ? 'block' : 'warn', tool: payload.tool_name || 'unknown', file: root },
      { directory: env.TEAM_STANDARDS_HOOK_EVENT_DIR });
      if (!logged) result.stderr += '[team-standards] AUDIT_UNAVAILABLE: 无法写入 Hook 事件日志\n';
    }
    return result;
  });
  return { code: outputs.some(result => result.code === 2) ? 2 : 0,
    stderr: outputs.map(result => result.stderr || '').join('') };
}
if (require.main === module) {
  let raw = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', chunk => {
    raw += chunk;
    if (Buffer.byteLength(raw) > 4 * 1024 * 1024) { process.stderr.write('INPUT_LIMIT\n'); process.exit(2); }
  });
  process.stdin.on('end', () => {
    try { const result = handle(JSON.parse(raw)); if (result.stderr) process.stderr.write(result.stderr); process.exitCode = result.code; }
    catch (error) { process.stderr.write(`Spec Resolution CHECK_ERROR: ${error.message}\n`); process.exitCode = 2; }
  });
}
module.exports = { handle, projectRoot, checkProject };
