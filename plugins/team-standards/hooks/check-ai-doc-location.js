#!/usr/bin/env node
// =============================================================
// PreToolUse hook: AI 生成的 Markdown 默认落「用户文档/ai-docs/{project}/」，
// 不写进业务/应用项目仓库的 docs/。给 markdown-writing-standards 的文档生命周期补一道机械闸——
// 防"图省事写项目 docs/"这类反复发生的越界(项目 docs/ 与 ai-docs/ 被当等价、无力量纠偏)。
//
// 只拦「新建」(Write)；Edit/MultiEdit(改已有) 放行。全中才拦：
//   - tool=Write，file_path 为 .md/.markdown
//   - 路径落在某个 docs/ 下（含 /docs/ 段），且不在 ai-docs/ 下
//   - 文件尚不存在（新建，非编辑已有）
//   - 文件名不是 INDEX.md / 00_index.md（索引豁免）
//   - 所属项目根不是「插件源码仓」（无 .claude-plugin/marketplace.json 等标记）——
//     插件仓 docs/design、docs/dev-log 是随仓发布的产品文档(CHANGELOG 引用)，豁免
//
// 默认 block（exit 2，把正确 ai-docs 路径回灌给 AI 让它改写过去）：
//   TEAM_STANDARDS_DOC_LOCATION_HOOK=warn → 仅提示放行 / =off → 关闭
//   确需写项目 docs（用户明确指定）：本次 set =off 绕过。
// =============================================================

const fs = require('fs');
const path = require('path');
const os = require('os');
const { normalizeChanges } = require('./change-input');

const MODE = (process.env.TEAM_STANDARDS_DOC_LOCATION_HOOK || 'block').toLowerCase();
if (MODE === 'off') process.exit(0);

// 插件源码仓标记：命中任一即视为插件仓（其 docs/ 是发布物，豁免）
const PLUGIN_MARKERS = [
  ['.claude-plugin', 'marketplace.json'],
  ['.codex-plugin', 'plugin.json'],
  ['.agents', 'plugins', 'marketplace.json'],
];

function findGitRoot(startDir) {
  const fsRoot = path.parse(startDir).root;
  let cur = startDir;
  while (cur && cur !== fsRoot) {
    try { if (fs.existsSync(path.join(cur, '.git'))) return cur; } catch (_) { /* skip */ }
    const p = path.dirname(cur);
    if (p === cur) break;
    cur = p;
  }
  return null;
}
function isPluginRepo(root) {
  if (!root) return false;
  return PLUGIN_MARKERS.some((seg) => { try { return fs.existsSync(path.join(root, ...seg)); } catch (_) { return false; } });
}
function resolveProjectName(root) {
  try {
    const f = path.join(root, '.team-standards-project.json');
    if (fs.existsSync(f)) {
      const c = JSON.parse(fs.readFileSync(f, 'utf8'));
      if (c && typeof c.aiDocsProject === 'string' && c.aiDocsProject.trim()) return c.aiDocsProject.trim();
    }
  } catch (_) { /* ignore */ }
  return root ? path.basename(root) : 'unknown';
}

let raw = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (c) => { raw += c; });
process.stdin.on('end', () => {
  let payload;
  try { payload = JSON.parse(raw); } catch (_) { process.exit(0); }

  for (const change of normalizeChanges(payload)) {
    if (change.operation !== 'add') continue;                    // 只拦新建；改已有放行
    const fp = change.filePath;
    if (!/\.(md|markdown)$/i.test(fp)) continue;

    const norm = fp.replace(/\\/g, '/');
    if (/\/ai-docs\//i.test(norm)) continue;                     // 已在 ai-docs：放行
    if (!/\/docs\//i.test(norm)) continue;                       // 不在 docs/：不归本 hook 管
    if (/^(INDEX|00_index)\.md$/i.test(path.basename(fp))) continue;

    const root = findGitRoot(path.dirname(fp));
    if (isPluginRepo(root)) continue;                             // 插件源码仓 docs/ 是发布物：豁免

    const project = resolveProjectName(root);
    const home = os.homedir();
    const docsBase = home ? path.join(home, 'Documents', 'ai-docs', project) : `~/Documents/ai-docs/${project}`;
    const suggested = path.join(docsBase, 'design', path.basename(fp));

    process.stderr.write(
`[team-standards] AI 文档默认不写进业务/应用项目仓的 docs/，应落到用户知识库 ai-docs/{project}/。

目标(被拦)：${fp}
推断项目：${project}
建议写到：${suggested}
  （设计→design/、bug→bug/、知识图谱→knowledge-graph/、现状梳理→work-log/，按 markdown-writing-standards 归类）

为什么：保持业务仓干净；AI 生成的设计/分析/现状/知识图谱统一沉淀到个人 ai-docs 知识库，后续异步汇聚到团队共享。
旁路：用户明确要求写项目 docs → 设 TEAM_STANDARDS_DOC_LOCATION_HOOK=off 本次绕过；或先走 markdown-writing-standards 确认归属。
`);
    process.exit(MODE === 'block' ? 2 : 0);
  }
  process.exit(0);
});
