---
name: design-system-guardian
description: "Govern and review meaningful UI implementation by resolving the design registry, project binding, profile, references, and existing implementation before conservative reuse or controlled exploration. Use for UI work, visual drift checks, representative renders, responsive review, or release visual acceptance."
---

# Design System Guardian

Treat approved existing UI as the visual source of truth and use design evidence before general model taste.

## Required workflow

1. Resolve context with [resolver.md](../design-system-bootstrap/references/resolver.md). If no registry exists, invoke `design-system-bootstrap` before material design work.
2. Read in this order: approved current implementation, project overrides, profile established rules, shared components, profile tokens, approved references, company core, candidates, philosophy, then general model knowledge.
3. Choose `CONSERVATIVE` when mature implementation, components, established patterns, references, or tokens cover the task. Choose `EXPLORATION` only for uncovered structures or component families.
4. In Conservative mode prefer `Reuse → Extend → Compose → Invent`.
5. In Exploration mode keep changes bounded. Vary layout, hierarchy, or interaction—not color alone—when offering alternatives.
6. For production Web work, also apply `frontend-excellence` for architecture, accessibility, responsive states, and browser verification.
7. Scale validation to scope. Do not run a full visual loop for copy, tiny spacing, or obvious alignment fixes.
8. For new pages, major refactors, new component systems, navigation, responsive redesign or release acceptance, render a representative state and read [review-workflow.md](references/review-workflow.md) to check profile, reference, visual and engineering drift.
9. Explicit aesthetic feedback is handed to `design-system-bootstrap` 的偏好学习模式记录，不在实施阶段直接改规则。

## Anti-drift guardrails

Review ungrounded card nesting, oversized rounded containers, huge empty-state icons, mechanical centering, excessive shadows, decorative or blue-purple gradients, unnecessary glassmorphism, badge saturation, generic SaaS dashboards, business-screen hero sections, and decorative illustration. These are warnings, not universal bans; established profile evidence can authorize them.

## Governance rules

- User feedback is evidence, not an immediate rule.
- Profile evidence does not directly alter global core.
- Approved and rejected references are equally valuable.
- Mature areas stay conservative; new areas allow controlled exploration.
- Skills govern workflow; the registry stores evolving knowledge.
- Do not create a competing local design system.

Report the resolved profile and mode, reused knowledge, intentional deviations, validation, and triggered follow-up.
