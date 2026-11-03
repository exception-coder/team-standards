---
name: frontend-excellence
description: "Build or improve Web/H5 interfaces; simplify forms, approvals, search, navigation and workflows that feel complex. Supports interaction design, implementation, visual review and design-system modes. Pure backend work and copy-only edits are excluded."
---

# Frontend Excellence

Goal: deliver a coherent, usable product interface with recoverable interactions and browser evidence. Shared decisions follow the [engineering constitution](../change-readiness/references/engineering-principles.md).

Interaction decisions follow the [interaction constitution](references/interaction-constitution.md): users should understand the purpose, state, next action and outcome without learning the system’s internals. Prefer valid project rules and an explicitly selected project skill; reuse one task analysis, and do not claim that guidance physically deduplicates host discovery.

## Select the requested mode

- **Interaction design or simplification:** for new task flows, confusing or cumbersome pages, forms, approvals, search/filter/navigation changes and interaction-changing mobile adaptations, read [interaction design mode](references/interaction-design.md). This mode stays inside this skill. Pure color/spacing/copy changes do not trigger full task analysis; backend work does not trigger this skill.
- **Implementation:** use the criteria below for pages, interactions and reusable components. Reuse project assets and only load references needed for the current change.
- **Visual consistency review:** read [review mode](references/review-mode.md); default to read-only findings. Review alone does not authorize redesign or code changes.
- **Design system or preference work:** read [design-system mode](references/design-system.md). Initialize or bind Registry/Profile only when requested or required by the project; read [bootstrap](references/bootstrap.md) then. Missing Registry never blocks ordinary UI work. Record explicit preferences at their actual scope; frequency alone does not promote a team rule.
- Reuse the same task context, visual evidence and verification results across modes. A review or preference-only task does not inherit implementation acceptance steps or require a second browser run without changed inputs.

## Implementation decision criteria

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
- New visual language or reusable components: [aesthetics](references/design-system-and-aesthetics.md) and [design-system](references/design-system.md).
- User tasks, hierarchy and interaction choices: [interaction design](references/interaction-design.md); it reuses states and verification below.
- Interaction states: [interaction and states](references/interaction-and-states.md).
- Workspace composition: [enterprise UI cases](references/enterprise-ui-failure-patterns.md).
- Completion evidence: [quality gates](references/quality-gates.md), especially its workspace viewport contract; visual inspection: [review checklist](references/visual-review-checklist.md).
- Business charts: [business visualization](../business-visualization-advisor/SKILL.md) owns metric semantics and chart choices.

Use available Figma/browser tools for their actual inputs. Image generation is for bitmap assets, not rasterizing semantic UI. Report the implemented direction, verification and material limitations.
