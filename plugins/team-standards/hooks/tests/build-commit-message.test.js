const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const test = require('node:test');

const { buildMessage, writeMessageFile } = require('../../skills/git-commit-standards/scripts/build-commit-message');

test('生成标题、中文正文和 Git 作者组成的完整消息', () => {
  const message = buildMessage({
    title: 'feat(commit): 主动生成提交说明',
    body: '在提交前整理会话意图，避免遗漏变更原因。',
    name: '张凯',
    email: '425485346@qq.com',
  });
  assert.equal(message, 'feat(commit): 主动生成提交说明\n\n在提交前整理会话意图，避免遗漏变更原因。\n\nAuthor: 张凯 <425485346@qq.com>\n');
});

test('拒绝缺少正文或正文不含中文', () => {
  assert.throws(() => buildMessage({ title: 'fix: title', body: '', name: '张凯', email: 'a@b.com' }), /缺少 --body/);
  assert.throws(() => buildMessage({ title: 'fix: title', body: 'english only', name: '张凯', email: 'a@b.com' }), /必须包含中文/);
});

test('在 Git 目录写入可供 git commit -F 使用的消息文件', (t) => {
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'team-standards-message-'));
  t.after(() => fs.rmSync(repo, { recursive: true, force: true }));
  execFileSync('git', ['init'], { cwd: repo });
  execFileSync('git', ['config', 'user.name', '张凯'], { cwd: repo });
  execFileSync('git', ['config', 'user.email', '425485346@qq.com'], { cwd: repo });

  const outputPath = writeMessageFile({ repo, cwd: repo, title: 'fix(commit): 补齐说明', body: '统一生成提交消息文件。' });
  assert.match(outputPath, /team-standards[\\/]COMMIT_MESSAGE$/);
  assert.match(fs.readFileSync(outputPath, 'utf8'), /Author: 张凯 <425485346@qq.com>/);
});
