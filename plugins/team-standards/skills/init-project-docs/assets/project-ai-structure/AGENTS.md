# {{PROJECT_NAME}} Agent Guide

## AI context routing

Read context in this order:

1. Project rules and task constraints: `AGENTS.md` and the nearest scoped `AGENTS.md`.
2. Human-maintained architecture, domain, development, and decision knowledge: `docs/INDEX.md`.
3. Accepted behavior and proposed changes: `openspec/specs/` and `openspec/changes/`.
4. Code locations, dependencies, call paths, and impact: Graphify.
5. Exact behavior: targeted source, tests, database evidence, and runtime evidence.

Graphify describes current implementation relationships; it does not define business intent. OpenSpec describes expected behavior and changes; validation does not prove the implementation conforms. Verify both against the task-owned source and tests before editing.

When `openspec/config.yaml` contains real project context, every non-trivial behavior or architecture change must match or create an OpenSpec change before implementation. Keep that change coherent as requirements or implementation discoveries evolve, validate it before coding and completion, and sync/archive only after its tasks and project verification evidence are complete. Do not silently replace it with a legacy design document.

## Project-specific rules

Keep project architecture, naming, build, test, deployment, data, and compatibility rules in this repository. Put substantial rationale in indexed documents and keep this file focused on mandatory rules and routing.

Do not copy team-wide rules, generated Graphify reports, OpenSpec artifacts, or external domain knowledge into a second project-local source of truth.

## Workspace safety

Preserve unrelated working-tree changes. Limit edits and verification to task-owned files. Project-specific Skills belong under `.codex/skills/` only when they provide a real reusable capability; do not create placeholder Skill directories.
