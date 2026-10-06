// Select compatibility evidence from the real Forge execution, never from recent files.
const { AsyncLocalStorage } = require('node:async_hooks');
const fs = require('node:fs');
const context = new AsyncLocalStorage();

function withBindingContext(options, action, env = process.env) {
  if (!options.session || options.evidence) return action(options);
  const { runtime, callForge } = require('../forge/client');
  const { requireValue, canonicalPath } = require('./storage');
  const config = runtime(env);
  if (config.protocolVersion !== 2) return action(options);
  const project = canonicalPath(options.repo || options.root || process.cwd());
  const { response, status } = callForge(config, 'session_init', { project, sessionId: options.session }, env);
  requireValue(status === 0 && response.protocolVersion === 2 && response.sessionId === options.session
    && canonicalPath(response.project) === project, 'GOVERNANCE_CONTEXT_INVALID', 'Forge 返回的真实会话或项目不匹配');
  const execution = response.execution;
  if (!execution?.changeId) return action(options);
  requireValue(execution.ownsWriter && execution.state === 'BOUND', 'GOVERNANCE_CONTEXT_DRIFT', '先恢复当前 Forge 执行的分支和写入归属');
  requireValue(!options.change || options.change === execution.changeId, 'GOVERNANCE_CHANGE_MISMATCH',
    `当前 Forge change 为 ${execution.changeId}，不能使用 ${options.change} 的设计绑定；按当前 change 审阅并绑定`);
  return context.run({ project, session: options.session, change: execution.changeId },
    () => action({ ...options, change: execution.changeId }));
}

function bindingStatePath(root, session, legacy, hash) {
  const scope = context.getStore();
  if (!scope || scope.project !== root || scope.session !== session) return legacy;
  const scoped = legacy.replace(/\.json$/, `.${hash(scope.change)}.json`);
  if (fs.existsSync(scoped)) return scoped;
  // Preserve historical evidence only for the same change; other changes remain untouched.
  if (fs.existsSync(legacy)) {
    const binding = require('./storage').readJson(legacy);
    if (binding.change === scope.change) return legacy;
  }
  return scoped;
}

module.exports = { withBindingContext, bindingStatePath };
