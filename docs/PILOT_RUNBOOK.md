# One-team pilot runbook — baseline → apply → import bill

Sales / FinOps path for **Wave A** (issues #85–#88). One repository (one Prove team), a
baseline scan plus imported billed usage, `tokenforge apply`, then a later-period
export so Prove can show **estimated reduction**, **actual billed change**, and
**variance**.

This is a **manual reconciliation** demo. It is **not** live vendor billing sync and
**not** metering of any agent pipeline.

Hackathon ≤5-min script (noisy tabs → CLI → ~30% scenario): [`DEMO_RUNBOOK.md`](./DEMO_RUNBOOK.md).  
Plan: [`USAGE_RECONCILIATION_PLAN.md`](./USAGE_RECONCILIATION_PLAN.md).

## Honesty (say this out loud)

> TokenForge finds and removes billable context waste, then reconciles **estimated**
> savings with **imported** vendor usage for a period. We do not tap the agent’s
> private pipeline. Invoice delta is **not** 100% causal without a control cohort
> (Wave C / #96).

Copy on the dashboard matches: **billed usage compare** — not agent pipeline metering.

## What you need

| Piece | Use |
| --- | --- |
| Repo | `fixtures/noisy-app` (team id `payments-platform` in the demo seed) |
| Baseline bill | FinOps CSV/JSON → `UsageMetrics` ([#85](https://github.com/JordyNicholas/TokenForge/issues/85)) |
| After bill | Second period export, same teams/provider when possible ([#86](https://github.com/JordyNicholas/TokenForge/issues/86)) |
| Assumptions freeze | Snapshot when the after-period compare starts ([#87](https://github.com/JordyNicholas/TokenForge/issues/87)) |

Sanitized fixtures (OK for a pilot dry-run):

- Baseline-shaped: [`dashboard/public/sample-usage.csv`](../dashboard/public/sample-usage.csv)
- After-period (lower spend): [`dashboard/public/sample-usage-after.csv`](../dashboard/public/sample-usage-after.csv)

JSON may be a full `UsageMetrics` document, nested `{ "usage": { … } }`, or a teams array.
CSV needs team / credits / $ columns (aliases: `org`/`repo`, `tokens`/`credits`, `cost`/`usd`).
Optional `# period:` and `# providerLabel:` comment lines.

## Fast path (sanitized fixture, ~3 min)

Use when you only need to **show variance**, not a live apply.

1. `npm install` at repo root.
2. Start Prove: `npm run tokenforge:dashboard` → `http://localhost:5173`.
3. Open Global Overview, then scope **payments-platform** (one team).
4. Confirm **Imported billed usage** (demo seed / `#85`).
5. Data source → **Import after-period usage…** and choose `dashboard/public/sample-usage-after.csv`  
   **or** boot  
   `http://localhost:5173/board/combined/team/payments-platform?afterUsage=/sample-usage-after.csv`
6. Call out the three KPIs on **Overview** or open **Variance** in the sidebar for the full BU/team board with period picker.
7. Call out **Assumptions frozen** (rate, team size, msgs/day, waste share, model mix). Edit
   Assumptions (e.g. Pitch ~30%) and show that estimated $ **does not rewrite** until
   **Re-freeze Assumptions**.
8. Note period/provider mismatch warnings if the demo baseline label differs from the CSV
   (`multi-provider (demo import)` vs Copilot) — prefer matching labels on a real export.

## Full path (one team: scan → apply → import bill)

Clock this as a **pilot**, not the ≤5-min hackathon pitch.

### 0. Setup

```bash
npm install
npm run tokenforge:dashboard   # leave running
```

Optional Detect beat: Context Guard on noisy tabs — same as [`DEMO_RUNBOOK.md`](./DEMO_RUNBOOK.md).
Skip if the room is FinOps-only.

### 1. Baseline scan (Detect)

From repo root:

```bash
npm run tokenforge:scan -- fixtures/noisy-app --team payments-platform --json
```

- Point at findings + totals. Fixture exclusion ratio is **~99.8%** raw — **not** the
  pitch ~30% (that is Assumptions `realizedWasteShare`).
- Report path: `fixtures/noisy-app/.tokenforge/scan-report.json`.

Stage into Prove (copies the report and opens the board):

```bash
npm run tokenforge:prove -- scan fixtures/noisy-app --team payments-platform
```

Or Data source → **Load JSON file** on that `scan-report.json`. Then isolate
**Team · payments-platform**.

### 2. Baseline billed usage (import)

Data source → **Import baseline usage CSV/JSON…**

- Real pilot: the team’s **pre-Fix** period export from FinOps (same `UsageMetrics` shape).
- Dry-run: `sample-usage.csv` (period `2026-08`, Copilot-labelled, `payments-platform` row).

Say: *"This is imported billed usage for the period — not a live Copilot/Cursor/Claude API."*

### 3. Apply Fix (local adapter pack)

```bash
npm run tokenforge:apply -- fixtures/noisy-app --dry-run
```

Then apply for real if the pilot allows writing files (Copilot adapter by default;
`tokenforge org-pack` is local aggregation, not a vendor org API).

- Show lean instructions + exclusion candidates under `fixtures/noisy-app/.github/`
  (or the selected adapter’s files).
- Apply / org-pack also write a Prove **change marker** under
  `.tokenforge/prove-change-latest.json` (plus append-only `prove-changes.jsonl`) —
  timestamp, provider, pack id — to bound before/after billing windows. Cohort
  compare still lands in Wave C (#96).
- Optional: Data source → **Load after-Fix report…** with a second scan JSON for the
  **scan** before/after card (token snapshot). Usage variance still needs the **after bill**.

### 4. After-period bill (import)

Wait for the next billing window **or** use the sanitized after fixture:

Data source → **Import after-period usage…** → `sample-usage-after.csv` (period `2026-09`).

Assumptions **freeze** on that compare so later knob edits cannot silently change history.

### 5. Prove the three numbers

On Overview (Global **or** `payments-platform`):

| KPI | Meaning |
| --- | --- |
| Estimated reduction | Baseline scan × **frozen** Assumptions |
| Actual billed change | Baseline billed $ − after billed $ (positive = bill went down) |
| Variance | Actual − estimated |

Team scope uses that team’s usage row; Global uses BU totals.

If periods or `providerLabel` differ, Prove warns — still billed-usage compare, not a
claim that TokenForge caused 100% of the invoice delta.

## Export shape (hand to FinOps)

Canonical JSON matches `UsageMetrics` in `dashboard/src/domain/usage.ts`:

`source`, `providerLabel`, `period`, `teams[]` (`team`, `creditsUsed`, `estimatedUsd`), `totals`.

Keep `source: "import"` for real files. Do not invent a second schema.

## Live usage sync (Wave B / #94)

On-demand or scheduled pull into `.tokenforge/` (same `UsageMetrics` contract; `source: "sync"`):

```bash
# One-shot sync (writes .tokenforge/usage-YYYY-MM.json + usage-latest.json)
npm run tokenforge -- usage-sync --usage-provider copilot --org YOUR_ORG --period 2026-08

# Optional repo-local config (see docs/schemas/examples/usage-sync.v0.json)
# .tokenforge/usage-sync.json → { "provider": "copilot", "org": "YOUR_ORG" }
npm run tokenforge -- usage-sync

# Stage + open Prove variance board
npm run tokenforge:usage-sync -- --usage-provider copilot --org YOUR_ORG --period 2026-08
TOKENFORGE_USAGE_SLOT=baseline npm run tokenforge:usage-sync -- --usage-provider copilot --org YOUR_ORG --period 2026-08
```

Cron example (monthly, Copilot org):

```cron
0 6 2 * * cd /path/to/repo && npm run tokenforge -- usage-sync --usage-provider copilot --org YOUR_ORG >> /var/log/tokenforge-usage-sync.log 2>&1
```

Providers: `copilot` (`GITHUB_TOKEN`), `cursor` (`CURSOR_API_KEY`, `--org org_abc123`), `claude` (`ANTHROPIC_ADMIN_API_KEY`). File/demo import remains the fallback when live APIs are unavailable.

## Out of scope (do not demo as done)

- Cohort compare / auto-calibrated `realizedWasteShare` (Wave C remaining: #96–#98)
- Remote org policy push (#99)

## Reset

- Data source → **Clear after-period usage** / **Reset to demo usage** / **Reset to demo seed**
- Delete untracked `fixtures/noisy-app/.tokenforge/` and generated adapter files between rehearsals
