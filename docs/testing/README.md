# Testing documentation

**Status:** Runbook  
**Scope:** Manual end-to-end verification — especially non-deterministic hybrid/LLM paths.  
**Audience:** QA and implementers before demo or release.  
**Companion:** [`../fixtures/README.md`](../../fixtures/README.md)

| Doc | Covers |
| --- | --- |
| [E2E_HYBRID_SCAN_TEST.md](./E2E_HYBRID_SCAN_TEST.md) | `--mode hybrid` scan + dashboard |
| [E2E_ACTIVE_SESSION_TEST.md](./E2E_ACTIVE_SESSION_TEST.md) | `--active-paths-file` / extension export |
| [E2E_CLAUDE_CODE_ENRICH_TEST.md](./E2E_CLAUDE_CODE_ENRICH_TEST.md) | `claude-code` enricher backend |

Heuristic regression lives in `npm test` (fixture golden totals). Do not add hybrid scan to CI — output is non-deterministic.
