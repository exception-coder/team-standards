#!/usr/bin/env node
// 内部编排入口：Agent 使用命名参数维护绑定，不要求用户编写候选 JSON。
const api = require('../../../hooks/governance/design-preparation');
const { requireValue } = require('../../../hooks/governance/storage');

function run(argv) {
  const [command, ...args] = argv;
  requireValue(['discover', 'prepare', 'upsert'].includes(command), 'DESIGN_COMMAND', '命令：discover | prepare | upsert');
  const names = { root: 'root', session: 'session', module: 'module', scope: 'scopes', capability: 'capabilities', owner: 'owner',
    overview: 'overview', 'overview-heading': 'overviewHeading', detailed: 'detailed', 'detailed-heading': 'detailedHeading',
    'code-version': 'codeVersion', content: 'content', 'migration-reason': 'migrationReason', 'migration-due': 'migrationDue' };
  const options = { root: process.cwd() };
  for (let i = 0; i < args.length; i += 2) {
    const key = names[args[i].replace(/^--/, '')];
    requireValue(args[i].startsWith('--') && key && args[i + 1] && !args[i + 1].startsWith('--'), 'DESIGN_ARGUMENT', `无效参数 ${args[i]}`);
    if (['scopes', 'capabilities'].includes(key)) (options[key] ||= []).push(args[i + 1]);
    else options[key] = args[i + 1];
  }
  return api[command](options);
}

if (require.main === module) {
  try { process.stdout.write(JSON.stringify(run(process.argv.slice(2)), null, 2) + '\n'); }
  catch (error) { process.stdout.write(JSON.stringify({ status: 'NEEDS_WORK', rule: error.rule || 'DESIGN_ERROR', message: error.message }) + '\n'); process.exitCode = 2; }
}
module.exports = { run };
