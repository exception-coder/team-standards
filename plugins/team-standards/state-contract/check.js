const fs = require('node:fs');
const { read, collect, fingerprint, hash } = require('./files');
const { validate } = require('./schema');
const schema = require('./schema.json');

const CHECKER_VERSION = '1.0.0';
const finding = (rule, message) => ({ rule, message });
const token = (text, value) => text.match(new RegExp(`(?<![\\w])${value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\w])`, 'u'));

function unique(items, label, findings) {
  if (new Set(items).size !== items.length) findings.push(finding('DUPLICATE_ID', label));
}

function validateReferences(contract, findings) {
  const actions = new Set(contract.actions.map(action => action.id));
  unique(contract.actions.map(action => action.id), 'actions', findings);
  unique(contract.dimensions.map(dimension => dimension.id), 'dimensions', findings);
  unique(contract.tests.map(test => test.id), 'tests', findings);
  for (const dimension of contract.dimensions) unique(dimension.values.map(value => value.code), dimension.id, findings);
  for (const action of contract.actions) {
    for (const transition of action.transitions) {
      const dimension = contract.dimensions.find(item => item.id === transition.dimension);
      if (!dimension || [...transition.from, ...transition.to].some(code => !dimension.values.some(value => value.code === code))) {
        findings.push(finding('TRANSITION_REFERENCE', action.id));
      }
    }
  }
  for (const item of [...contract.bindings, ...contract.tests]) {
    if (item.actions.some(id => !actions.has(id))) findings.push(finding('UNKNOWN_ACTION', item.file || item.id));
  }
  for (const action of actions) {
    for (const role of ['writer', 'policy']) {
      if (!contract.bindings.some(binding => binding.role === role && binding.actions.includes(action))) {
        findings.push(finding('ROLE_GAP', `${action}: ${role}`));
      }
    }
    for (const kind of ['lifecycle', 'negative']) {
      if (!contract.tests.some(test => test.kind === kind && test.actions.includes(action))) {
        findings.push(finding('TEST_GAP', `${action}: ${kind}`));
      }
    }
  }
}

function checkBindings(root, contract, findings) {
  const dimensions = new Map(contract.dimensions.map(dimension => [dimension.id, dimension]));
  for (const binding of contract.bindings) {
    const source = read(root, binding.file);
    const dimension = dimensions.get(binding.dimension);
    if (!dimension) { findings.push(finding('UNKNOWN_DIMENSION', binding.dimension)); continue; }
    if (!source.includes(binding.anchor)) findings.push(finding('ANCHOR_MISSING', binding.file));
    for (const code of binding.values) {
      const value = dimension.values.find(value => value.code === code);
      if (!value) findings.push(finding('UNKNOWN_VALUE', `${binding.file}: ${code}`));
      else if (value.kind === 'legacy' && !['migration', 'compatibility', 'test'].includes(binding.role)) {
        findings.push(finding('LEGACY_CONSUMER', `${binding.file}: ${code}; register explicit compatibility boundary`));
      }
      if (!token(source, code)) findings.push(finding('VALUE_MISSING', `${binding.file}: ${code}`));
    }
  }
}

function scan(root, contract, files, findings) {
  const values = contract.dimensions.flatMap(dimension => dimension.values.map(value => value.code));
  const hits = [];
  for (const file of files) {
    const source = read(root, file);
    const matched = values.filter(value => token(source, value));
    if (!matched.length && !contract.scanTerms.some(term => source.includes(term))) continue;
    const bindings = contract.bindings.filter(binding => binding.file === file);
    const missing = matched.filter(code => !bindings.some(binding => binding.values.includes(code)));
    hits.push({ file, values: matched, roles: bindings.map(binding => binding.role) });
    if (!bindings.length || missing.length) findings.push(finding('IMPACT_GAP', `${file}: ${missing.join(', ') || 'unreviewed state reference'}`));
  }
  return hits;
}

function analyze(root, contractPath) {
  const raw = read(root, contractPath);
  const contract = JSON.parse(raw);
  const errors = validate(contract, schema);
  if (errors.length) return { status: 'NEEDS_WORK', findings: errors.map(message => finding('SCHEMA', message)) };
  const findings = [];
  validateReferences(contract, findings);
  read(root, contract.spec);
  const sources = collect(root, contract.sourceRoots);
  if (sources.includes(contractPath)) throw new Error('Contract must be outside sourceRoots');
  for (const binding of contract.bindings) {
    if (!sources.includes(binding.file)) findings.push(finding('BINDING_OUTSIDE_SCOPE', binding.file));
  }
  checkBindings(root, contract, findings);
  const hits = scan(root, contract, sources, findings);
  const inputs = [...new Set([...sources, contractPath, contract.spec, ...contract.inputFiles])].sort();
  const checkerDigest = hash(['check.js', 'schema.js', 'schema.json', 'evidence.schema.json', 'files.js', 'verify.js', 'enrollment.js', '../scripts/state-contract.js']
    .map(name => fs.readFileSync(require('node:path').join(__dirname, name), 'utf8').replace(/\r\n/g, '\n')).join('\n'));
  return { schemaVersion: 1, checkerVersion: CHECKER_VERSION, checkerDigest,
    status: findings.length ? 'NEEDS_WORK' : 'STATIC_PASS', findings, contractPath,
    inputFingerprint: fingerprint(root, inputs), inputs, hits, contract,
    limitation: 'Declared scope and literal references only; semantic rules require business tests and review' };
}

module.exports = { analyze, finding, CHECKER_VERSION };
