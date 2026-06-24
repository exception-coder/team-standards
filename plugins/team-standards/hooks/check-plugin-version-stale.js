#!/usr/bin/env node
// =============================================================
// UserPromptSubmit hook: 插件版本陈旧 → 提醒重启会话
//
// 背景：Claude Code 在【会话启动那一刻】把 plugins/hooks/skills 一次性
// 加载进内存，运行中不热加载。每日刷新 / 计划任务会把新版插件拉到磁盘，
// 但同事若一直泡在老会话里不重启，这个会话就一直跑旧版——新规范、新 hook
// 全都不生效。本 hook 在每条 prompt 提交时比对：
//   已加载版本（当前会话运行的 ${CLAUDE_PLUGIN_ROOT}/.claude-plugin/plugin.json）
//   vs 磁盘最新版本（marketplace 克隆的 .claude-plugin/marketplace.json）
// 后者更高 → stderr 提醒「插件已更新到 X，请重启会话生效」。
//
// 红线（与本插件其它 hook 同源）：
//   - best-effort：任何读取失败一律静默 exit 0，绝不影响 prompt 放行。
//   - 绝不写 stdout（UserPromptSubmit 的 stdout 会注入 prompt），只写 stderr。
//   - 绝不 exit 非 0（不拦截输入）。
//   - 每会话每版本只提醒一次（flag 文件去重），不每条 prompt 刷屏。
//
// 已知局限（鸡生蛋）：本 hook 自身也要会话重启后才生效，故只对「装上本 hook
//   之后的版本更新」起作用——越早铺开越省心。
// 旁路：TEAM_STANDARDS_VERSION_REMINDER=off 关闭。
// =============================================================

const fs = require('fs');
const os = require('os');
const path = require('path');

if ((process.env.TEAM_STANDARDS_VERSION_REMINDER || 'on').toLowerCase() === 'off') process.exit(0);

const MARKETPLACE = 'team-standards'; // 本插件所在 marketplace 名
const PLUGIN = 'team-standards';

function readJson(p) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (_) { return null; }
}

// 已加载版本：当前会话运行目录的 plugin.json
function loadedVersion() {
  const root = process.env.CLAUDE_PLUGIN_ROOT;
  if (!root) return null;
  const j = readJson(path.join(root, '.claude-plugin', 'plugin.json'));
  return j && typeof j.version === 'string' ? j.version : null;
}

// 磁盘最新版本：marketplace 克隆里的 marketplace.json
function latestVersion() {
  const mp = path.join(os.homedir(), '.claude', 'plugins', 'marketplaces', MARKETPLACE, '.claude-plugin', 'marketplace.json');
  const j = readJson(mp);
  if (!j || !Array.isArray(j.plugins)) return null;
  const e = j.plugins.find((x) => x && x.name === PLUGIN);
  return e && typeof e.version === 'string' ? e.version : null;
}

// 返回 1 if a>b, -1 if a<b, 0 if 相等；解析失败返回 0（保守不提醒）
function cmpSemver(a, b) {
  const pa = String(a).split('.').map((n) => parseInt(n, 10));
  const pb = String(b).split('.').map((n) => parseInt(n, 10));
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const x = pa[i] || 0, y = pb[i] || 0;
    if (Number.isNaN(x) || Number.isNaN(y)) return 0;
    if (x > y) return 1;
    if (x < y) return -1;
  }
  return 0;
}

// 每会话每版本只提醒一次
function alreadyWarned(session, latest) {
  try {
    const flag = path.join(os.homedir(), '.kai-toolbox', `.version-reminded-${session}`);
    if (fs.existsSync(flag) && fs.readFileSync(flag, 'utf8').trim() === latest) return true;
    fs.mkdirSync(path.dirname(flag), { recursive: true });
    fs.writeFileSync(flag, latest);
    return false;
  } catch (_) {
    return false; // 去重失败时宁可多提醒一次，也不吞掉
  }
}

let raw = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (c) => { raw += c; });
process.stdin.on('end', () => {
  try {
    const payload = JSON.parse(raw);
    const loaded = loadedVersion();
    const latest = latestVersion();
    if (!loaded || !latest) process.exit(0);
    if (cmpSemver(latest, loaded) <= 0) process.exit(0); // 磁盘不比当前新 → 不提醒

    const session = payload.session_id || 'nosession';
    if (alreadyWarned(session, latest)) process.exit(0);

    process.stderr.write(
      `[team-standards] 团队规范插件已更新到 ${latest}，当前会话仍在运行旧版 ${loaded}。\n` +
      `  新规范 / 新 hook 不会在本会话生效——请重启 Claude Code 会话（开新会话）后再继续。\n` +
      `  旁路：TEAM_STANDARDS_VERSION_REMINDER=off 关闭本提醒。\n`
    );
  } catch (_) {
    // 静默：提醒是附带能力，任何失败都不得影响 prompt 放行
  }
  process.exit(0);
});
