# Design System and Aesthetics

Use this reference for new products, redesigns, new visual languages, component libraries, or pages whose quality depends materially on composition and styling.

## Establish one visual direction

Before styling, write a compact direction containing:

- product character and audience;
- dominant information hierarchy;
- typography mood and density;
- color role and contrast strategy;
- shape, surface, depth, and motion language;
- one distinctive motif grounded in the product's content or brand.

Keep the direction coherent. Do not mix unrelated visual trends merely to make the interface look elaborate.

## Token system

Define semantic tokens for:

- canvas, surface, elevated surface, text, muted text, border, accent, destructive, warning, and success colors;
- display, heading, body, label, and code typography;
- spacing rhythm, content widths, control heights, radii, shadows, z-index layers, breakpoints, and motion durations;
- light and dark themes when both are required.

Components consume semantic roles such as `surface-raised` or `text-muted`, not raw palette names or copied hexadecimal values. Keep primitive palette values behind semantic aliases.

## Typography and hierarchy

- Select typography for the product's voice and language coverage, not because it is a fashionable default.
- Use a deliberate type scale with limited, repeatable roles.
- Keep body text readable and line lengths controlled.
- Use weight, size, whitespace, alignment, and color in a consistent order of emphasis.
- Let data density match the task. Operational screens may be compact; editorial or marketing pages need more rhythm and breathing room.

## Layout and responsive composition

- Design around content priorities, not arbitrary card grids.
- Use grids for alignment, not as a reason to box every section.
- Preserve a clear primary action and reading order at each viewport.
- Recompose navigation, sidebars, tables, filters, and action groups for constrained widths.
- Prefer container-aware components when reusable modules appear in multiple page widths.
- Test long labels, localization expansion, large values, empty collections, and validation messages.

## Components and states

For each interactive primitive, define the applicable states:

```text
default
hover
focus-visible
active or selected
disabled
loading
invalid or error
success
read-only
```

Keep variants finite and semantic. Reuse primitives for buttons, fields, menus, dialogs, feedback, data display, and navigation. Complex composites may own layout, but must not fork base control behavior.

## Motion and depth

- Use motion to explain continuity, hierarchy, causality, or feedback.
- Keep durations and easing tokenized.
- Prefer a few meaningful transitions over universal animation.
- Respect reduced-motion preferences and avoid motion that blocks task completion.
- Use shadows, borders, blur, and elevation sparingly to express actual layering.

## Avoid generic output

- Avoid default gradient hero sections, arbitrary glass panels, decorative blobs, and card mosaics when they do not serve the product.
- Avoid excessive rounded containers and nested surfaces that weaken hierarchy.
- Avoid placeholder emoji as production iconography.
- Avoid lorem ipsum when realistic content shape affects layout.
- Avoid copying a reference's decoration while missing its spacing, typography, density, and interaction logic.
- Avoid treating dark mode as color inversion; preserve hierarchy and contrast relationships.

## Reference translation

When implementing from screenshots or Figma:

1. Extract hierarchy, grid, spacing rhythm, typography, component states, and responsive rules.
2. Map those decisions onto the repository's tokens and primitives.
3. Recreate behavior and semantics, not only pixels.
4. Resolve ambiguities with the simplest choice consistent with the overall direction.
5. Compare rendered output at matching viewports and iterate on the largest perceptual differences first.
