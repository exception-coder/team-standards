// Git 比较范围与任务基线；保守拒绝无法分离的初始脏文件。
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { MAX_BYTES, requireValue, hashBytes, fingerprints, safePath, canonicalPath } = require('./storage');

function git(root, args, encoding = 'utf8') {
  const result = spawnSync('git', args, { cwd: root, encoding, windowsHide: true,
    timeout: 5000, maxBuffer: MAX_BYTES });
  requireValue(!result.error && result.status === 0, 'GIT_ERROR',
    `Git 无法完成 ${args[0]}，请检查仓库、比较基线及超时`, 'CHECK_ERROR');
  return result.stdout;
}

function repository(cwd) {
  const root = canonicalPath(git(path.resolve(cwd), ['rev-parse', '--show-toplevel']).trim());
  return { root, head: git(root, ['rev-parse', '--verify', 'HEAD']).trim(),
    branch: git(root, ['rev-parse', '--abbrev-ref', 'HEAD']).trim() };
}

function resolveRevision(root, revision) {
  requireValue(typeof revision === 'string' && revision && !revision.startsWith('-'), 'BASE_REQUIRED', '必须提供有效比较基线');
  return git(root, ['rev-parse', '--verify', `${revision}^{commit}`]).trim();
}

function changedFiles(root, base, head) {
  const revision = resolveRevision(root, base);
  const args = ['diff', '--name-only', '--no-renames', '-z', revision];
  if (head) args.push(resolveRevision(root, head));
  args.push('--');
  const tracked = git(root, args).split('\0').filter(Boolean);
  const untracked = head ? [] : git(root, ['ls-files', '--others', '--exclude-standard', '-z']).split('\0').filter(Boolean);
  const files = [...new Set([...tracked, ...untracked])].sort();
  files.forEach(file => safePath(root, file));
  return files;
}

function isExecutable(file) {
  return /\.(?:[cm]?js|jsx|tsx?|java|kt|kts|dart|py|go|rs|rb|php|sql|xml|json|csv|graphql|proto|avsc|ya?ml|toml|properties|gradle|vue|svelte|sh|ps1|cmd|bat|c|cpp|h|cs|swift)$/i.test(file)
    || /(?:^|\/)(?:package(?:-lock)?\.json|[^/]*manifest\.json|Dockerfile|Makefile|Cargo\.lock|go\.mod)$/i.test(file);
}

function verifyBaseline(repo, binding) {
  requireValue(binding.repo === repo.root && binding.branch === repo.branch, 'BINDING_SCOPE', '仓库或分支已改变，请恢复原任务上下文');
  const ancestor = git(repo.root, ['merge-base', binding.base, repo.head]).trim();
  requireValue(ancestor === binding.base, 'BASE_DIVERGED', '起始基线不再是当前 HEAD 的祖先');
  for (const [file, digest] of Object.entries(binding.initial)) {
    if (binding.plan.files.includes(file)) throw new Error('绑定范围含初始脏文件');
    requireValue(fingerprints(repo.root, [file])[file] === digest, 'MIXED_CHANGES', `初始他人改动发生变化，需重新分离范围：${file}`);
  }
}

function fileAt(root, revision, file) {
  const exists = git(root, ['ls-tree', '-z', revision, '--', file]);
  return exists ? hashBytes(git(root, ['show', `${revision}:${file}`], null)) : null;
}

function revisionFingerprints(root, revision, files) {
  const resolved = resolveRevision(root, revision);
  return Object.fromEntries(files.map(file => [file, fileAt(root, resolved, file)]));
}

module.exports = { git, repository, resolveRevision, changedFiles, isExecutable, verifyBaseline, revisionFingerprints };
