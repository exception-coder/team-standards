// =============================================================
// 端到端测试 check-backend-evidence-readiness.js
// 通过 spawnSync + stdin JSON payload 模拟 PreToolUse(Write/Edit) 调用,
// 验证 后端业务源码 KG 读取检查的 warn / block / off 三种行为。
// =============================================================

const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync, execSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const HOOK = path.resolve(__dirname, '..', 'check-backend-evidence-readiness.js');

function runHook(payload, env = {}) {
  const res = spawnSync('node', [HOOK], {
    input: JSON.stringify(payload),
    encoding: 'utf8',
    env: { ...process.env, ...env },
  });
  return { code: res.status, stderr: res.stderr || '', stdout: res.stdout || '' };
}

function makeRepo(opts = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ts-kg-hook-'));
  execSync('git init -q', { cwd: dir });
  execSync('git config user.email test@local', { cwd: dir });
  execSync('git config user.name test', { cwd: dir });
  fs.writeFileSync(path.join(dir, 'README.md'), 'init\n');
  execSync('git add README.md', { cwd: dir });
  execSync('git commit -q -m init', { cwd: dir });

  if (opts.files === 'large') {
    // 制造 ≥2 文件 ≥20 行的未小改场景
    for (let i = 0; i < 3; i++) {
      fs.writeFileSync(
        path.join(dir, `f${i}.txt`),
        Array.from({ length: 15 }, (_, j) => `line ${j}`).join('\n') + '\n'
      );
    }
    execSync('git add -A', { cwd: dir });
  } else if (opts.files === 'trivial') {
    fs.appendFileSync(path.join(dir, 'README.md'), 'one more line\n');
    execSync('git add README.md', { cwd: dir });
  }
  return dir;
}

function makeTranscript({ hasRead = false, graphify = false } = {}) {
  const tmp = path.join(os.tmpdir(), `transcript-kg-${Date.now()}-${Math.random()}.jsonl`);
  const lines = [];
  if (graphify) {
    lines.push(JSON.stringify({ type: 'tool_use', name: 'Bash', input: { command: 'graphify query "order repository"' } }));
  } else if (hasRead) {
    lines.push(
      JSON.stringify({
        type: 'tool_use',
        name: 'Read',
        input: { file_path: '/Users/x/Documents/ai-docs/proj/knowledge-graph/00_index.md' },
      })
    );
  } else {
    lines.push(JSON.stringify({ type: 'text', text: 'hello' }));
  }
  fs.writeFileSync(tmp, lines.join('\n') + '\n');
  return tmp;
}

function cleanup(dir, transcript) {
  try { fs.rmSync(dir, { recursive: true, force: true }); } catch (e) {}
  if (transcript) try { fs.rmSync(transcript, { force: true }); } catch (e) {}
}

test('放行：非 Write/Edit/MultiEdit 工具', () => {
  const { code } = runHook({ tool_name: 'Bash', tool_input: {} });
  assert.equal(code, 0);
});

test('放行：目标文件不在后端业务白名单（如 UI 文件）', () => {
  const { code } = runHook({
    tool_name: 'Edit',
    tool_input: { file_path: 'lib/features/order/presentation/order_detail.dart' },
  });
  assert.equal(code, 0);
});

test('放行：测试文件即使在白名单路径下也跳过', () => {
  const { code } = runHook({
    tool_name: 'Edit',
    tool_input: { file_path: 'lib/features/refund/backend/service/refund_service_test.dart' },
  });
  assert.equal(code, 0);
});

test('放行：env=off 完全跳过', () => {
  const dir = makeRepo({ files: 'large' });
  const transcript = makeTranscript({ hasRead: false });
  try {
    const { code, stderr } = runHook(
      {
        tool_name: 'Edit',
        tool_input: { file_path: 'lib/features/refund/backend/service/refund_service.dart' },
        cwd: dir,
        transcript_path: transcript,
      },
      { TEAM_STANDARDS_BACKEND_EVIDENCE_HOOK: 'off' }
    );
    assert.equal(code, 0);
    assert.equal(stderr, '');
  } finally {
    cleanup(dir, transcript);
  }
});

