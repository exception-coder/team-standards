// 当前设计绑定是单一索引；正文仍由项目维护，内容语义来自具名审阅。
const fs = require('node:fs');
const path = require('node:path');
const { requireValue, readJson, readText, safePath, hash, MAX_FILES } = require('./storage');
const { git, resolveRevision } = require('./repository');

const REGISTRY = '.team-standards/design-baselines.json';
const nonempty = value => typeof value === 'string' && value.trim().length > 0;
const strings = value => Array.isArray(value) && value.length > 0 && value.every(nonempty)
  && new Set(value).size === value.length;

function relative(value) {
  return nonempty(value) && !/^[\\/]|^[A-Za-z]:|\\|[*?]|(?:^|\/)\.\.?(?:\/|$)/.test(value);
}

function matches(file, scopes) {
  return scopes.some(scope => file === scope || (scope.endsWith('/') && file.startsWith(scope)));
}

function validateRegistry(root, registry) {
  requireValue(registry?.schemaVersion === 1, 'BASELINE_VERSION', '未知模块绑定版本；保留原文件并按升级指引迁移');
  requireValue(strings(registry.managed) && registry.managed.every(relative)
    && Array.isArray(registry.modules) && registry.modules.length <= MAX_FILES,
  'BASELINE_FORMAT', 'managed 必须声明受管文件/目录；modules 最多 1000 项');
  const ids = new Set();
  for (const module of registry.modules) {
    requireValue(/^[a-z0-9][a-z0-9-]*$/.test(module.id || '') && !ids.has(module.id)
      && strings(module.scopes) && module.scopes.every(relative) && strings(module.capabilities)
      && nonempty(module.owner) && ['active', 'gap', 'retired'].includes(module.status),
    'MODULE_FORMAT', '模块必须有唯一 ID、范围、capabilities、责任人与有效状态');
    ids.add(module.id);
    if (module.shared !== undefined) requireValue(typeof module.shared === 'boolean', 'MODULE_FORMAT', 'shared 必须是布尔值');
    if (module.status !== 'active') requireValue(nonempty(module.plan), 'BASELINE_GAP_PLAN', '存量缺口/停用必须登记具体治理或迁移计划');
    if (module.status === 'active') {
      requireValue(nonempty(module.codeVersion), 'BASELINE_VERSION_SCOPE', '当前正文须说明代码/发布范围，部署另引真实记录');
      for (const view of ['overview', 'detailed']) {
        const ref = module[view];
        requireValue(ref && relative(ref.path) && /^#{1,6} .+/.test(ref.heading || '')
          && !ref.path.startsWith('openspec/changes/'), 'BASELINE_REFERENCE', '概设/详设须绑定长期文件与唯一标题，不能绑定 change');
        safePath(root, ref.path);
      }
    }
  }
  for (const module of registry.modules) {
    if (module.replacedBy !== undefined) requireValue(ids.has(module.replacedBy) && module.replacedBy !== module.id,
      'MODULE_MIGRATION', 'replacedBy 必须指向其它已登记模块');
  }
  return registry;
}

function loadRegistry(root) {
  const file = safePath(root, REGISTRY);
  return fs.existsSync(file) ? validateRegistry(root, readJson(file)) : null;
}

function affected(registry, files) {
  const modules = new Map();
  for (const file of files.filter(file => matches(file, registry.managed))) {
    const owners = registry.modules.filter(module => matches(file, module.scopes));
    requireValue(owners.length > 0, 'MODULE_UNBOUND', `受管文件缺少归属：${file}`, 'NEEDS_WORK');
    requireValue(owners.length === 1 || owners.every(module => module.shared === true),
      'MODULE_AMBIGUOUS', `文件归属多义：${file}；共享影响须在各模块显式 shared`, 'NEEDS_WORK');
    for (const module of owners) modules.set(module.id, module);
  }
  return [...modules.values()];
}

