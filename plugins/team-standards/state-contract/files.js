const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const MAX_BYTES = 4 * 1024 * 1024;
const MAX_FILES = 2000;
const hash = value => crypto.createHash('sha256').update(value).digest('hex');

function safePath(root, name) {
  if (typeof name !== 'string' || !name || name.includes('\\') || /^[a-z]:/i.test(name) || path.isAbsolute(name)
      || name.split('/').some(part => !part || part === '..' || part === '.')) {
    throw new Error(`Invalid repository-relative path: ${name}`);
  }
  let current = root;
  for (const part of name.split('/')) {
    current = path.join(current, part);
    if (fs.existsSync(current) && fs.lstatSync(current).isSymbolicLink()) throw new Error(`Symlink: ${name}`);
  }
  return current;
}

function read(root, name) {
  const file = safePath(root, name);
  if (!fs.statSync(file).isFile() || fs.statSync(file).size > MAX_BYTES) throw new Error(`Invalid file size/type: ${name}`);
  return fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
}

function collect(root, directories, extra = []) {
  const files = new Set(extra);
  function visit(name) {
    const full = safePath(root, name);
    const stat = fs.lstatSync(full);
    if (stat.isDirectory()) {
      for (const entry of fs.readdirSync(full).sort()) visit(`${name}/${entry}`);
    } else if (stat.isFile()) files.add(name);
    else throw new Error(`Unsupported file: ${name}`);
    if (files.size > MAX_FILES) throw new Error(`Scope exceeds ${MAX_FILES} files; narrow module roots`);
  }
  for (const directory of directories) visit(directory);
  return [...files].sort();
}

function fingerprint(root, names) {
  return hash(JSON.stringify(names.map(name => [name, hash(read(root, name))])));
}

module.exports = { safePath, read, collect, fingerprint, hash };
