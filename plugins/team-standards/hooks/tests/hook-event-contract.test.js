const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  HOOK_EVENT_SCHEMA_VERSION,
  buildHookEvent,
  logHookEvent,
} = require('../event-log');

const VALID_EVENT = Object.freeze({
  plugin: 'team-standards',
  hook: 'check-example',
  rule: 'example',
  mode: 'warn',
  tool: 'Edit',
  file: 'C:\\workspace\\Example.js',
});

const FIXED_CONTEXT = Object.freeze({
  now: () => new Date('2026-08-27T00:00:00.000Z'),
  user: 'tester',
  host: 'test-host',
});

test('buildHookEvent emits only the v1 whitelist and protects system fields', () => {
  const record = buildHookEvent({
    ...VALID_EVENT,
    schemaVersion: 99,
    ts: 'invalid',
    user: 'spoofed',
    host: 'spoofed',
    extra: 'drop-me',
  }, FIXED_CONTEXT);

  assert.deepEqual(record, {
    schemaVersion: HOOK_EVENT_SCHEMA_VERSION,
    ts: '2026-08-27T00:00:00.000Z',
    user: 'tester',
    host: 'test-host',
    plugin: VALID_EVENT.plugin,
    hook: VALID_EVENT.hook,
    rule: VALID_EVENT.rule,
    mode: VALID_EVENT.mode,
    tool: VALID_EVENT.tool,
    file: VALID_EVENT.file,
  });
});

test('buildHookEvent rejects missing fields and unsupported modes', () => {
  assert.equal(buildHookEvent({ ...VALID_EVENT, file: '' }, FIXED_CONTEXT), null);
  assert.equal(buildHookEvent({ ...VALID_EVENT, mode: 'observe' }, FIXED_CONTEXT), null);
  assert.equal(buildHookEvent(null, FIXED_CONTEXT), null);
});

test('logHookEvent writes one valid JSONL record and skips invalid input', (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'hook-event-v1-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));

  assert.equal(logHookEvent(VALID_EVENT, { ...FIXED_CONTEXT, directory }), true);
  assert.equal(logHookEvent({ ...VALID_EVENT, mode: 'invalid' }, { ...FIXED_CONTEXT, directory }), false);

  const lines = fs.readFileSync(path.join(directory, 'hook-events.jsonl'), 'utf8').trim().split(/\r?\n/);
  assert.equal(lines.length, 1);
  assert.equal(JSON.parse(lines[0]).schemaVersion, HOOK_EVENT_SCHEMA_VERSION);
});

test('logHookEvent supports an isolated directory through environment', (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'hook-event-env-'));
  const previous = process.env.TEAM_STANDARDS_HOOK_EVENT_DIR;
  process.env.TEAM_STANDARDS_HOOK_EVENT_DIR = directory;
  t.after(() => {
    if (previous === undefined) delete process.env.TEAM_STANDARDS_HOOK_EVENT_DIR;
    else process.env.TEAM_STANDARDS_HOOK_EVENT_DIR = previous;
    fs.rmSync(directory, { recursive: true, force: true });
  });

  assert.equal(logHookEvent(VALID_EVENT, FIXED_CONTEXT), true);
  assert.equal(fs.existsSync(path.join(directory, 'hook-events.jsonl')), true);
});
