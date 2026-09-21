// Frozen v1 compatibility adapter. New runtime policy is owned by Forge protocol v2.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { createHash } = require('node:crypto');
const { spawnSync } = require('node:child_process');
function outcome(mode, message) {
  return { code: mode === 'block' ? 2 : 0, stderr: `[team-standards] Spec Resolution: ${message}\n` };
}
function hasExecution(root, sessionId) {
  return Boolean(sessionId && fs.existsSync(path.join(root, '.forge', 'spec-resolution', `execution-session-${createHash('sha256').update(sessionId).digest('hex')}.json`)));
}
function applicable(root) {
  return fs.existsSync(path.join(root, 'openspec', 'config.yaml')) || fs.existsSync(path.join(root, '.forge', 'spec-resolution'));
}
function checkProject(root, files, operation, mode, env, sessionId, command = '') {
  const execution = Boolean(fs.existsSync(path.join(root, '.forge', 'spec-resolution', 'execution-writer.json'))
    || (sessionId && fs.existsSync(path.join(root, '.forge', 'spec-resolution', `execution-session-${createHash('sha256').update(sessionId).digest('hex')}.json`))));
  if (operation === 'git' && !execution) return { code: 0 };
  let cli = env.FORGE_SPEC_RESOLUTION_CLI;
  if (!cli) {
    const runtime = path.join(env.USERPROFILE || env.HOME || os.homedir(), '.kai-toolbox', 'forge-spec-resolution.json');
    if (fs.existsSync(runtime)) {
      try {
        if (fs.statSync(runtime).size > 16384) throw new Error('runtime config too large');
        const config = JSON.parse(fs.readFileSync(runtime, 'utf8'));
        if (config.protocolVersion !== 1) throw new Error('unsupported protocol');
        cli = config.cli;
      } catch { return outcome(execution ? 'block' : mode, 'FORGE_CONFIG_INVALID: 无法读取本机 Forge runtime 配置'); }
    }
  }
  const failureMode = env.TEAM_STANDARDS_SPEC_RESOLUTION_FAILURE === 'warn' ? 'warn' : execution ? 'block' : mode;
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
      } catch { return outcome(execution ? 'block' : mode, 'CHANGE_CONTEXT_MISMATCH: 会话绑定无效；重新 resolve_specs'); }
    }
  }
  if (!changeId && !execution && operation !== 'archive') return outcome(mode, 'CHANGE_CONTEXT_MISMATCH: 先 discover_execution / assess_execution，或通过 FORGE_OPENSPEC_CHANGE 绑定已有 change');
  const result = spawnSync(process.execPath, [cli, operation === 'archive' ? 'refresh_spec_index' : execution ? 'check_execution_readiness' : 'check_change_readiness'], {
    cwd: root, env, windowsHide: true, encoding: 'utf8', timeout: 10000, maxBuffer: 1024 * 1024,
    input: JSON.stringify({ project: root, sessionId, command, changeId, branch, operation: operation === 'commit' ? 'BEFORE_COMMIT' : 'BEFORE_IMPLEMENTATION', files }),
  });
  if (result.error || result.signal) return outcome(failureMode, `FORGE_UNAVAILABLE: ${result.error?.message || result.signal}`);
  let response;
  try { response = JSON.parse(result.stdout); } catch { return outcome(failureMode, 'FORGE_RESPONSE_INVALID: 需要 JSON 响应'); }
  if (operation === 'archive' && result.status === 0 && /^[a-f0-9]{64}$/.test(response.specRevision)) return { code: 0 };
  if (result.status === 0 && response.allowed === true && response.code === 'PASS') return { code: 0, executionPolicy: execution ? response.policy : undefined };
  if (response.allowed !== false || typeof response.code !== 'string') return outcome(failureMode, 'FORGE_RESPONSE_INVALID: 缺少 allowed/code');
  return outcome(execution ? 'block' : mode, `${response.code}: ${response.message || ''} ${(response.actions || []).join('; ')}`);
}
module.exports = { checkProject, hasExecution, applicable };
