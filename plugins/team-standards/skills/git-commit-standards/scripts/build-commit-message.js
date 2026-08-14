#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { buildStructuredBody, validateCommitBody } = require('./commit-message-format');

function readArgument(argv, name) {
  const index = argv.indexOf(name);
  return index >= 0 ? argv[index + 1] : undefined;
}

function readGitValue(key, cwd) {
  return execFileSync('git', ['config', '--get', key], { cwd, encoding: 'utf8' }).trim();
}

function buildMessage({ title, body, name, email }) {
  const cleanTitle = (title || '').trim();
  const cleanBody = (body || '').trim();
  if (!cleanTitle) throw new Error('缺少 --title');
  const bodyError = validateCommitBody(cleanBody);
  if (bodyError) throw new Error(`--body ${bodyError}`);
  if (!name || !email) throw new Error('缺少 Git user.name 或 user.email');
  return `${cleanTitle}\n\n${cleanBody}\n\nAuthor: ${name} <${email}>\n`;
}

function writeMessageFile({ cwd, title, body, change, reason, result }) {
  const name = readGitValue('user.name', cwd);
  const email = readGitValue('user.email', cwd);
  const gitDir = execFileSync('git', ['rev-parse', '--path-format=absolute', '--git-dir'], {
    cwd,
    encoding: 'utf8',
  }).trim();
  const outputDir = path.join(gitDir, 'team-standards');
  const outputPath = path.join(outputDir, 'COMMIT_MESSAGE');
  fs.mkdirSync(outputDir, { recursive: true });
  const structuredBody = body || buildStructuredBody({ change, reason, result });
  fs.writeFileSync(outputPath, buildMessage({ title, body: structuredBody, name, email }), 'utf8');
  return outputPath;
}

if (require.main === module) {
  try {
    const cwd = path.resolve(readArgument(process.argv, '--repo') || process.cwd());
    const outputPath = writeMessageFile({
      cwd,
      title: readArgument(process.argv, '--title'),
      body: readArgument(process.argv, '--body'),
      change: readArgument(process.argv, '--change'),
      reason: readArgument(process.argv, '--reason'),
      result: readArgument(process.argv, '--result'),
    });
    process.stdout.write(`${outputPath}\n`);
  } catch (error) {
    process.stderr.write(`[team-standards] 无法生成提交信息：${error.message}\n`);
    process.exit(2);
  }
}

module.exports = { buildMessage, writeMessageFile };
