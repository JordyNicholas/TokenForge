# Presenter runbook — Hackathon final (Sep 1–2)

**10 minutes** present + demo, **5 minutes** Q&A. Mirrors deck slide 7 (do not show slide 7 to judges).

Fill roles in [`TEAM_ASSIGNMENTS.md`](./TEAM_ASSIGNMENTS.md). Live script: [`DEMO-10min.md`](./DEMO-10min.md).

---

## Run of show

| Beat | Time | Owner | Slides / action |
| --- | --- | --- | --- |
| Open | 0:00–2:15 | **A** | Slides **1–6** (see cues below) |
| Detect + Fix | 2:15–4:30 | **B** | Extension → scan → **live apply** (`--provider cursor`) |
| Prove + variance | 4:30–6:45 | **C** | Dashboard **Tab 1** → Assumptions ~30% → Variance 3 KPIs |
| Hybrid AI | 6:45–8:15 | **B** | `cursor-cli:composer-2.5` → Dashboard **Tab 2** (F6 boards) |
| Close | 8:15–10:00 | **A** | Slides **8 → 10 → 11** (skip slide 9 unless Q&A) |

**Timekeeper:** 2-min / 1-min / 30-s cards. Enforce [cut order](./DEMO-10min.md#cut-order-if-over-10-min).

During **2:15–8:30**: hide slides; share IDE / terminal / browser only.

---

## Slide cues (Presenter A — open)

| Slide | Time | Say / show |
| --- | --- | --- |
| **1 Title** | 0:00 | *"AI Coding FinOps — Detect, Fix, Prove for metered AI coding agents."* |
| **2 Problem** | 0:20 | Managers see the **invoice**, not the waste loop. Pick lockfile + no-proof cards; don't read all four. |
| **3 Competition analysis** | 0:45 | **Mentor topic.** *"The market has pieces — none closes Detect → Fix → Prove on IDE/repo context waste."* |
| **4 Differentiation & uniqueness** | 1:15 | **Mentor topics.** Auto Memory vs TokenForge; read **What makes us unique** box. Sound bite. |
| **5 Who it's for** | 1:45 | Buyer = Eng Manager / FinOps. Hand off to demo. |
| **6 Core loop** | 2:00 | *"We prove this live in four beats."* Hand off to B. |

---

## Live demo cues

### B — Detect + Fix (2:15–4:30)

1. Extension Dev Host → TokenForge sidebar → Filter lockfile.
2. `npm run tokenforge:scan -- --json`
3. `npm run tokenforge:apply -- --provider cursor` (live policy pack)
4. *"~99.8% is raw fixture math — watch the dashboard Assumptions step."*

### C — Prove + variance (4:30–6:45)

1. Dashboard **Tab 1** (variance URL pre-open).
2. Scroll **Hybrid complementarity** + **Instruction stack** on Overview (F6 — on demo seed).
3. Assumptions → `realizedWasteShare ≈ 0.3`.
4. Variance board: estimated / actual / variance.

### B — Hybrid AI (6:45–8:15)

```bash
npm run tokenforge -- scan fixtures/instructions-app \
  --mode hybrid --llm cursor-cli:composer-2.5 --allow-external --json
cp fixtures/instructions-app/.tokenforge/scan-report.json \
  dashboard/public/live-hybrid-report.json
```

Switch to **Tab 2:** `http://localhost:5173/?src=/live-hybrid-report.json`  
Call out: **Model analysis**, **Hybrid complementarity**, **Instruction stack**.

**Fallback:** Tab 2 `?src=/demo-hybrid-cursor-report.json` if scan exceeds ~90s.

### A — Close (8:30–10:00)

Slides **8 Honesty** → **10 Architecture** → **11 Takeaway**.

---

## Commands cheat sheet

```bash
npm run tokenforge:extension
npm run tokenforge:dashboard
npm run tokenforge:scan -- --json
npm run tokenforge:apply -- --provider cursor
npm run tokenforge -- scan fixtures/instructions-app \
  --mode hybrid --llm cursor-cli:composer-2.5 --allow-external --json
cp fixtures/instructions-app/.tokenforge/scan-report.json \
  dashboard/public/live-hybrid-report.json
```

**Dashboard Tab 1 (Prove + variance):**  
`http://localhost:5173/board/combined/team/payments-platform?afterUsage=/sample-usage-after.csv`

**Dashboard Tab 2 (Hybrid backup):**  
`http://localhost:5173/?src=/demo-hybrid-cursor-report.json`

**Dashboard Tab 2 (after live hybrid):**  
`http://localhost:5173/?src=/live-hybrid-report.json`

**Pre-stage:** `bash .presentation/hackathon-2026-09/prestage.sh`

---

## Q&A (5 min)

| Question | Owner |
| --- | --- |
| Architecture? | A |
| Why AI / complementary hybrid? | B |
| Prove savings / variance? | C |
| ~30% vs ~99.8%? | C |
| vs Auto Memory? | A |
| Codex repo audit vs Cursor CLI? | B |
| Data leaving the org? | B |

Product FAQ: [`docs/product/PITCH_FAQ.md`](../../../docs/product/PITCH_FAQ.md) · Board prep: [`docs/pitch/PITCH_BOARD_PREP.md`](../../../docs/pitch/PITCH_BOARD_PREP.md).

---

## Rehearsal checklists

### Dry run #1

- [ ] Full 10 min timed with timekeeper
- [ ] Live apply on `noisy-app` (`--provider cursor`) included
- [ ] Two dashboard tabs rehearsed (Prove + Hybrid)
- [ ] Live `cursor-cli:composer-2.5` timed; fallback JSON tested

### Dry run #2 + mock Q&A

- [ ] 10 min + 5 min mock Q&A
- [ ] Record backup video (extension + hybrid boards)

### Smoke test (presentation morning)

- [ ] `npm run typecheck && npm test`
- [ ] F5 extension; dashboard + hybrid JSON OK
- [ ] `agent status --format json` OK
