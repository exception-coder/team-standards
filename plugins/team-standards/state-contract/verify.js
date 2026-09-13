const { spawnSync } = require('node:child_process');
const { analyze, finding } = require('./check');
const { hash } = require('./files');
const { validate } = require('./schema');
const evidenceSchema = require('./evidence.schema.json');

function verify(root, contractPath) {
  const before = analyze(root, contractPath);
  if (before.status !== 'STATIC_PASS') return before;
  const executions = [];
  for (const test of before.contract.tests) {
    const [executable, ...args] = test.command;
    // Commands are explicit project-owned invocations, never passed through a shell.
    const run = spawnSync(executable === 'node' ? process.execPath : executable, args,
      { cwd: root, shell: false, windowsHide: true, timeout: 120000, maxBuffer: 1024 * 1024, encoding: 'utf8' });
    executions.push({ id: test.id, command: test.command, exitCode: run.status,
      status: run.status === 0 && !run.error ? 'PASS' : 'FAIL',
      outputDigest: hash(`${run.stdout || ''}\n${run.stderr || ''}`), errorCode: run.error?.code || null });
  }
  const after = analyze(root, contractPath);
  const findings = [...after.findings];
  if (before.inputFingerprint !== after.inputFingerprint) findings.push(finding('INPUTS_CHANGED', 'Inputs changed during verification'));
  if (executions.some(item => item.status !== 'PASS')) findings.push(finding('TEST_FAILED', 'Inspect the project test command; raw output is not persisted'));
  return { ...after, status: findings.length ? 'NEEDS_WORK' : 'PASS', findings, executions,
    verifiedAt: new Date().toISOString(), environment: { node: process.version, platform: process.platform },
    assurance: 'Commands executed successfully; test quality, external dependencies and deployment provenance require review' };
}

function checkEvidence(current, evidence) {
  const findings = [...current.findings];
  const errors = validate(evidence, evidenceSchema);
  if (errors.length) return { ...current, status: 'NEEDS_WORK', findings: [...findings, ...errors.map(message => finding('EVIDENCE_SCHEMA', message))] };
  if (evidence.status !== 'PASS' || evidence.schemaVersion !== 1
      || evidence.checkerDigest !== current.checkerDigest || evidence.contractPath !== current.contractPath
      || evidence.inputFingerprint !== current.inputFingerprint) findings.push(finding('EVIDENCE_STALE', 'Missing, failed or stale state evidence'));
  for (const test of current.contract?.tests || []) {
    if (!evidence.executions?.some(item => item.id === test.id && item.exitCode === 0 && item.status === 'PASS'
      && JSON.stringify(item.command) === JSON.stringify(test.command))) findings.push(finding('EXECUTION_MISSING', test.id));
  }
  return { ...current, status: findings.length ? 'NEEDS_WORK' : 'PASS', findings };
}
module.exports = { verify, checkEvidence };
