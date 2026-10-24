const path = require('node:path');

/** Normalize the two registered shell tools without executing their command. */
function normalizeCommand(payload) {
  if (!payload || typeof payload !== 'object') return null;
  const input = payload.tool_input;
  if (!input || typeof input !== 'object') return null;
  const command = payload.tool_name === 'Bash' ? input.command
    : payload.tool_name === 'exec_command' ? input.cmd : null;
  if (typeof command !== 'string' || !command.trim()) return null;
  const directory = payload.tool_name === 'exec_command' && typeof input.workdir === 'string' && input.workdir
    ? input.workdir : typeof payload.cwd === 'string' && payload.cwd ? payload.cwd : process.cwd();
  return { command, cwd: path.resolve(directory) };
}

module.exports = { normalizeCommand };
