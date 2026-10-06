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
  const tracked = repoApi.git(repo.root, ['ls-files', '--cached', '-z']).split('\0').filter(Boolean);
  const untrackedDocs = repoApi.git(repo.root, ['ls-files', '--others', '--exclude-standard', '-z', '--',
    ':(glob)docs/**/*.md', ':(glob)*.md']).split('\0').filter(Boolean);
  const all = [...new Set([...tracked, ...untrackedDocs])];
  need(all.length <= 50000, 'DESIGN_SCAN_LIMIT', '超过 50000 文件；先明确模块范围再定向读取');
  const documents = [...new Set(all)].filter(file => /\.md$/i.test(file)
    && !/^(?:openspec\/changes\/|node_modules\/|graphify-out\/)/.test(file));
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
  need(candidates.length <= 1000, 'DESIGN_SCAN_LIMIT', '设计候选超过 1000 文档；使用项目索引定向确认，不静默截断');
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
    const dirty = repoApi.changedFiles(repo.root, repo.head, undefined,
      discovery.candidates.map(candidate => candidate.path));
    return { version: 1, repo: repo.root, branch: repo.branch, origin: repo.head, base: repo.head, session: options.session,
      initial: fingerprints(repo.root, dirty), registryHash: fingerprint(repo.root, baselines.REGISTRY), documents: {} };
  });
  return { ...discovery, preparation: { base: state.base, initialDirty: Object.keys(state.initial), session: state.session },
    next: 'Agent 读取候选并确认归属，补建/更新真实正文，再调用 upsert；不要求用户填写 JSON。' };
}

function resume(options) {
  need(text(options.session), 'SESSION_REQUIRED', '续接需要当前真实会话');
  need(text(options.change), 'DESIGN_RESUME_CHANGE', '续接需要显式指定原 change');
  const repo = repoApi.repository(options.root);
  const file = stateFile(repo.root, options.session);
  need(fs.existsSync(file), 'DESIGN_PREPARATION_REQUIRED', '续接需要原会话准备记录');
  const state = storage.readJson(file);
  need(state.version === 1 && state.repo === repo.root && state.branch === repo.branch && state.session === options.session,
    'DESIGN_PREPARATION_STALE', '准备记录与当前仓库、分支或会话不一致');
  need(state.base !== repo.head, 'DESIGN_RESUME_RANGE', '当前 HEAD 尚未产生可续接提交');
  const { commits, declared, touched } = committedRange(repo, state, options.files);
  const service = require('./service');
  const binding = service.readBinding(repo, options.session);
  need(binding.session === options.session && binding.base === state.base && binding.change === options.change,
    'DESIGN_RESUME_BINDING', '原会话绑定、change 或检查点不一致');
  need(binding.evidence && service.guarded(() => service.check({ repo: repo.root, session: options.session, phase: 'delivery' })).status === 'PASS',
    'DESIGN_RESUME_EVIDENCE', '原切片交付证据缺失或过期；已有真实 writer 的未完成开发使用显式 resume-writer');
  const owned = new Set([...binding.plan.files, ...Object.keys(binding.context.artifacts),
    ...Object.keys(binding.references), ...(binding.plan.baselines || []).flatMap(item => item.reference ? [item.reference.path] : []),
    binding.evidence]);
  for (const module of baselines.loadRegistry(repo.root)?.modules || []) {
    const visit = value => {
      if (!value || typeof value !== 'object') return;
      if (typeof value.path === 'string') owned.add(value.path);
      Object.values(value).forEach(visit);
    };
    if (state.ownedModules?.includes(module.id)) visit(module);
  }
  const outside = declared.filter(name => !owned.has(name));
  need(outside.length === 0, 'DESIGN_RESUME_SCOPE', `提交包含原切片范围之外的文件：${outside.join(', ')}`);
  for (const [name, digest] of Object.entries(state.initial)) {
    need(fingerprint(repo.root, name) === digest && !touched.has(name),
      'DESIGN_INITIAL_CHANGED', `其他任务初始改动的归属发生变化：${name}`);
  }
  const dirty = repoApi.changedFiles(repo.root, repo.head, undefined, [...declared, ...Object.keys(state.initial)]);
  need(dirty.every(name => !touched.has(name)), 'DESIGN_RESUME_MIXED', '已提交切片文件仍有未提交改动；先分离归属');
  const updated = atomicUpdate(file, current => {
    need(JSON.stringify(current) === JSON.stringify(state), 'DESIGN_PREPARATION_CONCURRENT', '准备记录并行变化');
    return { ...current, origin: current.origin || current.base,
      originInitial: current.originInitial || current.initial, originRegistryHash: current.originRegistryHash || current.registryHash,
      base: repo.head,
      checkpoints: [...(current.checkpoints || []), { from: current.base, to: repo.head, commits, files: declared,
        evidence: binding.evidence }], initial: fingerprints(repo.root, dirty),
      registryHash: fingerprint(repo.root, baselines.REGISTRY), documents: {}, ownedModules: [] };
  });
  return { origin: updated.origin, base: updated.base, commits, files: declared, next: '同一会话重新 prepare、upsert、bind，并为下一切片重新验证和记录证据' };
}

