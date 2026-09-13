#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const { analyze } = require('../state-contract/check');
const { verify, checkEvidence } = require('../state-contract/verify');
const { graphView } = require('../state-contract/graph');
const { safePath, read } = require('../state-contract/files');

function main(args) {
  const command = args.shift();
  if (!['check', 'impact', 'verify'].includes(command)) throw new Error('Use check|impact|verify --repo <root> --contract <relative.json> [--evidence <relative.json>] [--graph <relative.json>] [--out <relative.json>]');
  const options = {};
  while (args.length) {
    const key = args.shift();
    if (!['--repo', '--contract', '--evidence', '--graph', '--out'].includes(key) || !args.length || options[key]) throw new Error(`Invalid option: ${key}`);
    options[key] = args.shift();
  }
  if (!options['--repo'] || !options['--contract']) throw new Error('--repo and --contract are required');
  const root = fs.realpathSync(options['--repo']);
  let result = command === 'verify' ? verify(root, options['--contract']) : analyze(root, options['--contract']);
  if (options['--evidence']) result = checkEvidence(result, JSON.parse(read(root, options['--evidence'])));
  if (command === 'impact' && result.contract) result.graph = graphView(root, result.contract, options['--graph']);
  if (options['--out']) {
    const output = options['--out'];
    if (result.inputs?.includes(output) || result.contract?.sourceRoots.some(dir => output === dir || output.startsWith(`${dir}/`))) throw new Error('Output must be outside verification inputs');
    const destination = safePath(root, output);
    if (fs.existsSync(destination) && output !== options['--evidence']) {
      const old = JSON.parse(read(root, output));
      if (old.contractPath !== options['--contract']) throw new Error('Refusing to overwrite an unrelated file');
    }
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.writeFileSync(destination, `${JSON.stringify(result, null, 2)}\n`);
  }
  console.log(JSON.stringify(result));
  process.exitCode = ['PASS', 'STATIC_PASS'].includes(result.status) ? 0 : 2;
}

try { main(process.argv.slice(2)); }
catch (error) { console.log(JSON.stringify({ status: 'CHECK_ERROR', findings: [{ rule: 'CHECK_ERROR', message: error.message }] })); process.exitCode = 1; }
