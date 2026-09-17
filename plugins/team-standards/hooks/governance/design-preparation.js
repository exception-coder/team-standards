// Agent 决定业务归属和正文；本模块只负责候选发现、任务起点及安全合并绑定。
const fs = require('node:fs');
const path = require('node:path');
const storage = require('./storage');
const repoApi = require('./repository');
const baselines = require('./baselines');
const { requireValue: need, fingerprint, fingerprints, readText, safePath, statePath, atomicUpdate } = storage;
const stateFile = (root, session) => {
  const file = statePath(root, session);
  return path.join(path.dirname(file), 'design-preparation', path.basename(file));
};
const text = value => typeof value === 'string' && value.trim().length > 0;

function discover(options) {
  const repo = repoApi.repository(options.root);
  const registry = baselines.loadRegistry(repo.root);
  const all = repoApi.git(repo.root, ['ls-files', '--cached', '--others', '--exclude-standard', '-z']).split('\0').filter(Boolean);
  need(all.length <= 50000, 'DESIGN_SCAN_LIMIT', '超过 50000 文件；先明确模块范围再定向读取');
  const documents = [...new Set(all)].filter(file => /\.md$/i.test(file)
    && !/^(?:openspec\/changes\/|node_modules\/|graphify-out\/)/.test(file));
  need(documents.length <= 1000, 'DESIGN_SCAN_LIMIT', '设计候选超过 1000 文档；使用项目索引定向确认，不静默截断');
  const candidates = [];
  for (const file of documents) {
    const target = safePath(repo.root, file);
    if (!fs.existsSync(target)) continue;
    const body = readText(target);
    let fence;
    const headings = body.split('\n').filter(line => {
      const marker = /^\s{0,3}(`{3,}|~{3,})/.exec(line);
      if (marker) { if (!fence) fence = marker[1]; else if (marker[1][0] === fence[0] && marker[1].length >= fence.length) fence = null; return false; }
      return !fence && /^#{1,6} .+/.test(line);
    });
    if (headings.some(line => /概设|详设|概要设计|详细设计|overview|detailed|design/i.test(line))) {
      candidates.push({ path: file, headings, moduleHint: Boolean(options.module && (file.includes(options.module) || body.includes(options.module))) });
    }
  }
  return { ...repo, mode: fs.existsSync(path.join(repo.root, 'openspec/config.yaml')) ? 'openspec' : 'legacy',
    registry: registry || null, entries: all.filter(file => /^(?:AGENTS|CLAUDE|README)\.md$|^docs\/(?:README|INDEX)\.md$/.test(file)),
    candidates, note: '候选不代表权威归属；Agent 结合入口、引用、规格及代码确认。discover 不写文件。' };
}

function prepare(options) {
  need(text(options.session), 'SESSION_REQUIRED', '自动准备需要当前任务 session');
  const discovery = discover(options);
  const repo = repoApi.repository(options.root);
  const state = atomicUpdate(stateFile(repo.root, options.session), previous => {
    if (previous) { validateState(repo, previous); return previous; }
    const dirty = repoApi.changedFiles(repo.root, repo.head);
    return { version: 1, repo: repo.root, branch: repo.branch, base: repo.head, session: options.session,
      initial: fingerprints(repo.root, dirty), registryHash: fingerprint(repo.root, baselines.REGISTRY), documents: {} };
  });
  return { ...discovery, preparation: { base: state.base, initialDirty: Object.keys(state.initial), session: state.session },
    next: 'Agent 读取候选并确认归属，补建/更新真实正文，再调用 upsert；不要求用户填写 JSON。' };
}

function validateState(repo, state) {
  need(state?.version === 1 && state.repo === repo.root && state.branch === repo.branch && state.base === repo.head,
    'DESIGN_PREPARATION_STALE', '准备记录的仓库、分支或 HEAD 已变化；保留现场并在独立任务中重新核对');
  for (const [file, digest] of Object.entries(state.initial)) {
    need(fingerprint(repo.root, file) === digest, 'DESIGN_INITIAL_CHANGED', `起始已有改动发生变化：${file}；先分离任务，不覆盖他人内容`);
  }
}

function readPreparation(repo, session) {
  need(text(session), 'SESSION_REQUIRED', '缺少任务 session');
  const file = stateFile(repo.root, session);
  need(fs.existsSync(file), 'DESIGN_PREPARATION_REQUIRED', 'Agent 应先 prepare 保存任务起点，再补建文档和绑定');
  const state = storage.readJson(file);
  validateState(repo, state);
  return state;
}

function upsert(options) {
  const repo = repoApi.repository(options.root);
  need(text(options.session), 'SESSION_REQUIRED', '缺少任务 session');
  let output;
  atomicUpdate(stateFile(repo.root, options.session), state => {
    need(state, 'DESIGN_PREPARATION_REQUIRED', '先执行 prepare，不接受事后认领已有修改');
    validateState(repo, state);
    need(fingerprint(repo.root, baselines.REGISTRY) === state.registryHash, 'DESIGN_REGISTRY_CONCURRENT', '绑定在准备后被其它任务修改；重新审阅合并，不能覆盖');
    const registry = baselines.loadRegistry(repo.root) || { schemaVersion: 1, managed: [], modules: [] };
    const prior = registry.modules.find(item => item.id === options.module);
    need(prior?.status !== 'retired', 'DESIGN_RETIRED', '已停用模块不能自动恢复；先核对替代模块及迁移记录');
    const module = { ...prior, id: options.module,
      scopes: options.scopes?.length ? [...new Set([...(prior?.scopes || []), ...options.scopes])] : prior?.scopes,
      capabilities: options.capabilities?.length ? [...new Set([...(prior?.capabilities || []), ...options.capabilities])] : prior?.capabilities,
      owner: options.owner || prior?.owner, status: 'active', codeVersion: options.codeVersion || prior?.codeVersion,
      overview: options.overview ? { path: options.overview, heading: options.overviewHeading } : prior?.overview,
      detailed: options.detailed ? { path: options.detailed, heading: options.detailedHeading } : prior?.detailed };
    if (options.content) {
      const next = storage.readJson(path.resolve(options.content));
      need(prior?.content?.mode !== 'enforce' || next.mode === 'enforce', 'CONTENT_DOWNGRADE', '不能在准备阶段降级严格内容检查');
      module.content = next;
    }
    if (!module.content) {
      need(text(options.migrationReason) && text(options.migrationDue), 'DESIGN_MIGRATION_REQUIRED', '未完成内容接入时，Agent 须说明真实缺口和完成节点');
      module.content = { version: 1, mode: 'migrate', migration: { owner: module.owner, due: options.migrationDue, reason: options.migrationReason }, functions: [] };
    }
    const next = { ...registry, managed: [...new Set([...registry.managed, ...(module.scopes || [])])],
      modules: prior ? registry.modules.map(item => item.id === module.id ? module : item) : [...registry.modules, module] };
    baselines.validateRegistry(repo.root, next);
    for (const scope of module.scopes) baselines.affected(next, [scope]);
    for (const ref of [module.overview, module.detailed]) {
      need(!Object.hasOwn(state.initial, ref.path), 'DESIGN_DIRTY_DOCUMENT', `${ref.path} 在任务开始时已有修改；改用隔离工作树或先处理归属`);
      need(fs.existsSync(safePath(repo.root, ref.path)), 'DESIGN_DOCUMENT_MISSING', `${ref.path} 不存在；Agent 应先补建真实正文，再维护绑定`);
      const body = baselines.section(readText(safePath(repo.root, ref.path)), ref.heading);
      need(body.length >= 20 && !/^(TODO|TBD|待补充)[。\s]*$/i.test(body), 'DESIGN_EMPTY', '先由 Agent 编写真实设计，不能用空模板建立有效绑定');
    }
    const changed = JSON.stringify(registry) !== JSON.stringify(next);
    if (changed) {
      need(!Object.hasOwn(state.initial, baselines.REGISTRY), 'DESIGN_DIRTY_REGISTRY', '任务开始前已有绑定改动，不能合并认领');
      atomicUpdate(safePath(repo.root, baselines.REGISTRY), () => {
        need(fingerprint(repo.root, baselines.REGISTRY) === state.registryHash, 'DESIGN_REGISTRY_CONCURRENT', '绑定发生并行变化，停止覆盖');
        return next;
      });
    }
    const documents = { ...state.documents, ...fingerprints(repo.root, [module.overview.path, module.detailed.path]) };
    output = { action: changed ? prior ? 'updated' : 'created' : 'unchanged', module, registry: baselines.REGISTRY,
      content: module.content.mode, note: '只合并已确认模块；正文由 Agent 维护。准备不等于内容验收或启用宿主阻断。' };
    return { ...state, registryHash: fingerprint(repo.root, baselines.REGISTRY), documents };
  });
  return output;
}

// 首次治理 bind 只接纳本任务准备阶段的正文和绑定，不豁免提前修改业务代码。
function bindingPreparation(repo, session, targets, current) {
  if (!fs.existsSync(stateFile(repo.root, session))) return null;
  const state = readPreparation(repo, session);
  need(fingerprint(repo.root, baselines.REGISTRY) === state.registryHash, 'DESIGN_REGISTRY_CONCURRENT', '准备后绑定发生变化，需重新核对');
  for (const target of targets) if (repoApi.changedFiles(repo.root, repo.head).includes(target)) {
    need(Object.hasOwn(state.documents, target) && fingerprint(repo.root, target) === state.documents[target],
      'DESIGN_DOCUMENT_STALE', `${target} 未由本任务准备或准备后已变化；重新审阅正文并 upsert`);
  }
  need(current.every(file => Object.hasOwn(state.initial, file) || file === baselines.REGISTRY),
    'DESIGN_EARLY_CODE', '自动设计准备只接纳文档和绑定；业务代码必须在治理 bind 后修改');
  return { initial: Object.fromEntries(Object.entries(state.initial).filter(([file]) => repoApi.isExecutable(file))), base: state.base };
}

module.exports = { discover, prepare, upsert, bindingPreparation };
