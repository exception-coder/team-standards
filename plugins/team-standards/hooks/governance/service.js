// 共享治理用例：绑定不重置基线，检查无写入副作用，证据显式记录。
const fs = require('node:fs');
const path = require('node:path');
const storage = require('./storage');
const repoApi = require('./repository');
const openspec = require('./openspec');
const baselines = require('./baselines');
const { validatePlan } = require('./evidence');
const { checkEnrolled } = require('../../state-contract/enrollment');
const { requireValue, VERSION, POLICY_VERSION, CHECKER_VERSION, readJson, statePath, fingerprints, atomicUpdate, safePath } = storage;

function result(status, findings = [], extra = {}) {
  return { schemaVersion: VERSION, policyVersion: POLICY_VERSION, checkerVersion: CHECKER_VERSION, status, findings, ...extra };
}

function guarded(action) {
  try { return action(); }
  catch (error) { return result(error.status || 'CHECK_ERROR', [{ rule: error.rule || 'CHECK_FAILED', message: error.message }]); }
}

function discover(options) {
  const repo = repoApi.repository(options.repo || process.cwd());
  const configured = fs.existsSync(path.join(repo.root, 'openspec', 'config.yaml'));
  return result(configured ? 'PASS' : 'NOT_APPLICABLE', [], { repo: repo.root, head: repo.head,
    mode: configured ? 'openspec' : 'legacy', baselines: baselines.inspect(repo.root) });
}

function readBinding(repo, session) {
  const file = statePath(repo.root, session);
  requireValue(fs.existsSync(file), 'BINDING_REQUIRED', '当前会话未绑定 change；请运行 bind 并提供任务、文件及设计证据');
  const binding = readJson(file);
  requireValue(binding.schemaVersion === VERSION && binding.policyVersion === POLICY_VERSION,
    'VERSION_MISMATCH', '绑定版本不兼容；更新计划并对同一会话重新 bind，保留基线后重新审阅和验证');
  repoApi.verifyBaseline(repo, binding);
  return binding;
}

function bind(options) {
  const repo = repoApi.repository(options.repo);
  const plan = readJson(options.plan);
  const context = loadContext(repo.root, options.change, plan, options);
  const references = validatePlan(repo.root, plan, context, 'preflight', repo.head);
  const changed = repoApi.changedFiles(repo.root, repo.head);
  const current = executableScope(changed, context);
  const file = statePath(repo.root, options.session);
  const binding = atomicUpdate(file, previous => {
    if (!previous) {
      const targets = (plan.baselines || []).flatMap(item => item.reference ? [item.reference.path] : []);
      const prepared = require('./design-preparation').bindingPreparation(repo, options.session, targets, current);
      requireValue(prepared || !changed.some(file => targets.includes(file)), 'DIRTY_BASELINE_OWNERSHIP',
        '当前设计正文在任务开始前已修改；先用独立工作树分离，不能把他人正文差异记作本次 updated');
      if (prepared) options.designPreparation = prepared;
    }
    if (previous) {
      requireValue(previous.schemaVersion === VERSION && [1, 2, 3, 4, POLICY_VERSION].includes(previous.policyVersion),
        'VERSION_MISMATCH', '仅支持已知同结构策略绑定迁移，不能覆盖未知版本');
      repoApi.verifyBaseline(repo, previous);
      requireValue(previous.change === (options.change || null), 'REBIND_CONFLICT', '同一会话已有不同 change 绑定，不按最近修改时间替换');
      requireValue(previous.plan.files.every(item => plan.files.includes(item)), 'SCOPE_SHRINK', '不能通过缩小范围排除已绑定改动');
    }
    const initial = previous?.initial || options.designPreparation?.initial || fingerprints(repo.root, current);
    requireValue(plan.files.every(item => !Object.hasOwn(initial, item)), 'DIRTY_OWNERSHIP', '范围含任务开始前的脏文件；请先分离改动，不覆盖他人基线');
    return { schemaVersion: VERSION, policyVersion: POLICY_VERSION, repo: repo.root, branch: repo.branch,
      base: previous?.base || repo.head, initial, change: options.change || null, session: options.session,
      context, plan, references, retries: previous?.retries || 0, evidence: null };
  });
  return result('PASS', [], { change: binding.change, base: binding.base, binding: file });
}

function compareFingerprints(expected, actual, rule) {
  requireValue(JSON.stringify(expected) === JSON.stringify(actual), rule,
    '相关输入已变化；更新同一 change、复核受影响内容并重新记录证据', 'NEEDS_WORK');
}

function checkRange(repo, binding, incoming = []) {
  const changed = repoApi.changedFiles(repo.root, binding.base);
  const relevant = [...new Set([...executableScope(changed, binding.context), ...incoming])];
  const gaps = relevant.filter(file => !Object.hasOwn(binding.initial, file) && !binding.plan.files.includes(file));
  requireValue(gaps.length === 0, 'SCOPE_GAP', `出现未绑定文件：${gaps.join(', ')}`, 'NEEDS_WORK');
}

