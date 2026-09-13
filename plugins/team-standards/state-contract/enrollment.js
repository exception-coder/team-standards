const fs = require('node:fs');
const { read, safePath } = require('./files');
const { analyze } = require('./check');
const { checkEvidence } = require('./verify');

// Opt-in modules are checked by the existing governance gate, regardless of host hooks.
function checkEnrolled(root, phase) {
  const configPath = '.team-standards/state-contracts.json';
  if (!fs.existsSync(safePath(root, configPath))) return;
  const config = JSON.parse(read(root, configPath));
  if (config.schemaVersion !== 1 || !Array.isArray(config.contracts) || !config.contracts.length) {
    throw new Error('Invalid state-contract enrollment');
  }
  for (const item of config.contracts) {
    let result = analyze(root, item.contract);
    if (phase !== 'preflight') result = checkEvidence(result, JSON.parse(read(root, item.evidence)));
    if (!['PASS', 'STATIC_PASS'].includes(result.status)) {
      const error = new Error(`State contract ${item.contract}: ${result.findings.map(item => `${item.rule}: ${item.message}`).join('; ')}`);
      error.status = 'NEEDS_WORK';
      error.rule = 'STATE_CONTRACT';
      throw error;
    }
  }
}
module.exports = { checkEnrolled };
