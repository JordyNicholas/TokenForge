# lean-app (TokenForge demo fixture)

Synthetic Node app used as a **negative control** for the Detect → Fix → Prove
demo. It is not an npm workspace and not a product package.

Unlike `fixtures/noisy-app` (deliberately extreme waste), this tree is a small,
healthy repo: a handful of tiny source files, no committed lockfile, no
`dist/`, no oversized config. The point is to prove TokenForge does **not**
manufacture savings on a repo that has none.

## Why there's no `package-lock.json`

`classifyFiletype` (`packages/risk-core/src/classify/classify.ts`) treats any
file named `package-lock.json` (and the other lockfile basenames) as the
`lockfile` class — which is always `high_risk_filetype`, regardless of its
size. Committing even a tiny lockfile here would produce a non-zero finding by
class alone, which would defeat the point of this fixture as a "genuinely
nothing to flag" baseline. See `docs/HEURISTICS_AUDIT.md` (B2/B3) for the
related discussion of size-blind vs. class-blind risk.

## Expected scan result

Every file in `src/` is source-class, well under the 100KB `oversized`
threshold, and not a lockfile/generated path. `tokenforge scan` here should
report `savedPercent` at or near 0% — see
`fixtures/expected/lean-app-totals.json`.

## Layout

```text
fixtures/lean-app/
├── package.json
└── src/            # tiny, all "keep"
```
