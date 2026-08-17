---
name: design-reviewer
description: "Review a rendered UI, screenshot, or implemented page against the active design profile, approved references, and visual-evaluation rubric. Use for new pages, major UI refactors, new component systems, navigation or responsive redesign, release milestones, or explicit visual drift review requests."
---

# Design Reviewer

Identify drift against resolved design knowledge. Do not invent a replacement visual language.

## Required workflow

1. Resolve profile and references through [resolver.md](../design-system-bootstrap/references/resolver.md).
2. Require representative rendered evidence for material visual review. Without it, label findings preliminary.
3. Read [rubric.md](../design-system-bootstrap/assets/registry-template/evals/rubric.md).
4. Review hierarchy, alignment, spacing, typography, density, consistency, readability, restraint, interaction, recovery, responsive behavior, and AI-pattern risk.
5. Check arbitrary colors, radii, spacing, or shadows; duplicate components; token violations; overflow; focus and reduced-motion behavior.
6. Classify severity and cite the profile rule, reference, token, or implementation evidence for each finding.
7. Re-review affected dimensions only, except at release or major milestones.

Small copy, spacing, alignment, or obvious UI bugs normally need Guardian-only validation. New pages, major refactors, component families, navigation, and responsive redesign need representative review. Releases may require the full rubric.

Do not call preference a violation without evidence, invent tokens while reporting drift, over-validate tiny changes, or approve UI without required renders and states.
