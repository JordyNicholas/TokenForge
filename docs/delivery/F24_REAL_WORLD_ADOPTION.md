# F24 — Real-world adoption & evidence

**Status:** Done (Waves A–D shipped)  
**Honesty floor (non-negotiable):** no private-pipeline interception; no claim that invoice Δ is 100% TokenForge-caused; local-first Prove.

## Success definition

- A **Director** can run a **standard pilot kit** (control team + two periods + freeze + prove-report with trustLevel and calibration bands) without a spreadsheet.
- A **Developer** sees **host-honor evidence**, advisory vs enforced clarity, and a daily Fix/Prove health strip.
- **Platform** owns monthly cadence (scan / usage-sync / drift / org-seed) via runbooks + recommended CI.
- Every gap from the post-viability review is **shipped or explicitly owned** — no leftovers.

## Epic packaging

| Epic slice | Focus |
| --- | --- |
| **F24-A Evidence** | Standard pilot kit, honor smoke, prove-report trust/bands/calibration |
| **F24-B Fix quality** | Heuristics B1–B4, F14 instruction quality, drift recommended, promote checklist |
| **F24-C Adoption** | Extension daily health, marketplace screenshots, monthly cadence, session narrative |
| **F24-D Coverage** | Gemini/Claude Shield adapters, post-turn logging gate, prove-report richness, docs sync |

Branches: `TF#<n>-…` when issues filed; small commits.

---

## Wave A — Evidence

1. **Standard pilot kit** — `docs/runbooks/STANDARD_PILOT_KIT.md` + PILOT_RUNBOOK link: control team, 2 periods, freeze, checklist, prove-report.
2. **Host-honor smoke** — CLI `tokenforge honor-smoke`: writes `.tokenforge/honor-smoke.json` checklist for Cursor Soft/Hard (observe host behavior; honesty: not metering).
3. **Prove-report enrichment** — include trustLevel, confidence bands, freeze snapshot when present, usage/variance when local artifacts exist.
4. **Calibration bands** — domain helper: estimate vs billed Δ → `strong | suggestive | weak | insufficient` (cohort + control required for strong).

## Wave B — Fix quality

1. **B1** — `isInstructionPath` only under agent-config parents.
2. **B2/B3** — no `excluded` for oversized-only `source`; class-scaled oversized bar.
3. **B4** — separate borderline enrichment bucket cap.
4. **F14** — leaner managed instruction body (actionable, short, host-shaped).
5. **Platform checklist** — drift + promote-shield recommended in runbooks / example CI notes.

## Wave C — Adoption

1. **Extension daily health strip** — Scan stale? Drift dirty? Session unsent? Promote pending?
2. **Marketplace #279** — screenshot gallery table + placeholder assets notes in README.
3. **Monthly cadence runbook** — Platform: usage-sync + scan + prove + org-seed.
4. **Session narrative #276** — heuristic path complete; AI path writes costed honesty + optional local Ollama one-shot when enrichment on.

## Wave D — Coverage (lower priority, still shipped)

1. **Gemini / Claude Context Shield** — advisory adapters + ignore-merge where conventional files exist; effectiveness documented.
2. **`postTurnLogging` gate** — hooks installer respects setting; no silent logging when off.
3. **Docs sync** — BOARD, README, PITCH_FAQ, EXTENSION_PRODUCT, HEURISTICS_AUDIT status, glossary terms as needed.

## Explicit non-goals (unchanged)

- Realtime streaming context wall  
- Hosted multi-tenant SaaS  
- 100% causation claims  

## Exit criteria

| Wave | Exit | Status |
| --- | --- | --- |
| A | Standard kit + honor-smoke artifact + prove-report with trust/bands | **Met** |
| B | borderline-app regressions green; Platform checklist in runbooks | **Met** |
| C | Health strip visible; monthly runbook; narrative command complete | **Met** |
| D | Gemini/Claude adapters registered; post-turn gated; docs match code | **Met** |
