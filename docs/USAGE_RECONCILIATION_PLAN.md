# Prove attractiveness plan — estimate vs actual usage

Board home: [`BOARD.md`](./BOARD.md). Parent epic: **[#61 F2 — Prove at org scale](https://github.com/JordyNicholas/TokenForge/issues/61)**.  
Anchor story today: **[#27 Live usage metrics / billing sync](https://github.com/JordyNicholas/TokenForge/issues/27)** (thin demo/file import shipped).

This plan turns the **estimate ↔ bill gap** into incremental board work that raises adoption value without breaking provider independence or honesty constraints.

## Why this increases attractiveness

Buyers already understand Detect → Fix. They hesitate when Prove stops at assumptions. Closing (or narrowing) “projected $ vs billed $” is what makes TokenForge look like **AI Coding FinOps**, not only hygiene tooling.

| Buyer | Attractiveness outcome |
| --- | --- |
| Eng Manager / FinOps | Can reconcile a period: estimated reduction vs actual billed change |
| Platform / DevEx | Can run a pilot with baseline → apply → compare without a consulting spreadsheet |
| Developer | Unchanged Detect UX; their Fix still feeds the same Prove contract |

## Non-goals (do not pitch as covered)

- Intercepting any vendor Chat/Agent private context pipeline
- Metering “reasoning vs writing” tokens inside the model
- Claiming 100% of an invoice delta was caused by TokenForge without cohort controls
- Hard-wiring `risk-core` or the dashboard core to one vendor billing API

## Current baseline (already on the board)

| Piece | Status | Issue |
| --- | --- | --- |
| Assumptions → $ projection | Shipped | #17 |
| Before/after **scan** compare (local snapshots) | Shipped | dashboard After-Fix compare |
| Demo / file **usage import** shape (`UsageMetrics`) | Thin slice shipped | #27 |
| Live vendor usage/billing sync | **Remaining** | #27 under #61 |
| Remote org policy apply APIs | **Remaining** | #28 under #61 |

Shared contract to extend (do not fork): `UsageMetrics` in `@tokenforge/risk-core`
(re-exported from `dashboard/src/domain/usage.ts`) → period, team, credits, estimatedUsd,
providerLabel, source (`demo` \| `import` \| `sync`). Example:
[`docs/schemas/examples/usage-metrics.v0.json`](./schemas/examples/usage-metrics.v0.json).

## Architecture (ports & adapters)

```text
Vendor export / API  →  Usage adapter (per provider)  →  UsageMetrics JSON
Scan + Assumptions   →  Estimated reduction ($)
Prove variance view  →  Estimated vs Actual vs Gap  (+ frozen assumptions)
Apply marker         →  Attribution window for cohorts
```

- **Kernel / risk-core:** stays agnostic (no billing SDKs); owns the `UsageMetrics` JSON shape + guards.
- **Usage adapters:** CLI `UsageProvider` port (`cli/src/usage`) — same pattern as Fix adapters. #89 ships fixture/file; #90+ add live vendors.
- **Dashboard:** reads canonical usage + estimate; never owns vendor auth.

---

## Action plan — three waves

Waves are ordered for **attractiveness first**: each wave is demoable and shippable. Stories are **filed as sub-issues of epic #61** (reopened). Implement with `TF#<n>-slug` and `Closes #<n>` per story; do not close #61 until children are done.

### Wave A — Manual reconciliation (reduce the gap fast)

**Goal:** A FinOps user can import a real export, freeze a baseline, and see estimate vs imported actual without live APIs.

| Issue | Title | Extends | Attractiveness |
| --- | --- | --- | --- |
| #85 | Prove: usage CSV/JSON import UX (FinOps export → `UsageMetrics`) | #27 | Real bills enter Prove without engineering help |
| #86 | Prove: baseline + after-Fix period compare (usage + scan) | #27 | Three KPIs: estimated $, actual delta, variance |
| #87 | Prove: freeze Assumptions snapshot with a compare run | #17 / #27 | Estimates stay auditable when knobs change later |
| #88 | Docs + demo: one-team pilot runbook (baseline → apply → import bill) | #23 / #61 | Sales/pilot path that is honest and repeatable |

**Exit criteria:** Demo with a real-shaped export (sanitized fixture) shows variance; pitch can say “import your bill, compare to estimate” without claiming live sync. Repeatable script: [`PILOT_RUNBOOK.md`](./PILOT_RUNBOOK.md).

### Wave B — Live sync + variance product (mostly cover the gap)

**Goal:** Org-approved credentials pull usage on a schedule into the same contract; Prove shows continuous estimate vs actual.

| Issue | Title | Extends | Attractiveness |
| --- | --- | --- | --- |
| #89 | Prove port: `UsageProvider` interface + fixture adapter | #27 | Clean hexagon boundary for billing |
| #90 | CLI/Prove: first enterprise usage adapter (Copilot or org default) | #27 | First live provider path |
| #91 | CLI/Prove: Cursor usage adapter | #27 | Multi-provider story for Platform |
| #92 | CLI/Prove: Claude / Codex usage adapter (as APIs allow) | #27 | Avoid single-vendor lock-in in Prove |
| #93 | Prove: variance board (BU + team) + period picker | #27 / #18 | Manager-facing “books” view |
| #94 | Prove: scheduled / on-demand usage sync | #27 | Not a one-off file drop |

**Exit criteria:** At least **one** live adapter + variance board in a pilot org; file/demo import remains as fallback.

Keep #27 open until Wave B’s first live adapter + variance board land; split further adapters as separate stories so the epic does not block on every vendor.

### Wave C — Attribution & calibration (make the number believable)

**Goal:** Narrow “was that TokenForge?” noise so adoption survives finance review.

| Issue | Title | Extends | Attractiveness |
| --- | --- | --- | --- |
| #95 | CLI: apply/org-pack writes Prove change marker | #28 / #27 | Clear before/after window |
| #96 | Prove: cohort compare (Fix-on vs control) | #61 | Stronger causal story |
| #97 | Prove: auto-suggest `realizedWasteShare` from variance history | #17 / #27 | Estimates improve from bills |
| #98 | Pitch/FAQ: estimate vs actual honesty + pilot KPI card | #24 / #49 | Attractiveness without overclaim |

**Exit criteria:** Pilot report can show estimated vs actual with cohort note and calibrated assumptions.

### Parallel attractiveness (F2, not billing)

Keep shipping #28 remaining work beside usage — org-scale Fix increases value of Prove:

| Issue | Title | Extends | Attractiveness |
| --- | --- | --- | --- |
| #99 | Remote org content-exclusion / policy apply API (per provider) | #28 | Platform rollout beyond local files |
| #100 | Org pilot pack: scan → apply → prove variance (single path) | #28 / #27 | Lowest-friction adoption wedge |

F3 (#25 / #26 full assistants) stays **do not pitch first** per [`BOARD.md`](./BOARD.md).

---

## Build order (board)

Update when stories are filed. Intended sequence under **#61**:

```text
F1 (#60) complete
    ↓
Wave A (#85–#88)     ← done
    ↓
Wave B (#89–#94)     ← done (live adapters + variance + sync)
    ↓
Wave C attribution / calibration (#95–#98)  ← next
    ↓
#28 remote org apply (#99/#100) — can overlap Wave C
```

Do **not** wait on Wave C to sell Wave A/B: each wave is a buyer-visible increment.

## Acceptance language (reuse on issues)

For usage/variance stories, prefer:

- **Given** a period-scoped `UsageMetrics` document and a scan report with frozen assumptions  
- **When** Prove loads baseline and after windows  
- **Then** it shows estimated reduction, actual billed change, and variance by BU/team  
- **And** copy states this is billed usage compare — not agent pipeline metering  

## Filing checklist

Stories **#85–#100** are filed as sub-issues of epic **#61** (reopened). Repo automation expects **one issue per PR** (`TF#<n>-slug`, `Closes #<n>`).

1. Pick the next open Wave C issue (#95 first), or Parallel (#100) if overlapping.  
2. Branch `TF#<n>-slug`; PR body `Closes #<n>` (do **not** `Closes #61` until children are done).  
3. Keep labels `phase:future`; board column To-Do → In Progress via the PR workflow.  
4. Implement in dependency order; small commits.

## Honesty sound bite

> TokenForge finds and removes billable context waste, then reconciles **estimated** savings with **imported or synced** vendor usage for a period. We do not tap the agent’s private pipeline; we close the FinOps loop managers actually buy.