function executableScope(files, context) {
  return files.filter(file => repoApi.isExecutable(file) && !file.startsWith(`${context.changeDir}/`)
    && !Object.hasOwn(context.artifacts, file));
}

function check(options) {
  if (options.evidence) return checkCi(options);
  const repo = repoApi.repository(options.repo);
  const binding = readBinding(repo, options.session);
  const phase = options.phase || 'delivery';
  checkEnrolled(repo.root, phase);
  requireValue(['preflight', 'delivery', 'archive'].includes(phase), 'PHASE_INVALID', '不支持的检查阶段');
  checkRange(repo, binding, options.files || []);
  if (phase === 'preflight') {
    compareFingerprints(binding.context.artifacts, fingerprints(repo.root, Object.keys(binding.context.artifacts)), 'ARTIFACTS_STALE');
    compareFingerprints(binding.references, validatePlan(repo.root, binding.plan, binding.context, phase, binding.base), 'REVIEW_STALE');
  } else {
    requireValue(binding.evidence, 'EVIDENCE_REQUIRED', '缺少当前代码的交付证据；请完成验证后运行 record', 'NEEDS_WORK');
    const evidence = readJson(safePath(repo.root, binding.evidence));
    requireValue(evidence.change === binding.change && evidence.base === binding.base
      && evidence.bindingId === storage.hash(`${repo.root}\n${options.session}`)
      && JSON.stringify(evidence.plan.files) === JSON.stringify(binding.plan.files)
      && JSON.stringify(evidence.plan.taskIds) === JSON.stringify(binding.plan.taskIds),
    'EVIDENCE_BINDING', '证据不属于当前绑定的交付切片', 'NEEDS_WORK');
    verifyEvidence(repo.root, evidence, phase);
  }
  return result('PASS', [], { phase, change: binding.change, scope: binding.plan.files,
    assurance: '结构、范围和新鲜度通过；语义结论来自证据中的具名审阅' });
}

function record(options) {
  const repo = repoApi.repository(options.repo);
  const binding = readBinding(repo, options.session);
  checkRange(repo, binding);
  const plan = readJson(options.plan);
  requireValue(JSON.stringify([...plan.files].sort()) === JSON.stringify([...binding.plan.files].sort())
    && JSON.stringify(plan.taskIds) === JSON.stringify(binding.plan.taskIds), 'RECORD_SCOPE', '记录范围必须与绑定一致，扩展先重新 bind');
  const context = loadContext(repo.root, binding.change, plan, options);
  const phase = options.phase || 'delivery';
  checkEnrolled(repo.root, phase);
  requireValue(['delivery', 'archive'].includes(phase), 'PHASE_INVALID', 'record 只接受 delivery 或 archive');
  const references = validatePlan(repo.root, plan, context, phase, binding.base);
  validateSmallChange(repo.root, plan, context, binding.base);
  const evidence = { schemaVersion: VERSION, policyVersion: POLICY_VERSION, checkerVersion: CHECKER_VERSION, phase,
    bindingId: storage.hash(`${repo.root}\n${options.session}`),
    change: binding.change, base: binding.base, context, plan, references,
    inputs: fingerprints(repo.root, plan.files) };
  const destination = binding.change ? `${context.changeDir}/governance-evidence.json`
    : `.team-standards/evidence/${storage.hash(options.session)}.json`;
  atomicUpdate(safePath(repo.root, destination), previous => {
    requireValue(!previous || previous.bindingId === evidence.bindingId, 'EVIDENCE_CONCURRENT', '同一 change 已有其它任务的证据；请先合并交付范围再记录');
    return evidence;
  });
  atomicUpdate(statePath(repo.root, options.session), current => {
    requireValue(JSON.stringify(current) === JSON.stringify(binding), 'BINDING_CONCURRENT', '绑定已被其它操作修改，请重试');
    return { ...binding, evidence: destination, retries: 0 };
  });
  return result('PASS', [], { evidence: destination, phase, change: binding.change });
}

function verifyEvidence(root, evidence, phase) {
  checkEnrolled(root, phase);
  requireValue(evidence.schemaVersion === VERSION && evidence.policyVersion === POLICY_VERSION
    && evidence.checkerVersion === CHECKER_VERSION, 'VERSION_MISMATCH', '证据版本不兼容');
  requireValue(evidence.change === evidence.context.change, 'EVIDENCE_CHANGE', '证据与工件 change 不匹配');
  validateSmallChange(root, evidence.plan, evidence.context, evidence.base);
  requireValue(phase !== 'archive' || evidence.phase === 'archive', 'ARCHIVE_EVIDENCE', '归档检查缺少同步及长期设计晋升证据', 'NEEDS_WORK');
  compareFingerprints(evidence.inputs, fingerprints(root, evidence.plan.files), 'CODE_STALE');
  compareFingerprints(evidence.context.artifacts, fingerprints(root, Object.keys(evidence.context.artifacts)), 'ARTIFACTS_STALE');
  compareFingerprints(evidence.references, validatePlan(root, evidence.plan, evidence.context, phase, evidence.base), 'REVIEW_STALE');
}

