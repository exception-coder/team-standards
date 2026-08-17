---
name: design-pattern-miner
description: "Analyze repeated Preference Evidence, candidates, and approved/rejected references to strengthen, weaken, contradict, deprecate, or propose promotion of design patterns. Use when evidence repeats, users ask what preferences have emerged, or a profile's candidate rules need review."
---

# Design Pattern Miner

Mine governed candidates from repeated evidence. Do not auto-promote major rules to `CORE`.

## Required workflow

1. Resolve the registry and target profile through [resolver.md](../design-system-bootstrap/references/resolver.md).
2. Read relevant preferences, candidates, decisions, and approved/rejected reference metadata.
3. Group evidence by observable signal, context, direction, and scope; keep contradictions visible.
4. Produce only: `New Candidate`, `Candidate Strengthened`, `Candidate Weakened`, `Contradiction`, `Potential Deprecation`, or `Potential Promotion`.
5. Record evidence IDs, counter-evidence, contexts, confidence, maturity, and next validation.
6. Require repeated profile validation before proposing `ESTABLISHED` and cross-profile validation before proposing global `CORE`.
7. Require human confirmation for major promotion, deprecation, or scope expansion.

Maturity moves `EXPERIMENTAL → CANDIDATE → ESTABLISHED → CORE`; retirement moves `CORE → ESTABLISHED → DEPRECATED → REMOVED`.

Frequency supports but does not prove a rule. Do not erase rejected evidence, treat token frequency as approval, or rewrite implementations.
