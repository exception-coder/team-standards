const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const plugin = path.resolve(__dirname, '../..');
const skills = path.join(plugin, 'skills');
function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(file) : [file];
  });
}

test('distributed skill modes resolve local references without repository-only dependencies', () => {
  for (const file of walk(skills).filter((name) => name.endsWith('.md'))) {
    const text = fs.readFileSync(file, 'utf8');
    for (const match of text.matchAll(/(?<!!)\[[^\]]*\]\(([^)]+)\)/g)) {
      const target = match[1].split('#')[0];
      if (!target || /^[a-z]+:/i.test(target) || /[<{*]/.test(target)) continue;
      const resolved = path.resolve(path.dirname(file), target);
      assert.ok(resolved.startsWith(plugin + path.sep), `${file}: external repository dependency ${target}`);
      assert.ok(fs.existsSync(resolved), `${file}: missing ${target}`);
    }
  }
});

test('retired entrypoints are not distributed and replacement modes are reachable', () => {
  for (const name of ['planning-evidence-discovery', 'dev-log', 'daily-work-log', 'comment-cleanup', 'coding-violation-log', 'glossary-required', 'design-system-bootstrap', 'design-system-guardian']) {
    assert.equal(fs.existsSync(path.join(skills, name)), false, name);
  }
  for (const [owner, file] of [
    ['coding-standards-common', 'comment-maintenance.md'], ['coding-standards-common', 'feedback.md'],
    ['git-commit-standards', 'work-summary.md'], ['business-logic-orientation', 'terminology.md'],
    ['design-system', 'bootstrap.md'], ['design-system', 'review-mode.md'],
  ]) {
    assert.ok(fs.readFileSync(path.join(skills, owner, 'SKILL.md'), 'utf8').includes(`references/${file}`));
    assert.ok(fs.existsSync(path.join(skills, owner, 'references', file)));
  }
});
