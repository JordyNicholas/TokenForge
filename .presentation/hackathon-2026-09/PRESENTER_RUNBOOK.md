# Presenter runbook — Hackathon final (Sep 1–2)

**10 minutes** present + demo, **5 minutes** Q&A. Mirrors deck slide 7 (do not show slide 7 to judges).

Fill roles in [`TEAM_ASSIGNMENTS.md`](./TEAM_ASSIGNMENTS.md). Live script: [`DEMO-10min.md`](./DEMO-10min.md).

---

## Run of show

| Beat | Time | Owner | Slides / action |
| --- | --- | --- | --- |
| Open | 0:00–2:15 | **A** | Slides **1–6** (see cues below) |
| Detect + Fix | 2:15–4:45 | **B** | Extension → `tokenforge:scan` → `apply --dry-run` |
| Prove + variance | 4:45–7:00 | **C** | Dashboard → Assumptions ~30% → Variance 3 KPIs |
| Hybrid AI | 7:00–8:30 | **D** or **B** | `cursor-cli:composer-2.5` on `instructions-app` |
| Close | 8:30–10:00 | **A** | Slides **8 → 10 → 11** (skip slide 9 unless Q&A) |

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

### B — Detect + Fix (2:15–4:45)

1. Extension Dev Host → TokenForge sidebar → Filter lockfile.
2. `npm run tokenforge:scan -- --json` → `npm run tokenforge:apply -- --dry-run`
3. *"~99.8% is raw fixture math — watch the dashboard Assumptions step."*

### C — Prove + variance (4:45–7:00)

1. Dashboard (pre-open variance URL).
2. Assumptions → `realizedWasteShare ≈ 0.3`.
3. Variance board: estimated / actual / variance.

### D / B — Hybrid AI (7:00–8:30)

```bash
npm run tokenforge -- scan fixtures/instructions-app \
  --mode hybrid --llm cursor-cli:composer-2.5 --allow-external
```

**Fallback:** `dashboard/public/demo-hybrid-cursor-report.json`.

### A — Close (8:30–10:00)

Slides **8 Honesty** → **10 Architecture** → **11 Takeaway**.

---

## Commands cheat sheet

```bash
npm run tokenforge:extension
npm run tokenforge:dashboard
npm run tokenforge:scan -- --json
npm run tokenforge:apply -- --dry-run
npm run tokenforge -- scan fixtures/instructions-app \
  --mode hybrid --llm cursor-cli:composer-2.5 --allow-external
```

**Variance URL:**  
`http://localhost:5173/board/combined/team/payments-platform?afterUsage=/sample-usage-after.csv`

**Pre-stage:** `bash .presentation/hackathon-2026-09/prestage.sh`

---

## Q&A (5 min)

| Question | Owner |
| --- | --- |
| Architecture? | A / D |
| Why AI? | D / B |
| Prove savings? | C |
| ~30% vs ~99.8%? | C |
| vs Auto Memory? | A |

Product FAQ: [`docs/product/PITCH_FAQ.md`](../../docs/product/PITCH_FAQ.md) · Board prep: [`docs/pitch/PITCH_BOARD_PREP.md`](../../docs/pitch/PITCH_BOARD_PREP.md).

---

## Rehearsal checklists

### Dry run #1

- [ ] Full 10 min timed with timekeeper
- [ ] Live `cursor-cli:composer-2.5` included
- [ ] Screen-share layout rehearsed

### Dry run #2 + mock Q&A

- [ ] 10 min + 5 min mock Q&A
- [ ] Record backup video (extension + hybrid boards)

### Smoke test (presentation morning)

- [ ] `npm run typecheck && npm test`
- [ ] F5 extension; dashboard + hybrid JSON OK
- [ ] `agent status --format json` OK
