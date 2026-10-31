import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const skill = 'openspec-auto';
const roots = { codex: '.agents/skills', claude: '.claude/skills' };
const defaultPlugin = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const within = (root, target) => {
  const relative = path.relative(root, target);
  return !path.isAbsolute(relative) && relative !== '..' && !relative.startsWith(`..${path.sep}`);
};

function readSkill(file, project) {
  const real = fs.realpathSync(file);
  if (!within(project, real)) throw new Error(`Project skill escapes project: ${file}`);
  const content = fs.readFileSync(real, 'utf8');
  const header = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!header || !/^name:\s*\S.+$/m.test(header[1])) {
    throw new Error(`Invalid skill frontmatter: ${file}`);
  }
  return content.replaceAll('\r\n', '\n');
}

// Run before registration, not after the Agent has already classified the task.
export function selectProvider(project, host, plugin = defaultPlugin) {
  if (!roots[host]) throw new Error('Supported hosts: codex, claude');
  project = fs.realpathSync(project);
  const native = path.join(project, roots[host], skill, 'SKILL.md');
  const candidates = Object.values(roots).map(root => path.join(project, root, skill, 'SKILL.md'));
  // An explicitly declared equivalent capability may have a project-specific name.
  const declaration = path.join(project, '.agents', 'skill-providers.json');
  if (fs.existsSync(declaration)) {
    const entry = JSON.parse(fs.readFileSync(declaration, 'utf8'))[skill];
    if (entry !== undefined) {
      if (typeof entry !== 'string' || !entry) throw new Error('Invalid openspec-auto provider declaration');
      const declared = path.resolve(project, entry);
      readSkill(declared, project);
      candidates.push(declared);
    }
  }
  const found = [...new Set(candidates)].filter(file => fs.existsSync(file));
  const bodies = found.map(file => readSkill(file, project));
  if (new Set(bodies).size > 1) throw new Error('Conflicting project openspec-auto copies; reconcile explicitly');
  if (found.length) {
    const selected = found.includes(native) ? native : found[0];
    return { provider: 'project', skillPath: selected, registerGlobal: false,
      nativeDiscovery: selected === native,
      instruction: selected === native ? null : 'Read the project skill via AGENTS.md/CLAUDE.md, or explicitly install its native host copy.' };
  }
  const global = plugin && path.join(path.resolve(plugin), 'skills', skill, 'SKILL.md');
  if (global && fs.existsSync(global)) return { provider: 'plugin', skillPath: global, registerGlobal: true, nativeDiscovery: true };
  return { provider: 'none', skillPath: null, registerGlobal: false, nativeDiscovery: false };
}

// Caller supplies the effective config and all loaded copies; never replace an unknown user's array.
export function codexConfig(project, plugin, existingConfig, globalSkillPaths) {
  if (!Array.isArray(existingConfig) || existingConfig.some(item => !item || typeof item.path !== 'string'
    || typeof item.enabled !== 'boolean')) throw new Error('Supply effective skills.config as an array of {path, enabled}');
  if (!Array.isArray(globalSkillPaths) || globalSkillPaths.some(file => typeof file !== 'string')) {
    throw new Error('Supply the loaded global skill paths');
  }
  const selection = selectProvider(project, 'codex', plugin);
  const entries = existingConfig.map(item => ({ ...item }));
  if (selection.provider === 'project') {
    if (!globalSkillPaths.length) throw new Error('Loaded plugin paths required to suppress global copies');
    for (const file of globalSkillPaths) {
      const real = fs.realpathSync(file);
      if (within(fs.realpathSync(project), real)) throw new Error('Refusing to disable a project skill');
      if (path.basename(path.dirname(real)) !== skill || path.basename(real) !== 'SKILL.md') {
        throw new Error(`Not an openspec-auto skill path: ${file}`);
      }
      const found = entries.find(item => path.resolve(item.path).toLowerCase() === path.resolve(real).toLowerCase());
      if (found) found.enabled = false;
      else entries.push({ path: real, enabled: false });
    }
  }
  const toml = entries.map(item => `{path=${JSON.stringify(item.path.replaceAll('\\', '/'))},enabled=${item.enabled}}`).join(',');
  return { ...selection, skillConfig: entries, args: ['-c', `skills.config=[${toml}]`] };
}

