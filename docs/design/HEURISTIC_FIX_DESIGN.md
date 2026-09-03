# Heuristic Fix design — the deterministic policy synthesizer

**Status:** Locked — F14 (#283)  
**Scope:** What `apply` writes when no model is involved, and why that path carries the weight.  
**Companion:** [`HYBRID_FIX_DESIGN.md`](./HYBRID_FIX_DESIGN.md) · [`COMPLEMENTARY_HYBRID_SCAN.md`](./COMPLEMENTARY_HYBRID_SCAN.md)

## Why this path matters

F7 gave hybrid `apply` an LLM policy synthesizer. It is still not the path most
packs come out of. `synthesizeLeanInstructions` + `collapseExclusionPaths` run:

- by default — `apply` with no `--mode`
- in CI — LLM output is non-deterministic and cannot be a merge gate
- as the **hybrid over-budget fallback** — LLM markdown above the byte budget is
  discarded and the deterministic pack is written instead, which is where a repo
  with 3.5–5 KB instruction files routinely lands
- inside `@tokenforge/policy-adapters`, shared by the CLI Fix path and the
  extension

So the deterministic synthesizer is not a stub behind the real one. It **is** the
product for most runs, and its output quality is a correctness concern, not
cosmetics.

## Product rule

> The deterministic synthesizer never excludes more than the findings justify,
> and every line it writes is derived from the scan report — not a fixed template.

## Exclusion blast radius

`collapseExclusionPaths` turns many excluded file paths into few globs. A glob is
a claim about paths the scan never looked at, so it is the one place this
component can do harm.

Three rules bound it:

| Rule | Why |
| --- | --- |
| **Deepest cluster wins** | Candidates are tried deepest-first, so the tightest directory covering a cluster speaks for it. Ranking by covered-file count instead picked the shallowest heavy directory — on a real `tabler` scan, ~230 assets under `shared/static/**` collapsed all the way to `shared/**`. |
| **Ancestors are out once a subtree collapses** | Otherwise a parent mops up what the deeper globs left behind and re-widens to the directory the depth rule just refused. |
| **No unhinted repo-root globs** | A top-level directory (`core`, `docs`, `src`, `shared`) is load-bearing by convention. Only a known throwaway name (`dist`, `client`, `generated`, …) may speak for one. |

Those are shape heuristics, and shape is a proxy. The real question — *is
anything load-bearing in here?* — needs the tree, and collapse only ever receives
the **excluded** paths. The scan report cannot answer it either: `findings` are
at-risk paths only, so nothing in the contract mentions the `openapi.yaml` or the
`core/js/tabler.js` sitting beside the assets.

So `apply` walks once and attests:

- `collectKeptContent(root, report)` → `keepDirs` (directories holding kept
  source, config, or protected paths) and `sourceRoots`
- `collapseExclusionPaths(paths, { keepDirs })` refuses any glob for a directory
  in that set, hinted fast path included
- callers that cannot walk (e.g. `org-apply`) pass nothing and keep the shape
  heuristics as their only guard

**Decision: apply-side walk, not a report field.** A `report.tree` schema field
was the alternative (#286, Option B). The guard is a *rendering* concern, not a
*finding* one — persisting it in the risk contract would add a field every
consumer must reason about for a rule that only affects generated text. The walk
is `readdir` with `withFileTypes`, classification by path shape, no `stat` and no
file reads, and it works on a report `apply` did not produce, which is the case
the guard exists for.

## What the managed section says

Every block is synthesized from the report:

| Block | Source |
| --- | --- |
| Intro | Waste kinds present, ranked by est. tokens (`dominantWasteKinds`) |
| `## Do not load — …` | Collapsed globs, one section per waste kind |
| `## Read a section on demand` | The `prose` bucket — large text is worth a section, not a refusal |
| `## Instruction stack` | Verdict from `instructionBudget`, plus the heaviest files to trim |
| `## Prefer` | `sourceRoots` from the walk |

### No token counts in the generated file

The rendered pack names buckets and files; it never prints a count. `estTokens`
ranks candidates inside the synthesizer and stays there.

Counts in that file are actively harmful: they go stale the moment anyone edits a
rules file, they carry no action on their own, and the instruction-stack line
went through `toLocaleString()` — so a pt-BR machine emitted
`~2.975 est. tokens (recommended ≤ 4.096)` into an English document, which reads
as *2.975 tokens*. `instructionBudget` in the scan-report JSON keeps its
`estTokens`; that is the machine contract and is untouched.

### Waste kinds

`advise/kinds.ts` buckets a path coarser than `classifyFiletype`, because the
agent only needs to know whether to never load something or to read part of it:

| Kind | Rendered as |
| --- | --- |
| `binary` | Do not load — binary assets |
| `dump` | Do not load — lockfiles and data dumps |
| `output` | Do not load — build and CI output |
| `prose` | Read a section on demand — do not paste whole |

A collapsed glob has no extension of its own, so it is tagged from the findings
it covers, heaviest kind winning.

`binary` is the `media` file class (#300), not a second extension list — so the
bucket holds exactly what the scan flagged as an asset, and `dist/logo.png`
still reads as build output because its class says so. A folded asset directory (#301)
has no extension to read, so it is tagged from its own shape — the fold only
fires on a media supermajority, so the answer is already settled.

### Assets are waste at any size

The synthesizer can only name what the scan flagged, so the pack was silent
about ~900 asset files in a real `tabler` scan: `classifyFiletype` had no media
class and every image, icon, and font had to clear `OVERSIZED_BYTES` to be seen.
`media` flags on shape instead, which is what makes `assets/icons/**` — three
files of 200 bytes — expressible at all. Audit item
[B17](./HEURISTICS_AUDIT.md).

## Folding asset directories

Flagging every asset is correct and very loud: with the media class a real
`tabler` scan produces ~900 findings whose only interesting property is the
directory they share. `collapseExclusionPaths` can rebuild the globs from those
leaves, but it works from the excluded set alone and has to infer; the scan
walked the tree and can simply say so.

`foldAssetDirectories` emits one finding per directory that satisfies all three:

| Rule | Why |
| --- | --- |
| ≥ `MIN_DENSITY_FILES` (8) files directly in it | A fold trades per-file detail for one line, so it has to cover enough to be worth it. |
| ≥ `DENSITY_MIN_MEDIA_RATIO` (0.9) of those are `media` | Only `media` counts toward the numerator, so the finding can report `high_risk_filetype` honestly. Ten small `unknown` blobs have no true reason and stay per-file. |
| Nothing below it is `source` / `config` / protected / kept | The safety argument, and **recursive** rather than per-level: a directory of icons beside a `scripts/build.ts` two levels down must not fold, because the glob would reach that file. |

Candidates are taken **shallowest-first**, so a pure asset root yields one glob
rather than one per subdirectory. That is deliberately wider than collapse will
go on its own — collapse refuses repo-root globs precisely because it cannot see
what else is in there, and rule 3 is the attestation it lacks.

### The path carries the shape

A folded finding's `path` is `dir/**`. The Token Risk contract types `path` as a
plain string and gains no field, and the suffix makes every downstream consumer
read it correctly without being told: `isPathCoveredByExclusion` already treats
`/**` as a subtree, collapse passes it through untouched, and `wasteKindFor`
reads it as binary.

`tallyCombinedTotals` is the one place that needed the rule spelled out. It
matched finding paths to assessment paths by equality, so a fold banked the
finding while still charging every file it covered to `afterTokens`; it now
resolves a `/**` path as a prefix.

## Tests that hold the line

| Test | Holds |
| --- | --- |
| `fixtures/over-collapse-app` + `apply.over-collapse.test.ts` | Walks every file in a repo of binaries-beside-source and asserts the pack matches no path the scan did not flag |
| `policy/collapse.test.ts` | Depth, ancestor blocking, hinted fast path, `keepDirs` guard |
| `enrichers/policy/fallback.test.ts` | Hybrid over-budget output is byte-for-byte the deterministic pack |
| `advise/instructions.test.ts` | No digit-run below the first heading; stack verdict wording |
| `fixtures/expected/*` | Golden totals — unchanged by collapse, which affects globs, not totals |

## Out of scope

- Changing the risk model, the walk, or scoring — this is all downstream of scan
- Adding fields to the Token Risk contract
- Anything requiring a model at apply time (that is [`HYBRID_FIX_DESIGN.md`](./HYBRID_FIX_DESIGN.md))

## Implementation map (#283)

| Issue | Deliverable |
| --- | --- |
| #284 | Collapse to the deepest common directory |
| #285 | `keepDirs` guard in the kernel |
| #286 | `apply` attests kept directories (Option A) |
| #287 | Synthesized intro + Prefer roots |
| #288 | Do-not-load buckets by waste kind |
| #291 | Instruction-stack verdict, no counts |
| #289 | `over-collapse-app` control + fallback golden |
| #290 | This document + BOARD F14 index |
| #300 | `media` file class — assets flagged by shape, not size |
| #301 | Asset-tree density signal |
