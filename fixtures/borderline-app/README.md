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
| `rules/pricing-notes.md` | human business notes, not an AI instruction file | ~1.6 KB | Regression for B1: bare `rules/` must not be treated as an agent instruction path (only `.cursor/rules`, `.claude/rules`, `.github/rules`). |
| `src/generated-types.ts` | large but genuinely hand-maintained API type surface | ~120 KB | Below `SOURCE_OVERSIZED_BYTES` (250 KB) after B2/B3 — must stay out of findings. |
| `config/locales.json` | large but genuine i18n config | ~125 KB | Still crosses the config oversized bar → `oversized` / `excluded`. |
| `src/index.ts` | tiny real source | <1 KB | Control: this one should stay in the keep-set. |

## Expected scan result

Only `config/locales.json` is an expected finding (`reason: "oversized"`,
`action: "excluded"`). Hand-maintained source under the source size bar stays
out of the report. The golden file (`fixtures/expected/borderline-app-totals.json`)
pins those totals so a future heuristic change shows up as a diff here.

## Layout

```text
fixtures/borderline-app/
├── package.json
├── rules/               # human notes, name collides with instruction dirs
├── src/                 # tiny keep-set + one large legit source file
└── config/              # one large legit config file
```
