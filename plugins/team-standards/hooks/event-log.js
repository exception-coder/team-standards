const fs = require('fs');
const os = require('os');
const path = require('path');

const HOOK_EVENT_SCHEMA_VERSION = 1;
const EVENT_STRING_FIELDS = Object.freeze(['plugin', 'hook', 'rule', 'tool', 'file']);
const EVENT_MODES = new Set(['warn', 'block']);

function nonEmptyString(value) {
  if (typeof value !== 'string') return '';
  return value.trim();
}

function isoTimestamp(value) {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString();
}

function buildHookEvent(event, context = {}) {
  try {
    if (!event || typeof event !== 'object' || Array.isArray(event)) return null;
    const mode = nonEmptyString(event.mode);
    if (!EVENT_MODES.has(mode)) return null;

    const fields = {};
    for (const name of EVENT_STRING_FIELDS) {
      fields[name] = nonEmptyString(event[name]);
      if (!fields[name]) return null;
    }

    const timestamp = isoTimestamp(context.now ? context.now() : new Date());
    const user = nonEmptyString(context.user ?? os.userInfo().username);
    const host = nonEmptyString(context.host ?? os.hostname());
    if (!timestamp || !user || !host) return null;

    return {
      schemaVersion: HOOK_EVENT_SCHEMA_VERSION,
      ts: timestamp,
      user,
      host,
      plugin: fields.plugin,
      hook: fields.hook,
      rule: fields.rule,
      mode,
      tool: fields.tool,
      file: fields.file,
    };
  } catch (_) {
    return null;
  }
}

function logHookEvent(event, options = {}) {
  try {
    const record = buildHookEvent(event, options);
    if (!record) return false;
    const directory = options.directory
      || process.env.TEAM_STANDARDS_HOOK_EVENT_DIR
      || path.join(os.homedir(), '.kai-toolbox');
    fs.mkdirSync(directory, { recursive: true });
    fs.appendFileSync(path.join(directory, 'hook-events.jsonl'), `${JSON.stringify(record)}\n`, 'utf8');
    return true;
  } catch (_) {
    return false;
  }
}

module.exports = {
  HOOK_EVENT_SCHEMA_VERSION,
  buildHookEvent,
  logHookEvent,
};
