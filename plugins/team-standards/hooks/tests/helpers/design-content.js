const fs = require('node:fs');
const path = require('node:path');
const content = require('../../governance/design-content');

function write(root, file, body) {
  fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
  fs.writeFileSync(path.join(root, file), body);
}

function setup(root, specPath = 'openspec/specs/greeting/spec.md') {
  const ref = (file, heading) => ({ path: file, heading });
  const scenario = ref(specPath, '#### Scenario: Greeting requested');
  const module = { id: 'greeting', scopes: ['src/'], capabilities: ['greeting'], owner: 'test maintainer', status: 'active', codeVersion: 'fixture',
    overview: ref('docs/current.md', '## Overview'), detailed: ref('docs/current.md', '## Detailed'),
    content: { version: 1, mode: 'enforce', functions: [{ id: 'GS-001', heading: '### GS-001 问候',
      requirement: ref(specPath, '### Requirement: Stable greeting'), scenarios: [{ reference: scenario, verification: ref('docs/evidence.md', '## Test') }] }] } };
  const panorama = `| ${content.COLUMNS.join(' | ')} |\n| ${content.COLUMNS.map(() => '---').join(' | ')} |\n| GS-001 | 问候 | 使用者 | 无法确定问候结果 | 返回固定问候 | 调用方获得一致结果 | 已验证 | [问候](#gs-001-问候) |`;
  const overview = '## Overview\n\n' + content.OVERVIEW.map(title => `### ${title}\n\n${title === '范围与功能全景' ? panorama : '调用方需要明确的问候结果，本模块提供固定值并按场景验收。'}`).join('\n\n');
  const detailed = '## Detailed\n\n### GS-001 问候\n\n' + content.DETAIL.map(title => `#### ${title}\n\n${title === '技术实现' ? '当前返回 old 问候，调用方无需外部服务或数据库。' : '调用方发出问候请求，收到固定结果；失败时提供可理解的反馈。'}`).join('\n\n');
  write(root, 'docs/current.md', overview + '\n\n' + detailed + '\n');
  write(root, 'docs/evidence.md', '## Test\n\nFixture evidence used only for automated checker tests, never a business approval.\n');
  if (!fs.existsSync(path.join(root, specPath))) write(root, specPath, '### Requirement: Stable greeting\n\nThe system SHALL provide a stable greeting.\n\n#### Scenario: Greeting requested\n\nWHEN called THEN return the stable greeting to the caller.\n');
  return { module, scenario, write: (file, body) => write(root, file, body), update: () => {
    const file = path.join(root, 'docs/current.md');
    fs.writeFileSync(file, fs.readFileSync(file, 'utf8').replace('当前返回 old', '当前返回 hello'));
  } };
}

module.exports = { setup };
