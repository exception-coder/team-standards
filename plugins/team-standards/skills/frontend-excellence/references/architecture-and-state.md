# Frontend Architecture and State

Use these rules when the task changes routes, features, shared components, data access, forms, or state ownership. The canonical cross-stack dependency rules remain in `architecture-ddd-lite-fullstack`.

## Structure selection

Prefer the repository's established structure. For a new medium or large Web application, use this responsibility model as a default:

```text
src/
├── app/       application bootstrap, routing, providers, global error boundaries
├── pages/     route composition and page-level data orchestration
├── widgets/   substantial reusable page sections
├── features/  user-visible business actions and use cases
├── entities/  domain concepts, display models, and entity-level UI
└── shared/    design-system primitives, infrastructure, config, and generic utilities
```

Small applications may collapse adjacent layers. Preserve responsibilities and dependency direction even when directories are fewer.

## Dependency direction

- Keep `app` as the composition root.
- Let pages compose features, entities, and shared UI; do not bury reusable business actions inside page files.
- Expose intentional Feature entry points. Never import another Feature's private component, hook, store, or API module.
- Keep shared code domain-neutral. If a shared component knows order, invoice, customer, or approval rules, move it to the owning domain.
- Keep UI independent of transport details. Components consume typed use-case results, not raw fetch responses.

## State ownership

| State type | Preferred owner | Rule |
|---|---|---|
| Server state | Query/cache layer | Cache, invalidate, retry, and report errors in one place. |
| URL state | Router/search parameters | Use for shareable navigation, filters, sorting, pagination, and tabs when appropriate. |
| Form state | Form boundary | Keep validation and submission lifecycle close to the form. |
| Local interaction state | Nearest stable component | Use for disclosure, focus, selection, and temporary UI behavior. |
| Cross-page client state | Explicit application store | Add only when multiple distant consumers truly coordinate. |

Do not mirror server state into a global client store without a demonstrated offline, optimistic, or coordination requirement. Do not keep the same fact independently in URL, component state, and store.

## Component boundaries

- Give each component one visual or interaction responsibility.
- Separate data orchestration from reusable presentation when it improves testing or reuse; avoid ceremonial wrapper components.
- Prefer composition and explicit variants over boolean-prop multiplication.
- Keep public props small, semantic, and stable. Pass domain intent instead of CSS escape hatches.
- Centralize asynchronous and failure behavior in boundaries that can render meaningful recovery UI.
- Split files before they become hard to review; a long file is a signal, not the only reason to split.

## Data contracts

- Validate untrusted responses at the system boundary when the stack supports schemas.
- Normalize transport errors into a small set of UI-relevant outcomes.
- Preserve cancellation and stale-request handling for search, filters, navigation, and rapid input.
- Make optimistic updates reversible and surface conflicts instead of silently overwriting.
- Keep fixtures and mock handlers centralized and typed; do not scatter arbitrary sample data through components.

## Framework selection for new projects

Choose the framework from product needs, deployment constraints, team familiarity, and repository standards. Use server rendering when public discovery or first-render delivery requires it; use a client application when authenticated interaction dominates. Do not change an existing framework solely because another option is newer.
