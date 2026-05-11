// =============================================================
// 端到端测试 check-design-doc.js
// 用临时目录模拟项目根目录 + 设计文档命中/未命中场景
// =============================================================

const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');

const HOOK = path.resolve(__dirname, '..', 'check-design-doc.js');

function runHook(payload, env = {}) {
  const res = spawnSync('node', [HOOK], {
    input: JSON.stringify(payload),
    encoding: 'utf8',
    env: { ...process.env, ...env },
  });
  return { code: res.status, stderr: res.stderr || '', stdout: res.stdout || '' };
}

function mkTmpProject(name) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), `td-${name}-`));
  return root;
}

test('放行：非 Write/Edit/MultiEdit 工具', () => {
  const { code } = runHook({ tool_name: 'Read', tool_input: { file_path: '/tmp/x.dart' } });
  assert.equal(code, 0);
});

test('放行：非源码扩展名 (.md)', () => {
  const { code } = runHook({
    tool_name: 'Write',
    tool_input: { file_path: '/project/docs/note.md', content: '' },
    cwd: '/project',
  });
  assert.equal(code, 0);
});

test('放行：非源码扩展名 (.json / .yml)', () => {
  for (const ext of ['.json', '.yml', '.yaml', '.lock', '.toml', '.txt']) {
    const { code } = runHook({
      tool_name: 'Write',
      tool_input: { file_path: `/project/config${ext}`, content: '' },
      cwd: '/project',
    });
    assert.equal(code, 0, `扩展名 ${ext} 应放行`);
  }
});

test('放行：测试文件 (_test / .test / .spec / /test/ / /tests/)', () => {
  const cases = [
    '/project/test/foo.dart',
    '/project/tests/foo.dart',
    '/project/lib/foo_test.dart',
    '/project/lib/foo.test.ts',
    '/project/lib/foo.spec.ts',
    '/project/src/__tests__/foo.js',
  ];
  for (const fp of cases) {
    const { code } = runHook({
      tool_name: 'Write',
      tool_input: { file_path: fp, content: '' },
      cwd: '/project',
    });
    assert.equal(code, 0, `${fp} 应放行`);
  }
});

test('放行：Dockerfile / Makefile', () => {
  for (const fp of ['/project/Dockerfile', '/project/Makefile']) {
    const { code } = runHook({
      tool_name: 'Write',
      tool_input: { file_path: fp, content: '' },
      cwd: '/project',
    });
    assert.equal(code, 0, `${fp} 应放行`);
  }
});

test('放行：TEAM_STANDARDS_DESIGN_DOC_HOOK=off 一次性绕过', () => {
  const root = mkTmpProject('bypass');
  try {
    const { code } = runHook(
      {
        tool_name: 'Write',
        tool_input: { file_path: path.join(root, 'lib', 'main.dart'), content: '' },
        cwd: root,
      },
      { TEAM_STANDARDS_DESIGN_DOC_HOOK: 'off' },
    );
    assert.equal(code, 0);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('放行：项目内 docs/design/ 存在 .md', () => {
  const root = mkTmpProject('proj-docs-design');
  try {
    fs.mkdirSync(path.join(root, 'docs', 'design'), { recursive: true });
    fs.writeFileSync(path.join(root, 'docs', 'design', 'feature.md'), '# Design');

    const { code } = runHook({
      tool_name: 'Write',
      tool_input: { file_path: path.join(root, 'lib', 'main.dart'), content: '' },
      cwd: root,
    });
    assert.equal(code, 0);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('放行：项目内 docs/<subdir> 含 "design" 关键字的 .md', () => {
  const root = mkTmpProject('proj-design-subdir');
  try {
    fs.mkdirSync(path.join(root, 'docs', 'feature-design'), { recursive: true });
    fs.writeFileSync(path.join(root, 'docs', 'feature-design', 'spec.md'), '# Spec');

    const { code } = runHook({
      tool_name: 'Edit',
      tool_input: { file_path: path.join(root, 'lib', 'feature.dart'), content: '' },
      cwd: root,
    });
    assert.equal(code, 0);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('阻断：源码改动且无设计文档', () => {
  const root = mkTmpProject('proj-no-design');
  try {
    fs.mkdirSync(path.join(root, 'lib'), { recursive: true });

    const { code, stderr } = runHook({
      tool_name: 'Write',
      tool_input: { file_path: path.join(root, 'lib', 'main.dart'), content: 'void main(){}' },
      cwd: root,
    });
    assert.equal(code, 2);
    assert.match(stderr, /未检测到设计文档|未找到/);
    assert.match(stderr, /design-doc-required/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('阻断：MultiEdit 改动源码且无设计文档', () => {
  const root = mkTmpProject('proj-multiedit');
  try {
    const { code } = runHook({
      tool_name: 'MultiEdit',
      tool_input: { file_path: path.join(root, 'lib', 'svc.dart') },
      cwd: root,
    });
    assert.equal(code, 2);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
