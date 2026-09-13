const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { analyze } = require('../../state-contract/check');
const { verify, checkEvidence } = require('../../state-contract/verify');
const { graphView } = require('../../state-contract/graph');
const { checkEnrolled } = require('../../state-contract/enrollment');

function fixture(t, name = 'sample') {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'state-contract-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const write = (file, content) => {
    fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    fs.writeFileSync(path.join(root, file), typeof content === 'string' ? content : JSON.stringify(content));
  };
  const ready = name === 'sample' ? 'COMPLETE' : 'APPROVED';
  const rejected = name === 'sample' ? 'RETIRED' : 'CANCELLED';
  write('src/flow.js', `exports.create=()=>({state:'${ready}'}); exports.send=x=>x.state==='${ready}'; exports.retire=x=>({...x,state:'${rejected}'});`);
  write('test.js', "const a=require('node:assert/strict');const f=require('./src/flow');const x=f.create();a.equal(f.send(x),true);a.equal(f.send(f.retire(x)),false);");
  write('spec.md', '# State specification\nBusiness-owned meanings and transitions.\n');
  const contract = {
    schemaVersion: 1, module: name, spec: 'spec.md', sourceRoots: ['src'], inputFiles: ['test.js'], scanTerms: ['state'],
    dimensions: [{ id: 'lifecycle', meaning: 'Lifecycle', values: [
      { code: ready, meaning: 'Ready for dispatch', kind: 'current' },
      { code: rejected, meaning: 'No longer available', kind: 'current' },
      { code: 'ACTIVE', meaning: 'Legacy ready value', kind: 'legacy' },
    ] }],
    actions: [{ id: 'send', meaning: 'Dispatch', preconditions: ['Ready'], effects: ['Sent'], invariants: ['Rejected cannot dispatch'], transitions: [{ dimension: 'lifecycle', from: [ready], to: [ready] }] }],
    bindings: ['writer', 'policy'].map(role => ({ file: 'src/flow.js', anchor: 'exports.', role, dimension: 'lifecycle', values: [ready, rejected], actions: ['send'] })),
    tests: ['lifecycle', 'negative'].map(kind => ({ id: kind, kind, actions: ['send'], command: ['node', 'test.js'] })),
  };
  write('state-contract.json', contract);
  return { root, write, contract, save: () => write('state-contract.json', contract) };
}

test('two different domains execute real lifecycle commands with reusable checker', t => {
  for (const name of ['sample', 'purchase']) {
    const f = fixture(t, name);
    const result = verify(f.root, 'state-contract.json');
    assert.equal(result.status, 'PASS', JSON.stringify(result.findings));
    assert.equal(checkEvidence(analyze(f.root, 'state-contract.json'), result).status, 'PASS');
  }
});

test('old ACTIVE-only dispatch fails static bindings and real lifecycle test', t => {
  const f = fixture(t);
  f.write('src/flow.js', "exports.create=()=>({state:'COMPLETE'}); exports.send=x=>x.state==='ACTIVE'; exports.retire=x=>({...x,state:'RETIRED'});");
  assert.ok(analyze(f.root, 'state-contract.json').findings.some(item => item.rule === 'IMPACT_GAP'));
  f.contract.bindings.push({ file: 'src/flow.js', anchor: 'exports.send', role: 'compatibility', dimension: 'lifecycle', values: ['ACTIVE'], actions: ['send'] });
  f.save();
  const result = verify(f.root, 'state-contract.json');
  assert.equal(result.status, 'NEEDS_WORK');
  assert.ok(result.executions.every(item => item.status === 'FAIL'));
});

test('new unregistered consumer and declared value removal are detected', t => {
  const f = fixture(t);
  f.write('src/query.sql', "select * from sample where state = 'COMPLETE'");
  assert.ok(analyze(f.root, 'state-contract.json').findings.some(item => item.rule === 'IMPACT_GAP'));
  f.write('src/flow.js', 'exports.state = null;');
  assert.ok(analyze(f.root, 'state-contract.json').findings.some(item => item.rule === 'VALUE_MISSING'));
});

test('evidence invalidates on source, spec, test and checker changes', t => {
  for (const file of ['src/flow.js', 'spec.md', 'test.js']) {
    const f = fixture(t);
    const evidence = verify(f.root, 'state-contract.json');
    fs.appendFileSync(path.join(f.root, file), '\n// changed');
    assert.equal(checkEvidence(analyze(f.root, 'state-contract.json'), evidence).status, 'NEEDS_WORK');
  }
  const f = fixture(t);
  const evidence = verify(f.root, 'state-contract.json');
  evidence.checkerDigest = 'old';
  assert.equal(checkEvidence(analyze(f.root, 'state-contract.json'), evidence).status, 'NEEDS_WORK');
});

