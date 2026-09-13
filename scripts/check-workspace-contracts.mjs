#!/usr/bin/env node

import crypto from 'node:crypto';
import { contractFiles, multiRepositoryContracts } from './shared-contracts.mjs';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const defaultWorkspace = path.resolve(scriptDirectory, '..', '..');
const workspace = path.resolve(readOption('--workspace') || defaultWorkspace);

if (!process.argv.includes('--canonical-only')) {
  const groups = [
    ...contractFiles.map(({ label, team, profile }) => ({ label, files: [team, profile] })),
    ...multiRepositoryContracts,
  ];
  for (const contract of groups) {
    const files = contract.files.map((file) => path.join(workspace, file));
    files.forEach(assertFile);
    const canonicalBytes = contractBytes(files[0]);
    for (const file of files.slice(1)) {
      if (!canonicalBytes.equals(contractBytes(file))) {
        fail(`${contract.label} drifted:\n${files.map((item) => `  ${item}`).join('\n')}\nPreview repair with scripts/sync-shared-contracts.mjs --workspace <team-tools>.`);
      }
    }
    console.log(`[contracts] ${contract.label}: ${sha256(canonicalBytes)}`);
  }
}

const integrityPath = path.join(workspace, contractFiles[2].team);
const integrity = JSON.parse(fs.readFileSync(integrityPath, 'utf8'));
const adapterHash = sha256(contractBytes(path.join(workspace, contractFiles[0].team)));
const fixtureHash = sha256(contractBytes(path.join(workspace, contractFiles[1].team)));
if (integrity.changeInputSha256 !== adapterHash || integrity.writeEventsSha256 !== fixtureHash) {
  fail('contract-integrity.json does not match the canonical adapter or fixture');
}

console.log(process.argv.includes('--canonical-only') ? '[contracts] canonical integrity OK' : '[contracts] workspace mirrors are in sync');

function readOption(name) {
  const index = process.argv.indexOf(name);
  if (index < 0) return '';
  if (!process.argv[index + 1]) fail(`${name} requires a value`);
  return process.argv[index + 1];
}

function assertFile(filePath) {
  if (!fs.statSync(filePath, { throwIfNoEntry: false })?.isFile()) fail(`required file is missing: ${filePath}`);
}

function sha256(bytes) {
  return crypto.createHash('sha256').update(bytes).digest('hex');
}

function contractBytes(file) {
  return Buffer.from(fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n'), 'utf8');
}

function fail(message) {
  console.error(`[contracts] ${message}`);
  process.exit(1);
}