function section(body, heading) {
  const lines = body.replace(/\r\n/g, '\n').split('\n');
  const indices = lines.flatMap((line, index) => line === heading ? [index] : []);
  requireValue(indices.length === 1, 'BASELINE_HEADING', `当前正文标题缺失或重复：${heading}`, 'NEEDS_WORK');
  const level = heading.indexOf(' ');
  let end = indices[0] + 1;
  while (end < lines.length && !new RegExp(`^#{1,${level}} `).test(lines[end])) end++;
  // 日期、空标题和空白不计入正文变化。语义相关性仍须审阅。
  return lines.slice(indices[0] + 1, end).filter(line => !/^\s*#|^\s*(?:更新时间|更新日期|日期|updated|date)\s*[:：]/i.test(line))
    .join('\n').replace(/\s+/g, ' ').trim();
}

function currentSection(root, ref) {
  const file = safePath(root, ref.path);
  requireValue(fs.existsSync(file), 'BASELINE_MISSING', `当前正文不存在：${ref.path}`, 'NEEDS_WORK');
  const body = section(readText(file), ref.heading);
  requireValue(body.length >= 20 && !/^(?:TODO|TBD|待补充|暂无)[。.!\s]*$/i.test(body),
    'BASELINE_EMPTY', `当前正文不足以核对：${ref.path} ${ref.heading}`, 'NEEDS_WORK');
  return body;
}

function priorSection(root, base, ref) {
  const revision = resolveRevision(root, base);
  if (!git(root, ['ls-tree', '-z', revision, '--', ref.path])) return '';
  const body = git(root, ['show', `${revision}:${ref.path}`]);
  if (!body.replace(/\r\n/g, '\n').split('\n').includes(ref.heading)) return '';
  return section(body, ref.heading);
}

function checkConflicts(root, plan, context) {
  const folder = safePath(root, 'openspec/changes');
  if (!fs.existsSync(folder)) return;
  const targets = new Set((plan.baselines || []).filter(item => item.reference)
    .map(item => `${item.reference.path}#${item.reference.heading}`));
  const requirements = new Set();
  for (const file of Object.keys(context.artifacts || {}).filter(file => /\/specs\/.+\.md$/.test(file))) {
    const capability = file.split('/specs/')[1];
    for (const title of readText(safePath(root, file)).matchAll(/^### Requirement: (.+)$/gm)) requirements.add(`${capability}#${title[1]}`);
  }
  const entries = fs.readdirSync(folder, { withFileTypes: true }).filter(entry => entry.isDirectory() && entry.name !== 'archive');
  requireValue(entries.length <= 100, 'BASELINE_SCAN_LIMIT', '活动 change 超过 100；拆分检查范围或归档已完成项，不能静默漏查');
  const conflicts = new Set();
  for (const entry of entries) {
    if (entry.name === context.change) continue;
    const evidencePath = `openspec/changes/${entry.name}/governance-evidence.json`;
    if (fs.existsSync(safePath(root, evidencePath))) {
      const other = readJson(safePath(root, evidencePath));
      if ((other.plan?.baselines || []).some(item => item.reference && targets.has(`${item.reference.path}#${item.reference.heading}`))) conflicts.add(entry.name);
    }
    for (const requirement of requirements) {
      const [file, title] = requirement.split('#');
      const target = safePath(root, `openspec/changes/${entry.name}/specs/${file}`);
      if (fs.existsSync(target) && readText(target).split(/\r?\n/).includes(`### Requirement: ${title}`)) conflicts.add(entry.name);
    }
  }
  for (const change of conflicts) {
    requireValue(plan.conflicts?.some(item => item.change === change && nonempty(item.order) && nonempty(item.reason)),
      'BASELINE_CONFLICT', `与 ${change} 修改相同 Requirement/当前章节；记录依赖、合并顺序及审阅理由`, 'NEEDS_WORK');
  }
}

function validateBaselines(root, plan, context, phase, base, remember) {
  const registry = loadRegistry(root);
  let previous = null;
  if (base && git(root, ['ls-tree', '-z', resolveRevision(root, base), '--', REGISTRY])) {
    previous = validateRegistry(root, JSON.parse(git(root, ['show', `${resolveRevision(root, base)}:${REGISTRY}`])));
  }
  if (!registry) {
    requireValue(!plan.baselines && !previous, 'BASELINE_BINDING_REQUIRED', `先接入或恢复 ${REGISTRY}`);
    return;
  }
  remember({ key: REGISTRY, digest: hash(JSON.stringify(registry)) });
  const modules = affected(registry, plan.files);
  for (const prior of previous ? affected(previous, plan.files) : []) {
    requireValue(modules.some(module => module.id === prior.id), 'MODULE_MIGRATION',
      `旧范围属于 ${prior.id}；保留停用/迁移绑定并核对旧位置及消费者，不能缩小受管范围`, 'NEEDS_WORK');
  }
  if (!modules.length) return;
  requireValue(plan.dedup && nonempty(plan.dedup.query) && nonempty(plan.dedup.decision)
    && ['new', 'continue', 'small'].includes(plan.dedup.selection)
    && nonempty(plan.dedup.originalGoal) && nonempty(plan.dedup.acceptanceBoundary) && nonempty(plan.dedup.stage),
  'CHANGE_SELECTION', '核对原目标、验收边界、阶段及新建/沿用理由，不能仅按同模块复用', 'NEEDS_WORK');
  requireValue(context.change ? plan.dedup.selection !== 'small' : plan.dedup.selection === 'small',
    'CHANGE_SELECTION', 'S 类选择与是否绑定 change 不一致', 'NEEDS_WORK');
  checkConflicts(root, plan, context);
  for (const module of modules) {
    if (module.status === 'gap' && phase === 'preflight') continue;
    requireValue(module.status !== 'gap', 'BASELINE_MISSING', `${module.id} 缺基线；责任人 ${module.owner}，计划 ${module.plan}`, 'NEEDS_WORK');
    if (module.status === 'retired') {
      requireValue(plan.baselines?.some(item => item.module === module.id && item.disposition === 'not-applicable' && nonempty(item.reason)),
        'BASELINE_RETIREMENT', `${module.id} 停用须审阅删除范围、迁移和消费者`, 'NEEDS_WORK');
      continue;
    }
    for (const view of ['overview', 'detailed']) {
      const items = (plan.baselines || []).filter(item => item.module === module.id && item.id === view);
      requireValue(items.length === 1, 'BASELINE_IMPACT_GAP', `${module.id} 缺少唯一 ${view} 影响判定`, 'NEEDS_WORK');
      const item = items[0];
      requireValue(['updated', 'already-covered', 'not-applicable'].includes(item.disposition) && nonempty(item.reason),
        'BASELINE_DISPOSITION', '基线影响须声明状态与具体理由', 'NEEDS_WORK');
      const ref = module[view];
      requireValue(item.reference?.path === ref.path && item.reference?.heading === ref.heading,
        'BASELINE_TARGET', '交付引用必须与权威模块绑定一致', 'NEEDS_WORK');
      let body;
      try { body = currentSection(root, ref); }
      catch (error) {
        if (phase === 'preflight' && item.disposition === 'updated'
          && ['BASELINE_MISSING', 'BASELINE_HEADING'].includes(error.rule)) continue;
        throw error;
      }
      remember({ key: `baseline:${ref.path}#${ref.heading}`, digest: hash(body) });
      if (phase !== 'preflight') {
        requireValue(base, 'BASELINE_BASE_REQUIRED', '检查必须保留真实代码起始基线');
        requireValue(item.implemented === true && nonempty(item.codeVersion), 'BASELINE_UNVERIFIED', '审阅必须确认正文仅覆盖已实现切片并说明代码范围', 'NEEDS_WORK');
        if (item.disposition === 'updated') requireValue(body !== priorSection(root, base, ref),
          'BASELINE_NO_CHANGE', 'updated 没有相关正文差异；时间戳、空标题不能抵扣同步', 'NEEDS_WORK');
      }
    }
  }
  if (phase !== 'preflight') {
    requireValue(plan.sync && ['synced', 'not-applicable'].includes(plan.sync.status) && nonempty(plan.sync.reason),
      'BASELINE_SYNC', '交付切片须核对已接受行为规格同步；内部未开放能力说明无需晋升理由', 'NEEDS_WORK');
    if (plan.sync.status === 'synced') requireValue(Array.isArray(plan.sync.targets) && plan.sync.targets.length > 0,
      'BASELINE_SYNC', '同步结果须引用主规格');
    const { reference } = require('./evidence');
    remember(reference(root, plan.sync.reference));
    for (const ref of plan.sync.targets || []) {
      requireValue(ref.path.startsWith('openspec/specs/'), 'BASELINE_SYNC_TARGET', '行为同步必须指向主规格');
      remember(reference(root, ref));
    }
  }
}

function inspect(root, candidate) {
  const registry = candidate ? validateRegistry(root, candidate) : loadRegistry(root);
  if (!registry) return { state: 'not-enrolled', path: REGISTRY, findings: [], host: 'UNVERIFIED' };
  const findings = [];
  const files = git(root, ['ls-files', '--cached', '--others', '--exclude-standard', '-z']).split('\0').filter(Boolean);
  requireValue(files.length <= 50000, 'BASELINE_SCAN_LIMIT', '项目盘点超过 50000 文件；请显式收窄仓库边界');
  for (const file of new Set(files)) {
    try { affected(registry, [file]); } catch (error) { findings.push({ rule: error.rule, message: error.message }); }
  }
  for (const module of registry.modules) {
    if (module.status !== 'active') findings.push({ rule: 'BASELINE_GAP', message: `${module.id}: ${module.status}; ${module.owner}; ${module.plan}` });
    else for (const view of ['overview', 'detailed']) {
      try { currentSection(root, module[view]); } catch (error) { findings.push({ rule: error.rule, message: error.message }); }
    }
  }
  return { state: findings.length ? 'needs-work' : 'bound', path: REGISTRY, modules: registry.modules, findings,
    freshness: 'UNVERIFIED: run delivery with slice evidence and explicit Git base', host: 'UNVERIFIED' };
}

module.exports = { REGISTRY, validateRegistry, loadRegistry, affected, section, validateBaselines, inspect };
