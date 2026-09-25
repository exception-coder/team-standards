# Enterprise UI failure patterns and review cases

Use this reference for operational workspaces, business lists, dashboards, configuration pages, and their mobile layouts. It turns observed corrections into design decisions and review cases. A commit proves a before/after implementation, not that every product should copy the resulting pixels. Read the cited diff and the current project's requirements before applying a rule.

## Design contract before coding

For a materially new or reworked page, record a compact Page Anatomy in the existing design or task context:

```text
Global navigation → Workspace navigation → Page header → Toolbar → Content → Inspector
Primary user task · objects compared at once · current/target viewports
Density: Compact / Standard / Comfortable / Visual, with a task-based reason
Desktop scroll owner · Mobile scroll owner · first useful mobile content
```

These are roles, not mandatory visible layers. Merge, relocate, or omit a layer that duplicates another. A mobile task surface can keep the active business title in the shell, expose search and primary filters, and move low-frequency controls into a panel. On list-heavy mobile pages, review the first screen for the first useful business object; there is no universal pixel or card-count threshold.

Choose density from the number of objects users must compare and act on at once. Asset cards may emphasize imagery; operational cards should privilege identifiers, state, next action, and comparison. Keep a visual mode only when users have a genuine visual task. Use spacing, type, and dividers for hierarchy before adding a container. A section nested inside a card needs its own interaction, state, or ownership boundary to justify another card.

Action/selection/focus color and business status color have different semantic roles. Status must retain a text or symbol cue; a fresh badge variant or raw color is a review signal, not an automatic failure. Configuration pages should show current value, scope/source/inheritance where applicable, and unsaved difference before or alongside editing.

For explanations and rule-driven results, show **result → business reason → evidence**. Keep the result visible, reveal a concise reason when the result needs attention, and make source records and calculation details discoverable on demand. Do not hide an essential warning or permission consequence behind disclosure.

## Evidence-backed corrections

The source is the Yoooni One Git repository. Review with `git show <commit> -- <path>`; the short hashes below are stable retrieval keys in that repository. “Observed” describes the actual diff and commit rationale. “Generalization” is the Team Standards rule to test in other products.

| Pattern | Observed correction | Generalization and review question |
|---|---|---|
| Mobile inherits desktop hierarchy | `5255b642` moved low-frequency product-season filtering into a mobile panel; `c02d22f2` merged duplicate page and shell titles into the mobile app bar. Both commits report that the first record appeared too low. | Recompose mobile around the primary task. Does the first screen expose search, essential filters, and a useful object without repeated headers? |
| Asset imagery dominates operational comparison | `d73fbec0` changed default sample and procurement result cards to medium-density asset and horizontal business cards; `278fc1ca` compressed borrow exception records and removed a denominator-free progress bar; `0423c1f7` selected compact mobile table cards by default. | Select density by comparison task. Is a large image or progress bar carrying a decision, or only consuming row space? |
| Too many containers hide structure | `744ccfde` removed a large permission card, widened the workspace, and showed the save bar only while editing. | Count nested surface roles, not DOM elements. Could a divider or section heading express the same relationship more clearly? |
| Dashboard topics split the overview | `614b0acd` removed mutually exclusive “work/retired/buyer” dashboard buttons and placed essential summaries together, with detail analysis one action away. | The first view should answer the shared overview question; deeper analysis belongs to a drill-down. Does a dashboard switch hide information needed for comparison? |
| Sparse or unsupported charts | `614b0acd` reduced a low-information trend; `02fe8296` added composition and comparable duration charts where the existing layout could not answer management questions. | Ask question → insight → representation. A summary, event list, table, or **NO CHART** is valid when points or metric semantics cannot support a chart. |
| Explanation overwhelms result | `6f61b66c` moved node source records into “business evidence”, kept a concise business reason near the status; `07ad5e78` moved coverage detail from a permanent overview banner to a discoverable help control. | Show result first, concise reason second, raw evidence on demand. Is the normal path dominated by diagnostic text? |
| Competing scroll owners | `ca12cb1e` made sidebar navigation scroll independently of a fixed account footer; `c40ad866` changed a progress detail page from double vertical scrolling to document flow with sticky controls. Earlier `6d4ab7ad` introduced a table workspace with its own scroll owner for a different task. | Choose scroll ownership per page and breakpoint. Do not promote either document flow or panel scrolling to a universal rule; verify the last row, sticky controls, wheel handoff, and short/tall viewports. |
| Status looks like a neutral label | `9d8c9099` gave pending quote a semantic warning treatment and text/symbol cue while preserving long title space. | Keep action color separate from status meaning. Can the status be read without color, and is its meaning consistent across pages? |
| Brand decoration displaces the task | `2c047a93` removed oversized login slogan, numbered journey, and decorative English; `55f1f0ac` aligned the login palette and typography with the product after a divergent style pass. | Ask whether an element improves task understanding, operation, or brand recognition. If none improves, remove it. Check continuity between entry and workspace. |
| Hierarchical configuration shown as flat editing | `843e60b2` replaced flat long-path department selection with a tree; `744ccfde` added authorization summaries and made save controls conditional on unsaved edits. | Inspect current configuration and its source or hierarchy before editing. Can users tell what is currently active, inherited, or changed? |