function committedRange(repo, state, files) {
  need(state.base !== repo.head, 'DESIGN_RESUME_RANGE', '当前 HEAD 尚未产生可续接提交');
  const commits = repoApi.git(repo.root, ['rev-list', '--reverse', `${state.base}..${repo.head}`]).trim().split('\n').filter(Boolean);
  need(commits.length > 0 && repoApi.git(repo.root, ['merge-base', state.base, repo.head]).trim() === state.base,
    'DESIGN_RESUME_RANGE', '提交范围不在原检查点之后');
  let parent = state.base;
  const touched = new Set();
  for (const commit of commits) {
    need(repoApi.git(repo.root, ['rev-list', '--parents', '-n', '1', commit]).trim() === `${commit} ${parent}`,
      'DESIGN_RESUME_RANGE', '续接仅接受原检查点后的连续线性提交');
    repoApi.changedFiles(repo.root, parent, commit).forEach(name => touched.add(name));
    parent = commit;
  }
  const declared = [...new Set(files || [])].sort();
  declared.forEach(name => safePath(repo.root, name));
  need(declared.length > 0 && JSON.stringify([...touched].sort()) === JSON.stringify(declared),
    'DESIGN_RESUME_SCOPE', '已提交文件与显式声明的切片范围不一致');
  return { commits, declared, touched };
}

function recover(options) {
  need(text(options.session) && text(options.change) && text(options.plan),
    'DESIGN_RECOVERY_INPUT', '恢复需要原会话、原 change 和当前切片计划');
  const repo = repoApi.repository(options.root);
  const file = stateFile(repo.root, options.session);
  need(fs.existsSync(file), 'DESIGN_PREPARATION_REQUIRED', '缺少原会话准备记录');
  need(!fs.existsSync(statePath(repo.root, options.session)), 'DESIGN_RECOVERY_BOUND', '已有绑定应使用正常 resume');
  const state = storage.readJson(file);
  need(state.version === 1 && state.repo === repo.root && state.branch === repo.branch && state.session === options.session,
    'DESIGN_PREPARATION_STALE', '原准备记录与仓库、分支或会话不一致');
  const { commits, declared } = committedRange(repo, state, options.files);
  const owned = [...new Set(options.ownedFiles || [])].sort();
  owned.forEach(name => safePath(repo.root, name));
  need(owned.length > 0, 'DESIGN_RECOVERY_OWNERSHIP', '必须显式列出原 change 拥有的文件');
  const planFile = path.resolve(options.plan);
  const plan = storage.readJson(planFile);
  const context = require('./openspec').loadContext(repo.root, options.change, options);
  require('./openspec').validate(repo.root, options.change, options);
  const references = require('./evidence').validatePlan(repo.root, plan, context, 'delivery', repo.head);
  const referencedFiles = Object.keys(references).map(key => key.split('#')[0]);
  const allowed = new Set([...plan.files, ...referencedFiles]);
  need(owned.every(name => allowed.has(name)) && plan.files.every(name => owned.includes(name)),
    'DESIGN_RECOVERY_OWNERSHIP', '认领范围必须由当前切片计划、设计审阅和验证引用覆盖');
  const dirty = repoApi.changedFiles(repo.root, repo.head, undefined, [...owned, ...Object.keys(state.initial)]);
  const initial = fingerprints(repo.root, dirty.filter(name => !owned.includes(name)));
  const documents = fingerprints(repo.root, owned.filter(name => referencedFiles.includes(name)));
  const recovery = { change: options.change, from: state.base, to: repo.head, commits, files: declared,
    ownedFiles: owned, externalDirty: Object.keys(initial), planDigest: storage.hash(readText(planFile)),
    inputs: fingerprints(repo.root, plan.files), references };
  const updated = atomicUpdate(file, current => {
    need(JSON.stringify(current) === JSON.stringify(state), 'DESIGN_PREPARATION_CONCURRENT', '原准备记录并行变化');
    need(!fs.existsSync(statePath(repo.root, options.session)), 'DESIGN_RECOVERY_BOUND', '恢复期间建立了绑定');
    return { ...current, origin: current.origin || current.base,
      originInitial: current.originInitial || current.initial, originRegistryHash: current.originRegistryHash || current.registryHash,
      base: repo.head, initial,
      registryHash: fingerprint(repo.root, baselines.REGISTRY), documents,
      checkpoints: [...(current.checkpoints || []), { ...recovery, kind: 'unbound-recovery' }], recovery };
  });
  return { origin: updated.origin, base: updated.base, change: options.change, committedFiles: declared.length,
    ownedFiles: owned.length, externalDirty: Object.keys(initial).length,
    next: '使用同一真实会话和已审阅计划重新 bind；恢复记录不代表历史 delivery PASS' };
}