test('malformed contracts, duplicates and missing required test kinds fail', t => {
  const f = fixture(t);
  f.contract.unexpected = true; f.save();
  assert.equal(analyze(f.root, 'state-contract.json').status, 'NEEDS_WORK');
  delete f.contract.unexpected;
  f.contract.tests.pop(); f.save();
  assert.ok(analyze(f.root, 'state-contract.json').findings.some(item => item.rule === 'TEST_GAP'));
  f.contract.actions.push({ ...f.contract.actions[0], meaning: 'Duplicate action id' }); f.save();
  const result = analyze(f.root, 'state-contract.json');
  assert.ok(result.findings.some(item => item.rule === 'DUPLICATE_ID') || result.findings.some(item => item.rule === 'SCHEMA'));
});

test('path traversal, absolute paths and empty enrollment do not pass', t => {
  const f = fixture(t);
  f.contract.inputFiles = ['../outside']; f.save();
  assert.throws(() => analyze(f.root, 'state-contract.json'), /relative/);
  f.write('.team-standards/state-contracts.json', { schemaVersion: 1, contracts: [] });
  assert.throws(() => checkEnrolled(f.root, 'delivery'), /Invalid/);
});

test('enrolled governance requires fresh actual executions', t => {
  const f = fixture(t);
  f.write('.team-standards/state-contracts.json', { schemaVersion: 1, contracts: [{ contract: 'state-contract.json', evidence: 'evidence.json' }] });
  assert.doesNotThrow(() => checkEnrolled(f.root, 'preflight'));
  assert.throws(() => checkEnrolled(f.root, 'delivery'));
  f.write('evidence.json', verify(f.root, 'state-contract.json'));
  assert.doesNotThrow(() => checkEnrolled(f.root, 'delivery'));
  f.write('src/extra.js', 'exports.state="COMPLETE";');
  assert.throws(() => checkEnrolled(f.root, 'delivery'), /State contract/);
});

test('Graphify adapter is read-only and reports candidates, including unavailable fallback', t => {
  const f = fixture(t);
  assert.equal(graphView(f.root, f.contract).status, 'UNAVAILABLE');
  const graph = { nodes: [{ id: 'send', source_file: 'src/flow.js' }], links: [{ source: 'send', target: 'other' }] };
  f.write('graph.json', graph);
  assert.equal(graphView(f.root, f.contract, 'graph.json').status, 'CANDIDATE');
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(f.root, 'graph.json'))), graph);
});

test('CLI writes execution evidence and rejects changed input and shell interpolation', t => {
  const f = fixture(t);
  const cli = path.resolve(__dirname, '../../scripts/state-contract.js');
  const run = args => spawnSync(process.execPath, [cli, ...args, '--repo', f.root, '--contract', 'state-contract.json'], { encoding: 'utf8' });
  assert.equal(run(['verify', '--out', 'evidence.json']).status, 0);
  assert.equal(run(['check', '--evidence', 'evidence.json']).status, 0);
  f.contract.tests[0].command = ['node', 'test.js; echo unexpected']; f.save();
  assert.equal(run(['verify']).status, 2);
  assert.equal(run(['check', '--evidence', 'evidence.json']).status, 2);
  assert.equal(run(['check', '--out', 'src/flow.js']).status, 1);
});

test('inputs changing during a successful command cannot produce PASS', t => {
  const f = fixture(t);
  f.write('test.js', "require('node:fs').appendFileSync('src/flow.js','\\n// changed during test');");
  const result = verify(f.root, 'state-contract.json');
  assert.equal(result.status, 'NEEDS_WORK');
  assert.ok(result.findings.some(item => item.rule === 'INPUTS_CHANGED'));
});

test('unknown transitions and ordinary consumers of legacy states are rejected', t => {
  const f = fixture(t);
  f.contract.actions[0].transitions[0].to = ['UNKNOWN'];
  f.contract.bindings[0].values.push('ACTIVE'); f.save();
  const rules = analyze(f.root, 'state-contract.json').findings.map(item => item.rule);
  assert.ok(rules.includes('TRANSITION_REFERENCE'));
  assert.ok(rules.includes('LEGACY_CONSUMER'));
});

test('missing executable and fake execution omissions do not pass', t => {
  const f = fixture(t);
  const evidence = verify(f.root, 'state-contract.json');
  evidence.executions = [];
  assert.equal(checkEvidence(analyze(f.root, 'state-contract.json'), evidence).status, 'NEEDS_WORK');
  f.contract.tests[0].command = ['team-standards-nonexistent-command']; f.save();
  assert.equal(verify(f.root, 'state-contract.json').status, 'NEEDS_WORK');
});
