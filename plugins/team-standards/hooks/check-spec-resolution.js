#!/usr/bin/env node
// Thin lifecycle adapter. Forge owns resolution, freshness and Delta decisions.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { createHash } = require('node:crypto');
const { spawnSync } = require('node:child_process');
const { normalizeChanges } = require('./change-input');
const { logHookEvent } = require('./event-log');

function projectRoot(directory) {
  let cursor = path.resolve(directory);
  while (true) {
    if (fs.existsSync(path.join(cursor, 'openspec', 'config.yaml'))) return cursor;
    if (fs.existsSync(path.join(cursor, '.git'))) return null;
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
  const archive = payload.hook_event_name === 'PostToolUse' && /\bopenspec\s+archive\b/.test(command);
  if (payload.hook_event_name === 'PostToolUse' && !archive) return { code: 0 };
  const normalizedPayload = payload.tool_name === 'apply_patch' ? { ...payload, tool_input: {
    command: typeof payload.tool_input === 'string' ? payload.tool_input : payload.tool_input?.command || payload.tool_input?.patch || payload.tool_input?.input,
  } } : payload;
  const changes = normalizeChanges(normalizedPayload).flatMap(change => change.previousFilePath
    ? [change.filePath, change.previousFilePath] : [change.filePath]);
  const roots = new Map();
  if (commit || archive) { const root = projectRoot(payload.cwd || process.cwd()); if (root) roots.set(root, []); }
  for (const file of changes) {
    const root = projectRoot(path.dirname(file));
    if (!root) continue;
    const relative = path.relative(root, file).replace(/\\/g, '/');
    if (/^(openspec\/|docs\/|\.forge\/spec-resolution\/)/.test(relative) || /\.(md|txt)$/i.test(relative)) continue;
    roots.set(root, [...(roots.get(root) || []), relative]);
  }
  const outputs = [...roots].map(([root, files]) => {
    const result = checkProject(root, files, archive ? 'archive' : commit ? 'commit' : 'write', mode, env, payload.session_id);
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
function checkProject(root, files, operation, mode, env, sessionId) {
  let cli = env.FORGE_SPEC_RESOLUTION_CLI;
  if (!cli) {
    const runtime = path.join(env.USERPROFILE || env.HOME || os.homedir(), '.kai-toolbox', 'forge-spec-resolution.json');
    if (fs.existsSync(runtime)) {
      try {
        if (fs.statSync(runtime).size > 16384) throw new Error('runtime config too large');
        const config = JSON.parse(fs.readFileSync(runtime, 'utf8'));
        if (config.protocolVersion !== 1) throw new Error('unsupported protocol');
        cli = config.cli;
      } catch { return outcome(mode, 'FORGE_CONFIG_INVALID: 无法读取本机 Forge runtime 配置'); }
    }
  }
  const failureMode = env.TEAM_STANDARDS_SPEC_RESOLUTION_FAILURE === 'warn' ? 'warn' : mode;
  if (!cli || !path.isAbsolute(cli) || !fs.existsSync(cli)) return outcome(failureMode,
    'FORGE_UNAVAILABLE: 配置 FORGE_SPEC_RESOLUTION_CLI 为 Forge 编译后的 specResolution/cli.js 绝对路径');
  let changeId = env.FORGE_OPENSPEC_CHANGE;
  let branch;
  if (!changeId && sessionId) {
    const binding = path.join(root, '.forge', 'spec-resolution', `session-${createHash('sha256').update(sessionId).digest('hex')}.json`);
    if (fs.existsSync(binding)) {
      try {
        if (fs.statSync(binding).size > 16384) throw new Error('binding too large');
        const context = JSON.parse(fs.readFileSync(binding, 'utf8'));
        if (fs.realpathSync(context.project) !== fs.realpathSync(root)) throw new Error('project mismatch');
        changeId = context.changeId; branch = context.branch;
      } catch { return outcome(mode, 'CHANGE_CONTEXT_MISMATCH: 会话绑定无效；重新 resolve_specs'); }
    }
  }
  if (!changeId && operation !== 'archive') return outcome(mode, 'CHANGE_CONTEXT_MISMATCH: 通过 FORGE_OPENSPEC_CHANGE 绑定当前 change');
  const result = spawnSync(process.execPath, [cli, operation === 'archive' ? 'refresh_spec_index' : 'check_change_readiness'], {
    cwd: root, env, windowsHide: true, encoding: 'utf8', timeout: 10000, maxBuffer: 1024 * 1024,
    input: JSON.stringify({ project: root, changeId, branch, operation: operation === 'commit' ? 'BEFORE_COMMIT' : 'BEFORE_IMPLEMENTATION', files }),
  });
  if (result.error || result.signal) return outcome(failureMode, `FORGE_UNAVAILABLE: ${result.error?.message || result.signal}`);
  let response;
  try { response = JSON.parse(result.stdout); } catch { return outcome(failureMode, 'FORGE_RESPONSE_INVALID: 需要 JSON 响应'); }
  if (operation === 'archive' && result.status === 0 && /^[a-f0-9]{64}$/.test(response.specRevision)) return { code: 0 };
  if (result.status === 0 && response.allowed === true && response.code === 'PASS') return { code: 0 };
  if (response.allowed !== false || typeof response.code !== 'string') return outcome(failureMode, 'FORGE_RESPONSE_INVALID: 缺少 allowed/code');
  return outcome(mode, `${response.code}: ${response.message || ''} ${(response.actions || []).join('; ')}`);
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
module.exports = { handle, projectRoot };
