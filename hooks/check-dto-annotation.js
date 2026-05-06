#!/usr/bin/env node
// =============================================================
// PreToolUse hook: 拦截 wire DTO 的注解违规
//
// 适用文件：lib/features/{module}/common/models/(request|response)/*.dart
//
// 违规规则（任一命中即 exit 2 阻断）：
//   1. 含 `@freezed` 或 `@Freezed(`  ——  wire DTO 必须用 @JsonSerializable，
//      除非文件头注释里有 `// FREEZED-EXCEPTION:` 标记（union types / sealed class）
//   2. 含裸 `@JsonSerializable()`（缺 explicitToJson: true） ——  会导致嵌套子项
//      toJson 不递归，service 内部用 Map 风格读 / 改子项时 cast 失败爆 _TypeError
//
// 触发时机：matcher = "Write|Edit|MultiEdit"
// 退出码：
//   0 = 放行
//   2 = 阻断，stderr 内容回灌给 Claude
//
// 跨平台：Node.js（Claude Code 自带运行时）
//
// 配置：环境变量 TEAM_STANDARDS_DTO_HOOK=off 可临时禁用本 hook
// =============================================================

const fs = require('fs');
const path = require('path');

if (process.env.TEAM_STANDARDS_DTO_HOOK === 'off') {
  process.exit(0);
}

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

  const tool = payload.tool_name;
  if (!['Write', 'Edit', 'MultiEdit'].includes(tool)) {
    process.exit(0);
  }

  const input = payload.tool_input || {};
  const filePath = input.file_path || '';

  // 路径过滤：只检查 wire DTO 目录下的 .dart 源文件（不检查 .freezed.dart / .g.dart）
  const normalized = filePath.replace(/\\/g, '/');
  const isWireDto = /\/lib\/features\/[^/]+\/common\/models\/(request|response)\/[^/]+\.dart$/i.test(normalized)
    && !/\.(freezed|g)\.dart$/i.test(normalized);
  if (!isWireDto) {
    process.exit(0);
  }

  // 收集本次 Write/Edit 后**最终的文件内容**进行检查
  // - Write: 直接看 input.content（完整新文件）
  // - Edit: 看 input.new_string（局部新片段）+ 现有文件其它部分
  // - MultiEdit: 把所有 edits[].new_string 合在一起 + 现有其它部分
  let contentToCheck = '';
  if (tool === 'Write') {
    contentToCheck = input.content || '';
  } else if (tool === 'Edit') {
    contentToCheck = computeEditedContent(filePath, input.old_string, input.new_string);
  } else if (tool === 'MultiEdit') {
    contentToCheck = computeMultiEditedContent(filePath, input.edits || []);
  }

  if (!contentToCheck) {
    // 读不到内容（如新文件 Edit 失败）就不拦截，保守放行
    process.exit(0);
  }

  // 例外标记：文件头注释含 `// FREEZED-EXCEPTION:` 才允许 @freezed
  const hasException = /\/\/\s*FREEZED-EXCEPTION:/m.test(contentToCheck);

  // 违规检测
  const violations = [];

  if (!hasException) {
    if (/@freezed\b|@Freezed\s*\(/.test(contentToCheck)) {
      violations.push(
        '检测到 `@freezed` / `@Freezed(...)` 注解。\n' +
        '  Wire DTO 必须用 `@JsonSerializable(explicitToJson: true)`，' +
        '@freezed 默认 toJson 不递归会让嵌套子项 cast Map 失败。\n' +
        '  唯一例外：sealed class / union types / pattern matching。\n' +
        '  若属合法例外，请在文件头加 `// FREEZED-EXCEPTION: <原因>` 注释后重试。'
      );
    }
  }

  // 检测裸 @JsonSerializable()（无任何参数）—— 必须显式带 explicitToJson: true
  // 允许：@JsonSerializable(explicitToJson: true)
  //       @JsonSerializable(explicitToJson: true, anyShipKey: false) 等
  // 阻断：@JsonSerializable()
  //       @JsonSerializable(包含其它参数但没有 explicitToJson)
  const jsonSerializableMatches = contentToCheck.match(/@JsonSerializable\s*\(([^)]*)\)/g) || [];
  for (const match of jsonSerializableMatches) {
    if (!/explicitToJson\s*:\s*true/.test(match)) {
      violations.push(
        `检测到 \`${match.trim()}\`。\n` +
        '  Wire DTO 必须显式带 `explicitToJson: true`，否则嵌套子项 toJson 不递归，' +
        'service 内部 Map 风格读 / 改子项时会 cast 失败爆 _TypeError。\n' +
        '  正确写法：`@JsonSerializable(explicitToJson: true)`'
      );
    }
  }

  if (violations.length === 0) {
    process.exit(0);
  }

  process.stderr.write(
    '[team-standards] DTO 注解违规拦截：' +
    `${path.basename(filePath)} 触发 ${violations.length} 处违规。\n\n` +
    violations.map((v, i) => `[${i + 1}] ${v}`).join('\n\n') +
    '\n\n' +
    '依据：team-standards/skills/korepos-backend-service/SKILL.md ' +
    '「Step 2/3 通用：DTO 注解强制约束」节。\n' +
    '临时禁用：环境变量 TEAM_STANDARDS_DTO_HOOK=off。\n'
  );
  process.exit(2);
});

function computeEditedContent(filePath, oldStr, newStr) {
  if (!fs.existsSync(filePath)) {
    // 新文件 Edit 不存在，无法验证最终内容；保守放行
    return '';
  }
  let original;
  try {
    original = fs.readFileSync(filePath, 'utf8');
  } catch (e) {
    return '';
  }
  if (typeof oldStr !== 'string' || typeof newStr !== 'string') {
    return original;
  }
  // 模拟 Edit：把 oldStr 替换为 newStr（只替换第一处，与 Edit 默认行为一致）
  const idx = original.indexOf(oldStr);
  if (idx < 0) {
    return original;
  }
  return original.slice(0, idx) + newStr + original.slice(idx + oldStr.length);
}

function computeMultiEditedContent(filePath, edits) {
  if (!fs.existsSync(filePath)) {
    return '';
  }
  let content;
  try {
    content = fs.readFileSync(filePath, 'utf8');
  } catch (e) {
    return '';
  }
  for (const edit of edits) {
    const oldStr = edit.old_string;
    const newStr = edit.new_string;
    if (typeof oldStr !== 'string' || typeof newStr !== 'string') continue;
    const idx = content.indexOf(oldStr);
    if (idx < 0) continue;
    content = content.slice(0, idx) + newStr + content.slice(idx + oldStr.length);
  }
  return content;
}
