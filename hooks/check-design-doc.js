#!/usr/bin/env node
// =============================================================
// PreToolUse hook: 写源码前检查是否存在设计文档
//
// 触发时机: matcher = "Write|Edit|MultiEdit"，且目标文件后缀属于源码扩展名集合
//
// 检查路径(命中任一即放行):
//   <cwd>/docs/design/**/*.md
//   <cwd>/docs/**/{design,设计}*.md
//   <USER_HOME>/Documents/ai-docs/<projectName>/design/**/*.md (Windows/macOS)
//   <USER_HOME>/ai-docs/<projectName>/design/**/*.md (Linux 兜底)
//   <projectName> 取自 cwd 末段
//
// 不触发(放行,不检查):
//   - 非源码扩展名 (.md / .json / .yml / .yaml / .lock / .gitignore / .txt / .toml)
//   - 测试文件 (路径含 /test/ / /tests/ / __tests__ / 文件名 *_test.ext / *.test.ext / *.spec.ext)
//   - 配置/脚本 (.sh / .cmd / .bat / .ps1 / Dockerfile / Makefile / *.yml)
//   - hidden 文件 (以 . 开头)
//
// 注:源码新文件(尚不存在的 .dart / .java / .ts 等)同样进入设计文档检查,
//    不存在豁免——这是有意为之:新增源码同样需要先有项目设计文档基线,
//    否则等于把"边写代码边补文档"合法化。新项目首次落地用 TEAM_STANDARDS_DESIGN_DOC_HOOK=off
//    或先创建 docs/design/README.md 占位即可。
//
// 旁路:
//   环境变量 TEAM_STANDARDS_DESIGN_DOC_HOOK=off 一次性禁用
//
// 退出码:
//   0 = 放行
//   2 = 阻断,stderr 内容回灌给 Claude(让 Claude 知道要先触发 design-doc-required skill)
//
// 跨平台: Node.js,Claude Code 自带运行时
// =============================================================

const fs = require('fs');
const path = require('path');
const os = require('os');

if ((process.env.TEAM_STANDARDS_DESIGN_DOC_HOOK || '').toLowerCase() === 'off') {
  process.exit(0);
}

const SOURCE_EXTS = new Set([
  '.dart', '.java', '.kt', '.kts',
  '.ts', '.tsx', '.js', '.jsx',
  '.py', '.go', '.rs', '.rb', '.php',
  '.swift', '.m', '.mm', '.c', '.cc', '.cpp', '.h', '.hpp',
  '.scala', '.clj', '.cljs', '.ex', '.exs',
  '.vue',
]);

const TEST_PATH_PATTERNS = [
  /[\\/](test|tests|__tests__|spec)[\\/]/i,
  /(_test|\.test|\.spec)\.[a-z]+$/i,
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
  if (toolName !== 'Write' && toolName !== 'Edit' && toolName !== 'MultiEdit') {
    process.exit(0);
  }

  const filePath = payload.tool_input && payload.tool_input.file_path;
  if (!filePath || typeof filePath !== 'string') {
    process.exit(0);
  }

  if (!isSourceFile(filePath)) {
    process.exit(0);
  }
  if (isTestOrConfigFile(filePath)) {
    process.exit(0);
  }

  const cwd = payload.cwd || process.cwd();
  if (hasDesignDoc(cwd)) {
    process.exit(0);
  }

  const projectName = path.basename(cwd);
  process.stderr.write(
`[team-standards] 即将编辑源码文件，但未检测到设计文档。

目标文件：${filePath}
项目根目录：${cwd}

未在以下任一位置找到设计文档：
  • ${path.join(cwd, 'docs', 'design')}
  • ${path.join(os.homedir(), 'Documents', 'ai-docs', projectName, 'design')}
  • ${path.join(os.homedir(), 'ai-docs', projectName, 'design')}

请先触发 design-doc-required skill 生成或确认设计文档（极简改动可走「极简跳过」硬清单）。
若本次确为极简改动且确认跳过，可设置环境变量绕过本次会话：

  PowerShell: $env:TEAM_STANDARDS_DESIGN_DOC_HOOK = 'off'
  bash/zsh:   export TEAM_STANDARDS_DESIGN_DOC_HOOK=off

模板：参考 skills/design-doc-required/{lightweight-template.md, template.md}
`);
  process.exit(2);
});

function isSourceFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return SOURCE_EXTS.has(ext);
}

function isTestOrConfigFile(filePath) {
  const base = path.basename(filePath);
  if (base.startsWith('.')) return true;
  if (/^(Dockerfile|Makefile|CMakeLists\.txt)$/i.test(base)) return true;
  for (const re of TEST_PATH_PATTERNS) {
    if (re.test(filePath)) return true;
  }
  return false;
}

function hasDesignDoc(cwd) {
  const projectName = path.basename(cwd);

  const projectPaths = [
    path.join(cwd, 'docs', 'design'),
  ];
  for (const p of projectPaths) {
    if (dirHasMarkdown(p, /\.md$/i)) return true;
  }

  if (dirHasMarkdownRecursive(path.join(cwd, 'docs'), /design|设计/i, 2)) return true;

  const userHome = os.homedir();
  if (!userHome) return false;

  const userPaths = [
    path.join(userHome, 'Documents', 'ai-docs', projectName, 'design'),
    path.join(userHome, 'ai-docs', projectName, 'design'),
  ];
  for (const p of userPaths) {
    if (dirHasMarkdownRecursive(p, /\.md$/i, 3)) return true;
  }

  return false;
}

function dirHasMarkdown(dir, namePattern) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (e) {
    return false;
  }
  for (const entry of entries) {
    if (entry.isFile() && namePattern.test(entry.name)) return true;
  }
  return false;
}

function dirHasMarkdownRecursive(dir, namePattern, maxDepth) {
  if (maxDepth < 0) return false;
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (e) {
    return false;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isFile() && entry.name.endsWith('.md') && (namePattern.test(entry.name) || namePattern.test(dir))) {
      return true;
    }
    if (entry.isDirectory()) {
      if (dirHasMarkdownRecursive(full, namePattern, maxDepth - 1)) return true;
    }
  }
  return false;
}
