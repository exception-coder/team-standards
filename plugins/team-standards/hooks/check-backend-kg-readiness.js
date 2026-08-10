#!/usr/bin/env node
// =============================================================
// PreToolUse hook: 后端业务源码 Write/Edit/MultiEdit 之前
//   检查本会话是否读过 knowledge-graph 入口/场景卡。
//
// 默认 warn 模式：不阻断，仅 stderr 提示（便于试用期评估误报率）。
// TEAM_STANDARDS_BACKEND_KG_HOOK=block → 硬阻断（exit 2）
// TEAM_STANDARDS_BACKEND_KG_HOOK=off   → 完全跳过
//
// 路径白名单（命中才检查；其余文件直接放行）：
//   - lib/features/{module}/backend(v2)?/**/*.dart
//   - lib/common/backend_infra/(daos|services)/**/*.dart
//
// 排除：
//   - *_test.dart / test/ 目录
//   - 非源码（.md / .json / .yaml / 配置文件等）
//
// 豁免阈值（小改不打断）：
//   TEAM_STANDARDS_KG_TRIVIAL_FILES（默认 1）
//   TEAM_STANDARDS_KG_TRIVIAL_LINES（默认 20，insertions + deletions）
//
// transcript 中出现以下任一字面量即视为"读过知识图谱"：
//   - knowledge-graph/00_index.md（索引入口）
//   - knowledge-graph/scenarios（任一场景小卡）
//   - knowledge-graph/ddl-baseline.md（DDL 基线；写 SQL/DAO 前最常读的资产）
// （Windows 反斜杠路径同时识别）
// =============================================================

const fs = require('fs');
const { execSync } = require('child_process');
const { logHookEvent } = require('./event-log');
const { normalizeChanges } = require('./change-input');

const MODE = (process.env.TEAM_STANDARDS_BACKEND_KG_HOOK || 'warn').toLowerCase();
if (MODE === 'off') process.exit(0);

const TRIVIAL_FILES = parseInt(process.env.TEAM_STANDARDS_KG_TRIVIAL_FILES || '1', 10);
const TRIVIAL_LINES = parseInt(process.env.TEAM_STANDARDS_KG_TRIVIAL_LINES || '20', 10);

const BACKEND_PATH_PATTERNS = [
  // 允许路径开头就是 lib/...（相对路径）或 .../lib/...（绝对路径）
  /(^|[\\/])lib[\\/]features[\\/][^\\/]+[\\/]backend(v\d+)?[\\/].*\.dart$/i,
  /(^|[\\/])lib[\\/]common[\\/]backend_infra[\\/](daos|services)[\\/].*\.dart$/i,
];

const TEST_FILE_PATTERNS = [
  /_test\.dart$/i,
  /[\\/]test[\\/]/i,
];

let raw = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => { raw += chunk; });
process.stdin.on('end', () => {
  let payload;
  try {
    payload = JSON.parse(raw);
  } catch (e) {
    process.exit(0);
  }

  const toolName = payload.tool_name;
  const targetPaths = normalizeChanges(payload)
    .filter((change) => change.operation !== 'delete' && isBackendBusinessSource(change.filePath))
    .map((change) => change.filePath);
  if (targetPaths.length === 0) process.exit(0);

  if (isTrivialChange(payload.cwd || process.cwd())) process.exit(0);

  if (hasReadKnowledgeGraph(payload.transcript_path)) process.exit(0);

  const msg =
    '[team-standards] 即将 Write/Edit 后端业务源码，但本会话尚未读过项目知识图谱。\n' +
    `  目标文件：${targetPaths.join('、')}\n` +
    '  建议先 Read 任一项再继续：\n' +
    '    - {USER_DOCUMENTS}/ai-docs/{project}/knowledge-graph/00_index.md（按关键词反查命中场景卡）\n' +
    '    - {项目根}/docs/knowledge-graph/backend/00_index.md（正式图谱，若已存在）\n' +
    '    - 直接 Read 命中的 scenarios/{业务场景}.md\n' +
    '  原因：先读图谱可避免重复发明状态判定 / 金额聚合 / SQL 查询逻辑；\n' +
    '        skill `backend-knowledge-graph-required` 要求编码前必读。\n' +
    '  旁路：TEAM_STANDARDS_BACKEND_KG_HOOK=off 关闭 / =block 升级硬阻断。\n';

  for (const targetPath of targetPaths) {
    logHookEvent({ plugin: 'team-standards', hook: 'check-backend-kg-readiness', rule: 'backend-kg', mode: MODE, tool: toolName, file: targetPath });
  }
  process.stderr.write(msg);
  process.exit(MODE === 'block' ? 2 : 0);
});

function isBackendBusinessSource(filePath) {
  if (TEST_FILE_PATTERNS.some((r) => r.test(filePath))) return false;
  return BACKEND_PATH_PATTERNS.some((r) => r.test(filePath));
}

function isTrivialChange(cwd) {
  // 没有 git 仓库 / 未 stage 时按"非小改"处理（让 hook 提示一次）
  const gitOptions = { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] };
  let nameStatus;
  try {
    nameStatus = execSync('git diff --name-status', gitOptions).trim()
      + '\n'
      + execSync('git diff --staged --name-status', gitOptions).trim();
  } catch (e) {
    return false;
  }
  const lines = nameStatus.split(/\r?\n/).filter(Boolean);
  if (lines.length === 0) return true; // 没改动 / 新会话第一次 Edit 之前，先放过
  if (lines.length > TRIVIAL_FILES) return false;

  let shortstat;
  try {
    const unstaged = execSync('git diff --shortstat', gitOptions).trim();
    const staged = execSync('git diff --staged --shortstat', gitOptions).trim();
    shortstat = unstaged + ' ' + staged;
  } catch (e) {
    return false;
  }

  const insMatches = shortstat.matchAll(/(\d+)\s+insertion/g);
  const delMatches = shortstat.matchAll(/(\d+)\s+deletion/g);
  let totalLines = 0;
  for (const m of insMatches) totalLines += parseInt(m[1], 10);
  for (const m of delMatches) totalLines += parseInt(m[1], 10);
  return totalLines <= TRIVIAL_LINES;
}

function hasReadKnowledgeGraph(transcriptPath) {
  if (!transcriptPath || !fs.existsSync(transcriptPath)) return false;
  let content;
  try {
    content = fs.readFileSync(transcriptPath, 'utf8');
  } catch (e) {
    return false;
  }
  // JSONL 字面量匹配（同 git-commit-skill 的 MB 级文件优化策略）
  // Windows 路径在 transcript 里是 \\ 转义形式；linux/macos 是 /
  return (
    content.includes('knowledge-graph/00_index.md') ||
    content.includes('knowledge-graph\\\\00_index.md') ||
    content.includes('knowledge-graph/scenarios') ||
    content.includes('knowledge-graph\\\\scenarios') ||
    content.includes('knowledge-graph/ddl-baseline.md') ||
    content.includes('knowledge-graph\\\\ddl-baseline.md')
  );
}
