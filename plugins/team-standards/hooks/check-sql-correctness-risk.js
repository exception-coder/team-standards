#!/usr/bin/env node

const { logHookEvent } = require('./event-log');
const { normalizeChanges } = require('./change-input');

const MODE = (process.env.TEAM_STANDARDS_SQL_CORRECTNESS_HOOK || 'warn').toLowerCase();
if (MODE === 'off') process.exit(0);

const TEST_FILE_PATTERNS = [
  /_test\.[a-z]+$/i,
  /[\\/]test[\\/]/i,
  /[\\/]tests[\\/]/i,
  /\.spec\.[a-z]+$/i,
];

let raw = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => { raw += chunk; });
process.stdin.on('end', () => {
  let payload;
  try { payload = JSON.parse(raw); } catch (_) { process.exit(0); }

  const findings = normalizeChanges(payload)
    .filter((change) => change.operation !== 'delete')
    .filter((change) => !TEST_FILE_PATTERNS.some((pattern) => pattern.test(change.filePath)))
    .map((change) => ({
      filePath: change.filePath,
      risks: detectRisks(change.addedText.slice(0, 20000)),
    }))
    .filter((finding) => finding.risks.length > 0);

  if (findings.length === 0) process.exit(0);

  for (const finding of findings) {
    logHookEvent({
      plugin: 'team-standards',
      hook: 'check-sql-correctness-risk',
      rule: 'sql-correctness',
      mode: 'warn',
      tool: payload.tool_name,
      file: finding.filePath,
    });
  }

  const details = findings
    .map((finding) => `  - ${finding.filePath}: ${finding.risks.join('、')}`)
    .join('\n');
  process.stderr.write(
    '[team-standards] 本次改动出现 SQL 正确性风险信号，请执行 backend-evidence 的 SQL 正确性门禁。\n' +
    `${details}\n` +
    '  多数据源查询请限定全部实体字段并显式声明结果列；最终动态 SQL 仍须通过项目 DDL、真实数据库解析和 Mapper 契约测试。\n' +
    '  说明：这是保守的编辑期提醒，不替代数据库验证；TEAM_STANDARDS_SQL_CORRECTNESS_HOOK=off 可关闭。\n'
  );
  process.exit(0);
});

function detectRisks(text) {
  if (!text || !/\bselect\b/i.test(text) || !/\bjoin\b/i.test(text)) return [];

  const risks = new Set();
  const normalized = stripComments(text);
  const selectPattern = /\bselect\b([\s\S]{1,6000}?)\bfrom\b/gi;
  let match;

  while ((match = selectPattern.exec(normalized)) !== null) {
    const tail = normalized.slice(selectPattern.lastIndex, selectPattern.lastIndex + 6000);
    if (!/\bjoin\b/i.test(tail)) continue;

    for (const rawItem of splitProjection(match[1])) {
      const item = normalizeProjectionItem(rawItem);
      if (!item) continue;

      if (/^(?:[A-Za-z_][\w$]*\s*\.\s*)?\*$/.test(item)) {
        risks.add('多数据源查询使用通配投影');
        continue;
      }

      if (/^(?:distinct\s+)?[`A-Za-z_][`\w$]*$/i.test(item)) {
        const identifier = item.replace(/^distinct\s+/i, '').replaceAll('`', '');
        risks.add(`SELECT 中存在未限定字段 ${identifier}`);
      }
    }
  }

  return [...risks];
}

function stripComments(text) {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/--[^\r\n]*/g, ' ');
}

function splitProjection(projection) {
  const items = [];
  let current = '';
  let depth = 0;
  let quote = null;

  for (let index = 0; index < projection.length; index += 1) {
    const char = projection[index];
    const previous = projection[index - 1];

    if (quote) {
      current += char;
      if (char === quote && previous !== '\\') quote = null;
      continue;
    }
    if (char === '\'' || char === '"') {
      quote = char;
      current += char;
      continue;
    }
    if (char === '(') depth += 1;
    if (char === ')' && depth > 0) depth -= 1;
    if (char === ',' && depth === 0) {
      items.push(current);
      current = '';
      continue;
    }
    current += char;
  }

  if (current.trim()) items.push(current);
  return items;
}

function normalizeProjectionItem(item) {
  return item
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+as\s+[`A-Za-z_][`\w$]*\s*$/i, '')
    .trim();
}

module.exports = { detectRisks, splitProjection };
