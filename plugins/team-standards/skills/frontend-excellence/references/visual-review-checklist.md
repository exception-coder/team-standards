# Visual Review Checklist

Run this review after the first complete browser render and repeat it after material visual revisions. Inspect the page at representative desktop and mobile viewports with realistic content and at least one non-happy state.

## Hierarchy and composition

- Can the reviewer identify global navigation, workspace navigation, page header, toolbar, content, and inspector roles, including roles intentionally merged or omitted? Check the [enterprise UI failure cases](enterprise-ui-failure-patterns.md).
- Is the chosen Compact / Standard / Comfortable / Visual density justified by how many objects the user compares at once?
- Is there one clear visual focus and reading path?
- Does alignment reveal relationships without relying on extra containers?
- Can any card or panel be replaced by spacing, typography, a divider, or a tonal change?
- Is any card nested only because components were composed mechanically?
- Does whitespace clarify the layout rather than make operational content unnecessarily sparse?
- Do workspace panels reach their allocated boundaries at both tall and short viewport heights, with usable scrolling and reachable actions? Apply the [workspace viewport contract](quality-gates.md#workspace-viewport-contract); do not treat a prematurely ending panel as intentional whitespace.
- Does removing a non-essential visual element make the page clearer?
- On a mobile list, does the first useful object appear without unnecessary duplicate headers or low-frequency controls filling the initial view?

---

## Shape, surface, and color

- Are radii restrained, consistent by level, and smaller on nested elements?
- Are shadows limited to real elevation, with border or tone used for ordinary separation?
- Is the interaction accent reserved for action, selection, and focus rather than decoration or an unrelated business status?
- Are action/selection colors distinct in role from pending, success, danger, and neutral status; does status remain understandable without color?
- Are gradients, blur, translucency, glow, and illustration grounded in the product direction?
- Are badges and pills used for compact semantics instead of as a default container shape?

---

## Typography and density

- Do size, weight, color, and spacing establish a clear hierarchy without excessive bold text?
- Are line length, label length, localization expansion, and large values handled?
- Is secondary information genuinely subordinate but still readable?
- Can users scan, understand, and act at the density expected for this product?
- Are content widths intentional rather than automatically full-screen?

---

## Interaction and states

- Are controls visually complete across hover, pressed, focus-visible, disabled, loading, invalid, and selected states where applicable?
- Do empty, error, expired, invalid, and permission states preserve context and offer a credible next action?
- Does a configuration page show current state, source/inheritance when relevant, and unsaved differences before asking the user to edit?
- Does a rule-driven result show the business reason when needed while keeping raw evidence available on demand?
- Are status icons supportive rather than dominant?
- Does navigation communicate current position quietly and unambiguously?
- Does motion explain feedback or continuity without demanding attention?

---

## Generic-pattern rejection

Look specifically for these high-frequency generated-UI defaults:

- a large rounded white card floating on a pale gray canvas;
- a centered oversized icon above a heading and muted paragraph;
- repeated card grids where sections would communicate hierarchy better;
- universal `rounded-2xl` or pill controls;
- decorative blue-purple gradients, glow, glass, or background blobs;
- shadows on every component;
- landing-page hero composition applied to an operational workflow;
- placeholder emoji or illustration used instead of product meaning.

Do not fail a design merely because it contains one of these devices. Fail the device when it lacks a hierarchy, interaction, readability, or contextual purpose. Resolve the largest perceptual problems first, render again, and record any intentional exception in the delivery summary.