function validateState(repo, state, targets = []) {
  need(state?.version === 1 && state.repo === repo.root && state.branch === repo.branch && state.base === repo.head,
    'DESIGN_PREPARATION_STALE', '准备记录的仓库、分支或 HEAD 已变化；保留现场，按真实 writer 开发续接或已交付 resume 核对');
  for (const file of targets) if (Object.hasOwn(state.initial, file)) {
    const digest = state.initial[file];
    need(fingerprint(repo.root, file) === digest, 'DESIGN_INITIAL_CHANGED', `起始已有改动发生变化：${file}；先分离任务，不覆盖他人内容`);
  }
}

function readPreparation(repo, session, targets = []) {
  need(text(session), 'SESSION_REQUIRED', '缺少任务 session');
  const file = stateFile(repo.root, session);
  need(fs.existsSync(file), 'DESIGN_PREPARATION_REQUIRED', 'Agent 应先 prepare 保存任务起点，再补建文档和绑定');
  const state = storage.readJson(file);
  validateState(repo, state, targets);
  return state;
}

function recoverWriter(options, resumeBound = false) {
  need(text(options.session) && text(options.change) && text(options.plan),
    'DESIGN_RECOVERY_INPUT', '开发恢复需要原真实会话、当前 change 和已审阅计划');
  const repo = repoApi.repository(options.root);
  const file = stateFile(repo.root, options.session);
  need(fs.existsSync(file), 'DESIGN_PREPARATION_REQUIRED', '先 prepare 保存当前现场；既有记录不得删除');
  const bindingFile = statePath(repo.root, options.session);
  need(resumeBound || !fs.existsSync(bindingFile), 'DESIGN_RECOVERY_BOUND', '已有绑定使用 resume-writer 开发续接或已交付 resume');
  const previousBinding = resumeBound ? storage.readJson(bindingFile) : null;
  const state = storage.readJson(file);
  need(state.version === 1 && state.repo === repo.root && state.branch === repo.branch && state.session === options.session,
    'DESIGN_PREPARATION_STALE', '原准备记录与仓库、分支或会话不一致');
  const plan = storage.readJson(path.resolve(options.plan));
  if (previousBinding) {
    need(previousBinding.schemaVersion === storage.VERSION && previousBinding.policyVersion === storage.POLICY_VERSION
      && previousBinding.repo === repo.root && previousBinding.branch === repo.branch
      && previousBinding.session === options.session && previousBinding.change === options.change
      && (previousBinding.base === state.base || state.recovery?.kind === 'bound-writer-recovery'
        && state.recovery.previousBindingDigest === storage.hash(JSON.stringify(previousBinding))
        && state.recovery.from === previousBinding.base),
    'DESIGN_RESUME_BINDING', '原绑定、准备检查点、真实会话和 change 必须一致');
    need(previousBinding.plan.files.every(file => plan.files.includes(file)), 'SCOPE_SHRINK', '开发续接必须保留原绑定范围');
  }
  const writerRecovery = require('./writer-recovery');
  const rangeState = previousBinding ? { ...state, base: previousBinding.base } : state;
  const range = writerRecovery.range(repo, rangeState, options, committedRange);
  const recovery = writerRecovery.build(repo, options, rangeState, range, previousBinding);
  if (previousBinding) {
    recovery.kind = 'bound-writer-recovery';
    recovery.previousBinding = previousBinding;
    recovery.previousBindingDigest = storage.hash(JSON.stringify(previousBinding));
    const output = require('./evidence-inputs').output({ change: options.change });
    if (output && fs.existsSync(safePath(repo.root, output))) {
      recovery.previousEvidence = { path: output, content: storage.readText(safePath(repo.root, output)) };
    }
    recovery.id = storage.hash(JSON.stringify(recovery));
  }
  const registry = baselines.loadRegistry(repo.root);
  const modules = [...new Set((plan.baselines || []).map(item => item.module))];
  if (recovery.ownedFiles.includes(baselines.REGISTRY) && Object.hasOwn(state.initial, baselines.REGISTRY)) {
    need(modules.some(module => state.ownedModules?.includes(module))
      && fingerprint(repo.root, baselines.REGISTRY) === state.registryHash,
    'DESIGN_DIRTY_REGISTRY', '已有共享登记改动须先由正式 upsert 合并目标模块，再审阅和认领登记文件');
  }
  // 共享登记文件可以已有其他模块修改；只确认本切片条目未被其他任务改写。
  modules.forEach(module => verifyInitialModule(repo, state, registry, module));
  const updated = atomicUpdate(file, current => {
    need(JSON.stringify(current) === JSON.stringify(state), 'DESIGN_PREPARATION_CONCURRENT', '原准备记录并行变化');
    need(previousBinding ? storage.hash(JSON.stringify(storage.readJson(bindingFile))) === recovery.previousBindingDigest
      : !fs.existsSync(bindingFile), 'DESIGN_RECOVERY_BOUND', '恢复期间绑定发生变化');
    need(repoApi.repository(repo.root).head === repo.head, 'DESIGN_RECOVERY_STALE', '恢复期间 HEAD 变化');
    const context = require('./openspec').loadContext(repo.root, options.change, options);
    writerRecovery.verify(repo, options, recovery, plan, context);
    return { ...current, origin: current.origin || current.base,
      originInitial: current.originInitial || current.initial, originRegistryHash: current.originRegistryHash || current.registryHash,
      base: repo.head, initial: recovery.external.inputs,
      registryHash: fingerprint(repo.root, baselines.REGISTRY),
      documents: fingerprints(repo.root, recovery.ownedFiles.filter(name => !repoApi.isExecutable(name))),
      ownedModules: modules, checkpoints: [...(current.checkpoints || []), recovery], recovery };
  });
  return { origin: updated.origin, base: updated.base, change: options.change, executionId: recovery.writer.executionId,
    phase: 'preflight', ownedFiles: recovery.ownedFiles.length, externalDirty: Object.keys(updated.initial).length,
    next: '同一真实会话 bind 并检查 preflight 后继续开发；交付仍须完成任务、实际验证并 record' };
}