function checkCi(options) {
  const repo = repoApi.repository(options.repo);
  requireValue(options.base && options.head, 'CI_BASE_REQUIRED', 'CI 必须明确指定 base 和 head');
  const base = repoApi.resolveRevision(repo.root, options.base);
  const head = repoApi.resolveRevision(repo.root, options.head);
  requireValue(head === repo.head, 'CI_CHECKOUT', 'CI 必须检出所检查的 head');
  requireValue(repoApi.changedFiles(repo.root, head).length === 0, 'CI_DIRTY', 'CI 检出包含工作区变化，不能用其替代目标提交');
  const evidence = readJson(safePath(repo.root, options.evidence));
  requireValue(evidence.base === base, 'CI_BASE_MISMATCH', '证据基线与交付基线不同，请重新核验范围');
  const changed = executableScope(repoApi.changedFiles(repo.root, base, head), evidence.context);
  requireValue(changed.every(file => evidence.plan.files.includes(file)), 'CI_SCOPE_GAP', '存在未被当前 change 证据覆盖的可执行变化', 'NEEDS_WORK');
  compareFingerprints(evidence.inputs, repoApi.revisionFingerprints(repo.root, head, evidence.plan.files), 'CI_INPUTS');
  verifyEvidence(repo.root, evidence, options.phase || 'delivery');
  return result('PASS', [], { phase: options.phase || 'delivery', base, head, change: evidence.change });
}

function doctor(options) {
  const found = discover(options);
  if (found.status === 'NOT_APPLICABLE') return found;
  const cli = openspec.executable(options.cli);
  const state = openspec.call(found.repo, ['list', '--json'], options);
  return result('PASS', [], { ...found, cli: cli.command, changes: state.changes,
    host: { status: 'UNVERIFIED', reason: 'CLI 可用不代表 Hook 已信任或宿主事件已触发' },
    limits: { files: storage.MAX_FILES, fileBytes: storage.MAX_BYTES, commandTimeoutMs: 5000 } });
}

function snapshot(options) {
  const repo = repoApi.repository(options.repo);
  const binding = readBinding(repo, options.session);
  checkRange(repo, binding);
  const files = options.files ? (Array.isArray(options.files) ? options.files : options.files.split(',')) : binding.plan.files;
  requireValue(files.every(file => binding.plan.files.includes(file)), 'SNAPSHOT_SCOPE', 'snapshot 输入必须属于绑定范围');
  const inputs = fingerprints(repo.root, files);
  const baselineApi = require('./baselines');
  const registry = baselineApi.loadRegistry(repo.root);
  const contentFingerprints = {};
  for (const module of registry ? baselineApi.affected(registry, binding.plan.files) : []) {
    if (module.content?.mode === 'enforce') contentFingerprints[module.id] = require('./design-content').fingerprint(repo.root, module);
  }
  return result('PASS', [], { inputs, inputFingerprint: storage.hash(JSON.stringify(inputs)),
    contentFingerprints,
    note: '只读取验证输入；未执行测试或审阅，须在实际验证时关联本结果' });
}

function loadContext(root, change, plan, options) {
  if (change) {
    const context = openspec.loadContext(root, change, options);
    openspec.validate(root, change, options);
    return context;
  }
  requireValue(plan.smallChange && typeof plan.smallChange.reason === 'string' && plan.smallChange.reason.trim()
    && plan.smallChange.behaviorUnchanged === true && plan.files?.length <= 2,
  'SMALL_CHANGE_REQUIRED', '无 change 仅支持具名审阅的 S 类：最多两文件，明确行为/契约不变理由');
  return { change: null, changeDir: '.team-standards/evidence', schema: 'small-change', tasks: [{ id: 'small', done: true }], artifacts: {} };
}

function validateSmallChange(root, plan, context, base) {
  if (context.schema !== 'small-change') return;
  loadContext(root, null, plan, {});
  const diff = repoApi.git(root, ['diff', '--numstat', '--no-renames', repoApi.resolveRevision(root, base), '--', ...plan.files]);
  let lines = 0;
  for (const row of diff.trim().split('\n').filter(Boolean)) {
    const [added, deleted] = row.split('\t');
    requireValue(/^\d+$/.test(added) && /^\d+$/.test(deleted), 'SMALL_CHANGE_SCOPE', 'S 类不接受二进制变化');
    lines += Number(added) + Number(deleted);
  }
  for (const file of plan.files) {
    if (!repoApi.git(root, ['ls-files', '--', file]).trim() && fs.existsSync(safePath(root, file))) {
      lines += storage.readText(safePath(root, file)).split('\n').length;
    }
  }
  requireValue(lines <= 30, 'SMALL_CHANGE_SCOPE', 'S 类最多 30 行；超出后使用独立 change');
}

module.exports = { guarded, result, discover, readBinding, bind, check, record, doctor, snapshot };
