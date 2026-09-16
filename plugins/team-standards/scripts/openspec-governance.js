#!/usr/bin/env node
// JSON 命令入口。只有 bind/record 写入治理状态，check 始终只读。
const service = require('../hooks/governance/service');
const { requireValue } = require('../hooks/governance/storage');

function parse(argv) {
  const [command, ...args] = argv;
  requireValue(['discover', 'bind', 'record', 'check', 'doctor', 'snapshot'].includes(command),
    'COMMAND_INVALID', '命令：discover | bind | snapshot | record | check | doctor');
  const options = { repo: process.cwd() };
  const allowed = new Set(['repo', 'session', 'change', 'plan', 'phase', 'base', 'head', 'evidence', 'cli', 'files']);
  for (let index = 0; index < args.length; index += 2) {
    const key = args[index].replace(/^--/, '');
    requireValue(args[index].startsWith('--') && allowed.has(key) && args[index + 1]
      && !args[index + 1].startsWith('--'), 'ARGUMENT_INVALID', `无效参数：${args[index]}`);
    options[key] = args[index + 1];
  }
  return { command, options };
}

const output = service.guarded(() => {
  const { command, options } = parse(process.argv.slice(2));
  return service[command](options);
});
process.stdout.write(`${JSON.stringify(output)}\n`);
process.exitCode = ['PASS', 'NOT_APPLICABLE'].includes(output.status) ? 0
  : output.status === 'CHECK_ERROR' ? 1 : 2;
