#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const defaultWorkspace = path.resolve(scriptDirectory, '..', '..');
const workspace = path.resolve(readOption('--workspace') || defaultWorkspace);

const contractFiles = [
  {
    label: 'write input adapter',
    team: 'team-standards/plugins/team-standards/hooks/change-input.js',
    profile: 'project-coding-profiles/plugins/project-coding-profiles/hooks/change-input.js',
  },
  {
    label: 'Golden Fixtures',
    team: 'team-standards/plugins/team-standards/hooks/tests/fixtures/write-events.v1.json',
    profile: 'project-coding-profiles/plugins/project-coding-profiles/hooks/tests/fixtures/write-events.v1.json',
  },
  {
    label: 'contract integrity metadata',
    team: 'team-standards/plugins/team-standards/hooks/tests/fixtures/contract-integrity.json',
    profile: 'project-coding-profiles/plugins/project-coding-profiles/hooks/tests/fixtures/contract-integrity.json',
  },
  {
    label: 'privacy-safe hook metrics helper',
    team: 'team-standards/plugins/team-standards/hooks/hook-metrics.js',
    profile: 'project-coding-profiles/plugins/project-coding-profiles/hooks/hook-metrics.js',
  },
];

for (const contract of contractFiles) {
  const teamPath = path.join(workspace, contract.team);
  const profilePath = path.join(workspace, contract.profile);
  assertFile(teamPath);
  assertFile(profilePath);
  const teamBytes = fs.readFileSync(teamPath);
  const profileBytes = fs.readFileSync(profilePath);
  if (!teamBytes.equals(profileBytes)) {
    fail(`${contract.label} drifted:\n  ${teamPath}\n  ${profilePath}`);
  }
  console.log(`[contracts] ${contract.label}: ${sha256(teamBytes)}`);
}

const integrityPath = path.join(workspace, contractFiles[2].team);
const integrity = JSON.parse(fs.readFileSync(integrityPath, 'utf8'));
const adapterHash = sha256(fs.readFileSync(path.join(workspace, contractFiles[0].team)));
const fixtureHash = sha256(fs.readFileSync(path.join(workspace, contractFiles[1].team)));
if (integrity.changeInputSha256 !== adapterHash || integrity.writeEventsSha256 !== fixtureHash) {
  fail('contract-integrity.json does not match the canonical adapter or fixture');
}

console.log('[contracts] workspace mirrors are in sync');

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

function fail(message) {
  console.error(`[contracts] ${message}`);
  process.exit(1);
}
