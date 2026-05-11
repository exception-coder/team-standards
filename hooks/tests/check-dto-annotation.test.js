// =============================================================
// 端到端测试 check-dto-annotation.js
// 通过 spawnSync + stdin JSON payload 模拟 PreToolUse 调用,验证 exit code
// 与 stderr 输出。无外部依赖,只用 Node 18+ 内置 node:test。
// =============================================================

const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

const HOOK = path.resolve(__dirname, '..', 'check-dto-annotation.js');

function runHook(payload, env = {}) {
  const res = spawnSync('node', [HOOK], {
    input: JSON.stringify(payload),
    encoding: 'utf8',
    env: { ...process.env, ...env },
  });
  return { code: res.status, stderr: res.stderr || '', stdout: res.stdout || '' };
}

test('放行：非 Write/Edit/MultiEdit 工具', () => {
  const { code } = runHook({ tool_name: 'Read', tool_input: {} });
  assert.equal(code, 0);
});

test('放行：非 wire DTO 路径', () => {
  const { code } = runHook({
    tool_name: 'Write',
    tool_input: { file_path: '/project/lib/common/util.dart', content: '@freezed class X {}' },
  });
  assert.equal(code, 0);
});

test('放行：wire DTO 但内容合法（@JsonSerializable(explicitToJson: true)）', () => {
  const { code } = runHook({
    tool_name: 'Write',
    tool_input: {
      file_path: '/project/lib/features/order/common/models/request/refund_request.dart',
      content: '@JsonSerializable(explicitToJson: true)\nclass RefundRequest {}',
    },
  });
  assert.equal(code, 0);
});

test('阻断：wire DTO 用 @freezed（无 EXCEPTION 标记）', () => {
  const { code, stderr } = runHook({
    tool_name: 'Write',
    tool_input: {
      file_path: '/project/lib/features/order/common/models/request/refund_request.dart',
      content: '@freezed\nclass RefundRequest with _$RefundRequest {}',
    },
  });
  assert.equal(code, 2);
  assert.match(stderr, /@freezed/);
});

test('放行：wire DTO 用 @freezed 但有 FREEZED-EXCEPTION 标记', () => {
  const { code } = runHook({
    tool_name: 'Write',
    tool_input: {
      file_path: '/project/lib/features/order/common/models/request/refund_request.dart',
      content: '// FREEZED-EXCEPTION: sealed class for refund command\n@freezed\nsealed class Cmd {}',
    },
  });
  assert.equal(code, 0);
});

test('阻断：wire DTO 用裸 @JsonSerializable()（缺 explicitToJson）', () => {
  const { code, stderr } = runHook({
    tool_name: 'Write',
    tool_input: {
      file_path: '/project/lib/features/order/common/models/response/refund_response.dart',
      content: '@JsonSerializable()\nclass RefundResponse {}',
    },
  });
  assert.equal(code, 2);
  assert.match(stderr, /explicitToJson/);
});

test('阻断：wire DTO 用 @JsonSerializable(其它参数) 但缺 explicitToJson', () => {
  const { code, stderr } = runHook({
    tool_name: 'Write',
    tool_input: {
      file_path: '/project/lib/features/order/common/models/request/refund_request.dart',
      content: '@JsonSerializable(includeIfNull: false)\nclass RefundRequest {}',
    },
  });
  assert.equal(code, 2);
  assert.match(stderr, /explicitToJson/);
});

test('放行：环境变量 TEAM_STANDARDS_DTO_HOOK=off 临时禁用', () => {
  const { code } = runHook(
    {
      tool_name: 'Write',
      tool_input: {
        file_path: '/project/lib/features/order/common/models/request/refund_request.dart',
        content: '@freezed\nclass X {}',
      },
    },
    { TEAM_STANDARDS_DTO_HOOK: 'off' }
  );
  assert.equal(code, 0);
});

test('放行：.freezed.dart / .g.dart 生成文件不检查', () => {
  const { code } = runHook({
    tool_name: 'Write',
    tool_input: {
      file_path: '/project/lib/features/order/common/models/request/refund_request.freezed.dart',
      content: '@freezed\nclass X {}',
    },
  });
  assert.equal(code, 0);
});

test('放行：非 JSON stdin 不崩溃', () => {
  const res = spawnSync('node', [HOOK], { input: 'not json', encoding: 'utf8' });
  assert.equal(res.status, 0);
});

test('Windows 风格路径也能正确识别 wire DTO', () => {
  const { code } = runHook({
    tool_name: 'Write',
    tool_input: {
      file_path: 'C:\\project\\lib\\features\\order\\common\\models\\request\\refund_request.dart',
      content: '@freezed\nclass X {}',
    },
  });
  assert.equal(code, 2);
});