test('warn 模式（默认）：后端文件 + 未读图谱 + 非小改 → exit 0 + 提示', () => {
  const dir = makeRepo({ files: 'large' });
  const transcript = makeTranscript({ hasRead: false });
  try {
    const { code, stderr } = runHook({
      tool_name: 'Edit',
      tool_input: { file_path: 'lib/features/refund/backend/service/refund_service.dart' },
      cwd: dir,
      transcript_path: transcript,
    });
    assert.equal(code, 0);
    assert.match(stderr, /knowledge-graph/);
    assert.match(stderr, /backend-evidence/);
  } finally {
    cleanup(dir, transcript);
  }
});

test('block 模式：后端文件 + 未读图谱 + 非小改 → exit 2 + 提示', () => {
  const dir = makeRepo({ files: 'large' });
  const transcript = makeTranscript({ hasRead: false });
  try {
    const { code, stderr } = runHook(
      {
        tool_name: 'Write',
        tool_input: { file_path: 'lib/common/backend_infra/daos/some_dao.dart' },
        cwd: dir,
        transcript_path: transcript,
      },
      { TEAM_STANDARDS_BACKEND_EVIDENCE_HOOK: 'block' }
    );
    assert.equal(code, 2);
    assert.match(stderr, /knowledge-graph/);
  } finally {
    cleanup(dir, transcript);
  }
});

test('放行：已读过 knowledge-graph/00_index.md（transcript 命中）', () => {
  const dir = makeRepo({ files: 'large' });
  const transcript = makeTranscript({ hasRead: true });
  try {
    const { code, stderr } = runHook(
      {
        tool_name: 'Edit',
        tool_input: { file_path: 'lib/features/refund/backendv2/service/refund_service.dart' },
        cwd: dir,
        transcript_path: transcript,
      },
      { TEAM_STANDARDS_BACKEND_EVIDENCE_HOOK: 'block' }
    );
    assert.equal(code, 0);
    assert.equal(stderr, '');
  } finally {
    cleanup(dir, transcript);
  }
});

test('放行：小改（≤1 文件 ∧ ≤20 行）即使未读图谱', () => {
  const dir = makeRepo({ files: 'trivial' });
  const transcript = makeTranscript({ hasRead: false });
  try {
    const { code } = runHook(
      {
        tool_name: 'Edit',
        tool_input: { file_path: 'lib/features/refund/backend/service/refund_service.dart' },
        cwd: dir,
        transcript_path: transcript,
      },
      { TEAM_STANDARDS_BACKEND_EVIDENCE_HOOK: 'block' }
    );
    assert.equal(code, 0);
  } finally {
    cleanup(dir, transcript);
  }
});

test('放行：非 JSON stdin 不崩溃', () => {
  const res = spawnSync('node', [HOOK], { input: 'not json', encoding: 'utf8' });
  assert.equal(res.status, 0);
});

test('命中 backendv2 路径（refund 模块惯用结构）', () => {
  const dir = makeRepo({ files: 'large' });
  const transcript = makeTranscript({ hasRead: false });
  try {
    const { code, stderr } = runHook(
      {
        tool_name: 'Edit',
        tool_input: { file_path: 'lib/features/refund/backendv2/service/internal/refund_persistence_service.dart' },
        cwd: dir,
        transcript_path: transcript,
      },
      { TEAM_STANDARDS_BACKEND_EVIDENCE_HOOK: 'block' }
    );
    assert.equal(code, 2);
    assert.match(stderr, /knowledge-graph/);
  } finally {
    cleanup(dir, transcript);
  }
});

