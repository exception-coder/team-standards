#!/usr/bin/env node
// =============================================================
// UserPromptSubmit hook: 团队疑问/纠正信号采集（prompt-signal-capture）
//
// 设计见 docs/design/prompt-signal-capture.md。每条 prompt 提交时，
// 机械启发式打标后把一行 JSON 追加到本地
//   ~/.kai-toolbox/prompt-signals-<user>-<host>.jsonl
// 供下游聚合「反复出现的疑问 / 对 AI 的纠正」，反推缺失的知识图谱条目
// 或通用标准约束。
//
// 设计红线（与 event-log.js 同源）：
//   - 只写本地，绝不在 hook 里做网络/SMB IO（热路径）。同步到 \\IT01 由
//     yoooni-daily-plugin 承接（team-standards 不感知公司内网基础设施）。
//   - 全程 try/catch 吞异常：采集是附带能力，任何失败都不得影响 prompt 放行。
//   - 绝不写 stdout：UserPromptSubmit 的 stdout 会被当作上下文注入 prompt。
//   - 绝不 exit 非 0：非 0 会拦截/干扰用户输入。永远 exit 0。
//
// 旁路：TEAM_STANDARDS_PROMPT_SIGNAL=off 完全关闭（不写本地）。
//   注：上行到 \\IT01 默认开，但归 yoooni-daily-plugin 控制，与本 hook 无关。
// =============================================================

const fs = require('fs');
const os = require('os');
const path = require('path');

if ((process.env.TEAM_STANDARDS_PROMPT_SIGNAL || 'on').toLowerCase() === 'off') process.exit(0);

// 纠正标记：用户在否定/纠偏 AI（高价值，afterEdit 时信号更强）
const CORRECTION_RE = /(不对|不能这|不应该|应该是|应该改|错了|搞错|写错|弄错|改一下|改成|别这样|不要这样|方向反了|反了|不行|有问题|重新写|重来|这是错|不准确|理解错)/;
// 疑问标记：用户在提问（反复出现→缺知识图谱/术语）
const QUESTION_RE = /(怎么|为什么|为何|如何|在哪|哪里|哪个|能不能|可不可以|是不是|有没有|什么是|是什么|啥意思|\?|？)/;

function classify(text) {
  const markers = [];
  let kind = 'other';
  const corr = text.match(CORRECTION_RE);
  const ques = text.match(QUESTION_RE);
  if (corr) { kind = 'correction'; markers.push(corr[1] || corr[0]); }
  else if (ques) { kind = 'question'; markers.push(ques[1] || ques[0]); }
  return { kind, markers };
}

// 读 transcript 尾部，判断本条 prompt 是否紧跟一次 Edit/Write（纠正信号增强）。
// best-effort：只读文件末尾有限字节，解析失败/无文件一律返回 false。
function detectAfterEdit(transcriptPath) {
  try {
    if (!transcriptPath || !fs.existsSync(transcriptPath)) return false;
    const stat = fs.statSync(transcriptPath);
    const readBytes = Math.min(stat.size, 64 * 1024);
    const fd = fs.openSync(transcriptPath, 'r');
    const buf = Buffer.alloc(readBytes);
    fs.readSync(fd, buf, 0, readBytes, stat.size - readBytes);
    fs.closeSync(fd);
    const lines = buf.toString('utf8').split(/\r?\n/).filter(Boolean);
    // 从尾往前找最近一条 assistant 记录，看其中有没有 Edit/Write/MultiEdit 的 tool_use
    for (let i = lines.length - 1; i >= 0; i--) {
      let rec;
      try { rec = JSON.parse(lines[i]); } catch (_) { continue; }
      const msg = rec && rec.message;
      if (!msg || msg.role !== 'assistant') continue;
      const content = Array.isArray(msg.content) ? msg.content : [];
      const edited = content.some(
        (c) => c && c.type === 'tool_use' && /^(Edit|Write|MultiEdit)$/.test(c.name)
      );
      return edited; // 最近一条 assistant 回合是否含编辑
    }
    return false;
  } catch (_) {
    return false;
  }
}

let raw = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (c) => { raw += c; });
process.stdin.on('end', () => {
  try {
    const payload = JSON.parse(raw);
    const text = typeof payload.prompt === 'string' ? payload.prompt : '';
    if (!text.trim()) process.exit(0);

    const cwd = typeof payload.cwd === 'string' ? payload.cwd : process.cwd();
    const project = path.basename(cwd) || 'unknown';
    const { kind, markers } = classify(text);
    const afterEdit = detectAfterEdit(payload.transcript_path);

    const dir = path.join(os.homedir(), '.kai-toolbox');
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(
      dir,
      `prompt-signals-${os.userInfo().username}-${os.hostname()}.jsonl`
    );
    const record = {
      ts: new Date().toISOString(),
      user: os.userInfo().username,
      host: os.hostname(),
      project,
      cwd,
      kind,
      markers,
      afterEdit,
      session: payload.session_id || null,
      text,
    };
    fs.appendFileSync(file, JSON.stringify(record) + '\n');
  } catch (_) {
    // 静默：采集是附带能力，任何失败都不得影响 prompt 放行
  }
  process.exit(0);
});
