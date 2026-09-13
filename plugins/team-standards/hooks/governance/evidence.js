// 场景、设计视图和验证记录的结构检查；语义结论始终属于具名审阅者。
const { readText, safePath, hash, requireValue, MAX_FILES, fingerprints } = require('./storage');

const VIEW_IDS = ['implementation', 'contracts', 'data', 'workflow', 'async', 'runtime', 'architecture', 'ui'];

function text(value) { return typeof value === 'string' && value.trim().length > 0; }

function reference(root, ref, allowFile = false) {
  if (allowFile && ref && text(ref.path) && ref.heading === undefined) {
    const body = readText(safePath(root, ref.path));
    requireValue(body.trim().length > 0, 'REFERENCE_EMPTY', `验证结果文件为空：${ref.path}`, 'NEEDS_WORK');
    return { key: ref.path, digest: hash(body) };
  }
  requireValue(ref && text(ref.path) && text(ref.heading), 'REFERENCE_REQUIRED', '证据必须定位文件和唯一标题', 'NEEDS_WORK');
  const lines = readText(safePath(root, ref.path)).split('\n');
  const matches = lines.flatMap((line, index) => line === ref.heading ? [index] : []);
  requireValue(/^#{1,6} /.test(ref.heading) && matches.length === 1, 'REFERENCE_AMBIGUOUS',
    `证据标题缺失或重复：${ref.path} ${ref.heading}`, 'NEEDS_WORK');
  const start = matches[0];
  const level = ref.heading.indexOf(' ');
  let end = start + 1;
  while (end < lines.length && !new RegExp(`^#{1,${level}} `).test(lines[end])) end++;
  const body = lines.slice(start + 1, end).join('\n').trim();
  requireValue(body.length >= 20 && !/^(?:TBD|TODO|待补充|暂无)[。.!\s]*$/i.test(body),
    'REFERENCE_EMPTY', `证据章节没有实质正文：${ref.path} ${ref.heading}`, 'NEEDS_WORK');
  return { key: `${ref.path}#${ref.heading}`, digest: hash(body) };
}

function requiredViews(file) {
  const views = ['implementation'];
  if (/controller|dto|api|contract|\.(?:graphql|proto|avsc)$/i.test(file)) views.push('contracts');
  if (/repository|mapper|migration|schema|\.(?:sql|csv)$/i.test(file)) views.push('data');
  if (/service|domain|application|state/i.test(file)) views.push('workflow');
  if (/event|sse|queue|worker|job/i.test(file)) views.push('async');
  if (/config|docker|deploy|security|\.(?:ya?ml|toml|properties)$/i.test(file)) views.push('runtime');
  if (/package(?:-lock)?\.json|manifest|pom\.xml|gradle/i.test(file)) views.push('architecture');
  if (/\.(?:vue|svelte|tsx|jsx)$/i.test(file)) views.push('ui');
  return views;
}

function validateScope(plan, tasks) {
  requireValue(plan && Array.isArray(plan.files) && plan.files.length > 0 && plan.files.length <= MAX_FILES,
    'SCOPE_REQUIRED', '请列明本次任务拥有的相对文件路径', 'NEEDS_WORK');
  requireValue(plan.files.every(text) && new Set(plan.files).size === plan.files.length,
    'SCOPE_INVALID', '文件范围必须唯一且非空', 'NEEDS_WORK');
  requireValue(Array.isArray(plan.taskIds) && plan.taskIds.length > 0
    && plan.taskIds.every(id => tasks.some(task => task.id === id)), 'TASK_SCOPE', '当前切片必须绑定真实 OpenSpec task ID', 'NEEDS_WORK');
}

function validateViews(root, plan, remember) {
  requireValue(Array.isArray(plan.views), 'VIEWS_REQUIRED', '请补齐 Architecture Impact 视图映射', 'NEEDS_WORK');
  for (const view of plan.views) {
    requireValue(VIEW_IDS.includes(view.id) && ['updated', 'already-covered', 'not-applicable'].includes(view.disposition)
      && text(view.reason) && Array.isArray(view.files) && view.files.length > 0 && view.files.every(file => plan.files.includes(file)),
    'VIEW_INVALID', '设计视图须含有效类型、文件范围、覆盖状态和理由', 'NEEDS_WORK');
    if (view.disposition !== 'not-applicable' || view.reference !== undefined) {
      remember(reference(root, view.reference));
    }
  }
  for (const file of plan.files) {
    safePath(root, file);
    for (const id of requiredViews(file)) {
      requireValue(plan.views.some(view => view.id === id && view.files.includes(file)),
        'VIEW_GAP', `${file} 缺少 ${id} 视图覆盖；不适用也须记录理由`, 'NEEDS_WORK');
    }
  }
}

function validateScenarios(root, plan, remember, delivery) {
  requireValue(Array.isArray(plan.scenarios) && plan.scenarios.length > 0, 'SCENARIOS_REQUIRED', '缺少 Scenario 到任务的映射', 'NEEDS_WORK');
  const ids = new Set();
  for (const scenario of plan.scenarios) {
    requireValue(text(scenario.id) && !ids.has(scenario.id) && Array.isArray(scenario.taskIds)
      && scenario.taskIds.length > 0 && scenario.taskIds.every(id => plan.taskIds.includes(id))
      && Array.isArray(scenario.files) && scenario.files.length > 0 && scenario.files.every(file => plan.files.includes(file)),
    'SCENARIO_INVALID', 'Scenario 必须唯一并映射本次文件与任务', 'NEEDS_WORK');
    ids.add(scenario.id);
    remember(reference(root, scenario.reference));
    if (delivery) {
      requireValue(Array.isArray(scenario.verificationIds) && scenario.verificationIds.length > 0
        && scenario.verificationIds.every(id => plan.verifications?.some(item => item.id === id && item.result === 'PASS')),
      'VERIFICATION_GAP', `${scenario.id} 缺少通过的验证记录`, 'NEEDS_WORK');
    }
  }
  requireValue(plan.files.every(file => plan.scenarios.some(item => item.files.includes(file)))
    && plan.taskIds.every(id => plan.scenarios.some(item => item.taskIds.includes(id))),
  'SCENARIO_COVERAGE', '存在没有场景映射的文件或任务', 'NEEDS_WORK');
}