function resumeWriter(options) {
  const repo = repoApi.repository(options.root);
  const file = statePath(repo.root, options.session);
  need(fs.existsSync(file), 'BINDING_REQUIRED', '已有绑定的开发续接需要原绑定；未绑定使用 recover-writer');
  // 只锁定并读取原绑定；准备检查点原子写入，原绑定直到 bind 成功才更新。
  const lock = `${file}.lock`;
  let descriptor;
  try { descriptor = fs.openSync(lock, 'wx'); }
  catch (error) {
    if (error.code !== 'EEXIST') throw error;
    need(false, 'STATE_BUSY', '原绑定正在更新，稍后重新读取再续接');
  }
  try { return recoverWriter(options, true); }
  finally { fs.closeSync(descriptor); fs.unlinkSync(lock); }
}

function readCheckpoint(repo, session) {
  const file = stateFile(repo.root, session);
  return fs.existsSync(file) ? storage.readJson(file) : null;
}

function verifyInitialModule(repo, state, registry, moduleId) {
  if (!Object.hasOwn(state.initial, baselines.REGISTRY)) return;
  if (state.ownedModules?.includes(moduleId)) return;
  const exists = repoApi.git(repo.root, ['ls-tree', '-z', state.base, '--', baselines.REGISTRY]);
  const baseline = exists
    ? JSON.parse(repoApi.git(repo.root, ['show', `${state.base}:${baselines.REGISTRY}`]))
    : { modules: [] };
  const original = baseline.modules.find(item => item.id === moduleId);
  const current = registry.modules.find(item => item.id === moduleId);
  need(JSON.stringify(original) === JSON.stringify(current), 'DESIGN_DIRTY_REGISTRY',
    `模块 ${moduleId} 在任务开始前已有绑定改动，不能合并认领；其它模块改动可保留`);
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
    verifyInitialModule(repo, state, registry, options.module);
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
    validateState(repo, state, [module.overview.path, module.detailed.path]);
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
      atomicUpdate(safePath(repo.root, baselines.REGISTRY), () => {
        need(fingerprint(repo.root, baselines.REGISTRY) === state.registryHash, 'DESIGN_REGISTRY_CONCURRENT', '绑定发生并行变化，停止覆盖');
        return next;
      });
    }
    const documents = { ...state.documents, ...fingerprints(repo.root, [module.overview.path, module.detailed.path]) };
    output = { action: changed ? prior ? 'updated' : 'created' : 'unchanged', module, registry: baselines.REGISTRY,
      content: module.content.mode, note: '只合并已确认模块；正文由 Agent 维护。准备不等于内容验收或启用宿主阻断。' };
    return { ...state, registryHash: fingerprint(repo.root, baselines.REGISTRY), documents,
      ownedModules: [...new Set([...(state.ownedModules || []), module.id])] };
  });
  return output;
}

