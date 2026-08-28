#!/usr/bin/env node

const { logHookEvent } = require('./event-log');
const { normalizeChanges } = require('./change-input');

const MODE = (process.env.TEAM_STANDARDS_SQL_PERF_HOOK || 'warn').toLowerCase();
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
      hook: 'check-query-performance-risk',
      rule: 'sql-performance',
      mode: 'warn',
      tool: payload.tool_name,
      file: finding.filePath,
    });
  }

  const details = findings
    .map((finding) => `  - ${finding.filePath}: ${finding.risks.join('、')}`)
    .join('\n');
  process.stderr.write(
    '[team-standards] 本次改动出现查询性能风险信号，请先执行 backend-evidence 的高风险查询性能门禁。\n' +
    `${details}\n` +
    '  落码前：估算候选规模与最坏 SQL 次数，优先比较过滤下推、集合查询、预计算或有界异步方案；高风险查询补充执行计划、调用次数和真实计时。\n' +
    '  说明：这是启发式软提醒，命中不代表方案必错；TEAM_STANDARDS_SQL_PERF_HOOK=off 可关闭。\n'
  );
  process.exit(0);
});

function detectRisks(text) {
  if (!text) return [];
  const risks = [];

  const hasAggregate = /\b(count|sum|avg|min|max)\s*\(|\bgroup\s+by\b|\bselect\s+distinct\b/i.test(text);
  const hasSqlSource = /\bfrom\b|<\s*select\b/i.test(text);
  const hasBound = /\bwhere\b|<\s*where\b/i.test(text);
  if (hasAggregate && hasSqlSource && !hasBound) {
    risks.push('聚合/去重查询缺少明显数据边界');
  }

  const hasLoop = /\b(for|while)\s*\(|\.forEach\s*\(|\.stream\s*\(\)/i.test(text);
  const hasDataCall = /\b\w*(dao|mapper|repository)\w*\s*\.\s*(find|get|query|select|load|fetch|list|count|exists)\w*\s*\(/i.test(text);
  if (hasLoop && hasDataCall) {
    risks.push('循环或 Stream 内出现逐条数据访问');
  }

  const hasFilter = /\.filter\s*\(/i.test(text);
  const hasMemoryPage = /\.subList\s*\(|\.skip\s*\(|\.take\s*\(|\.slice\s*\(/i.test(text);
  if (hasFilter && hasMemoryPage) {
    risks.push('集合过滤后在应用层分页');
  }

  return risks;
}

module.exports = { detectRisks };
