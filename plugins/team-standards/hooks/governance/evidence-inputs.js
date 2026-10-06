// 当前 change 的规范证据是输出，保留范围归属，但不能成为自身的源输入。
const storage = require('./storage');

function output(context) {
  return /^[a-z0-9][a-z0-9-]*$/.test(context?.change || '')
    ? `openspec/changes/${context.change}/governance-evidence.json` : null;
}

function files(context, scope) {
  return scope.filter(file => file !== output(context));
}

function fingerprints(root, context, scope) {
  return storage.fingerprints(root, files(context, scope));
}

module.exports = { output, files, fingerprints };
