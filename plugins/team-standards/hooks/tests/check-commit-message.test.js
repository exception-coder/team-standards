const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');

const hookPath = path.join(__dirname, '..', 'check-commit-no-ai-signature.js');

function runHook(command, env = {}) {
  return spawnSync(process.execPath, [hookPath], {
    input: JSON.stringify({ tool_name: 'Bash', tool_input: { command } }),
    encoding: 'utf8',
    env: { ...process.env, TEAM_STANDARDS_COMMIT_MESSAGE_HOOK: 'block', ...env },
  });
}

test('放行：标题、中文正文和 Author 完整', () => {
  const result = runHook('git commit -m "fix(prd): 完善反馈" -m "【改动】补充流式进度。\n【原因】生成过程缺少反馈。\n【结果】用户可持续观察执行状态。" -m "Author: 张凯 <425485346@qq.com>"');
  assert.equal(result.status, 0);
});

test('阻断：只有标题', () => {
  const result = runHook('git commit -m "fix(prd): 完善反馈"');
  assert.equal(result.status, 2);
  assert.match(result.stderr, /缺少变更说明正文/);
});

test('阻断：有正文但缺少 Author', () => {
  const result = runHook('git commit -m "fix(prd): 完善反馈" -m "【改动】补充流式进度。\n【原因】生成过程缺少反馈。\n【结果】用户可持续观察执行状态。"');
  assert.equal(result.status, 2);
  assert.match(result.stderr, /缺少合法 Author 行/);
});

test('阻断：正文不含中文', () => {
  const result = runHook('git commit -m "fix(prd): improve feedback" -m "【改动】Improve feedback.\n【原因】Missing feedback.\n【结果】Visible state." -m "Author: Zhang Kai <425485346@qq.com>"');
  assert.equal(result.status, 2);
  assert.match(result.stderr, /必须包含中文说明/);
});

test('阻断：正文缺少结果段', () => {
  const result = runHook('git commit -m "fix(prd): 完善反馈" -m "【改动】补充流式进度。\n【原因】生成过程缺少反馈。" -m "Author: 张凯 <425485346@qq.com>"');
  assert.equal(result.status, 2);
  assert.match(result.stderr, /【改动】【原因】【结果】/);
});

test('放行：从 -F 文件读取完整提交信息', (t) => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'commit-message-hook-'));
  t.after(() => fs.rmSync(tempDir, { recursive: true, force: true }));
  const messageFile = path.join(tempDir, 'message.txt');
  fs.writeFileSync(messageFile, 'feat(hook): 增加结构校验\n\n【改动】增加三段式结构校验。\n【原因】自由正文无法稳定保留语义。\n【结果】提交历史保留完整变更意图。\n\nAuthor: 张凯 <425485346@qq.com>\n');

  const result = runHook(`git commit -F "${messageFile}"`);
  assert.equal(result.status, 0);
});

test('放行：heredoc 形式的完整提交信息', () => {
  const command = `git commit -m "$(cat <<'EOF'
feat(hook): 增加结构校验

【改动】增加三段式结构校验。
【原因】自由正文无法稳定保留语义。
【结果】提交历史保留完整变更意图。

Author: 张凯 <425485346@qq.com>
EOF
)"`;
  const result = runHook(command);
  assert.equal(result.status, 0);
});

test('阻断：完整结构中仍含 AI 署名', () => {
  const result = runHook('git commit -m "fix(prd): 完善反馈" -m "【改动】补充流式进度。\n【原因】生成过程缺少反馈。\n【结果】用户可持续观察执行状态。" -m "Author: 张凯 <425485346@qq.com>\nCo-Authored-By: Claude <noreply@anthropic.com>"');
  assert.equal(result.status, 2);
  assert.match(result.stderr, /AI 工具署名/);
});

test('warn 模式只提示不阻断', () => {
  const result = runHook('git commit -m "fix(prd): 完善反馈"', { TEAM_STANDARDS_COMMIT_MESSAGE_HOOK: 'warn' });
  assert.equal(result.status, 0);
  assert.match(result.stderr, /提交信息结构不完整/);
});

test('放行：非 git commit 命令', () => {
  const result = runHook('git status --short');
  assert.equal(result.status, 0);
});
