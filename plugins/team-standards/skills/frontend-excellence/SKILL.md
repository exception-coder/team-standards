---
name: frontend-excellence
description: "Use when creating, redesigning, or substantially improving production Web frontends, including React, Vue, Next.js, dashboards, portals, landing pages, component libraries, or screenshot/Figma-to-code work. Enforces product-level visual direction, design systems, responsive behavior, accessibility, complete UI states, maintainable component architecture, and real-browser visual verification. Do not use for pure backend work, native mobile UI, or copy-only changes with no layout or interaction impact."
---

# Frontend Excellence

Deliver a coherent product interface, not a runnable mock. Preserve the repository's stack and design language while improving structure, visual quality, interaction completeness, and verification evidence.

## Required workflow

1. Inspect the current project before choosing libraries or structure.
   - Read the package manifest, application entry, routes, styling setup, existing design tokens, shared components, state/data patterns, and test commands.
   - Reuse established capabilities unless the user explicitly requests a redesign or migration.
2. Establish the product intent.
   - Identify audience, primary task, content hierarchy, brand cues, target viewports, and accessibility expectations.
   - Use provided Figma selections, screenshots, brand assets, or written references as sources of truth.
   - If no visual reference exists, state a concise visual direction and its rationale before implementing it.
3. Resolve architecture and state ownership.
   - Apply `architecture-ddd-lite-fullstack` for Feature boundaries and dependency direction.
   - Read [architecture-and-state.md](references/architecture-and-state.md) when adding routes, features, shared components, data fetching, forms, or state.
4. Build a design system before composing pages.
   - Read [design-system-and-aesthetics.md](references/design-system-and-aesthetics.md) for new projects, redesigns, new visual languages, or reusable component work.
   - Express repeated decisions through semantic tokens and component variants, not page-local magic values.
5. Implement the complete experience.
   - Cover responsive layout, content hierarchy, keyboard behavior, focus, motion preferences, and all relevant loading, empty, error, success, disabled, and permission states.
   - Use real content shapes and realistic density. Keep fixtures centralized when live data is unavailable.
6. Verify in a real browser.
   - Read [quality-gates.md](references/quality-gates.md) before declaring completion.
   - Run the project's build, lint, type, and test commands that are relevant to the change.
   - Inspect at least one mobile and one desktop viewport. Exercise the primary interaction and one failure or empty path.
   - Compare against supplied references and iterate until material differences are resolved or explicitly documented.
7. Report the result.
   - Summarize the visual direction, architectural choices, verification performed, and any residual limitation.
   - Do not claim the interface is fully verified when browser validation could not run.

## Tool and input routing

- Use a Figma connector when the user supplies Figma resources and the connector is available. Figma is an enhancement, not a prerequisite.
- Use image generation only for original bitmap assets, textures, illustrations, or visual exploration. Do not rasterize UI that should remain semantic code.
- Use the repository's browser automation when available; otherwise use an interactive browser and preserve equivalent visual evidence.
- Use existing icons, fonts, tokens, and component primitives before adding dependencies.

## Hard gates

- Do not deliver a single giant page component or a single-file HTML demo as production architecture unless the repository is intentionally static and the user explicitly wants that form.
- Do not introduce a second design system beside an existing one without an explicit migration decision.
- Do not scatter raw colors, spacing, radii, shadows, z-index values, endpoints, or breakpoints across page code.
- Do not use desktop shrinkage as the mobile strategy; reflow hierarchy and interaction for constrained space.
- Do not omit focus, keyboard, reduced-motion, error, empty, loading, or disabled behavior when the component can enter those states.
- Do not substitute visual novelty for information hierarchy, legibility, or task completion.
- Do not declare completion from compilation alone; browser inspection is required for material visual work.

## Completion contract

A finished result must be componentized, type-safe where the stack supports it, consistent with the repository, visually intentional, responsive, accessible, and backed by proportionate build/test/browser evidence. If any dimension is intentionally deferred, name it explicitly.
