# Demo script — 10 minutes (Sep 1–2)

Situational script for the hackathon final. Product runbook: [`docs/runbooks/DEMO_RUNBOOK.md`](../../docs/runbooks/DEMO_RUNBOOK.md) (≤5 min).

Presenter cues: [`PRESENTER_RUNBOOK.md`](./PRESENTER_RUNBOOK.md). Roles: [`TEAM_ASSIGNMENTS.md`](./TEAM_ASSIGNMENTS.md).

> **Honesty:** Context Guard does **not** intercept the agent pipeline. Raw CLI savings on `noisy-app` is **~99.8%**; pitch **~30%** comes from dashboard Assumptions only.

> **Three presenters:** merge role **D into B** (see [`TEAM_ASSIGNMENTS.md`](./TEAM_ASSIGNMENTS.md)). Use **two dashboard tabs** — Tab 1 = Prove (`demo-seed` + variance); Tab 2 = Hybrid boards (backup URL or live JSON after scan).

## Pre-demo setup

1. `npm install` at repo root; optional: `bash .presentation/hackathon-2026-09/prestage.sh`
2. Reset fixtures (safe before each rehearsal):
   ```bash
   rm -rf fixtures/noisy-app/.tokenforge fixtures/noisy-app/.github/copilot-instructions.md \
     fixtures/noisy-app/.cursor/rules/tokenforge.mdc fixtures/noisy-app/.cursor/tokenforge-exclusion-candidates.yml
   rm -rf fixtures/instructions-app/.tokenforge
   ```
3. `npm run tokenforge:extension` → F5 Extension Development Host
4. Pre-open tabs: `fixtures/noisy-app/package-lock.json`, `dist/bundle.js`, `config/app-settings.json`
5. `npm run tokenforge:dashboard`
6. **Tab 1 — Prove:** pre-load variance URL:
   `http://localhost:5173/board/combined/team/payments-platform?afterUsage=/sample-usage-after.csv`
7. **Tab 2 — Hybrid backup:**  
   `http://localhost:5173/?src=/demo-hybrid-cursor-report.json`
8. Refresh hybrid backup (optional): `prestage.sh --hybrid-live` → copies live report to `dashboard/public/demo-hybrid-cursor-report.json`
9. `agent login && agent status --format json`

## Run of show

| Time | Owner | Beat |
| --- | --- | --- |
| **0:00–2:15** | **A** | Slides 1–6: problem, competition, differentiation & uniqueness, buyer, core loop |
| **2:15–4:30** | **B** | Extension Detect → CLI scan → **live apply** (policy pack) |
| **4:30–6:45** | **C** | Dashboard Tab 1 → Assumptions ~30% → Variance (3 KPIs) |
| **6:45–8:15** | **B** | Hybrid: `cursor-cli:composer-2.5` on `instructions-app` → Dashboard Tab 2 (F6 boards) |
| **8:30–9:30** | **A** | Slides: Honesty → Architecture → Takeaway |
| **9:30–10:00** | All | Buffer; pilot ask |

Hide slides during live demo (2:15–8:30).

### Beat B — Detect + Fix (live)

Extension → Filter lockfile. Then:

```bash
npm run tokenforge:scan -- --json
npm run tokenforge:apply -- --provider cursor
```

**Say:** scan is heuristic baseline; apply writes the **Cursor policy pack** (`.cursor/rules/tokenforge.mdc` + exclusion candidates) — merge-section safe, git-reversible.

**If nervous about writes:** use `--dry-run` first, then drop `--dry-run` in rehearsal #2. Reset fixtures between runs (see Pre-demo setup).

### Beat C — Prove + variance (Tab 1)

1. Overview KPIs + **Hybrid complementarity** / **Instruction stack** cards (F6 — already on `demo-seed` for `payments-platform`).
2. Assumptions → `realizedWasteShare ≈ 0.3`.
3. Variance board: estimated / actual / variance (3 KPIs).

### Beat D — Hybrid AI (Tab 2)

```bash
npm run tokenforge -- scan fixtures/instructions-app \
  --mode hybrid --llm cursor-cli:composer-2.5 --allow-external --json
cp fixtures/instructions-app/.tokenforge/scan-report.json \
  dashboard/public/live-hybrid-report.json
```

Refresh Tab 2: `http://localhost:5173/?src=/live-hybrid-report.json`

**Show on Overview:** `LlmAnalysisOverview`, **Hybrid complementarity** (`hybridDelta`), **Instruction stack** (`instructionBudget`). Optional: `apply fixtures/instructions-app --provider cursor --dry-run` for synthesized hygiene.

**Fallback:** Tab 2 backup URL (`demo-hybrid-cursor-report.json`) — say *"pre-staged from yesterday's run"* if live scan exceeds ~90s.

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
| Extension + CLI scan + apply | 2:15 |
| Prove + variance | 2:15 |
| Hybrid AI + dashboard boards | 1:30 |
| Close | 1:00 |
| Buffer | 0:30 |
| **Total** | **10:00** |
