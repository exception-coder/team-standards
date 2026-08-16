# Interaction and Workflow States

Use this reference when an experience can load, fail, be empty, reject input, deny access, expire, or otherwise interrupt the user's current task.

## Design states inside the workflow

Treat a state as part of the current task, not as a decorative poster. Preserve enough surrounding context for the user to understand where they are and what the state affects.

Compose blocked states in this order:

```text
context -> state -> explanation -> next action
```

Keep icons secondary and normally close to text scale. Do not default to a large icon above a large title inside a floating card. A state does not need its own card unless the boundary itself carries meaning.

---

## Provide recovery paths

- Explain what happened in language the user can act on.
- Preserve entered data and useful context whenever safety permits.
- Offer the next useful action, such as retry, return, edit, request access, contact the responsible party, or start a valid replacement flow.
- Do not offer an action that cannot resolve or advance the state.
- When no direct recovery exists, explain who or what can unblock the user and retain a reference identifier when it helps support or audit.
- Keep destructive recovery distinct from the primary safe path.

Empty states must distinguish between a genuinely empty collection, filters that returned no matches, unavailable data, and missing permission. Each case needs different explanation and action.

---

## Complete control states

Define every applicable state for interactive controls:

```text
default
hover
pressed or active
focus-visible
disabled
loading
invalid or error
selected
read-only
success
```

Keep state changes stable in layout. Do not use hover movement, bounce, or large scaling for routine feedback. Prefer color, border, opacity, and subtle elevation changes, and respect reduced-motion preferences.

Disabled controls should communicate why when the reason is not evident. Loading states must prevent duplicate action where relevant and keep progress understandable.

---

## Keep navigation quiet and legible

- Express current location with typography, weight, a subtle indicator, or a restrained surface change.
- Keep future steps secondary without making them look disabled when they remain navigable.
- Avoid oversized steppers, heavy progress rails, and colorful nodes unless progress itself is central to the task.
- Preserve a clear route back or onward from transient and exceptional states.

Navigation should orient the user without competing with page content.

---

## Write state content for action

Use a direct title that names the state, one concise explanation of cause or consequence, and action labels that describe the result. Avoid vague headings such as "Something went wrong" when the system knows whether the link expired, access was denied, validation failed, or the service is unavailable.

Do not overload the page with muted secondary copy. Keep diagnostic detail available through disclosure, logs, reference identifiers, or support paths when it is not needed for the immediate decision.
