# asset-dump-app

Standing control for the asset-tree density fold (F14, #301).

The `media` class (#300) makes every asset visible, which is correct and very
loud — a real `tabler` scan turns into ~900 findings whose only interesting
property is the directory they share. This fixture pins when the scan is allowed
to speak for a directory instead of its files, and when it is not.

| Path | Files | Expected |
| --- | --- | --- |
| `press-kit/` + `press-kit/screens/` | 9 + 9 | **One** finding, `press-kit/**`. Shallowest-first: nothing under it is kept, so the outer directory speaks for the whole subtree rather than emitting a glob per level. |
| `assets/icons/*.svg` | 12 | Folds to `assets/icons/**`. |
| `assets/logos/*.png` | 4 | Under `MIN_DENSITY_FILES` — stays four per-file findings. `collapseExclusionPaths` may still glob them at render time; that is a different rule and a different layer. |
| `assets/brand/logo.svg` | 1 | **Never folds.** `palette.ts` sits beside it, so the whole `assets/` subtree is vetoed. |
| `src/*.ts`, `package.json` | 3 | Kept content. A glob that reaches any of these is a bug. |

Every asset here is a few hundred bytes. That is the point: none of them clears
`OVERSIZED_BYTES`, so a size-only heuristic produces an empty report for this
repo, and the fold has to be driven by class and density instead.

What it proves:

- a directory folds only on ≥ `MIN_DENSITY_FILES` direct children that are
  ≥ `DENSITY_MIN_MEDIA_RATIO` `media` — so the finding can honestly say
  `high_risk_filetype`
- the source veto is **recursive**, not per-level: one `.ts` anywhere below a
  directory keeps every ancestor speaking per file
- a fold is allowed to name a repo-root directory (`press-kit/**`), which
  `collapseExclusionPaths` refuses on its own — collapse works from the excluded
  set and has to guess, the scan walked the tree and knows
- `tallyCombinedTotals` charges a folded subtree to `savedTokens`, so 39 files
  and 7 findings still reconcile against the per-file assessment totals

The generated pack is asserted in
`cli/src/commands/scan/scan.asset-dump.test.ts`. Totals are pinned in
`fixtures/expected/asset-dump-app-totals.json`.