// A session-only Claude plugin replaces the installed copy by manifest name.
// The derived payload omits the duplicate skill physically; other skills/hooks remain intact.
export function prepareClaude(project, plugin, output) {
  const selection = selectProvider(project, 'claude', plugin);
  if (selection.provider === 'none') return { ...selection, args: [] };
  if (selection.provider === 'plugin') return { ...selection, args: ['--plugin-dir', path.resolve(plugin)] };
  plugin = fs.realpathSync(plugin);
  output = path.resolve(output);
  if (fs.existsSync(output)) throw new Error('Output already exists; use a fresh output directory');
  const parent = fs.realpathSync(path.dirname(output));
  if (within(plugin, parent) || within(fs.realpathSync(project), parent)) {
    throw new Error('Use an output directory outside the source plugin and project');
  }
  fs.mkdirSync(output);
  for (const name of ['.claude-plugin', '.codex-plugin', 'skills', 'hooks', 'scripts']) {
    const source = path.join(plugin, name);
    if (fs.existsSync(source)) fs.cpSync(source, path.join(output, name), {
      recursive: true,
      filter: file => file !== path.join(plugin, 'skills', skill),
    });
  }
  fs.writeFileSync(path.join(output, 'openspec-auto-selection.json'), JSON.stringify(selection, null, 2) + '\n');
  return { ...selection, args: ['--plugin-dir', output],
    limitation: 'Managed settings or a disabled @inline plugin can prevent replacement; verify host inventory before use.' };
}

// Explicit install only. Existing project files are never overwritten, including on suite update.
export function installSkill(project, host, source) {
  if (!roots[host]) throw new Error('Supported hosts: codex, claude');
  project = fs.realpathSync(project);
  const target = path.join(project, roots[host], skill);
  if (fs.existsSync(target)) throw new Error('Project skill already exists; review and merge an explicit update');
  const selected = selectProvider(project, host);
  const localSource = selected.provider === 'project' ? path.dirname(selected.skillPath) : null;
  if (localSource && source && fs.realpathSync(source) !== fs.realpathSync(localSource)) {
    throw new Error('Project already provides this capability; copy its version instead');
  }
  source = localSource || source || path.join(defaultPlugin, 'skills', skill);
  // Reject existing linked parents before writing through them.
  let parent = path.dirname(target);
  while (!fs.existsSync(parent)) parent = path.dirname(parent);
  if (!within(project, fs.realpathSync(parent))) throw new Error('Skill target escapes project');
  readSkill(path.join(source, 'SKILL.md'), fs.realpathSync(source));
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.cpSync(source, target, { recursive: true, errorOnExist: true, force: false });
  return { installed: target };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const { positionals: [command], values } = parseArgs({ allowPositionals: true, options: {
      project: { type: 'string' }, host: { type: 'string' }, plugin: { type: 'string' },
      output: { type: 'string' }, config: { type: 'string' }, source: { type: 'string' },
    } });
    if (!values.project) throw new Error('--project is required');
    const plugin = values.plugin || defaultPlugin;
    let result;
    if (command === 'resolve') result = selectProvider(values.project, values.host, plugin);
    else if (command === 'install') result = installSkill(values.project, values.host, values.source);
    else if (command === 'claude' && values.output) result = prepareClaude(values.project, plugin, values.output);
    else if (command === 'codex' && values.config) {
      const config = JSON.parse(fs.readFileSync(values.config, 'utf8'));
      result = codexConfig(values.project, plugin, config.skillConfig, config.globalSkillPaths);
    } else throw new Error('Use resolve/install --host, claude --output, or codex --config');
    process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  } catch (error) { process.stderr.write(error.message + '\n'); process.exitCode = 1; }
}
