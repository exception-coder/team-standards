---
name: design-system-bootstrap
description: "Initialize or extend an evidence-driven design registry, create or bind a Design Profile, capture explicit user visual preferences, and mine repeated evidence into candidate patterns. Use for design bootstrap, profile binding, preference recording, or pattern learning."
---

# Design System Bootstrap

Create design governance from observed evidence. Do not invent a complete design system from a vague aesthetic request.

## Required workflow

1. Resolve the user home directory and `$HOME/.design-registry/registry.json`.
2. If absent, copy the minimal [registry template](assets/registry-template/) and validate it with [registry.schema.json](references/registry.schema.json).
3. Choose global bootstrap, profile bootstrap, project binding, or profile fork.
4. When scanning a project, inspect tokens, styles, shared components, layouts, interaction patterns, and approved screens. Classify extracted knowledge as `OBSERVED`, `EXPERIMENTAL`, `CANDIDATE`, `ESTABLISHED`, or `CORE`.
5. For bindings, create `design.config.json` with `inherit`, `reference`, or `independent` mode.
6. Validate profiles, bindings, and evidence with the schemas in `references/`.
   - Use [reference-metadata-template.md](references/reference-metadata-template.md) for approved and rejected visual references.
7. Report created paths, evidence sources, unresolved choices, and validation results.

## 偏好学习模式

- 用户明确表达接受、拒绝或比较某个 UI 选择时，读取 [evidence-capture.md](references/evidence-capture.md)，只记录最小作用域的 Preference Evidence，不直接改设计规则。
- 同类 Evidence 重复出现、互相冲突或用户要求归纳偏好时，读取 [pattern-mining.md](references/pattern-mining.md)，更新候选强弱、冲突与晋升建议。
- 单次反馈不得直接升级为 Profile 或 Global Core；重大晋升必须人工确认。

## Resolver and storage contract

Use [resolver.md](references/resolver.md). Skills may be installed from a plugin, repository `.agents/skills`, or the official personal directory `$HOME/.agents/skills`; evolving registry data always stays outside Skill directories at `$HOME/.design-registry`.

- `inherit`: follow a profile and receive later established changes.
- `reference`: consult a profile without treating it as project law.
- `independent`: use core plus project overrides.
- A user instruction such as “按 Supplier 风格” may select a profile temporarily; do not persist a binding unless requested.

## Hard gates

- Do not overwrite an existing registry, profile, binding, evidence, or reference without authorization.
- Do not infer `CORE` or `ESTABLISHED` rules from frequency alone.
- Do not place registry data in a Skill or plugin directory.
- Do not require Git, `AGENTS.md`, a business repository, database, RAG, or agent server.
- Preserve approved and rejected references with metadata; screenshots alone are insufficient.

## Completion contract

The result works in temporary directories, resolves through the manifest, preserves provenance and maturity, and marks uncertainty as `OBSERVED`, `EXPERIMENTAL`, or `TBD`.
