# OpenSpec Workspace Rules

These rules apply to files under `openspec/`.

- `specs/` contains accepted behavioral specifications; `changes/` describes proposed or in-progress evolution.
- Keep proposal, design, delta specs, and tasks coherent within one change.
- Match or create the related change before non-trivial implementation, and update the same change whenever scope, behavior, contracts, or acceptance evidence changes.
- Do not turn a Graphify observation into an accepted behavioral requirement.
- Check current strict structural validation and targeted implementation/test evidence before syncing or archiving a change; rerun only checks whose relevant inputs changed or coverage is missing. Incomplete tasks or critical mismatches block archive.
- Shared repository rules remain in the root `AGENTS.md`; do not duplicate them here.
- Verification tasks cover independent risks, not a quota of new tests or files. Reuse existing suites and current evidence; select affected modules and required consumers. Count checks already performed by builds. Task completion, commits, progress reports and archive do not themselves require reruns; changed protocol, security, migration or other relevant inputs require renewed checks for affected risks. Preserve explicitly adopted project gates.
