const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');

const hook = path.resolve(__dirname, '..', 'check-ai-doc-location.js');

function repository(t) {
  const temporaryDirectory = fs.realpathSync(os.tmpdir());
  const root = fs.mkdtempSync(path.join(temporaryDirectory, 'bug-doc-location-'));
  fs.mkdirSync(path.join(root, '.git'));
  t.after(() => {
    assert.equal(path.dirname(root), temporaryDirectory);
    assert.ok(path.basename(root).startsWith('bug-doc-location-'));
    fs.rmSync(root, { recursive: true, force: true });
  });
  return root;
}

function check(root, tool, relativePath) {
  const input = tool === 'Write'
    ? { file_path: path.join(root, relativePath), content: '# Evidence' }
    : { command: `*** Begin Patch\n*** Add File: ${relativePath}\n+# Evidence\n*** End Patch` };
  return spawnSync(process.execPath, [hook], {
    input: JSON.stringify({ cwd: root, tool_name: tool, tool_input: input }),
    encoding: 'utf8',
    env: { ...process.env, TEAM_STANDARDS_DOC_LOCATION_HOOK: 'block' },
  });
}

for (const tool of ['Write', 'apply_patch']) {
  test(`${tool} permits a shared Bug record without requiring a personal copy`, t => {
    const root = repository(t);
    for (const file of ['docs/bug/order-state.md', 'docs/bug/order/state.md']) {
      const result = check(root, tool, file);
      assert.equal(result.status, 0, result.stderr);
      assert.equal(result.stderr, '');
      assert.equal(fs.existsSync(path.join(root, file)), false);
    }
  });

  test(`${tool} retains restrictions for other new documents and escaped paths`, t => {
    const root = repository(t);
    for (const file of ['docs/design/new.md', 'docs/bug-like/new.md', 'docs/bug/../design/new.md']) {
      const result = check(root, tool, file);
      assert.equal(result.status, 2, `${file}: ${result.stderr}`);
      assert.match(result.stderr, /ai-docs/);
    }
  });
}

test('existing project documents remain editable', t => {
  const root = repository(t);
  const file = path.join(root, 'docs', 'design', 'existing.md');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, '# Existing');
  const result = check(root, 'Write', 'docs/design/existing.md');
  assert.equal(result.status, 0, result.stderr);
});
