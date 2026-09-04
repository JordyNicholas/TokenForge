# F25 — EM multi-person Prove

**Status:** Done (Waves A–E shipped)  
**Honesty floor (non-negotiable):** no private-pipeline interception; no claim that invoice Δ is 100% TokenForge-caused; local-first Prove; inbox is file handoff not live sync.

## Success definition

- An **EM** can run a **Friday inbox drop** for a multi-team BU: validate folders vs roster, roll up `org-prove-pack.json`, stage dashboard `?pack=`, and review Variance with usage team remap.
- **Developers** export last-scan + session-stats to inbox via extension or CLI inbox hints.
- **Platform** can copy the example EM Prove CI workflow (inbox-validate, prove-pack, drift).
- Wave C (session restore / prove persistence) may land in the same PR as Wave E — both shipped.

## Epic packaging

| Epic slice | Focus |
| --- | --- |
| **F25-A Prove pack** | CLI `prove-pack`, dashboard `?pack=` load, multi-team session/discover entries |
| **F25-B Inbox** | `inbox-init`, `inbox-validate`, extension Export to inbox, roster coverage |
| **F25-C Session handoff** | Prove session persist/restore in dashboard localStorage |
| **F25-D Stage dashboard** | CLI `stage-dashboard`, boot URL with pack query |
| **F25-E Usage map + CI + docs** | Usage team map, `remap-usage`, EM runbook, example CI, glossary |

Branches: `TF#<n>-…` when issues filed; small commits.

---

## Wave A — Prove pack

1. **CLI `prove-pack`** — walk inbox tree; merge seed, markers, sessions, discovers; optional roster coverage.
2. **Dashboard load** — SourceBar prove pack + `?pack=/org-prove-pack.json` boot.
3. **Domain parser** — `parseProvePackJson` / coverage types.

## Wave B — Inbox

1. **`inbox-init`** — scaffold README + optional roster stub.
2. **`inbox-validate`** — folder walk vs roster; stale mtime warnings; exit 2 on failure.
3. **Extension Export to inbox** — `tokenforge.inboxPath` + team label settings.

## Wave C — Session handoff

1. **Prove session persist** — localStorage snapshot of pack/seed, markers, usage periods.
2. **Restore last Prove session** — SourceBar menu when snapshot exists.

## Wave D — Stage dashboard

1. **`stage-dashboard`** — copy pack/artifacts to `dashboard/public`; print boot URL.

## Wave E — Usage map, CI, docs

1. **Usage team map** — `usageTeamMap.ts`, SourceBar load, apply on usage import / map change.
2. **CLI `remap-usage`** — offline UsageMetrics rename.
3. **Example CI** — `.github/workflows/examples/tokenforge-em-prove.yml` + `fixtures/em-inbox/`.
4. **Runbooks** — `EM_TEAM_PROVE.md`; updates to PILOT, STANDARD_PILOT_KIT, MONTHLY_CADENCE, README, AGENTS, BOARD, glossary, PITCH_FAQ, EXTENSION_PRODUCT.

## Explicit non-goals (unchanged)

- Realtime streaming context wall  
- Hosted multi-tenant SaaS  
- 100% causation claims  

## Exit criteria

| Wave | Exit | Status |
| --- | --- | --- |
| A | prove-pack JSON + dashboard ?pack= load | **Met** |
| B | inbox-init/validate + extension export | **Met** |
| C | Prove session restore in dashboard | **Met** |
| D | stage-dashboard boot URL | **Met** |
| E | usage team map + EM CI example + runbooks | **Met** |