The scroll commits illustrate a deliberate tradeoff: a data table may need an independently scrolling panel, while a detail page may work better as document flow. The rule is explicit ownership and observable usability, not a single CSS property.

## Review and Eval cases

Each case should use representative content and actual viewport/browser evidence. A test that only matches a class name does not establish usability.

| Case | Input to Agent | Expected observable result |
|---|---|---|
| Mobile asset browser | Desktop page with breadcrumb, workspace title, season filter, search, tabs, view switch, and image cards. | Agent names the mobile task, removes or relocates duplicate layers, chooses density, and shows a useful record in the initial mobile view. Search/filter remain usable; desktop preferences survive. |
| Dense operational records | 20 purchase or borrow records with image, identity, status, owner, and next action. | Agent compares several rows without oversize imagery, retains identifiers and state, and offers a justified visual mode when images matter. |
| Permission configuration | Hierarchical departments, inherited and direct grants, existing state, and unsaved changes. | Default view explains active state and source; editor changes one scope, shows the diff, and exposes save/cancel only when relevant. |
| Progress explanation | A normal node and an anomalous node with ERP source records and calculation rules. | Normal path shows result; anomaly shows a concise reason; evidence and rule details remain accessible by keyboard and are not forced open. |
| Sparse overview | One or two event dates, current stock, overdue count, and a purchase summary. | Agent rejects a fabricated trend or meaningless pie, uses summary/event list where appropriate, and connects important counts to a real detail action. |
| Scroll ownership | Tall table, short table, long sidebar, fixed footer, narrow and short viewports. | Agent declares scroll owners per layout; last item and actions remain reachable without scroll trap or footer overlap. |
| Login visual revision | A frequent-use internal login with large slogan, decorative eyebrow, numbered brand story, and a distinct visual theme. | Agent removes elements that do not improve task or brand recognition, preserves a real brand cue, and verifies continuity with the authenticated product. |
| Status consistency | Pending, approved, rejected, neutral, and selected/action states across two pages. | Agent uses semantic status tokens and text/symbol cues; action color does not silently redefine business state. |

## Candidate mechanical checks

Start with diagnostic output and a false-positive review. Promote to a blocking Gate only after project token configuration, baseline sampling, negative controls, and real host/CI evidence.

- Scan changed UI files for new literal hex/rgb values and Tailwind arbitrary colors; compare against allowed token definitions. A token definition or documented exceptional illustration is not a failure.
- Detect newly introduced badge variants or duplicate status mappings across feature pages; report inconsistent semantics for human review. A name match alone cannot prove that two business states are equivalent.
- Locate changed `overflow-y-auto`, `overflow-auto`, `h-screen`, `max-h-*`, `sticky`, and `fixed` usage, then inspect the parent/child layout. Text scanning alone cannot prove a nested scroll trap.
- Compare mobile screenshots or DOM geometry at task-specific viewports: first useful object, hidden actions, last item, sticky overlap, and scroll handoff. Do not impose a universal 200px header limit.
- Flag new nested card surfaces and decorative hero patterns for a purpose review. Do not ban cards, gradients, or slogans by syntax alone.

The deterministic layer can report token provenance, DOM geometry, coverage, and changed selectors. Whether hierarchy, density, explanation, or brand expression suits a task remains a named design review.

## Adoption plan

1. **Skill and Review:** apply Page Anatomy and density choice before material UI implementation; use the review cases after first render. Record exceptions beside the design decision, not in an ever-growing project rule copy.
2. **Eval:** run the eight cases above against representative business fixtures. Score whether the Agent explains hierarchy, chooses a task-appropriate representation, renders relevant states, and verifies the actual browser result. Retain a negative control where a card, image, independent panel scroll, or chart is correct.
3. **Diagnostic Gate:** prototype token/color and scroll-layout findings on changed files only. Compare reports with reviewed diffs from this history and a second project. Report false positives, missed defects, and uncovered host events before considering `block`.
4. **Project rollout:** keep project-specific dimensions, state names, branding, and layout exceptions in the project. The shared Skill contains the decision method and evaluation criteria; Forge or CI may later host deterministic checks after an explicit integration test.

## Mining method and limits

Future mining should search commit messages and changed frontend paths for UI, mobile, layout, density, dashboard, scroll, drawer, permissions, and login terms. For each candidate, compare before/after diff, commit rationale, related tests, and available browser evidence. Keep ordinary feature additions separate from corrections. Promote a cross-project rule only after it survives a different product or an explicit review case.

This pass inspected selected Yoooni One commits through 2026-09-24, not every frontend commit. The separately mentioned `frontend-ui-skill-handoff.md` was not found in the accessible workspaces during this pass; this reference therefore does not claim to merge its text. The configuration and container patterns above have supporting diffs, while a full AI slop taxonomy and automated nested-scroll detection remain future work. No Yoooni One source was modified.
