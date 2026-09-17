// 只检查结构、关联及快照；业务表达和设计正确性由具名审阅负责。
const fs = require('node:fs');
const path = require('node:path');
const { requireValue, readText, safePath, hash } = require('./storage');
const { git, resolveRevision } = require('./repository');

const OVERVIEW = ['一页总览', '业务背景与目标', '用户角色与职责', '范围与功能全景', '核心业务流程', '总体方案与系统边界', '关键规则与质量目标', '交付与验收'];
const DETAIL = ['功能目的与适用场景', '角色、入口与前置条件', '操作流程、页面交互与结果反馈', '输入输出、字段含义与校验', '业务规则、状态转换与边界条件', '操作权限与数据范围', '异常、并发、幂等与恢复', '技术实现', '验收场景及验证证据'];
const COLUMNS = ['功能编号', '功能名称', '使用角色', '解决的问题', '主要能力', '预期效果', '交付状态', '详设链接'];
const text = value => typeof value === 'string' && value.trim().length > 0;
const need = (ok, rule, message) => requireValue(ok, rule, message, 'NEEDS_WORK');

function validateConfig(content) {
  if (content === undefined) return;
  need(content?.version === 1 && ['migrate', 'enforce'].includes(content.mode), 'CONTENT_CONFIG', '内容协议须为 version:1，mode:migrate/enforce');
  if (content.mode === 'migrate') need(text(content.migration?.owner) && text(content.migration?.due) && text(content.migration?.reason),
    'CONTENT_MIGRATION', '迁移须记录责任人、完成节点及具体缺口');
  need(Array.isArray(content.functions) && content.functions.length <= 1000, 'CONTENT_CONFIG', 'functions 须为至多 1000 项的功能引用索引');
  const ids = new Set();
  for (const item of content.functions) {
    need(/^[A-Z][A-Z0-9]*-\d+$/.test(item.id || '') && !ids.has(item.id) && text(item.heading)
      && Array.isArray(item.scenarios) && item.scenarios.length > 0, 'CONTENT_FUNCTION', '功能编号须唯一，如 GS-001，并绑定详设标题及场景');
    ids.add(item.id);
  }
}

