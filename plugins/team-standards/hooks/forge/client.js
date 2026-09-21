// Transport and protocol adaptation only. No Forge state paths or business policy here.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawnSync } = require('node:child_process');
const legacy = require('./legacy-v1');

function runtime(env = process.env) {
  let config = {};
  if (!env.FORGE_SPEC_RESOLUTION_CLI) {
    const file = path.join(env.USERPROFILE || env.HOME || os.homedir(), '.kai-toolbox', 'forge-spec-resolution.json');
    if (fs.existsSync(file)) {
      if (fs.statSync(file).size > 16384) throw new Error('FORGE_CONFIG_INVALID: runtime config too large');
      config = JSON.parse(fs.readFileSync(file, 'utf8'));
    }
  }
  const protocolVersion = Number(env.FORGE_EXECUTION_PROTOCOL || config.protocolVersion || 1);
  if (![1, 2].includes(protocolVersion)) throw new Error('FORGE_CONFIG_INVALID: unsupported protocol');
  return { protocolVersion, cli: env.FORGE_SPEC_RESOLUTION_CLI || config.cli };
}

function callForge(config, name, input, env = process.env) {
  if (!config.cli || !path.isAbsolute(config.cli) || !fs.existsSync(config.cli)) {
    throw new Error('FORGE_UNAVAILABLE: 使用 Forge 安装器注册已编译的 CLI');
  }
  const result = spawnSync(process.execPath, [config.cli, name], {
    cwd: input.project, env, windowsHide: true, encoding: 'utf8', timeout: 10000, maxBuffer: 1024 * 1024,
    input: JSON.stringify(input),
  });
  if (result.error || result.signal) throw new Error(`FORGE_UNAVAILABLE: ${result.error?.message || result.signal}`);
  let response;
  try { response = JSON.parse(result.stdout); } catch { throw new Error('FORGE_RESPONSE_INVALID: 需要 JSON 响应'); }
  if (!response || typeof response !== 'object' || Array.isArray(response)) throw new Error('FORGE_RESPONSE_INVALID: 需要响应对象');
  return { response, status: result.status };
}

function diagnostic(mode, message) {
  return { code: mode === 'block' ? 2 : 0, enforcement: mode, stderr: `[team-standards] Spec Resolution: ${message}\n` };
}

function checkProject(root, files, operation, mode, env = process.env, sessionId, command = '') {
  try {
    const config = runtime(env);
    if (config.protocolVersion === 1) {
      if (!legacy.applicable(root)) return { code: 0, legacyGovernanceRequired: true };
      return legacy.checkProject(root, files, operation, mode, env, sessionId, command);
    }
    const archive = operation === 'archive';
    const { response, status } = callForge(config, archive ? 'refresh_spec_index' : 'check_execution_event', archive ? { project: root } : {
      project: root, sessionId, files, command, event: { write: 'WRITE', commit: 'COMMIT', stop: 'STOP', git: 'GIT' }[operation],
      legacyMode: mode, ...(env.FORGE_OPENSPEC_CHANGE ? { changeId: env.FORGE_OPENSPEC_CHANGE } : {}),
    }, env);
    if (archive && status === 0 && /^[a-f0-9]{64}$/.test(response.specRevision)) return { code: 0 };
    if (response.code === 'TOOL_INVALID') throw new Error('FORGE_UPGRADE_REQUIRED: 当前 CLI 不支持 execution v2；升级 Forge 运行时');
    if (response.protocolVersion !== 2 || typeof response.allowed !== 'boolean' || typeof response.code !== 'string'
      || !['warn', 'block'].includes(response.enforcement) || typeof response.legacyGovernanceRequired !== 'boolean') {
      throw new Error('FORGE_RESPONSE_INVALID: execution v2 决策字段缺失');
    }
    if (response.allowed && (status !== 0 || response.code !== 'PASS')) throw new Error('FORGE_RESPONSE_INVALID: 退出码与允许决策不一致');
    const result = response.allowed ? { code: 0 } : diagnostic(response.enforcement,
      `${response.code}: ${response.message || ''} ${(response.actions || []).join('; ')}`);
    return { ...result, enforcement: response.enforcement, executionPolicy: response.policy,
      legacyGovernanceRequired: response.allowed ? response.legacyGovernanceRequired : true };
  } catch (error) {
    // Without a response, binding/ownership is unknown. Never guess it from private files.
    return diagnostic(env.TEAM_STANDARDS_SPEC_RESOLUTION_FAILURE === 'warn' ? 'warn' : 'block', String(error.message || error));
  }
}

function checkGovernance(root, files, operation, mode, env, sessionId) {
  try {
    if (runtime(env).protocolVersion === 1) {
      if (!legacy.hasExecution(root, sessionId)) return { code: 0, legacyGovernanceRequired: true };
      const result = legacy.checkProject(root, files, operation === 'stop' ? 'commit' : operation, 'block', env, sessionId);
      return { ...result, enforcement: 'block', legacyGovernanceRequired: !(result.code === 0 && result.executionPolicy?.spec === 'NO_SPEC_CHANGE') };
    }
    return checkProject(root, files, operation, mode, env, sessionId);
  } catch (error) { return diagnostic('block', String(error.message || error)); }
}

module.exports = { runtime, callForge, checkProject, checkGovernance };
