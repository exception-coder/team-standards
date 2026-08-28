#!/usr/bin/env node
/**
 * audit-skills.js
 *
 * 不依赖运行时 telemetry 的"静态"skill 健康度审计。
 * 输出每个 skill 的多维指标,标记需要维护人关注的项。
 *
 * 维度:
 *   - description 长度(超过阈值要压缩)
 *   - SKILL.md 总行数(过大考虑拆分)
 *   - 被其它 SKILL.md / CLAUDE.md / docs 引用的次数(impact / fan-in)
 *   - 最近 commit 日期(过旧可能 stale)
 *   - dev-log 中出现次数(决策密度)
 *   - rules / references Markdown 是否能从 SKILL.md 的链接图到达
 *   - skills/ 下含文件但缺少 SKILL.md 的可分发孤儿目录
 *
 * 用法:
 *   node scripts/audit-skills.js                # 输出全表 + 警告(exit 0)
 *   node scripts/audit-skills.js --markdown     # 输出 markdown 表格(用于贴到 issue)
 *   node scripts/audit-skills.js --warnings     # 只输出有警告的 skill(exit 0)
 *   node scripts/audit-skills.js --ci           # CI 守卫模式:有任何警告则 exit 1(可与 --warnings 叠加)
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const SKILLS_DIR = path.join(ROOT, 'plugins', 'team-standards', 'skills');
const DEV_LOG_DIR = path.join(ROOT, 'docs', 'dev-log');

// 阈值(可调)
const TH_DESC_WARN = 800;       // description 字符 > 800 警告
const TH_SKILL_WARN = 800;      // SKILL.md 行数 > 800 警告
const TH_SKILL_FATAL = 2000;    // SKILL.md 行数 > 2000 严重警告
const TH_STALE_DAYS = 180;      // 半年未改可能 stale

const ARG_MD = process.argv.includes('--markdown');
const ARG_WARN_ONLY = process.argv.includes('--warnings');
const ARG_CI = process.argv.includes('--ci');

function listSkills() {
  return fs.readdirSync(SKILLS_DIR).filter((d) => {
    const p = path.join(SKILLS_DIR, d);
    return fs.statSync(p).isDirectory() && fs.existsSync(path.join(p, 'SKILL.md'));
  });
}

function getDescriptionLength(skillName) {
  const file = path.join(SKILLS_DIR, skillName, 'SKILL.md');
  const content = fs.readFileSync(file, 'utf8');
  const match = /^description:\s*(?:"([^"\r\n]*)"|'([^'\r\n]*)'|([^\r\n]+))\s*$/m.exec(content);
  const description = match ? (match[1] ?? match[2] ?? match[3] ?? '') : '';
  return description.replace(/\s+/g, ' ').length;
}

function getLineCount(skillName) {
  const file = path.join(SKILLS_DIR, skillName, 'SKILL.md');
  return fs.readFileSync(file, 'utf8').split('\n').length;
}

function countReferences(skillName, allSkills) {
  // 扫所有其它 SKILL.md / CLAUDE.md / README.md / docs/ / AGENTS.md 引用本 skill 的次数
  const targets = [
    ...allSkills.filter((n) => n !== skillName).map((n) => path.join(SKILLS_DIR, n, 'SKILL.md')),
    path.join(ROOT, 'CLAUDE.md'),
    path.join(ROOT, 'AGENTS.md'),
    path.join(ROOT, 'README.md'),
    path.join(ROOT, 'README_en.md'),
    path.join(ROOT, 'docs', 'skill-flow.md'),
    path.join(ROOT, 'docs', 'skill-dependencies.md'),
    path.join(ROOT, 'docs', 'anti-pattern-case-library.md'),
  ].filter(fs.existsSync);

  let count = 0;
  const re = new RegExp(`\`${skillName}\``, 'g');
  for (const f of targets) {
    const content = fs.readFileSync(f, 'utf8');
    const m = content.match(re);
    if (m) count += m.length;
  }
  return count;
}

function getLastCommitDate(skillName) {
  try {
    const out = execFileSync('git', [
      '-c', `safe.directory=${ROOT}`,
      '-C', ROOT,
      'log', '-1', '--format=%ad', '--date=short', '--',
      `plugins/team-standards/skills/${skillName}/SKILL.md`,
    ], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    return out || null;
  } catch (e) {
    return null;
  }
}

function countDevLogMentions(skillName) {
  if (!fs.existsSync(DEV_LOG_DIR)) return 0;
  let count = 0;
  const re = new RegExp(`\`${skillName}\`|${skillName}`, 'g');
  for (const f of fs.readdirSync(DEV_LOG_DIR)) {
    if (!f.endsWith('.md')) continue;
    const content = fs.readFileSync(path.join(DEV_LOG_DIR, f), 'utf8');
    const m = content.match(re);
    if (m) count += m.length;
  }
  return count;
}

function isTrackedSkill(skillName) {
  try {
    execFileSync('git', [
      '-c', `safe.directory=${ROOT}`,
      '-C', ROOT,
      'ls-files', '--error-unmatch',
      `plugins/team-standards/skills/${skillName}/SKILL.md`,
    ], {
      encoding: 'utf8',
      stdio: ['ignore', 'ignore', 'ignore'],
    });
    return true;
  } catch (e) {
    return false;
  }
}

function directoryContainsFiles(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.isFile()) return true;
    if (entry.isDirectory() && directoryContainsFiles(path.join(directory, entry.name))) return true;
  }
  return false;
}

function findOrphanSkillDirectories() {
  return fs.readdirSync(SKILLS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => !fs.existsSync(path.join(SKILLS_DIR, name, 'SKILL.md')))
    .filter((name) => directoryContainsFiles(path.join(SKILLS_DIR, name)));
}

function findUnreachableResources(skillName) {
  const skillDir = path.join(SKILLS_DIR, skillName);
  const entry = path.join(skillDir, 'SKILL.md');
  const reachable = new Set();
  const queue = [entry];

  while (queue.length > 0) {
    const file = queue.shift();
    const key = path.normalize(file);
    if (reachable.has(key) || !fs.existsSync(file)) continue;
    reachable.add(key);

    const content = fs.readFileSync(file, 'utf8');
    const links = content.matchAll(/\[[^\]]*\]\(([^)#]+\.md)(?:#[^)]+)?\)/g);
    for (const match of links) {
      const target = path.resolve(path.dirname(file), decodeURIComponent(match[1]));
      if (target.startsWith(`${skillDir}${path.sep}`)) queue.push(target);
    }
  }

  const resources = [];
  for (const subdir of ['rules', 'references']) {
    const root = path.join(skillDir, subdir);
    if (!fs.existsSync(root)) continue;
    collectMarkdown(root, resources);
  }
  return resources
    .filter((file) => !reachable.has(path.normalize(file)))
    .map((file) => path.relative(skillDir, file).replace(/\\/g, '/'));
}

function collectMarkdown(directory, output) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) collectMarkdown(fullPath, output);
    else if (entry.isFile() && entry.name.endsWith('.md')) output.push(fullPath);
  }
}

function daysSince(dateStr) {
  if (!dateStr) return Infinity;
  const d = new Date(dateStr);
  return Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
}

function analyze() {
  const skills = listSkills();
  const rows = [];
  for (const name of skills) {
    const descLen = getDescriptionLength(name);
    const lines = getLineCount(name);
    const refs = countReferences(name, skills);
    const lastCommit = getLastCommitDate(name);
    // A new or renamed Skill has no path history until the current change is committed.
    // Treat it as current; after commit, Git history becomes the normal freshness source.
    const stale = lastCommit
      ? daysSince(lastCommit) > TH_STALE_DAYS
      : isTrackedSkill(name);
    const devLogMentions = countDevLogMentions(name);
    const unreachableResources = findUnreachableResources(name);

    const warnings = [];
    if (descLen > TH_DESC_WARN) warnings.push(`description 过长(${descLen} > ${TH_DESC_WARN})`);
    if (lines > TH_SKILL_FATAL) warnings.push(`SKILL.md 严重过大(${lines} > ${TH_SKILL_FATAL},强烈建议拆分)`);
    else if (lines > TH_SKILL_WARN) warnings.push(`SKILL.md 过大(${lines} > ${TH_SKILL_WARN})`);
    if (stale) warnings.push(`stale: 最近一次改动 ${lastCommit || '未知'}`);
    if (refs === 0) warnings.push(`零引用: 无其它 skill / 文档引用本 skill,可能孤立`);
    if (unreachableResources.length > 0) {
      warnings.push(`渐进读取不可达: ${unreachableResources.join(', ')}`);
    }

    rows.push({ name, descLen, lines, refs, lastCommit: lastCommit || '?', devLogMentions, warnings });
  }
  return rows;
}

function output(allRows, orphanDirectories) {
  const warnSkills = allRows.filter((r) => r.warnings.length > 0);
  const rows = ARG_WARN_ONLY ? warnSkills : allRows;

  if (ARG_MD) {
    console.log('| Skill | desc | lines | refs | last commit | dev-log | warnings |');
    console.log('|-------|-----:|------:|-----:|------------|--------:|----------|');
    for (const r of rows) {
      console.log(
        `| \`${r.name}\` | ${r.descLen} | ${r.lines} | ${r.refs} | ${r.lastCommit} | ${r.devLogMentions} | ${r.warnings.join('; ') || '—'} |`
      );
    }
    if (orphanDirectories.length > 0) {
      console.log(`\n孤儿 Skill 目录: ${orphanDirectories.map((name) => `\`${name}\``).join(', ')}`);
    }
    return;
  }

  // 文本表
  const padR = (s, n) => String(s).padStart(n);
  const padL = (s, n) => String(s).padEnd(n);

  console.log(padL('skill', 38), padR('desc', 5), padR('lines', 6), padR('refs', 5), padR('last', 12), padR('dev-log', 8), 'warnings');
  console.log('-'.repeat(120));
  for (const r of rows) {
    console.log(
      padL(r.name, 38),
      padR(r.descLen, 5),
      padR(r.lines, 6),
      padR(r.refs, 5),
      padR(r.lastCommit, 12),
      padR(r.devLogMentions, 8),
      r.warnings.join('; ') || '—'
    );
  }

  // 汇总
  console.log('-'.repeat(120));
  console.log(`总计: ${allRows.length} skill,其中 ${warnSkills.length} 个有警告。`);
  if (warnSkills.length > 0) {
    console.log('建议关注的 skill:', warnSkills.map((r) => r.name).join(', '));
  }
  if (orphanDirectories.length > 0) {
    console.log('孤儿 Skill 目录（含文件但缺少 SKILL.md）:', orphanDirectories.join(', '));
  }
}

const rows = analyze();
const orphanDirectories = findOrphanSkillDirectories();
output(rows, orphanDirectories);

if (ARG_CI) {
  const warnSkills = rows.filter((r) => r.warnings.length > 0);
  if (warnSkills.length > 0 || orphanDirectories.length > 0) {
    console.error(`\n[audit-skills] ✖ CI 模式: 发现 ${warnSkills.length} 个 skill 警告、${orphanDirectories.length} 个孤儿目录,阻断 PR`);
    console.error(`修复: 按警告类型处理(SKILL.md 拆 rules/ 子文档 / 压缩 description / 补 dev-log 等)`);
    process.exit(1);
  }
  console.log(`\n[audit-skills] ✓ CI 模式: 0 警告`);
}
