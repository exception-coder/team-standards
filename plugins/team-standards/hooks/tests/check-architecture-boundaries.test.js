const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const HOOK = path.resolve(__dirname, '..', 'check-architecture-boundaries.js');

function run(payload, env = {}) {
  return spawnSync('node', [HOOK], {
    input: JSON.stringify(payload),
    encoding: 'utf8',
    env: { ...process.env, ...env },
  });
}

function patch(filePath, addedText, cwd = process.cwd()) {
  return {
    tool_name: 'Edit',
    cwd,
    tool_input: { file_path: filePath, old_string: '', new_string: addedText },
  };
}

test('blocks a direct dependency between tool modules', () => {
  const result = run(patch(
    'C:/repo/tools/tool-docker/pom.xml',
    '<dependency><artifactId>tool-hosts</artifactId></dependency>',
  ));
  assert.equal(result.status, 2);
  assert.match(result.stderr, /tool-module-dependency/);
});

test('allows platform module dependencies', () => {
  const result = run(patch(
    'C:/repo/tools/tool-docker/pom.xml',
    '<dependency><artifactId>toolbox-common</artifactId></dependency>',
  ));
  assert.equal(result.status, 0);
});

test('blocks imports of another feature internal path', () => {
  const result = run(patch(
    'C:/repo/frontend/src/features/reqpool/pages/ReqPoolPage.tsx',
    "import { ChatPanel } from '@/features/claude-chat/components/ChatPanel';",
  ));
  assert.equal(result.status, 2);
  assert.match(result.stderr, /feature-internal-import/);
});

test('allows imports through another feature public API', () => {
  const result = run(patch(
    'C:/repo/frontend/src/features/reqpool/pages/ReqPoolPage.tsx',
    "import { ChatPanel } from '@/features/claude-chat/public-api';",
  ));
  assert.equal(result.status, 0);
});

test('warns but does not block growth of an existing giant file', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'team-standards-arch-'));
  const file = path.join(root, 'frontend', 'src', 'features', 'reqpool', 'pages', 'ReqPoolPage.tsx');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, Array.from({ length: 501 }, (_, i) => `line${i}`).join('\n'));
  const result = run(patch(file, 'const a = 1;\nconst b = 2;\nconst c = 3;\nconst d = 4;\nconst e = 5;'));
  assert.equal(result.status, 0);
  assert.match(result.stderr, /giant-file-growth/);
  fs.rmSync(root, { recursive: true, force: true });
});

test('warn mode never blocks objective boundary violations', () => {
  const result = run(patch(
    'C:/repo/tools/tool-docker/pom.xml',
    '<dependency><artifactId>tool-hosts</artifactId></dependency>',
  ), { TEAM_STANDARDS_ARCH_BOUNDARY_HOOK: 'warn' });
  assert.equal(result.status, 0);
  assert.match(result.stderr, /tool-module-dependency/);
});
