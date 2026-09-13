# Frontend Quality Gates

Read this reference before declaring material frontend work complete. Scale the number of checks to the change, but do not skip an applicable quality dimension.

## Verification loop

1. Run the repository's formatting, lint, type, unit, and build commands relevant to the changed scope.
2. Start the application through its documented development or preview command.
3. Open the changed experience in a real browser.
4. Inspect the primary route at a representative mobile and desktop viewport. Add tablet or dense-data widths when the product requires them.
5. Exercise the primary interaction plus one empty, validation, permission, network, or failure path.
6. Run [visual-review-checklist.md](visual-review-checklist.md) against the rendered page.
7. Compare with supplied references at equivalent dimensions.
8. Fix material hierarchy, spacing, overflow, generic-pattern, state, and interaction defects; repeat until stable.

When no target sizes are supplied, use approximately 375 pixels wide for a mobile pass and 1440 pixels wide for a desktop pass, then inspect any breakpoint where composition changes.

## Responsive checks

- No accidental horizontal scrolling.
- Reading order remains logical when columns collapse.
- Navigation, tables, filters, dialogs, sticky regions, and action bars remain usable.
- Touch targets are appropriately sized and separated.
- Long labels, large numbers, localization expansion, and validation messages do not break layout.
- Content does not hide behind fixed headers, footers, or device safe areas.

## Workspace viewport contract

For operational workspaces (registries, editors, consoles, split views and data tables), responsiveness includes usable height as well as width. This contract does not require reading pages, short forms or landing pages to stretch their content.

- Trace the sizing chain from the actual shell outlet through intermediate wrappers to panels. Allocate remaining space with flex/grid and shrinkable children (`min-height: 0`, `min-width: 0` where needed). A full-height outer page alone does not establish a full-height workspace.
- Use the space the shell allocates; do not subtract guessed header heights from `100vh`, impose a screenshot-specific fixed height, or apply a reading `max-width` to the entire operational surface without a product reason.
- Declare which region scrolls at each layout breakpoint. Desktop split panels may scroll independently; narrow screens may use document flow. Avoid nested scroll traps, clipped overflow, empty strips outside prematurely ending panels, and controls hidden behind fixed or sticky bars. Do not enlarge fields or add decorative content just to consume whitespace.
- Verify the supplied viewport and a taller and shorter desktop viewport, then a narrow viewport. When no dimensions are supplied, 1440×900, 1920×1080, 1280×600 and 390×844 are useful starting points, not mandated product breakpoints. Resize an already open page; also exercise sidebar expansion/collapse and zoom when supported by the host and relevant to the change.
- Test sparse and overflowing content plus an applicable loading/empty/error state. Measure panel boundaries against the actual available region, confirm intentional padding, scroll the final item into view, and reach primary actions by keyboard. A workbench must retain its allocated extent when content is short and remain usable when content is long.
- Preserve screenshots and/or DOM geometry with dimensions and outcomes in the task's existing evidence record. A width-only screenshot or compilation result cannot establish viewport utilization. If a host mode (for example a native title-bar overlay) cannot be tested, name that gap.

## Accessibility checks

- Use semantic landmarks, headings, buttons, links, labels, lists, and tables.
- Ensure every action is keyboard reachable and the focus order matches the visual order.
- Keep focus visibly distinguishable and restore it after dialogs or temporary layers close.
- Provide accessible names for icon-only controls and meaningful alternatives for informative images.
- Announce asynchronous status and validation errors when appropriate.
- Do not rely on color alone to communicate meaning.
- Verify contrast and support reduced-motion preferences.

## Interaction and state checks

- Loading avoids destructive layout shifts and communicates progress.
- Empty states explain what happened and the next useful action.
- Errors retain user context, explain recovery, and do not silently disappear.
- Expired, invalid, and permission states do not become dead ends when a return, retry, request-access, replacement, contact, or support path exists.
- Disabled controls communicate why when the reason is not obvious.
- Submission prevents accidental duplication where relevant.
- Optimistic changes can roll back cleanly.
- Overlays handle escape, outside click, scroll locking, and focus containment consistently.

## Performance checks

- Avoid shipping large libraries for a small effect when platform or existing capabilities suffice.
- Reserve image dimensions, use appropriate formats, and defer non-critical media.
- Prevent unnecessary request waterfalls and duplicate fetching.
- Keep route and component boundaries suitable for code splitting when the application is large.
- Investigate render loops, unstable keys, and expensive recalculation in interaction-heavy views.

## Evidence and completion

Record:

- commands run and their results;
- routes and viewports inspected;
- interactions and non-happy paths exercised;
- reference comparison performed;
- visual-review findings and intentional exceptions;
- limitations, skipped checks, or environment blockers.

Compilation alone is insufficient evidence for visual work. If the browser cannot run, report the work as implemented but visually unverified.
