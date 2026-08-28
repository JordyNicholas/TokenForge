# Demo script — 10 minutes (Sep 1–2)

Situational script for the hackathon final. Product runbook: [`docs/runbooks/DEMO_RUNBOOK.md`](../../docs/runbooks/DEMO_RUNBOOK.md) (≤5 min).

Presenter cues: [`PRESENTER_RUNBOOK.md`](./PRESENTER_RUNBOOK.md). Roles: [`TEAM_ASSIGNMENTS.md`](./TEAM_ASSIGNMENTS.md).

> **Honesty:** Context Guard does **not** intercept the agent pipeline. Raw CLI savings on `noisy-app` is **~99.8%**; pitch **~30%** comes from dashboard Assumptions only.

## Pre-demo setup

1. `npm install` at repo root; optional: `bash .presentation/hackathon-2026-09/prestage.sh`
2. `npm run tokenforge:extension` → F5 Extension Development Host
3. Pre-open tabs: `fixtures/noisy-app/package-lock.json`, `dist/bundle.js`, `config/app-settings.json`
4. `npm run tokenforge:dashboard`
5. Pre-load variance:  
   `http://localhost:5173/board/combined/team/payments-platform?afterUsage=/sample-usage-after.csv`
6. Hybrid backup: `dashboard/public/demo-hybrid-cursor-report.json` (refresh: `prestage.sh --hybrid-live`)
7. `agent login && agent status --format json`

## Run of show

| Time | Owner | Beat |
| --- | --- | --- |
| **0:00–2:15** | **A** | Slides 1–6: problem, competition, differentiation & uniqueness, buyer, core loop |
| **2:15–4:45** | **B** | Extension Detect → CLI scan → apply `--dry-run` |
| **4:45–7:00** | **C** | Dashboard → Assumptions ~30% → Variance (3 KPIs) |
| **7:00–8:30** | **D / B** | Hybrid: `cursor-cli:composer-2.5` on `instructions-app` → dashboard LLM boards |
| **8:30–9:30** | **A** | Slides: Honesty → Architecture → Takeaway |
| **9:30–10:00** | All | Buffer; pilot ask |

Hide slides during live demo (2:15–8:30).

### Beat B — Detect + Fix

Extension → Filter lockfile. Then:

```bash
npm run tokenforge:scan -- --json
npm run tokenforge:apply -- --dry-run
```

### Beat C — Prove + variance

Assumptions `realizedWasteShare ≈ 0.3`. Variance: estimated / actual / variance.

### Beat D — Hybrid AI

```bash
npm run tokenforge -- scan fixtures/instructions-app \
  --mode hybrid --llm cursor-cli:composer-2.5 --allow-external
```

**Fallback:** load `dashboard/public/demo-hybrid-cursor-report.json`.

## Hybrid validation log

| Run | Date | Wall-clock | Notes |
| --- | --- | --- | --- |
| | | | |

```bash
time npm run tokenforge -- scan fixtures/instructions-app \
  --mode hybrid --llm cursor-cli:composer-2.5 --allow-external --json
cp fixtures/instructions-app/.tokenforge/scan-report.json \
  dashboard/public/demo-hybrid-cursor-report.json
```

## Cut order (if over 10 min)

1. Drop team scope drill-down
2. Switch hybrid to pre-staged JSON
3. Shorten Architecture slide
4. Skip Roadmap slide

## Timing checklist

| Beat | Target |
| --- | --- |
| Slides open | 2:15 |
| Extension + CLI | 2:30 |
| Prove + variance | 2:15 |
| Hybrid AI | 1:30 |
| Close | 1:00 |
| Buffer | 0:30 |
| **Total** | **10:00** |