test('放行：已读过 knowledge-graph/ddl-baseline.md（DDL 基线也算已读图谱）', () => {
  const dir = makeRepo({ files: 'large' });
  // 自建 transcript 写入 ddl-baseline.md 字面量
  const tmp = path.join(os.tmpdir(), `transcript-ddl-${Date.now()}-${Math.random()}.jsonl`);
  fs.writeFileSync(
    tmp,
    JSON.stringify({
      type: 'tool_use',
      name: 'Read',
      input: { file_path: '/Users/x/Documents/ai-docs/proj/knowledge-graph/ddl-baseline.md' },
    }) + '\n'
  );
  try {
    const { code, stderr } = runHook(
      {
        tool_name: 'Edit',
        tool_input: { file_path: 'lib/common/backend_infra/daos/refund_eligibility_dao.dart' },
        cwd: dir,
        transcript_path: tmp,
      },
      { TEAM_STANDARDS_BACKEND_EVIDENCE_HOOK: 'block' }
    );
    assert.equal(code, 0);
    assert.equal(stderr, '');
  } finally {
    cleanup(dir, tmp);
  }
});

test('兼容：旧 TEAM_STANDARDS_BACKEND_KG_HOOK=off 仍可跳过', () => {
  const dir = makeRepo({ files: 'large' });
  const transcript = makeTranscript({ hasRead: false });
  try {
    const { code, stderr } = runHook({
      tool_name: 'Edit',
      tool_input: { file_path: 'lib/features/refund/backend/service/refund_service.dart' },
      cwd: dir,
      transcript_path: transcript,
    }, { TEAM_STANDARDS_BACKEND_KG_HOOK: 'off' });
    assert.equal(code, 0);
    assert.equal(stderr, '');
  } finally {
    cleanup(dir, transcript);
  }
});

test('放行：Java 后端已查询 Graphify 且 manifest 覆盖目标版本', () => {
  const dir = makeRepo({ files: 'large' });
  const transcript = makeTranscript({ graphify: true });
  const target = path.join(dir, 'src', 'main', 'java', 'example', 'OrderRepository.java');
  try {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, 'class OrderRepository {}\n');
    const relative = path.relative(dir, target).split(path.sep).join('/');
    const manifestDir = path.join(dir, 'graphify-out');
    fs.mkdirSync(manifestDir, { recursive: true });
    fs.writeFileSync(path.join(manifestDir, 'manifest.json'), JSON.stringify({
      [relative]: { mtime: fs.statSync(target).mtimeMs / 1000 },
    }));

    const { code, stderr } = runHook({
      tool_name: 'Edit',
      tool_input: { file_path: target },
      cwd: dir,
      transcript_path: transcript,
    }, { TEAM_STANDARDS_BACKEND_EVIDENCE_HOOK: 'block' });
    assert.equal(code, 0, stderr);
  } finally {
    cleanup(dir, transcript);
  }
});

test('阻断：Java 后端查询的 Graphify manifest 早于目标文件', () => {
  const dir = makeRepo({ files: 'large' });
  const transcript = makeTranscript({ graphify: true });
  const target = path.join(dir, 'src', 'main', 'java', 'example', 'OrderRepository.java');
  try {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, 'class OrderRepository {}\n');
    const relative = path.relative(dir, target).split(path.sep).join('/');
    const manifestDir = path.join(dir, 'graphify-out');
    fs.mkdirSync(manifestDir, { recursive: true });
    fs.writeFileSync(path.join(manifestDir, 'manifest.json'), JSON.stringify({
      [relative]: { mtime: fs.statSync(target).mtimeMs / 1000 - 60 },
    }));

    const { code, stderr } = runHook({
      tool_name: 'Edit',
      tool_input: { file_path: target },
      cwd: dir,
      transcript_path: transcript,
    }, { TEAM_STANDARDS_BACKEND_EVIDENCE_HOOK: 'block' });
    assert.equal(code, 2);
    assert.match(stderr, /Graphify/);
    assert.match(stderr, /过期|未索引/);
  } finally {
    cleanup(dir, transcript);
  }
});
