# Hackathon presentation — Sep 2026 (situational)

**Not product documentation.** This folder is for the Sep 1–2 presentation only. It is intentionally **not** linked from [`docs/README.md`](../../docs/README.md) or the repo README.

After the event, delete this folder or archive it locally.

## Repo assets used in the demo (stay in tree)

| Asset | Path |
| --- | --- |
| Pitch deck | [`docs/pitch/TokenForge-Pitch.pptx`](../../docs/pitch/TokenForge-Pitch.pptx) |
| Hybrid demo report | [`dashboard/public/demo-hybrid-cursor-report.json`](../../dashboard/public/demo-hybrid-cursor-report.json) |
| Live hybrid slot (gitignored path during demo) | `dashboard/public/live-hybrid-report.json` (copied after live scan) |

Regenerate deck: `python3 scripts/generate-pitch-deck.py` (from repo root).

## This folder

| File | Purpose |
| --- | --- |
| [`TEAM_ASSIGNMENTS.md`](./TEAM_ASSIGNMENTS.md) | Slot, roles A/B/C/D, timekeeper |
| [`PRESENTER_RUNBOOK.md`](./PRESENTER_RUNBOOK.md) | 10-min run-of-show, slide cues, Q&A, rehearsals |
| [`DEMO-10min.md`](./DEMO-10min.md) | Live demo script (Detect → Fix → Prove + hybrid + variance) |
| [`prestage.sh`](./prestage.sh) | Build, test, optional hybrid JSON refresh |

Generic ≤5 min demo (product runbook): [`docs/runbooks/DEMO_RUNBOOK.md`](../../docs/runbooks/DEMO_RUNBOOK.md).

Product FAQ for judges: [`docs/product/PITCH_FAQ.md`](../../docs/product/PITCH_FAQ.md).
