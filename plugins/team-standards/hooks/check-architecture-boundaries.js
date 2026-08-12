#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { normalizeChanges } = require('./change-input');

const MODE = (process.env.TEAM_STANDARDS_ARCH_BOUNDARY_HOOK || 'block').toLowerCase();
if (MODE === 'off') process.exit(0);

const GIANT_FILE_LINES = Number.parseInt(
  process.env.TEAM_STANDARDS_GIANT_FILE_LINES || '500',
  10,
);

let raw = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => { raw += chunk; });
process.stdin.on('end', () => {
  let payload;
  try { payload = JSON.parse(raw); } catch (_) { process.exit(0); }

  const findings = [];
  for (const change of normalizeChanges(payload)) {
    if (change.operation === 'delete' || !change.addedText) continue;
    findings.push(...checkToolModuleDependency(change));
    findings.push(...checkFeatureImports(change));
    const giant = checkGiantFileGrowth(change);
    if (giant) findings.push(giant);
  }

  if (findings.length === 0) process.exit(0);

  const lines = ['[team-standards] 架构边界检查发现新增内容可能破坏模块边界：'];
  for (const finding of findings) {
    lines.push(`  - [${finding.severity}] ${finding.id}: ${finding.message}`);
    lines.push(`    文件：${finding.filePath}`);
  }
  lines.push('  规则源：skills/architecture-ddd-lite-fullstack/SKILL.md 与 rules/structure-quality-gates.md');
  lines.push('  旁路：TEAM_STANDARDS_ARCH_BOUNDARY_HOOK=warn 仅提示 / =off 关闭；TEAM_STANDARDS_GIANT_FILE_LINES 可调整体积提醒阈值。');
  process.stderr.write(`${lines.join('\n')}\n`);

  const hasHardFinding = findings.some((finding) => finding.severity === 'block');
  process.exit(MODE === 'block' && hasHardFinding ? 2 : 0);
});

function checkToolModuleDependency(change) {
  if (path.basename(change.filePath).toLowerCase() !== 'pom.xml') return [];
  const normalized = change.filePath.replace(/\\/g, '/');
  const ownerMatch = /\/tools\/(tool-[^/]+)\/pom\.xml$/i.exec(normalized);
  if (!ownerMatch) return [];

  const owner = ownerMatch[1];
  const dependencies = Array.from(
    change.addedText.matchAll(/<artifactId>\s*(tool-[^<\s]+)\s*<\/artifactId>/gi),
    (match) => match[1],
  );
  return dependencies
    .filter((dependency) => dependency !== owner)
    .map((dependency) => ({
      id: 'tool-module-dependency',
      severity: 'block',
      filePath: change.filePath,
      message: `${owner} 新增对 ${dependency} 的直接 Maven 依赖；请提取平台能力或小型 contract/SPI。`,
    }));
}

function checkFeatureImports(change) {
  if (!/\.(?:ts|tsx|js|jsx|vue)$/i.test(change.filePath)) return [];
  const normalized = change.filePath.replace(/\\/g, '/');
  const ownerMatch = /\/src\/features\/([^/]+)\//i.exec(normalized);
  if (!ownerMatch) return [];

  const owner = ownerMatch[1];
  const specifiers = collectModuleSpecifiers(change.addedText);
  const findings = [];
  for (const specifier of specifiers) {
    const target = resolveFeatureTarget(specifier, change.filePath);
    if (!target || target.feature === owner || isPublicApi(target.remainder)) continue;
    findings.push({
      id: 'feature-internal-import',
      severity: 'block',
      filePath: change.filePath,
      message: `${owner} 直接引用 ${target.feature} 的内部路径“${specifier}”；跨 feature 只能通过 features/${target.feature}/public-api。`,
    });
  }
  return findings;
}

function collectModuleSpecifiers(text) {
  const result = new Set();
  const patterns = [
    /(?:import|export)\s+(?:[^'";]+?\s+from\s+)?['"]([^'"]+)['"]/g,
    /import\(\s*['"]([^'"]+)['"]\s*\)/g,
    /require\(\s*['"]([^'"]+)['"]\s*\)/g,
  ];
  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) result.add(match[1]);
  }
  return result;
}

function resolveFeatureTarget(specifier, sourceFile) {
  const direct = /(?:^|\/)features\/([^/]+)(?:\/(.*))?$/.exec(specifier);
  if (direct) return { feature: direct[1], remainder: direct[2] || '' };
  if (!specifier.startsWith('.')) return null;

  const resolved = path.resolve(path.dirname(sourceFile), specifier).replace(/\\/g, '/');
  const relative = /\/src\/features\/([^/]+)(?:\/(.*))?$/.exec(resolved);
  return relative ? { feature: relative[1], remainder: relative[2] || '' } : null;
}

function isPublicApi(remainder) {
  return /^public-api(?:\.(?:ts|tsx|js|jsx))?$/.test(remainder);
}

function checkGiantFileGrowth(change) {
  if (!/\.(?:java|kt|kts|ts|tsx|js|jsx|dart|py|vue)$/i.test(change.filePath)) return null;
  const added = substantiveLines(change.addedText);
  if (added < 5) return null;

  const existingLines = readLineCount(change.filePath);
  const resultingLines = change.operation === 'add'
    ? change.addedText.split(/\r?\n/).length
    : existingLines + added;
  if (resultingLines <= GIANT_FILE_LINES) return null;

  return {
    id: 'giant-file-growth',
    severity: 'warn',
    filePath: change.filePath,
    message: `文件预计超过 ${GIANT_FILE_LINES} 行且本次新增 ${added} 行有效内容；请优先迁入 focused service、hook/store 或独立组件。`,
  };
}

function substantiveLines(text) {
  return text.split(/\r?\n/).filter((line) => {
    const trimmed = line.trim();
    return trimmed && !/^(?:import|export)\b/.test(trimmed) && !/^(?:\/\/|\/\*|\*|\*\/)/.test(trimmed);
  }).length;
}

function readLineCount(filePath) {
  try { return fs.readFileSync(filePath, 'utf8').split(/\r?\n/).length; } catch (_) { return 0; }
}
