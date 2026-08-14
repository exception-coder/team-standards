const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const test = require('node:test');

const { buildMessage, writeMessageFile } = require('../../skills/git-commit-standards/scripts/build-commit-message');

const completeBody = '【改动】增加提交消息生成流程。\n【原因】避免提交正文被遗漏。\n【结果】提交历史可稳定回归改动意图。';

test('生成标题、中文正文和 Git 作者组成的完整消息', () => {
  const message = buildMessage({
    title: 'feat(commit): 主动生成提交说明',
    body: completeBody,
    name: '张凯',
    email: '425485346@qq.com',
  });
  assert.equal(message, `feat(commit): 主动生成提交说明\n\n${completeBody}\n\nAuthor: 张凯 <425485346@qq.com>\n`);
});

test('拒绝缺少正文或三段式语义不完整', () => {
  assert.throws(() => buildMessage({ title: 'fix: title', body: '', name: '张凯', email: 'a@b.com' }), /缺少变更说明正文/);
  assert.throws(() => buildMessage({ title: 'fix: title', body: '只有一句中文。', name: '张凯', email: 'a@b.com' }), /【改动】【原因】【结果】/);
  assert.throws(() => buildMessage({ title: 'fix: title', body: '【改动】补代码。\n【原因】修问题。', name: '张凯', email: 'a@b.com' }), /【改动】【原因】【结果】/);
});

test('在 Git 目录写入可供 git commit -F 使用的消息文件', (t) => {
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'team-standards-message-'));
  t.after(() => fs.rmSync(repo, { recursive: true, force: true }));
  execFileSync('git', ['init'], { cwd: repo });
  execFileSync('git', ['config', 'user.name', '张凯'], { cwd: repo });
  execFileSync('git', ['config', 'user.email', '425485346@qq.com'], { cwd: repo });

  const outputPath = writeMessageFile({
    repo,
    cwd: repo,
    title: 'fix(commit): 补齐说明',
    change: '统一生成提交消息文件。',
    reason: '避免调用方自行拼接多行正文。',
    result: '三段提交说明可稳定写入。',
  });
  assert.match(outputPath, /team-standards[\\/]COMMIT_MESSAGE$/);
  const fileContent = fs.readFileSync(outputPath, 'utf8');
  assert.match(fileContent, /【改动】统一生成提交消息文件。/);
  assert.match(fileContent, /Author: 张凯 <425485346@qq.com>/);
});
