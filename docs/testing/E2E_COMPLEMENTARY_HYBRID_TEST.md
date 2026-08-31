# E2E — complementary hybrid scan (manual)

Automated complementarity checks live in `cli/src/commands/scan/scan.hybrid.test.ts` (#209).
Use this matrix when validating a **real** LLM backend before release or pilot sign-off.

## Preconditions

- Repo bootstrapped: `npm run tokenforge -- scan fixtures/<fixture> --mode hybrid --llm <backend> --allow-external`
- Compare against heuristic-only: same fixture without `--mode hybrid` (or `--llm noop:none`)

## Fixture matrix

| Fixture | Heuristic expectation | Hybrid must add |
| --- | --- | --- |
| `noisy-app` | High `savedTokens` (lockfiles, dist) | `scan.llm` metadata; optional `analysisOverview`; `hybridDelta.heuristicSavedTokens` matches heuristic savings |
| `instructions-app` | Instruction bloat `kept`; `savedTokens === 0` | LLM findings and/or `hybridDelta.complementarityStatus === ok`; policy hygiene after `apply` |
| `heuristic-edge-app` | Protected paths never excluded | Zero unsafe LLM excludes on `src/index.ts`, contracts, generated trees |
| `semantic-duplicates-app` | Source in candidate set | `duplicate_logic` kept in LLM layer |
| `monorepo-config-app` | Repeated tsconfigs routed | `redundant_config` or cross-package review detail |

## Pass criteria

1. **Complementarity:** hybrid adds distinct signal (findings, overview, or delta) without reducing heuristic savings on `noisy-app`.
2. **Safety:** no `action: excluded` on protected / source paths unless policy allowlist permits (#201).
3. **Honesty:** do not claim pipeline interception; non-Codex hybrids send bounded excerpts only. **Codex** sends a sanitized eligible repo copy (`scan.llm.repoAuditCoverage.mode === "codex_repo_audit"`).
4. **Prove:** `scan.hybridDelta` and `instructionBudget` present on v5 reports when hybrid ran.
5. **Codex-only (when using `--llm codex`):** optional `contextIndexRecommendations` (`.md` index proposals) on `scan.llm`.

## Suggested commands

```bash
npm run tokenforge -- scan fixtures/noisy-app --json --mode hybrid --llm ollama:qwen2.5-coder:7b
npm run tokenforge -- scan fixtures/instructions-app --json --mode hybrid --llm codex --allow-external
npm run tokenforge -- apply fixtures/noisy-app --provider cursor --dry-run
```

Record backend, model, duration, and whether `analysisOverview.summary` is populated.
For Codex runs, also record `repoAuditCoverage.filesCopied` and whether
`contextIndexRecommendations` is non-empty.
