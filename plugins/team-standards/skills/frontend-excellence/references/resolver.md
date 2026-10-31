# Design Registry Resolver

1. Resolve the current user's home directory.
2. Resolve `$HOME/.design-registry/registry.json`.
3. If absent, use approved project components, tokens and design guidance. Do not block UI work or initialize a registry automatically.
4. Resolve the working context, then search upward for `design.config.json` until the filesystem or repository boundary.
5. If a binding exists, validate it and resolve its profile and project overrides.
6. Without a binding, prefer project assets; consult existing global core only when applicable. A user-named profile may apply temporarily for the task.
7. Resolve approved and rejected references plus current implementation.
8. Select Guardian mode from available maturity evidence.

Do not hard-code registry internals in consuming Skills. Read paths from manifests.
