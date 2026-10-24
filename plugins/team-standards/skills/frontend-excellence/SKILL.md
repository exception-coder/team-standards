---
name: frontend-excellence
description: "Use when creating, redesigning, or substantially improving production Web frontends, including React, Vue, Next.js, dashboards, portals, landing pages, component libraries, or screenshot/Figma-to-code work. Enforces product-level visual direction, deliberate anti-generic composition, design systems, responsive behavior, accessibility, complete recoverable UI states, maintainable component architecture, and real-browser visual verification. Do not use for pure backend work, native mobile UI, or copy-only changes with no layout or interaction impact."
---

# Frontend Excellence

Goal: deliver a coherent, usable product interface with recoverable interactions and browser evidence. Shared decisions follow the [engineering constitution](../change-readiness/references/engineering-principles.md).

## Decision criteria

- Use the repository's stack, tokens, components, data patterns and supplied visual references. Define a concise visual direction where none exists; create only the missing design decisions.
- Organize around the audience's primary task, content hierarchy, comparison needs and realistic density. For material workspace changes, make the page anatomy, first useful mobile content and scroll ownership clear before implementation.
- Keep feature boundaries and state ownership explicit. Use semantic tokens and component variants for repeated decisions; visual novelty must support hierarchy or interaction.
- Cover applicable loading, empty, error, success, invalid, disabled and permission states. Preserve context and offer a useful recovery action.
- Design responsive hierarchy rather than shrinking desktop layouts. Trace available width and height through wrappers; constrain reading content without unnecessarily constraining the operational workspace.
- Configuration screens show current values and their source/inheritance, pending changes and recovery. Rule-driven results distinguish the result, business explanation and inspectable evidence.

## Necessary constraints and completion

Keyboard access, visible focus and reduced-motion behavior are part of applicable interactions. Avoid scattered raw styles, a competing design system or a giant production page that hides unrelated responsibilities.

Material visual work requires real-browser inspection at relevant desktop and mobile sizes, including short-height workspace behavior, the primary interaction and a failure or empty path. Inspect final items and scroll ownership with short and long content. Compilation alone cannot establish usability; name inaccessible or unverified scope.

Use [delivery verification](../delivery-verification/SKILL.md#执行范围与证据复用) for execution scope and [test assets](../coding-standards-common/references/testing-assets.md) for shared fixtures and isolated mutable state. Reuse valid checks rather than adding a second acceptance run.

## Compact counterexamples

- A centered card grid on every page: choose containers that express the actual task and comparison structure.
- Mobile filters occupy the entire first viewport: expose the first useful business object and adapt controls.
- Every panel scrolls independently: assign scroll ownership and verify the final content remains reachable.
- An error banner with no next action: preserve input and provide recovery where possible.

## Read when needed

- Routes, features, forms or state: [architecture and state](references/architecture-and-state.md) and [DDD-lite](../architecture-ddd-lite-fullstack/SKILL.md).
- New visual language or reusable components: [aesthetics](references/design-system-and-aesthetics.md) and [design-system](../design-system/SKILL.md).
- Interaction states: [interaction and states](references/interaction-and-states.md).
- Workspace composition: [enterprise UI cases](references/enterprise-ui-failure-patterns.md).
- Completion evidence: [quality gates](references/quality-gates.md), especially its workspace viewport contract; visual inspection: [review checklist](references/visual-review-checklist.md).
- Business charts: [business visualization](../business-visualization-advisor/SKILL.md) owns metric semantics and chart choices.

Use available Figma/browser tools for their actual inputs. Image generation is for bitmap assets, not rasterizing semantic UI. Report the implemented direction, verification and material limitations.
