# {{PROJECT_NAME}} Agent Guide

## Context and knowledge

Read this file, the nearest scoped AGENTS.md, and `docs/INDEX.md` first. Use targeted source search, LSP when available, Git, tests and runtime evidence to understand current behavior. Graphify is optional for complex relationships; missing graphs do not block normal work. Follow existing OpenSpec only when the project has adopted it.

Business knowledge belongs to this repository. Reuse the current document for each topic; do not copy rules from an existing design or accepted specification into another document. Create `docs/domain/<module>/` only when real content exists; preserve an established alternative location.

Project initialization includes a concise business overview and one editable draw.io panorama with an embedded preview. Reuse existing documents and diagrams; fill gaps from key entry points and business code, cite the evidence, and label inferred rules and flows as pending confirmation. When no overview exists, start with `docs/domain/overview.md`; do not create a mandatory document set. Empty projects must report missing business evidence instead of inventing content.

When business meaning changes, update the affected terms, rules, flows or capabilities. Pure styling, performance tuning and behavior-preserving refactoring do not require knowledge updates. New standalone knowledge uses lightweight YAML (`id`, `domain`, `type`, `knowledge_status`, `updated_at`; `related` when useful). Keep inferred facts separate from verified business decisions, with traceable evidence. Do not upgrade trust based only on passing code tests.

Keep the business panorama consistent with the overview when relevant behavior changes; update its draw.io source and regenerate the preview together. Reuse the project's diagram location, otherwise use `docs/diagrams/`. Maintain these files with the project through Git, without a separate knowledge repository.

Markdown is the single maintained source. Graphs and retrieval indexes are rebuildable derivatives, not another manually maintained knowledge base. Shared knowledge has one owning project; consumers link to it. Real-time business values come from authorized APIs or runtime queries, not document snapshots.

## Project rules and workspace

Keep project-specific build, test, data, compatibility and deployment rules in the repository. Preserve unrelated changes. Verify only the affected scope and relevant consumers. Do not create placeholder skills, graph outputs, empty business documents, global MCP configuration or a central knowledge project during initialization.
