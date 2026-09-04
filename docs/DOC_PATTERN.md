# Documentation pattern — TokenForge

**Status:** Locked  
**Scope:** How every TokenForge doc is structured, named, and placed.  
**Audience:** Collaborators and agents writing or moving docs.

---

## Principles

1. **One concern per doc** — a runbook is not a design spec; a pitch FAQ is not a board map.
2. **Folder = topic** — if you cannot name the folder from the doc’s job, the doc is in the wrong place.
3. **Index, don’t bury** — `docs/README.md` is the entry point; each folder has its own `README.md`.
4. **Honesty up front** — what we do *not* do (pipeline interception, universal 30%, live billing APIs) belongs in product and runbook docs, not footnotes.
5. **Code is truth** — when docs and code disagree, fix the doc or mark the gap explicitly under **Implementation status**.

---

## Folder map

| Folder | Holds | Does not hold |
| --- | --- | --- |
| [`product/`](./product/) | Category, buyer, positioning, pitch FAQ | CLI flags, schema fields |
| [`design/`](./design/) | Architecture, contracts narrative, audits, phased plans | Step-by-step demo scripts |
| [`delivery/`](./delivery/) | Board map, PR ↔ issue workflow | Product pitch |
| [`adapters/`](./adapters/) | Extension, MCP, enricher setup — one surface each | risk-core scoring rules |
| [`runbooks/`](./runbooks/) | Operator scripts (demo, pilot, monthly Prove) | Design rationale |
| [`testing/`](./testing/) | Manual E2E verification (often non-deterministic LLM) | Unit-test catalog |
| [`pitch/`](./pitch/) | Deck assets + live Q&A prep | Architecture |
| [`schemas/`](./schemas/) | JSON Schema + example documents (code references these paths) | Prose design |

Repo root [`AGENTS.md`](../AGENTS.md) stays the **agent onboarding** slice (read-first list + delivery rules).  
Repo root [`README.md`](../README.md) stays the **developer quick start** (commands + links).

---

## Doc header (required on every `.md` under `docs/`)

Every document opens with this block (adjust values; omit lines only when truly N/A):

```markdown
# Title — TokenForge

**Status:** Locked | Draft | Planning | Runbook | Audit  
**Scope:** One sentence — what this doc covers.  
**Audience:** Collaborators | Developers | FinOps | Judges | Platform  
**Companion:** [Related doc](./path.md) · [Other](../folder/doc.md)

---
```

| Field | Meaning |
| --- | --- |
| **Status** | `Locked` = narrative/design agreed; change only with intent. `Runbook` = operator steps. `Audit` = point-in-time findings. |
| **Scope** | The single question this doc answers. |
| **Audience** | Who should read it first. |
| **Companion** | 1–3 links; not a duplicate of the folder README. |

Body sections use `##` for major beats; tables for comparisons; code blocks for commands.

---

## Naming

| Kind | Pattern | Example |
| --- | --- | --- |
| Product / design | `SCREAMING_SNAKE.md` | `CONCEPT_BRIEF.md`, `SOLUTION_DESIGN.md` |
| Runbooks | `*_RUNBOOK.md` or task name | `DEMO_RUNBOOK.md`, `prove-monthly.md` |
| E2E tests | `E2E_*_TEST.md` | `E2E_HYBRID_SCAN_TEST.md` |
| Folder index | `README.md` | Always `README.md` inside each folder |

Do not add new top-level files under `docs/` except `README.md`, `DOC_PATTERN.md`, and `schemas/`.  
New prose docs go in the matching subfolder.

---

## Cross-linking rules

- From repo root: `docs/<folder>/<FILE>.md`
- Between folders: relative paths (`../design/SOLUTION_DESIGN.md`)
- Schema paths stay **`docs/schemas/...`** — tests and `risk-core` constants embed these strings; do not rename the folder without a coordinated code change.
- When moving a doc, grep the repo for the old path and update references in the same PR.

---

## Implementation status (when docs lag code)

Add a short subsection when shipped behavior differs from the narrative:

```markdown
## Implementation status

| Doc claim | Code today |
| --- | --- |
| Session stats on dashboard | **Shipped** — extension writes `session-stats.json`; dashboard loads via Source or `?session=` boot |
| Standard Director pilot | **Shipped** — [`STANDARD_PILOT_KIT.md`](./runbooks/STANDARD_PILOT_KIT.md) + `honor-smoke` + enriched `prove-report` |
| Platform monthly cadence | **Shipped** — [`MONTHLY_CADENCE.md`](./runbooks/MONTHLY_CADENCE.md) |
| F24 adoption & evidence | **Shipped** — [`F24_REAL_WORLD_ADOPTION.md`](./delivery/F24_REAL_WORLD_ADOPTION.md) Waves A–D |
```

Remove rows when the gap closes.
