#!/usr/bin/env node
const { runtime, callForge } = require('./forge/client');
const { projectRoot } = require('./check-spec-resolution');
const fs = require('node:fs');

function handle(payload, env = process.env) {
  if (env.TEAM_STANDARDS_SESSION_INIT_HOOK === 'off') return {};
  try {
    const config = runtime(env);
    // A v1 runtime remains supported; it cannot advertise the new session protocol.
    if (config.protocolVersion !== 2) return {};
    const candidate = projectRoot(payload.cwd || process.cwd());
    if (!candidate) return {};
    const project = fs.realpathSync(candidate);
    if (!payload.session_id) throw new Error('SESSION_ID_MISSING: 宿主未提供会话标识');
    const { response, status } = callForge(config, 'session_init', { project, sessionId: payload.session_id }, env);
    if (status !== 0 || response.protocolVersion !== 2 || response.project !== project || response.sessionId !== payload.session_id
      || !response.capabilities) throw new Error('FORGE_SESSION_INVALID: 无法取得当前会话的能力与执行归属');
    return { hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext: `Forge execution context: ${JSON.stringify(response)}` } };
  } catch (error) {
    // Session startup remains usable for consultation/recovery; writes have their own gate.
    return { systemMessage: `[team-standards] ${error.message || error}；能力未知，写前必须重新查询 Forge。` };
  }
}

if (require.main === module) {
  let raw = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', chunk => { raw += chunk; if (Buffer.byteLength(raw) > 1024 * 1024) process.exit(2); });
  process.stdin.on('end', () => {
    try { process.stdout.write(JSON.stringify(handle(JSON.parse(raw)))); }
    catch (error) { process.stderr.write(String(error)); process.exitCode = 2; }
  });
}
module.exports = { handle };
