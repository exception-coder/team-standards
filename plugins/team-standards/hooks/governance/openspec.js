// 官方 CLI 的只读协议适配；不复制规格合并与归档算法。
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { MAX_BYTES, requireValue, relativePath, fingerprints } = require('./storage');

function executable(override) {
  const configured = override || process.env.TEAM_STANDARDS_OPENSPEC_CLI;
  if (configured) return /\.[cm]?js$/i.test(configured)
    ? { command: process.execPath, prefix: [path.resolve(configured)] } : { command: configured, prefix: [] };
  for (const directory of (process.env.PATH || '').split(path.delimiter)) {
    const binary = path.join(directory, process.platform === 'win32' ? 'openspec.cmd' : 'openspec');
    if (!fs.existsSync(binary)) continue;
    if (process.platform !== 'win32') return { command: binary, prefix: [] };
    const entry = path.join(directory, 'node_modules', '@fission-ai', 'openspec', 'bin', 'openspec.js');
    if (fs.existsSync(entry)) return { command: process.execPath, prefix: [entry] };
  }
  requireValue(false, 'CLI_MISSING', '未找到 OpenSpec CLI；请安装或指定 TEAM_STANDARDS_OPENSPEC_CLI', 'CHECK_ERROR');
}

function call(root, args, options = {}) {
  const cli = executable(options.cli);
  const result = spawnSync(cli.command, [...cli.prefix, ...args], { cwd: root,
    encoding: 'utf8', windowsHide: true, timeout: 5000, maxBuffer: MAX_BYTES,
    env: { ...process.env, OPENSPEC_TELEMETRY: '0' } });
  requireValue(!result.error && result.status === 0, 'CLI_ERROR',
    `OpenSpec ${args[0]} 失败或超时；请直接运行相同命令查看诊断`, 'CHECK_ERROR');
  return JSON.parse(result.stdout);
}

function loadContext(root, change, options = {}) {
  requireValue(/^[a-z0-9][a-z0-9-]*$/.test(change || ''), 'CHANGE_REQUIRED', '必须明确指定 change ID');
  const status = call(root, ['status', '--change', change, '--json'], options);
  const apply = call(root, ['instructions', 'apply', '--change', change, '--json'], options);
  requireValue(status.changeName === change && apply.changeName === change, 'CLI_CONTRACT', 'CLI 返回了不同 change', 'CHECK_ERROR');
  requireValue(status.isPlanningComplete === true || status.isComplete === true,
    'ARTIFACTS_INCOMPLETE', '先补齐当前 schema 的 planning artifacts', 'NEEDS_WORK');
  requireValue(['ready', 'all_done'].includes(apply.state) && Array.isArray(apply.tasks),
    'APPLY_BLOCKED', 'OpenSpec apply 尚未就绪', 'NEEDS_WORK');
  const files = Object.values(apply.contextFiles || {}).flatMap(value => typeof value === 'string' ? [value] : value);
  for (const item of Object.values(status.artifactPaths || {})) files.push(...(item.existingOutputPaths || []));
  requireValue(files.length > 0 && files.every(file => typeof file === 'string' && !/[*?]/.test(file)),
    'CLI_CONTRACT', 'CLI 必须返回真实工件路径，不能写入 glob', 'CHECK_ERROR');
  const changeDir = status.changeRoot || apply.changeDir;
  requireValue(typeof changeDir === 'string', 'CLI_CONTRACT', 'CLI 缺少 change 真实目录', 'CHECK_ERROR');
  const relativeChange = relativePath(root, changeDir);
  const config = path.join(root, 'openspec', 'config.yaml');
  if (fs.existsSync(config)) files.push(config);
  const metadata = path.join(changeDir, '.openspec.yaml');
  if (fs.existsSync(metadata)) files.push(metadata);
  return { change, changeDir: relativeChange, schema: status.schemaName, tasks: apply.tasks,
    artifacts: fingerprints(root, files.map(file => relativePath(root, file))) };
}

function validate(root, change, options) {
  const result = call(root, ['validate', change, '--strict', '--json', '--no-interactive'], options);
  requireValue(result.items?.some(item => item.id === change && item.valid === true)
    && result.items.every(item => item.valid === true), 'SPEC_INVALID', 'OpenSpec 严格校验未通过', 'NEEDS_WORK');
}

module.exports = { executable, call, loadContext, validate };
