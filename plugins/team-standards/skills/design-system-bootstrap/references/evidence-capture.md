---
name: design-evidence-capture-reference
description: "Internal preference-evidence capture rules loaded by design-system-bootstrap."
---

# Design Observer

Convert explicit feedback into evidence. Never edit design rules or promote maturity.

## Required workflow

1. Resolve registry, binding, profile, and context through [resolver.md](../design-system-bootstrap/references/resolver.md).
2. Identify accepted choice, rejected choice, observable signals, stated reason, confidence, and narrowest valid scope.
3. Append one JSON object per line using [evidence.schema.json](../design-system-bootstrap/references/evidence.schema.json).
4. Default scope to local context, then profile. Use global scope only for explicit global feedback, and keep it unpromoted.
5. Store profile evidence at `profiles/{profile}/memory/preferences.jsonl`; use root memory only for genuinely profile-neutral evidence.
6. Report context, choices, signals, reason, confidence, scope, evidence ID, and destination.

Do not infer preference from silence, code frequency, or an unreviewed screenshot. Preserve contradictions. Do not run the pattern-mining mode for one observation unless repeated evidence already exists.
