// 开发恢复只消费 Forge 实时写入归属；不接收离线 writer 证明，不产生交付 PASS。
const fs = require('node:fs');
const path = require('node:path');
const storage = require('./storage');
const repoApi = require('./repository');
const { requireValue: need, fingerprints, hash, safePath, canonicalPath } = storage;

function liveWriter(repo, options) {
  const { runtime, callForge } = require('../forge/client');
  const config = runtime();
  need(config.protocolVersion === 2, 'DESIGN_WRITER_REQUIRED', '开发恢复需要 Forge v2 实时 writer 归属');
  const read = (name, input) => {
    const { response, status } = callForge(config, name, input);
    need(status === 0 && response && canonicalPath(response.project) === repo.root,
      'DESIGN_WRITER_REQUIRED', 'Forge 未返回当前仓库的有效归属');
    return response;
  };
  const session = read('session_init', { project: repo.root, sessionId: options.session });
  const execution = session.execution;
  need(session.protocolVersion === 2 && session.sessionId === options.session && execution?.ownsWriter
    && execution.state === 'BOUND' && execution.changeId === options.change
    && session.branch === repo.branch && execution.branch === repo.branch,
  'DESIGN_WRITER_IDENTITY', '原真实会话、change、分支和活动 writer 必须一致');
  const workspace = read('inspect_execution_writer', { project: repo.root });
  const writers = workspace.writers || (workspace.writer ? [workspace.writer] : []);
  const writer = writers.find(item => item.executionId === execution.executionId);
  need(workspace.branch === repo.branch && workspace.head === repo.head
    && writer?.ownerSessionId === options.session && writer.assignedBranch === repo.branch
    && writer.scopes?.includes(`change:${options.change}`) && Array.isArray(execution.files)
    && Array.isArray(writer.scopedPaths) && typeof writer.scopeFingerprint === 'string',
  'DESIGN_WRITER_IDENTITY', '实时 writer、HEAD 或文件归属不一致');
  need(repoApi.git(repo.root, ['merge-base', writer.baselineHead, repo.head]).trim() === writer.baselineHead,
    'DESIGN_WRITER_BASE', 'writer 起点不在当前提交链');
  const files = [...new Set(execution.files)].sort();
  files.forEach(file => safePath(repo.root, file));
  const changeDir = `openspec/changes/${options.change}`;
  safePath(repo.root, changeDir);
  const contains = (scope, file) => file === scope || file.startsWith(`${scope.replace(/\/$/, '')}/`);
  need([...files, changeDir].every(file => writer.scopedPaths.some(scope => contains(scope, file))),
    'DESIGN_WRITER_SCOPE', '执行文件未被实时 writer 范围覆盖');
  for (const other of writers.filter(item => item.executionId !== writer.executionId)) {
    need(!(other.scopedPaths || []).some(scope => [...files, changeDir].some(file => contains(scope, file) || contains(file, scope))),
      'DESIGN_WRITER_MIXED', '当前恢复范围与其他 writer 交叉，先由 Forge 分离归属');
  }
  return { executionId: execution.executionId, session: options.session, change: options.change,
    taskId: execution.taskId, branch: repo.branch, head: repo.head, baselineHead: writer.baselineHead,
    files, changeDir, scopeFingerprint: writer.scopeFingerprint };
}

function snapshot(repo, files) {
  return { inputs: fingerprints(repo.root, files),
    index: hash(files.length ? repoApi.git(repo.root, ['ls-files', '--stage', '-z', '--', ...files]) : '') };
}

function review(repo, options, plan, context) {
  const references = require('./evidence').validatePlan(repo.root, plan, context, 'preflight', repo.head);
  need(plan.review.inputFingerprint === hash(JSON.stringify(fingerprints(repo.root, plan.files))),
    'REVIEW_INPUTS_STALE', '重新审阅当前开发输入并记录 snapshot.inputFingerprint；无需宣称任务完成');
  return references;
}

function build(repo, options, state, range) {
  const writer = liveWriter(repo, options);
  const plan = storage.readJson(path.resolve(options.plan));
  const openspec = require('./openspec');
  const context = openspec.loadContext(repo.root, options.change, options);
  openspec.validate(repo.root, options.change, options);
  const references = review(repo, options, plan, context);
  // Forge 使用 checklist key（如 2.2），OpenSpec apply 可能返回序号（如 6）。只接受唯一的当前工件映射。
  const tasks = context.tasks.filter(task => task.id === writer.taskId
    || task.description?.match(/^(\d+(?:\.\d+)+)\s/)?.[1] === writer.taskId);
  need(!writer.taskId || tasks.length === 1 && plan.taskIds.includes(tasks[0].id),
    'DESIGN_WRITER_TASK', '恢复计划必须包含唯一对应 writer 当前任务的 OpenSpec task ID');
  const owned = [...new Set(options.ownedFiles || [])].sort();
  owned.forEach(file => {
    const target = safePath(repo.root, file);
    need(!fs.existsSync(target) || fs.statSync(target).isFile(), 'DESIGN_WRITER_SCOPE', '恢复必须逐个列明文件，不能认领目录');
  });
  const referenced = Object.keys(references).map(key => key.replace(/^(?:baseline|content):/, '').split('#')[0]);
  const allowed = new Set([...plan.files, ...referenced, ...Object.keys(context.artifacts)]);
  const writerOwns = file => writer.files.includes(file) || file.startsWith(`${writer.changeDir}/`);
  need(owned.length > 0 && owned.every(file => writerOwns(file) && allowed.has(file))
    && plan.files.every(file => owned.includes(file)),
  'DESIGN_WRITER_SCOPE', '认领文件须同时属于实时 writer 和当前审阅计划；不得混入其他任务');
  const dirty = repoApi.changedFiles(repo.root, repo.head, undefined,
    [...writer.files, writer.changeDir, ...Object.keys(state.initial)]);
  need(dirty.filter(writerOwns).every(file => owned.includes(file))
    && range.declared.every(file => owned.includes(file)),
  'DESIGN_WRITER_SCOPE', '遗漏 writer 已有改动或提交包含无关文件；显式核对完整范围');
  const inputs = [...new Set([...owned, ...referenced, ...Object.keys(context.artifacts)])].sort();
  return { kind: 'writer-recovery', change: options.change, from: state.base, to: repo.head,
    commits: range.commits, files: range.declared, ownedFiles: owned, writer,
    planDigest: hash(storage.readText(path.resolve(options.plan))),
    ...snapshot(repo, inputs), references, artifacts: context.artifacts,
    external: snapshot(repo, dirty.filter(file => !owned.includes(file))),
    reviewedBy: plan.review.actor, recoveredAt: new Date().toISOString() };
}

function verify(repo, options, recovery, plan, context) {
  const equal = (expected, actual) => need(JSON.stringify(expected) === JSON.stringify(actual),
    'DESIGN_RECOVERY_STALE', '恢复后 writer、文件、暂存区或审阅输入已变化；重新核对后 recover-writer');
  equal(recovery.planDigest, hash(storage.readText(path.resolve(options.plan))));
  equal(recovery.writer, liveWriter(repo, options));
  equal({ inputs: recovery.inputs, index: recovery.index }, snapshot(repo, Object.keys(recovery.inputs)));
  equal(recovery.external, snapshot(repo, Object.keys(recovery.external.inputs)));
  equal(recovery.artifacts, context.artifacts);
  equal(recovery.references, review(repo, options, plan, context));
}

module.exports = { build, verify };
