const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { normalizeChanges } = require('../change-input');

const cwd = path.resolve('fixture-root');

test('Claude Write/Edit/MultiEdit normalize to one change', () => {
  const write = normalizeChanges({
    tool_name: 'Write', cwd,
    tool_input: { file_path: 'src/new.js', content: 'const 文本 = 1;' },
  });
  assert.equal(write.length, 1);
  assert.equal(write[0].operation, 'add');
  assert.equal(write[0].filePath, path.resolve(cwd, 'src/new.js'));
  assert.equal(write[0].addedText, 'const 文本 = 1;');

  const edit = normalizeChanges({
    tool_name: 'Edit', cwd,
    tool_input: { file_path: 'src/a.js', old_string: 'old', new_string: 'new' },
  });
  assert.equal(edit[0].operation, 'update');
  assert.equal(edit[0].addedText, 'new');
  assert.equal(edit[0].removedText, 'old');

  const multi = normalizeChanges({
    tool_name: 'MultiEdit', cwd,
    tool_input: { file_path: 'src/a.js', edits: [
      { old_string: 'a', new_string: 'b' },
      { old_string: 'c', new_string: 'd' },
    ] },
  });
  assert.equal(multi[0].addedText, 'b\nd');
  assert.equal(multi[0].removedText, 'a\nc');
});
test('Codex multi-file patch preserves operation, paths, additions, and removals', () => {
  const changes = normalizeChanges({
    tool_name: 'apply_patch', cwd,
    tool_input: { command: [
      '*** Begin Patch',
      '*** Add File: src/new.js',
      '+const added = true;',
      '*** Update File: src/old.js',
      '@@',
      '-const before = true;',
      '+const after = true;',
      '*** Delete File: src/dead.js',
      '-obsolete',
      '*** Update File: src/from.js',
      '*** Move to: src/to.js',
      '@@',
      '-oldName',
      '+newName',
      '*** End Patch',
    ].join('\n') },
  });

  assert.deepEqual(changes.map((change) => change.operation), ['add', 'update', 'delete', 'move']);
  assert.equal(changes[0].filePath, path.resolve(cwd, 'src/new.js'));
  assert.equal(changes[0].addedText, 'const added = true;');
  assert.equal(changes[1].removedText, 'const before = true;');
  assert.equal(changes[1].addedText, 'const after = true;');
  assert.equal(changes[3].previousFilePath, path.resolve(cwd, 'src/from.js'));
  assert.equal(changes[3].filePath, path.resolve(cwd, 'src/to.js'));
});

test('unknown and malformed payloads safely produce no changes', () => {
  assert.deepEqual(normalizeChanges(null), []);
  assert.deepEqual(normalizeChanges({ tool_name: 'Bash', tool_input: {} }), []);
  assert.deepEqual(normalizeChanges({ tool_name: 'apply_patch', tool_input: { command: 'bad patch' } }), []);
});
