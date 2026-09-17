// 治理数据的有界读取、安全路径与原子持久化；不修改业务文件。
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const os = require('node:os');

const MAX_BYTES = 4 * 1024 * 1024;
const MAX_FILES = 1000;
const VERSION = 1;
const POLICY_VERSION = 5;
const CHECKER_VERSION = 5;

class GovernanceError extends Error {
  constructor(rule, message, status = 'CONTEXT_REQUIRED') {
    super(message);
    this.rule = rule;
    this.status = status;
  }
}

function requireValue(condition, rule, message, status) {
  if (!condition) throw new GovernanceError(rule, message, status);
}

function hash(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function readText(file) {
  requireValue(fs.statSync(file).size <= MAX_BYTES, 'INPUT_LIMIT', `文件超过读取上限：${file}`, 'CHECK_ERROR');
  return fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
}

function readJson(file) {
  return JSON.parse(readText(file));
}

function inside(root, file) {
  const relative = path.relative(root, file);
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
}

function canonicalPath(file) {
  let existing = path.resolve(file);
  const suffix = [];
  while (!fs.existsSync(existing)) {
    suffix.unshift(path.basename(existing));
    existing = path.dirname(existing);
  }
  return path.join(fs.realpathSync.native(existing), ...suffix);
}

function safePath(root, relative) {
  requireValue(typeof relative === 'string' && relative.length > 0 && !path.isAbsolute(relative),
    'PATH_SCOPE', '必须使用范围内的相对路径');
  const absolute = path.resolve(root, relative);
  requireValue(inside(root, absolute) && absolute !== root, 'PATH_SCOPE', `路径越界：${relative}`);
  let existing = absolute;
  while (!fs.existsSync(existing)) existing = path.dirname(existing);
  requireValue(inside(canonicalPath(root), canonicalPath(existing)), 'PATH_SYMLINK', `链接越界：${relative}`);
  return absolute;
}

function relativePath(root, absolute) {
  const relative = path.relative(canonicalPath(root), canonicalPath(absolute)).split(path.sep).join('/');
  safePath(root, relative);
  return relative;
}

function fingerprint(root, file) {
  const target = safePath(root, file);
  if (!fs.existsSync(target)) return null;
  requireValue(fs.statSync(target).size <= MAX_BYTES, 'INPUT_LIMIT', `文件超过读取上限：${file}`, 'CHECK_ERROR');
  return hashBytes(fs.readFileSync(target));
}

function hashBytes(bytes) {
  return hash(Buffer.from(bytes.toString('latin1').replace(/\r\n/g, '\n'), 'latin1'));
}

function fingerprints(root, files) {
  requireValue(files.length <= MAX_FILES, 'INPUT_LIMIT', '文件数量超过检查上限', 'CHECK_ERROR');
  return Object.fromEntries([...new Set(files)].sort().map(file => [file, fingerprint(root, file)]));
}

function statePath(root, session) {
  requireValue(typeof session === 'string' && session.trim(), 'SESSION_REQUIRED', '请提供当前会话的 session ID');
  const home = process.env.TEAM_STANDARDS_GOVERNANCE_DATA
    || path.join(os.homedir(), '.local', 'share', 'team-standards', 'governance');
  return path.join(home, hash(canonicalPath(root)), `${hash(session)}.json`);
}

function atomicUpdate(file, update) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const lock = `${file}.lock`;
  let descriptor;
  try { descriptor = fs.openSync(lock, 'wx'); }
  catch (error) {
    if (error.code !== 'EEXIST') throw error;
    throw new GovernanceError('STATE_BUSY', '绑定正在更新；确认没有活动写入后再处理遗留锁');
  }
  const temporary = `${file}.${crypto.randomUUID()}.tmp`;
  try {
    const next = update(fs.existsSync(file) ? readJson(file) : null);
    fs.writeFileSync(temporary, `${JSON.stringify(next, null, 2)}\n`, { flag: 'wx' });
    fs.renameSync(temporary, file);
    return next;
  } finally {
    if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
    fs.closeSync(descriptor);
    fs.unlinkSync(lock);
  }
}

module.exports = { GovernanceError, MAX_BYTES, MAX_FILES, VERSION, POLICY_VERSION, CHECKER_VERSION, requireValue, hash, readText,
  readJson, safePath, inside, canonicalPath, relativePath, hashBytes, fingerprint, fingerprints, statePath, atomicUpdate };
