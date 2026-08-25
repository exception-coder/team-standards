#!/usr/bin/env node

const path = require('path');
const { Worker } = require('worker_threads');
const { recordHookMetric } = require('./hook-metrics');

const CHILD_TIMEOUT_MS = 15000;
const GUARDS = [
  { script: 'check-design-doc.js', env: 'TEAM_STANDARDS_DESIGN_DOC_HOOK' },
  { script: 'check-architecture-boundaries.js', env: 'TEAM_STANDARDS_ARCH_BOUNDARY_HOOK' },
  { script: 'check-backend-kg-readiness.js', env: 'TEAM_STANDARDS_BACKEND_KG_HOOK' },
  { script: 'check-comment-density.js', env: 'TEAM_STANDARDS_COMMENT_HOOK' },
  { script: 'check-sql-ddl-readiness.js', env: 'TEAM_STANDARDS_SQL_DDL_HOOK' },
  { script: 'check-query-performance-risk.js', env: 'TEAM_STANDARDS_SQL_PERF_HOOK' },
  { script: 'check-ai-doc-location.js', env: 'TEAM_STANDARDS_DOC_LOCATION_HOOK' },
];

let raw = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => { raw += chunk; });
process.stdin.on('end', async () => {
  const active = GUARDS.filter((guard) => (process.env[guard.env] || '').toLowerCase() !== 'off');
  const results = await Promise.all(active.map((guard) => runGuard(guard.script, raw)));

  // Stable output order follows GUARDS even though the children run concurrently.
  for (const result of results) {
    recordHookMetric({
      enabled: (process.env.TEAM_STANDARDS_HOOK_METRICS || '').toLowerCase() === 'on',
      directory: process.env.TEAM_STANDARDS_HOOK_METRICS_DIR,
      plugin: 'team-standards',
      guard: result.script,
      durationMs: result.durationMs,
      code: result.code,
    });
    if (result.stdout) process.stdout.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);
  }

  if (results.some((result) => result.code === 2)) process.exit(2);
  if (results.some((result) => result.code !== 0)) process.exit(1);
  process.exit(0);
});

function runGuard(script, input) {
  return new Promise((resolve) => {
    const startedAt = process.hrtime.bigint();
    const worker = new Worker(path.join(__dirname, script), {
      env: process.env,
      stdin: true,
      stdout: true,
      stderr: true,
    });
    let stdout = '';
    let stderr = '';
    let finished = false;

    worker.stdout.setEncoding('utf8');
    worker.stderr.setEncoding('utf8');
    worker.stdout.on('data', (chunk) => { stdout += chunk; });
    worker.stderr.on('data', (chunk) => { stderr += chunk; });

    const timer = setTimeout(() => {
      if (finished) return;
      worker.terminate();
      stderr += `[team-standards] ${script} timed out after ${CHILD_TIMEOUT_MS}ms.\n`;
    }, CHILD_TIMEOUT_MS);

    worker.on('error', (error) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      resolve(result(1, stdout, stderr + `[team-standards] ${script} failed to start: ${error.message}\n`));
    });
    worker.on('exit', (code) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      resolve(result(Number.isInteger(code) ? code : 1, stdout, stderr));
    });
    worker.stdin.end(input);

    function result(code, capturedStdout, capturedStderr) {
      return {
        script,
        code,
        stdout: capturedStdout,
        stderr: capturedStderr,
        durationMs: Number(process.hrtime.bigint() - startedAt) / 1e6,
      };
    }
  });
}
