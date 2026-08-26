# monorepo-config-app (TokenForge demo fixture)

Synthetic 3-package monorepo used as the **candidate-routing and semantic
stress test for #136**. Not an npm workspace of this repo and not a product
package (`fixtures/*` is absent from the root `workspaces` field, so its inner
`workspaces` array is inert).

`semantic-duplicates-app/` covers duplicated *logic* and duplicated
*instructions*. This one covers the third form: duplicated **configuration**,
where the same settings are copied per package instead of extending a shared
base.

## The heuristic layer finds nothing here, on purpose

`tokenforge scan` reports **0 findings, 0% saved** (exit code 3). Every file is
small, legitimate, and correctly classified — there is no size or filetype
signal to fire on. That is the point: redundancy is about *how many copies
exist*, not how big each one is, so this waste is invisible to the default
scan and can only surface in `--mode hybrid`.

## What's in here and why

| Path | Role |
| --- | --- |
| `tsconfig.base.json` | The shared base the packages *should* extend. Nothing extends it — that is the finding. |
| `packages/a/tsconfig.json` | Copy 1. Conventional key order. |
| `packages/b/tsconfig.json` | Copy 2. Same settings, keys reversed, 4-space indent. |
| `packages/c/tsconfig.json` | Copy 3. Same settings again, but `"strict": true` is **expanded into its eight constituent flags**, enum values are lowercase, and `outDir` is `./dist`. |
| `packages/{a,b,c}/package.json` | **Control.** Same basename in three directories, but genuinely different: different names, versions, scripts, dependencies, and one has `bin` + `peerDependencies`. A shared filename is not redundancy. |
| `packages/{a,b,c}/src/index.ts` | Control: real source, distinct per package. |

## Why copy 3 matters

Copies 1 and 2 could be caught by normalizing JSON and comparing keys. Copy 3
could not: `"strict": true` and its eight expanded flags share no text and no
keys, yet mean exactly the same thing. Matching this pair requires reasoning
about what the settings *do* — the same bar `semantic-duplicates-app` sets for
paraphrased prose, applied to configuration.

## What the fixture is asserting

Candidate **routing**, deterministically — that all three `tsconfig.json`
copies reach the enricher and receive a content digest in the Pass A map.
Whether a given model then calls them redundant is model-dependent and not
pinned by any test here; the hybrid pipeline stays non-deterministic by design
and is never a CI gate.

The `package.json` control is what keeps that honest: routing must select it
too (its basename repeats), while the prompt rules push the model away from
claiming redundancy on a shared filename alone.

## Layout

```text
fixtures/monorepo-config-app/
├── package.json          # root, declares the (inert) workspace
├── tsconfig.base.json    # the base nobody extends
└── packages/
    ├── a/                # billing      — conventional tsconfig
    ├── b/                # notifications — reordered tsconfig
    └── c/                # reporting    — expanded-flags tsconfig
```
