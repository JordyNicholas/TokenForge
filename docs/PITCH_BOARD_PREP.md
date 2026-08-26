# Board / live Q&A prep — TokenForge

Shark Tank–style rehearsal: short spoken answers, no slides required in the room.
Hackathon clock: see [`CONCEPT_BRIEF.md`](./CONCEPT_BRIEF.md) (≤5 min demo) and
[`DEMO_RUNBOOK.md`](./DEMO_RUNBOOK.md).

FAQ depth: [`PITCH_FAQ.md`](./PITCH_FAQ.md) · Pilot numbers: [`PILOT_RUNBOOK.md`](./PILOT_RUNBOOK.md).

---

## Slide copy — Pilot scorecard (3 KPIs)

**Slide title:** *Q1 pilot — what we measure*

**On-slide (3 bullets only):**

1. **Actual billed change** — AI coding credits / $ down on Fix-on team vs prior period (target: **10–15%** on one team).
2. **Estimated reduction** — scan × frozen Assumptions on Prove (transparent knobs).
3. **Variance** — actual minus estimated; we show the gap, not hide it (pilot band: **±30%**).

**Speaker note (15 s):**  
*Primary scorecard is the invoice, not scan totals. Scan feeds the estimate; import or usage-sync feeds the bill; Prove shows all three.*

**Guardrail (subtitle or footnote):**  
*Quality: PR lead time / reopen rate vs control team — pause pilot if red. We do not guarantee agent performance; policies are git-reversible.*

---

## Slide copy — Day 1 on a repo that never saw TokenForge

**Slide title:** *Adopt without blind surgery*

**On-slide (4 steps):**

| Step | Command / action | Mutates agent policy? |
| --- | --- | --- |
| 1. Assess | `tokenforge scan <repo>` | No — report only |
| 2. Preview Fix | `tokenforge apply <repo> --dry-run` | No — planned files only |
| 3. Review | PR the pack; Platform approves | Optional |
| 4. Prove | Import baseline bill → apply → after-period bill | Prove only |

**Speaker note (20 s):**  
*First contact is a stethoscope, not surgery. Dollars-before-adoption come from the bill you already pay — not from the scanner inventing last month’s invoice.*

**Honesty line (say once):**  
*We infer waste surfaces in the repo and IDE; we do not meter the vendor’s private Chat/Agent pipeline.*

---

## Slide copy — Who owns the monthly clock

**Slide title:** *Pipelines remember; developers don’t*

**On-slide:**

- **Developers** — Context Guard (live tab hygiene).
- **Platform** — monthly `usage-sync` + optional `scan` via cron / GitHub Action ([#131](https://github.com/JordyNicholas/TokenForge/issues/131)).
- **FinOps** — baseline vs after bill import; owns pilot continue/kill.

**Speaker note (10 s):**  
*No one “remembers to scan.” Platform automates the Prove feed; extension is not the FinOps scheduler.*

---

## Live Q&A — 15-second answers (memorize shape, not script)

| Question | Answer shape |
| --- | --- |
| *Why not just read the Copilot bill?* | Bill is a lump sum; no Detect→Fix on context waste; no variance vs estimate. |
| *How prove savings?* | Three KPIs on Prove: estimated, actual bill delta, variance — frozen assumptions. |
| *Greenfield repo?* | Scan + dry-run first; apply is opt-in; bill import when FinOps has it. |
| *Break the agent?* | No performance SLA; dry-run + PR; revert in git; org hard-enforce is Platform-only. |
| *Overwrite our CLAUDE.md?* | **No wipe.** We merge a marked TokenForge section into the conventional file; your text outside the markers stays. |
| *Monthly scans?* | CLI + cron/Action ([#131](https://github.com/JordyNicholas/TokenForge/issues/131)); extension is not monthly scheduler. |
| *Any LLM for hybrid?* | Opt-in; Ollama / Anthropic / Codex CLI; default scan is heuristic, repeatable for pilot. |
| *vs Auto Memory?* | They improve recall; we cut billable waste and prove $ — different buyer metric. |
| *~30%?* | Scenario on Assumptions panel — not universal SLA; pilot targets 10–15% actual on one team. |
| *What don’t you do?* | Intercept agent pipeline; guarantee quality; claim 100% of invoice delta without cohort. |

---

## Hackathon vs Shark Tank — what to expect

| | **Typical hackathon** | **Shark Tank (TV)** | **This rehearsal** |
| --- | --- | --- | --- |
| **Time** | Often **3–5 min** pitch + **1–3 min** Q&A (check *your* rules) | ~10 min pitch + longer grill | **Short questions, you answer live** — no slides |
| **Judges** | Mentors, sponsors, engineers + sometimes business | Investors, emotion + deal drama | C-level: technical + budget |
| **Goal** | Working prototype, clarity, problem fit | Equity / entertainment | Trust, pilot viability, honesty |
| **Demo** | **Required** — often scored highest | Sometimes secondary | Assume demo already seen; Q&A only |
| **Weakness** | Admit + roadmap | Can get torn apart if defensive | Brief ack + control (pilot design, #130, #131) |

**Hackathon habits that win:**

1. **Problem in 20 s** — one pain, one buyer.
2. **One live path** — noisy tabs → scan → dashboard variance (not a feature tour).
3. **Know your “questions you don’t want”** — overwrite, causality, performance, monthly cadence.
4. **Strong last 15 s** — sound bite + ask (pilot one team / Platform cron / safe apply).

**Read your event brief for:** exact minutes, judging criteria (UX, viability, originality), demo vs slides split, whether Q&A is per judge or panel.

---

## Next round — simulation rules

- **You** = presenter (live answers only).
- **Assistant** = board member: one question at a time, 1–3 sentences, interrupts if you ramble or overclaim.
- No markdown tables in the room — speak in plain sentences.
- Target **≤30 s per answer** unless asked to go deeper.

**Opening board question (when ready):**  
*“You’ve got five minutes — why should I fund a pilot instead of telling my teams to close their lockfile tabs?”*
