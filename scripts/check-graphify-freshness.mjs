#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fingerprintFile = path.join(repositoryRoot, 'graphify-out', 'source-fingerprint.json');
const writeMode = process.argv.includes('--write');
const current = collectFingerprints();

if (writeMode) {
  fs.mkdirSync(path.dirname(fingerprintFile), { recursive: true });
  fs.writeFileSync(fingerprintFile, `${JSON.stringify({ files: current }, null, 2)}\n`);
  console.log(`[graphify-freshness] wrote ${fingerprintFile} (${Object.keys(current).length} files)`);
  process.exit(0);
}

const recorded = readRecorded();
const changed = [...new Set([...Object.keys(recorded), ...Object.keys(current)])]
  .filter((file) => recorded[file] !== current[file]);
if (changed.length) fail(`Graphify source fingerprint is stale:\n${changed.map((file) => `  ${file}`).join('\n')}\nRun "graphify update ." and then "node scripts/check-graphify-freshness.mjs --write".`);
console.log(`[graphify-freshness] current (${Object.keys(current).length} files)`);

function collectFingerprints() {
  const files = [];
  visit(path.join(repositoryRoot, 'plugins', 'team-standards'), files);
  visit(path.join(repositoryRoot, 'scripts'), files);
  return Object.fromEntries(files
    .filter((file) => /\.(?:js|mjs|json|md)$/.test(file))
    .filter((file) => file !== fingerprintFile)
    .sort()
    .map((file) => [relative(file), sha256(fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n'))]));
}

function visit(directory, files) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.name === 'node_modules') continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) visit(absolute, files);
    else if (entry.isFile()) files.push(absolute);
  }
}

function readRecorded() {
  try {
    const parsed = JSON.parse(fs.readFileSync(fingerprintFile, 'utf8'));
    if (!parsed.files || typeof parsed.files !== 'object') throw new Error('missing files object');
    return parsed.files;
  } catch (error) {
    fail(`cannot read ${fingerprintFile}: ${error.message}`);
  }
}

function relative(file) {
  return path.relative(repositoryRoot, file).split(path.sep).join('/');
}

function sha256(content) {
  return crypto.createHash('sha256').update(content).digest('hex');
}

function fail(message) {
  console.error(`[graphify-freshness] ${message}`);
  process.exit(1);
}