function validateReview(root, plan, remember, delivery) {
  requireValue(plan.review && ['agent', 'human', 'independent'].includes(plan.review.type)
    && text(plan.review.actor) && plan.review.result === 'PASS', 'REVIEW_REQUIRED', '缺少具名审阅及通过结论', 'NEEDS_WORK');
  remember(reference(root, plan.review.reference));
  if (plan.dedup !== undefined) {
    requireValue(plan.dedup && text(plan.dedup.query) && text(plan.dedup.decision),
      'DEDUP_REQUIRED', '查重记录须含检索范围与复用/新建理由', 'NEEDS_WORK');
    if (plan.dedup.reference !== undefined) remember(reference(root, plan.dedup.reference));
  }
  if (plan.handoff !== undefined) {
    requireValue(plan.handoff && text(plan.handoff.stage) && text(plan.handoff.nextTask)
      && Array.isArray(plan.handoff.blockers), 'HANDOFF_REQUIRED', '交接须含阶段、下一任务与阻塞清单', 'NEEDS_WORK');
    if (plan.handoff.reference !== undefined) remember(reference(root, plan.handoff.reference));
    requireValue(plan.handoff.blockers.length === 0, 'SLICE_BLOCKED', '当前切片仍有阻塞；请先解决或分离独立切片', 'NEEDS_WORK');
  }
  if (!delivery) return;
  const inputFingerprint = hash(JSON.stringify(fingerprints(root, plan.files)));
  requireValue(plan.review.inputFingerprint === inputFingerprint, 'REVIEW_INPUTS_STALE',
    '审阅未覆盖当前代码；复核后记录当时的 snapshot.inputFingerprint', 'NEEDS_WORK');
  requireValue(Array.isArray(plan.verifications) && plan.verifications.length > 0, 'VERIFICATION_REQUIRED', '缺少实际验证结果', 'NEEDS_WORK');
  const ids = new Set();
  for (const item of plan.verifications) {
    requireValue(text(item.id) && !ids.has(item.id) && text(item.command) && text(item.environment) && item.result === 'PASS',
      'VERIFICATION_FAILED', '验证必须记录唯一 ID、实际命令/操作、环境与通过结果', 'NEEDS_WORK');
    ids.add(item.id);
    requireValue(item.inputFingerprint === inputFingerprint, 'VERIFICATION_INPUTS_STALE',
      '验证输入已变化；重新验证后记录当时的 snapshot.inputFingerprint，不能仅重新 record', 'NEEDS_WORK');
    remember(reference(root, item.reference, true));
  }
}

function validatePlan(root, plan, context, phase) {
  const delivery = phase !== 'preflight';
  const references = {};
  const remember = ({ key, digest }) => { references[key] = digest; };
  validateScope(plan, context.tasks);
  validateViews(root, plan, remember);
  validateScenarios(root, plan, remember, delivery);
  validateReview(root, plan, remember, delivery);
  if (delivery) requireValue(plan.taskIds.every(id => context.tasks.find(task => task.id === id)?.done === true),
    'TASKS_INCOMPLETE', '本次切片的 OpenSpec tasks 尚未完成', 'NEEDS_WORK');
  if (phase === 'archive') validateArchive(root, plan, context, remember);
  return references;
}

function validateArchive(root, plan, context, remember) {
  requireValue(context.tasks.every(task => task.done === true), 'CHANGE_INCOMPLETE', '整个 change 尚未完成，不能归档', 'NEEDS_WORK');
  requireValue(plan.sync && ['synced', 'not-applicable'].includes(plan.sync.status) && text(plan.sync.reason),
    'SYNC_REQUIRED', '缺少官方同步结果或无需同步依据', 'NEEDS_WORK');
  remember(reference(root, plan.sync.reference));
  requireValue(Array.isArray(plan.sync.targets) && (plan.sync.status !== 'synced' || plan.sync.targets.length > 0),
    'SYNC_TARGETS', '同步证据必须指向当前主规格', 'NEEDS_WORK');
  for (const target of plan.sync.targets) remember(reference(root, target));
  requireValue(Array.isArray(plan.promotion) && plan.views.every(view => plan.promotion.some(item => item.id === view.id)),
    'PROMOTION_REQUIRED', '长期设计晋升必须覆盖每个设计视图', 'NEEDS_WORK');
  for (const item of plan.promotion) {
    requireValue(text(item.reason) && ['updated', 'already-covered', 'not-applicable'].includes(item.disposition),
      'PROMOTION_INVALID', '晋升记录缺少状态或理由', 'NEEDS_WORK');
    if (item.disposition !== 'not-applicable' || item.reference !== undefined) {
      remember(reference(root, item.reference));
    }
  }
}

module.exports = { VIEW_IDS, reference, requiredViews, validatePlan };
