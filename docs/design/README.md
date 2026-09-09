# Design documentation

**Status:** Locked  
**Scope:** Architecture, scoring design, audits, and phased Prove plans.  
**Audience:** Implementers and reviewers.  
**Companion:** [`../schemas/`](../schemas/) · [`../adapters/`](../adapters/)

| Doc | When to read |
| --- | --- |
| [SOLUTION_DESIGN.md](./SOLUTION_DESIGN.md) | Stack, ports & adapters, monorepo layout |
| [HYBRID_SCAN_DESIGN.md](./HYBRID_SCAN_DESIGN.md) | Optional LLM enrichment on bounded candidates |
| [HEURISTICS_AUDIT.md](./HEURISTICS_AUDIT.md) | Default scan rule gaps (fixture-backed) |
| [USAGE_RECONCILIATION_PLAN.md](./USAGE_RECONCILIATION_PLAN.md) | Estimate vs billed usage waves |
| [REASONING_PACK_DESIGN.md](./REASONING_PACK_DESIGN.md) | Persona + per-directory CoT/ToT routing in the managed section (F26 #329, proposed) |

JSON Schema files: [`../schemas/`](../schemas/) (paths referenced from `risk-core` tests).
