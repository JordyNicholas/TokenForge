# JSON contracts

**Status:** Locked  
**Scope:** Formal schemas and example payloads for Token Risk, usage, and session reports.  
**Audience:** Implementers of CLI, extension, and dashboard loaders.  
**Companion:** [`../design/SOLUTION_DESIGN.md`](../design/SOLUTION_DESIGN.md#json-contract) · [`../design/HYBRID_SCAN_DESIGN.md`](../design/HYBRID_SCAN_DESIGN.md)

## Layout

| Path | Purpose |
| --- | --- |
| `risk-event.schema.json` | Live Token Risk report schema (v5 `$id`) |
| `risk-event.v0.schema.json` … `v4` | Frozen predecessors (strict superset chain) |
| `session-stats.schema.json` | Extension session ledger export |
| `examples/` | Valid example documents for tests and demos |

**Important:** `packages/risk-core` and tests embed paths like `docs/schemas/risk-event.schema.json`. Do not rename this folder without a coordinated code update.

## Versioning

Each version is a **strict superset** of the previous. Delta history is recorded in [`../design/HYBRID_SCAN_DESIGN.md`](../design/HYBRID_SCAN_DESIGN.md) and [`../design/HEURISTICS_AUDIT.md`](../design/HEURISTICS_AUDIT.md).
