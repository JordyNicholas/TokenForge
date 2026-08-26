# Demo Runbook — TokenForge (≤5 min)

Step-by-step script for presenting the **Detect → Fix → Prove** loop live: noisy tabs →
extension → CLI → dashboard, closing on the Auto Memory sound bite. Written so a new
teammate can run the whole demo from this doc alone, with no other context.

Positioning background: [`PITCH_FAQ.md`](./PITCH_FAQ.md) · [`CONCEPT_BRIEF.md`](./CONCEPT_BRIEF.md).

One-team **pilot** (baseline usage → apply → import a later bill, estimate vs actual):
[`PILOT_RUNBOOK.md`](./PILOT_RUNBOOK.md). That path is for FinOps / sales, not the ≤5-min
hackathon clock.

> **Honesty note:** the VS Code extension ships **Context Guard** — status bar
> at-risk readout, TokenForge sidebar (Pending / Kept / Filtered + Risk pulse),
> Keep/Filter actions, and auto-export of `.tokenforge/last-scan.json`. It
> recommends hygiene; it does **not** intercept any agent pipeline. Likewise, the
> CLI's raw savings ratio on the demo fixture is **~99.8%**, not the pitch
> **~30%** — the 30% only appears after the dashboard Assumptions step below.
> See the caveats inline in each beat.

## Pre-demo setup (do this before the clock starts)

1. `npm install` at repo root.
2. Build the extension and launch it:
   ```bash
   npm run tokenforge:extension
   ```
   Open the repo root in VS Code, press **F5** (**Run Extension**, per
   `.vscode/launch.json`) to open the Extension Development Host window.
3. In that Extension Development Host window, open these fixture files as tabs.
   High-risk filetypes (lockfile / generated) flag **immediately**; source/config
   tabs need idle time (**10 minutes** when focused, **5 minutes** in the
   background — panel shows an **Approaching idle** countdown after 1m). For a
   clean stage beat, leave the lockfile + bundle open:
   - `fixtures/noisy-app/package-lock.json`
   - `fixtures/noisy-app/dist/bundle.js`
   - `fixtures/noisy-app/config/app-settings.json`
   - `fixtures/noisy-app/config/legacy-export.xml`
4. Start the dashboard ahead of time in a spare terminal so it's already loaded when
   you switch to it:
   ```bash
   npm run tokenforge:dashboard
   ```
   Opens at `http://localhost:5173`, auto-loading `dashboard/public/demo-seed.json`.
5. Nothing to clean up between rehearsals — `.tokenforge/` output is gitignored.

## Live script (≤5 min)

### Beat 1 — Noisy tabs → extension (~60–75s)

- Switch to the pre-staged Extension Development Host window.
- Open the **TokenForge** activity-bar icon: **At-risk tabs** + **Risk pulse**.
- Point at the status bar (`TokenForge: … at risk`) and the Pending section
  (lockfile / bundle should already be flagged).
- Click **Filter** on the lockfile — status bar drops, Risk pulse shows
  before → after → saved, and `.tokenforge/last-scan.json` updates (use
  **Reveal last-scan.json** if you want to show the file).
- Say: *"Detect is heuristic on open tabs — Keep or Filter is your call. We don't
  intercept the agent pipeline; we export the same Token Risk JSON the dashboard
  can load."*

### Beat 2 — CLI scan → fix (~120–150s)

Run from repo root:

```bash
npm run tokenforge:scan -- --json
```

- Show the printed findings table and the JSON totals — `beforeTokens` will be
  roughly **~455k–462k** (exact bytes drift slightly locally; the pinned reference
  is [`fixtures/expected/noisy-app-totals.json`](../fixtures/expected/noisy-app-totals.json)).

```bash
npm run tokenforge:apply -- --dry-run
```

- Show it writing the Copilot pack into
  `fixtures/noisy-app/.github/copilot-instructions.md` (managed
  `<!-- tokenforge:begin/end -->` section + exclusion candidates) and the
  `afterTokens` / `savedTokens` / `savedPercent` totals (~99.8%).
- **Say explicitly:** *"That ~99.8% is the raw exclusion ratio on this noisy fixture —
  not the pitch number. Watch what the dashboard does with it next."*

### Beat 3 — Dashboard / Prove (~90–120s)

- Switch to the already-running dashboard tab (**Overview** / Global scope): call out the KPI
  row, the `SavingsChart`, architecture mix, and the **Imported usage** badge (demo credits/$ —
  not a live billing API).
- Click a team (e.g. `payments-platform`) in the sidebar or chart — show **team-scoped** KPIs
  and repo isolation, then return to **Global (BU)**.
- Navigate to **Assumptions** (`/assumptions` or board path): show rate / team size / msgs-per-day /
  model-mix inputs recomputing $ saved live.
- Set **waste applicability** (`realizedWasteShare`) to **~0.3** and call out: *"This
  is what turns the ~99.8% raw ratio into our pitch's ~30% scenario number — it's an
  editable assumption, not a vendor billing API."*
- Optional stretch: note **Adjacent levers** (compaction / routing advisories) only if asked —
  do not lead with them. Optional: load a fresh `scan-report.json` via the file/URL loader.
- If a FinOps judge asks “vs the invoice?”: one sentence — import a period export, then
  [`PILOT_RUNBOOK.md`](./PILOT_RUNBOOK.md) (billed usage compare, not live sync).

### Close — Auto Memory sound bite (~15–20s)

> *"They help the agent remember. We help the organization stop bleeding tokens."*

Full comparison table: [`PITCH_FAQ.md` — vs Claude Auto Memory](./PITCH_FAQ.md#vs-claude-auto-memory).
Competition map: [`PITCH_FAQ.md` — Competitive landscape](./PITCH_FAQ.md#competitive-landscape).

## Timing checklist

| Beat | Target |
| --- | --- |
| Extension toast | 60–75s |
| CLI scan + apply | 120–150s |
| Dashboard Global → team → Assumptions | 90–120s |
| Auto Memory close | 15–20s |
| **Total** | **≤5 min** |

## Troubleshooting / reset

- **Toast shows no at-risk tabs** — the fixture files weren't opened 15+ minutes
  ahead of time. Fallback: narrate over a screenshot/recording of a prior run instead
  of live.
- **Want a clean before/after for another rehearsal** — delete
  `fixtures/noisy-app/.tokenforge/` and any generated `fixtures/noisy-app/.github/`
  adapter files; both are untracked/gitignored, safe to remove.
- **Exact numbers don't match this doc** — expected; byte counts drift slightly
  locally. Present figures as "~455k / ~99.8%" ballpark. The pinned reference for
  "official" numbers is `fixtures/expected/noisy-app-totals.json`.
