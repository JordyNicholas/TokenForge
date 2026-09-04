# Standard pilot kit — Director Prove evidence

**Audience:** Directors / FinOps running a **credible** TokenForge pilot without a spreadsheet.  
**Companion:** [`PILOT_RUNBOOK.md`](./PILOT_RUNBOOK.md) (step-by-step) · [`EM_TEAM_PROVE.md`](./EM_TEAM_PROVE.md) (multi-team) · [`F24_REAL_WORLD_ADOPTION.md`](../delivery/F24_REAL_WORLD_ADOPTION.md) · [`USAGE_RECONCILIATION_PLAN.md`](../design/USAGE_RECONCILIATION_PLAN.md)

---

## What this kit delivers

A **standard pilot** produces local-first artifacts a Director can forward:

| Artifact | Command / location | Purpose |
| --- | --- | --- |
| Scan baseline | `tokenforge scan` → `.tokenforge/scan-report.json` | Estimated token waste |
| Fix marker | `tokenforge apply` / `pilot` → `.tokenforge/prove-change-latest.json` | Fix-on attribution window |
| Baseline bill | Import or `usage-sync` → `.tokenforge/usage-YYYY-MM.json` | Pre-Fix billed usage |
| After bill | Second period import/sync | Post-Fix billed usage |
| Assumptions freeze | Dashboard **Re-freeze Assumptions** on compare | Locks estimate $ for the period pair |
| Honor smoke | `tokenforge honor-smoke` → `.tokenforge/honor-smoke.json` | Host-honor checklist (Cursor Soft/Hard) |
| Prove report | `tokenforge prove-report` → `.tokenforge/prove-report.md` | Forwardable Markdown with trust + calibration |

This is **imported billed usage compare** — not live vendor pipeline metering.

---

## Honesty (say this out loud)

> TokenForge finds and removes billable context waste, then reconciles **estimated**
> savings with **imported** vendor usage for a period. We do **not** tap any agent's
> private context pipeline. Invoice delta is **not** 100% causal without a **control
> cohort**. Host-honor smoke observes whether Cursor honors ignore files — it is **not**
> metering of what the model actually read.

Full reconciliation honesty: [`PILOT_RUNBOOK.md` — Honesty](./PILOT_RUNBOOK.md#honesty-say-this-out-loud).

---

## Prerequisites

| Requirement | Why |
| --- | --- |
| **Control team** (no Fix apply marker) | Fix-on vs control cohort compare; `strong` trust needs both |
| **Two billing periods** | Baseline (pre-Fix window) + after (post-Fix window) |
| **Same provider label** when possible | Reduces period/provider mismatch warnings on Variance |
| **Assumptions freeze** before sharing | Prevents silent rewrite of estimated $ after knob edits |

Optional but recommended: run **honor-smoke** after Cursor Shield / apply so developers have a host-honor checklist on disk.

---

## Standard pilot checklist

Use this as a Director run sheet. Tick each box before calling the pilot complete.

### 0 — Scope

- [ ] Pick **one Fix-on team** (repo) and at least **one control team** (no apply marker).
- [ ] Confirm billing periods: baseline month **before** Fix marker timestamp; after month **after**.
- [ ] Agree provider (Copilot / Cursor / Claude) and export path (CSV/JSON or `usage-sync`).

### 1 — Baseline (period 1)

```bash
npm run tokenforge -- scan <repo> --team <fix-on-team>
npm run tokenforge -- usage-sync <repo> --usage-provider <provider> --org <org> --period <YYYY-MM>
# or import baseline CSV/JSON in dashboard Data source
```

- [ ] `.tokenforge/scan-report.json` exists.
- [ ] Baseline usage loaded (`.tokenforge/usage-<period>.json` or dashboard import).

### 2 — Fix (Fix-on team only)

```bash
npm run tokenforge -- apply <repo> --provider <provider>
# or: npm run tokenforge -- pilot <repo> --team <fix-on-team>
```

- [ ] `.tokenforge/prove-change-latest.json` exists with correct team label.
- [ ] Control team(s) did **not** receive apply.

### 3 — Host honor (Cursor pilots)

```bash
npm run tokenforge -- honor-smoke <repo>
```

- [ ] `.tokenforge/honor-smoke.json` written.
- [ ] Developer walked Soft (`.cursorindexingignore`) and Hard (`.cursorignore`) verification steps.
- [ ] Understood: observation of host behavior, **not** pipeline metering.

### 4 — After period (period 2)

```bash
npm run tokenforge -- usage-sync <repo> --usage-provider <provider> --org <org> --period <YYYY-MM>
# or import after-period CSV/JSON in dashboard
```

- [ ] After usage loaded for the same team(s) as baseline.
- [ ] Dashboard Variance: **Re-freeze Assumptions** when the after compare starts.
- [ ] Control cohort visible on cohort compare card (Fix-on vs control).

### 5 — Prove export

```bash
npm run tokenforge -- prove-report <repo>
```

- [ ] `.tokenforge/prove-report.md` includes scan savings, Fix marker, usage/variance (when artifacts exist), trust, and calibration band.
- [ ] Forward Markdown to FinOps; open dashboard for interactive Variance / cohort drill-down.

---

## Calibration bands (how to read Prove)

When estimate $ and billed Δ are both present, Prove assigns a **calibration band**:

| Band | Meaning |
| --- | --- |
| **strong** | Control cohort + strong cohort trust + estimated and actual movement align |
| **suggestive** | Some alignment or partial evidence — still not causation |
| **weak** | Fix-on only (no control) or movement misaligned |
| **insufficient** | Missing markers, usage, or estimate baseline |

Bands reduce spreadsheet guesswork; they do **not** claim TokenForge caused 100% of any invoice delta.

---

## Quick commands (copy block)

```bash
# Full wedge (scan + apply + handoff hint)
npm run tokenforge -- pilot fixtures/noisy-app --team payments-platform --prove

# Host-honor checklist (Cursor)
npm run tokenforge -- honor-smoke fixtures/noisy-app

# Director Markdown export
npm run tokenforge -- prove-report fixtures/noisy-app
```

Dry-run fixture path (no writes): [`PILOT_RUNBOOK.md` — Fast path](./PILOT_RUNBOOK.md#fast-path-sanitized-fixture-3-min).

---

## Out of scope

- Claiming realtime agent context metering
- 100% invoice causation without control cohort
- Hosted multi-tenant Prove backend

Reset between rehearsals: [`PILOT_RUNBOOK.md` — Reset](./PILOT_RUNBOOK.md#reset).