// 支持 ATX 标题和普通 Markdown 管道表；围栏中的演示标题不能冒充正文。
function linesOf(body) {
  let fence;
  return body.replace(/\r\n/g, '\n').split('\n').map(line => {
    const match = /^\s{0,3}(`{3,}|~{3,})/.exec(line);
    if (match) {
      if (!fence) fence = match[1];
      else if (match[1][0] === fence[0] && match[1].length >= fence.length) fence = undefined;
      return '';
    }
    return fence ? '' : line;
  });
}

function section(body, heading) {
  const lines = linesOf(body);
  const indices = lines.flatMap((line, i) => line === heading ? [i] : []);
  need(/^#{1,6} .+/.test(heading || '') && indices.length === 1, 'CONTENT_HEADING', `内容标题缺失或重复：${heading}`);
  const level = heading.indexOf(' ');
  let end = indices[0] + 1;
  while (end < lines.length && !new RegExp(`^#{1,${level}} `).test(lines[end])) end++;
  return lines.slice(indices[0] + 1, end).join('\n');
}

function substantive(body) {
  const value = body.replace(/^#+ .*$/gm, '').replace(/^\s*(?:更新时间|日期|updated|date)[:：].*$/gmi, '').trim();
  return value.length >= 12 && !/^(?:TODO|TBD|待补充|待填写|暂无|不适用)[。.!\s]*$/i.test(value);
}

function chapters(body, parent, titles) {
  const prefix = '#'.repeat(parent.indexOf(' ') + 1) + ' ';
  const actual = linesOf(body).filter(line => line.startsWith(prefix)).map(line => line.slice(prefix.length));
  need(JSON.stringify(actual) === JSON.stringify(titles), 'CONTENT_COVERAGE', `${parent} 必须按顺序覆盖：${titles.join('、')}`);
  for (const title of titles) need(substantive(section(body, prefix + title)), 'CONTENT_EMPTY', `${title} 缺少说明；不适用须解释原因`);
}

function panorama(body) {
  const rows = linesOf(body).filter(line => /^\s*\|/.test(line)).map(line => line.trim().slice(1, -1).split('|').map(cell => cell.trim()));
  const header = rows.findIndex(row => JSON.stringify(row) === JSON.stringify(COLUMNS));
  need(header >= 0 && rows[header + 1]?.every(cell => /^:?-{3,}:?$/.test(cell)), 'CONTENT_PANORAMA', '缺少标准八列功能全景表');
  const data = rows.slice(header + 2);
  need(data.length > 0 && data.every(row => row.length === 8 && row.every(text)), 'CONTENT_PANORAMA', '功能全景表须有非空的八列业务内容');
  need(new Set(data.map(row => row[0])).size === data.length, 'CONTENT_FUNCTION', '功能全景编号重复');
  return data;
}

function referenceBody(root, ref, remember) {
  need(ref && text(ref.path) && text(ref.heading), 'CONTENT_REFERENCE', '内容关联须含 path 与 heading');
  const file = safePath(root, ref.path);
  need(fs.existsSync(file), 'CONTENT_REFERENCE', `关联文件不存在：${ref.path}`);
  const body = section(readText(file), ref.heading);
  need(substantive(body), 'CONTENT_EMPTY', `关联正文为空：${ref.path} ${ref.heading}`);
  remember({ key: `content:${ref.path}#${ref.heading}`, digest: hash(body) });
  return body;
}

function anchor(heading) {
  return heading.replace(/^#+ /, '').toLowerCase().replace(/[^\p{L}\p{N}_\-\s]/gu, '').replace(/\s/g, '-');
}

function requirementBody(root, ref, remember) {
  need(/^openspec\/(?:specs|changes\/(?!archive\/)[^/]+\/specs)\/.+\.md$/.test(ref?.path || '')
    && /^### Requirement: .+/.test(ref?.heading || ''), 'CONTENT_REQUIREMENT', '功能须关联 OpenSpec Requirement');
  return referenceBody(root, ref, remember);
}

function inspectModule(root, module, remember = () => {}) {
  validateConfig(module.content);
  const overview = referenceBody(root, module.overview, remember);
  const detailed = referenceBody(root, module.detailed, remember);
  chapters(overview, module.overview.heading, OVERVIEW);
  const scope = section(overview, '#'.repeat(module.overview.heading.indexOf(' ') + 1) + ' 范围与功能全景');
  const rows = panorama(scope);
  need(rows.length === module.content.functions.length, 'CONTENT_FUNCTION', '功能全景与绑定索引必须一一对应');
  const functions = new Map();
  const functionalHeadings = linesOf(detailed).filter(line => new RegExp(`^#{${module.detailed.heading.indexOf(' ') + 1}} [A-Z][A-Z0-9]*-\\d+ `).test(line));
  need(functionalHeadings.length === module.content.functions.length && functionalHeadings.every(heading => module.content.functions.some(item => item.heading === heading)),
    'CONTENT_FUNCTION', '详设包含未登记或重复的功能章节');
  for (const item of module.content.functions) {
    const row = rows.find(row => row[0] === item.id);
    need(row && ['规划中', '实现中', '已验证', '已上线'].includes(row[6]), 'CONTENT_STATUS', `${item.id} 缺少明确的四态交付状态`);
    need(item.heading.startsWith('#'.repeat(module.detailed.heading.indexOf(' ') + 1) + ` ${item.id} `),
      'CONTENT_DETAIL', `${item.id} 须是详设的直接子章节`);
    const body = section(detailed, item.heading);
    chapters(body, item.heading, DETAIL);
    const link = /^\[[^\]]+\]\(([^)]+)\)$/.exec(row[7]);
    const target = link?.[1].split('#');
    let fragment;
    try { fragment = decodeURIComponent(target?.[1] || ''); } catch { fragment = ''; }
    need(target?.length === 2 && path.posix.normalize(path.posix.join(path.posix.dirname(module.overview.path), target[0] || path.posix.basename(module.overview.path))) === module.detailed.path
      && fragment === anchor(item.heading), 'CONTENT_DETAIL_LINK', `${item.id} 的全景链接未指向绑定详设`);
    const requirement = requirementBody(root, item.requirement, remember);
    const verified = ['已验证', '已上线'].includes(row[6]);
    const seen = new Set();
    for (const scenario of item.scenarios) {
      const ref = scenario.reference;
      const owner = scenario.requirement || item.requirement;
      const ownerBody = scenario.requirement ? requirementBody(root, owner, remember) : requirement;
      const key = `${ref?.path}#${ref?.heading}`;
      need(ref?.path === owner.path && /^#### Scenario: .+/.test(ref?.heading || '') && !seen.has(key),
        'CONTENT_SCENARIO', `${item.id} 的 Scenario 须唯一且属于关联 Requirement`);
      seen.add(key);
      need(substantive(section(ownerBody, ref.heading)), 'CONTENT_SCENARIO', `${item.id} 的 Scenario 不属于 Requirement`);
      referenceBody(root, ref, remember);
      if (verified) referenceBody(root, scenario.verification, remember);
    }
    if (!verified) {
      need(/^openspec\/changes\/(?!archive\/)[^/]+\/.+\.md$/.test(item.change?.path || ''), 'CONTENT_PLAN', `${item.id} 未交付目标须关联活动 change`);
      referenceBody(root, item.change, remember);
      need(body.includes(row[6]), 'CONTENT_PLAN', `${item.id} 详设须显式标记 ${row[6]}，不能混入当前能力`);
    }
    if (row[6] === '已上线') referenceBody(root, item.release, remember);
    functions.set(item.id, { item, body, row });
  }
  return { overview, detailed, functions };
}

function fingerprint(root, module) {
  const files = new Set([module.overview.path, module.detailed.path]);
  for (const item of module.content.functions) {
    for (const ref of [item.requirement, item.change, item.release, ...item.scenarios.flatMap(s => [s.requirement, s.reference, s.verification])]) if (ref?.path) files.add(ref.path);
  }
  return hash(JSON.stringify([module, [...files].sort().map(file => {
    const target = safePath(root, file);
    return [file, fs.existsSync(target) ? hash(readText(target)) : null];
  })]));
}

function oldModule(root, base, module) {
  const revision = resolveRevision(root, base);
  const registryPath = '.team-standards/design-baselines.json';
  if (!git(root, ['ls-tree', '-z', revision, '--', registryPath])) return null;
  return JSON.parse(git(root, ['show', `${revision}:${registryPath}`])).modules.find(item => item.id === module.id);
}

function validateDelivery(root, module, plan, phase, base, remember) {
  if (module.content?.mode !== 'enforce') return;
  // 首次规划允许正文尚未形成；完整内容在独立切片交付前准出。
  if (phase === 'preflight') return;
  const current = inspectModule(root, module, remember);
  const prior = oldModule(root, base, module);
  const previous = new Map((prior?.content?.functions || []).map(item => [item.id, item]));
  const oldDetailed = previous.size ? git(root, ['show', `${resolveRevision(root, base)}:${prior.detailed.path}`]) : '';
  const normalize = body => body.replace(/^\s*(?:更新时间|日期|updated|date)[:：].*$/gmi, '').replace(/\s+/g, ' ').trim();
  const impacts = (plan.functionImpacts || []).filter(item => item.module === module.id);
  need(impacts.length > 0 && new Set(impacts.map(item => item.id)).size === impacts.length,
    'CONTENT_IMPACT', `${module.id} 须声明唯一的功能影响记录，包括无行为变化理由`);
  for (const impact of impacts) {
    need(text(impact.reason) && ['added', 'updated', 'removed', 'unchanged'].includes(impact.disposition), 'CONTENT_IMPACT', '功能影响须记录有效判定和理由');
    const now = current.functions.get(impact.id);
    const before = previous.get(impact.id);
    need(impact.disposition === 'removed' ? before && !now : now, 'CONTENT_IMPACT', `${impact.id} 新旧功能范围与影响判定不符`);
    if (impact.disposition === 'removed') {
      need(!new RegExp(`(?<![A-Z0-9-])${impact.id}(?![A-Z0-9-])`).test(current.overview + current.detailed),
        'CONTENT_REMOVAL', `${impact.id} 在当前正文仍有遗留描述或引用；历史留在 Git/change`);
      if (impact.replacedBy) need(current.functions.has(impact.replacedBy), 'CONTENT_REMOVAL', '替代功能必须存在');
    } else if (impact.disposition === 'added') need(!before, 'CONTENT_IMPACT', `${impact.id} 已存在，不能标为 added`);
    else if (before) {
      const oldBody = section(oldDetailed, before.heading);
      const changed = normalize(now.body) !== normalize(oldBody);
      need(impact.disposition === 'updated' ? changed : !changed, 'CONTENT_NO_CHANGE', `${impact.id} 的正文变化与影响判定不符，修改其它章节不能抵扣`);
    }
    need(Array.isArray(impact.scenarioIds) && impact.scenarioIds.length > 0
      && impact.scenarioIds.every(id => plan.scenarios.some(s => s.id === id)), 'CONTENT_TRACE', `${impact.id} 缺少本次 Scenario 与验证映射`);
    if (now) for (const id of impact.scenarioIds) {
      const scenario = plan.scenarios.find(s => s.id === id);
      need(now.item.scenarios.some(s => s.reference.path === scenario.reference.path && s.reference.heading === scenario.reference.heading),
        'CONTENT_TRACE', `${impact.id} 的切片场景未绑定在功能索引中`);
      if (['已验证', '已上线'].includes(now.row[6])) {
        const linked = now.item.scenarios.find(s => s.reference.path === scenario.reference.path && s.reference.heading === scenario.reference.heading);
        need(plan.verifications?.some(v => scenario.verificationIds?.includes(v.id) && v.result === 'PASS'
          && v.reference.path === linked.verification.path && v.reference.heading === linked.verification.heading),
        'CONTENT_TRACE', `${impact.id} 的当前验证证据与切片验证记录不一致`);
      }
    }
  }
  for (const id of new Set([...previous.keys(), ...current.functions.keys()])) {
    if (previous.has(id) !== current.functions.has(id)) need(impacts.some(item => item.id === id && item.disposition === (previous.has(id) ? 'removed' : 'added')),
      'CONTENT_IMPACT', `${id} 新增/删除未登记影响`);
    if (previous.has(id) && current.functions.has(id)
      && normalize(section(oldDetailed, previous.get(id).heading)) !== normalize(current.functions.get(id).body)) {
      need(impacts.some(item => item.id === id && item.disposition === 'updated'), 'CONTENT_IMPACT', `${id} 的正文变化未登记更新影响`);
    }
  }
  const scopedScenarios = plan.scenarios.filter(s => s.files.some(file => module.scopes.some(scope => scope === file || scope.endsWith('/') && file.startsWith(scope))));
  need(scopedScenarios.every(s => impacts.some(item => item.scenarioIds.includes(s.id))), 'CONTENT_TRACE', '模块场景存在未关联功能的验证路径');
  const reviews = (plan.review.content || []).filter(item => item.module === module.id);
  need(reviews.length === 1 && reviews[0].result === 'PASS' && text(reviews[0].reason)
    && reviews[0].inputFingerprint === fingerprint(root, module), 'CONTENT_REVIEW',
  `${module.id} 须由 review.actor 具名审阅业务表达、规则和正确性，并引用当前 snapshot.contentFingerprints；机器覆盖不等于设计合格`);
}

module.exports = { OVERVIEW, DETAIL, COLUMNS, validateConfig, section, inspectModule, fingerprint, validateDelivery };