// 首次治理 bind 只接纳本任务准备阶段的正文和绑定，不豁免提前修改业务代码。
function bindingPreparation(repo, session, targets, current) {
  if (!fs.existsSync(stateFile(repo.root, session))) return null;
  const state = readPreparation(repo, session, [...targets, ...current].filter(file => file !== baselines.REGISTRY));
  need(fingerprint(repo.root, baselines.REGISTRY) === state.registryHash, 'DESIGN_REGISTRY_CONCURRENT', '准备后绑定发生变化，需重新核对');
  need(!Object.hasOwn(state.initial, baselines.REGISTRY) || state.ownedModules?.length || state.recovery?.kind === 'writer-recovery',
    'DESIGN_DIRTY_REGISTRY', '初始登记改动须先经过目标模块 upsert 核验，不能直接认领');
  const changed = repoApi.changedFiles(repo.root, repo.head, undefined, targets);
  for (const target of targets) if (changed.includes(target)) {
    need(Object.hasOwn(state.documents, target) && fingerprint(repo.root, target) === state.documents[target],
      'DESIGN_DOCUMENT_STALE', `${target} 未由本任务准备或准备后已变化；重新审阅正文并 upsert`);
  }
  need(current.every(file => Object.hasOwn(state.initial, file) || file === baselines.REGISTRY
    || state.recovery?.ownedFiles.includes(file)),
    'DESIGN_EARLY_CODE', '自动设计准备只接纳文档和绑定；业务代码必须在治理 bind 后修改');
  return { initial: Object.fromEntries(Object.entries(state.initial).filter(([file]) => repoApi.isExecutable(file)
    && (file !== baselines.REGISTRY || state.recovery?.kind === 'writer-recovery'))), base: state.base };
}

module.exports = { discover, prepare, resume, recover, recoverWriter, resumeWriter, upsert, bindingPreparation, readCheckpoint };
