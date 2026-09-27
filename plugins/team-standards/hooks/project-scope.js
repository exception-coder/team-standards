const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { canonicalPath, inside } = require('./governance/storage');

const PROJECT_MARKERS = [
  'pom.xml', 'build.gradle', 'build.gradle.kts',
  'package.json', 'pubspec.yaml', 'Cargo.toml', 'go.mod',
  'pyproject.toml', 'setup.py', 'Gemfile', 'composer.json',
  'openspec/config.yaml', '.team-standards-project.json',
];

function findProjectRoot(filePath) {
  const directories = [];
  let cursor = path.dirname(path.resolve(filePath));
  while (true) {
    // Git 根优先于子包构建标记，同时识别 worktree 的 .git 文件。
    if (fs.existsSync(path.join(cursor, '.git'))) return cursor;
    directories.push(cursor);
    const parent = path.dirname(cursor);
    if (parent === cursor) break;
    cursor = parent;
  }
  return directories.find(directory => PROJECT_MARKERS.some(marker =>
    fs.existsSync(path.join(directory, marker)))) || null;
}

function isExternalTemporaryFile(filePath, cwd = process.cwd()) {
  try {
    if (inside(path.resolve(cwd), path.resolve(filePath))) return false;
    if (!fs.existsSync(path.parse(path.resolve(filePath)).root)) return false;
    const target = canonicalPath(filePath);
    const workingDirectory = canonicalPath(cwd);
    // 先解析目录链接与尚未创建的末级路径，避免通过临时链接绕过项目检查。
    return inside(canonicalPath(os.tmpdir()), target)
      && !inside(workingDirectory, target)
      && !findProjectRoot(target);
  } catch (_) {
    // 无法确定文件归属时保留原检查，不以文件系统错误作为豁免依据。
    return false;
  }
}

module.exports = { findProjectRoot, isExternalTemporaryFile };
