# borderline-app (TokenForge demo fixture)

Synthetic Node app used as a **precision stress test** for the Detect → Fix →
Prove demo. It is not an npm workspace and not a product package.

Unlike `fixtures/noisy-app` (obvious junk: padded lockfile, `dist/`, fat
generated configs), every large file here is written to look like something a
real engineer would legitimately commit. The point is to make visible where
today's heuristics (`packages/risk-core/src/score/score.ts`,
`classify/classify.ts`, `candidates/candidates.ts`) cannot tell "legitimately
large" from "waste" — see `docs/design/HEURISTICS_AUDIT.md` for the full write-up.

## What's in here and why

| Path | Role | ~Bytes | What it stresses |
| --- | --- | ---: | --- |
| `rules/pricing-notes.md` | human business notes, not an AI instruction file | ~1.6 KB | `isInstructionPath` matches the bare path segment `rules`, so this gets prioritized as an LLM enrichment candidate even though it has nothing to do with agent instructions (B1). |
| `src/generated-types.ts` | large but genuinely hand-maintained API type surface | ~120 KB | Crosses `OVERSIZED_BYTES` (100 KB) as a `source`-class file (weight 0.15). `toFinding()` still assigns it `action: "excluded"` — the exact same fix-adapter recommendation a lockfile gets (B2/B3). |
| `config/locales.json` | large but genuine i18n config | ~125 KB | Same `oversized` → `excluded` outcome as the type file, on a real config a team would want to keep in context. |
| `src/index.ts` | tiny real source | <1 KB | Control: this one should stay in the keep-set. |

## Expected scan result

`src/generated-types.ts` and `config/locales.json` are expected findings
(`reason: "oversized"`, `action: "excluded"`) — that is today's actual,
intentional behavior, not a test bug. The golden file
(`fixtures/expected/borderline-app-totals.json`) pins those totals precisely
so a future heuristic change (e.g. addressing B1/B2) shows up as a diff here.

## Layout

```text
fixtures/borderline-app/
├── package.json
├── rules/               # human notes, name collides with instruction dirs
├── src/                 # tiny keep-set + one large legit source file
└── config/              # one large legit config file
```
