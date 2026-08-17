# noisy-app (TokenForge demo fixture)

Synthetic Node app used to drive the **Detect → Fix → Prove** demo. It is not an npm
workspace and not a product package.

The point is a **material before-token baseline**: lockfiles, fat JSON/XML, and
`dist/` junk dominate the tree. Source under `src/` is tiny. When E2 `tokenforge scan`
runs here, high-risk paths should dwarf the keep-set.

## Token estimate (v0)

Hackathon math from `packages/risk-core`: `estTokens ≈ ceil(bytes / 4)`.

| Path | Role | ~Bytes | ~Tokens |
| --- | --- | ---: | ---: |
| `package-lock.json` | lockfile (high-risk filetype) | 802 KB | 201k |
| `dist/bundle.js` | generated junk | 337 KB | 84k |
| `dist/bundle.js.map` | generated junk | 140 KB | 35k |
| `config/app-settings.json` | oversized config | 358 KB | 89k |
| `config/legacy-export.xml` | oversized config | 183 KB | 46k |
| `src/*.js` | keep (source) | <1 KB | <0.2k |
| **Tree total (excl. this README)** | before baseline | **1.82 MB** | **~455k** |

Excluding lockfile + `dist/` + fat configs leaves almost only `src/`. That raw
ratio is far above 30% — it is the noisy **before** picture, not a production SLA.

## How this drives the ~30% story

Pitch “30%” is **scenario-based** on the dashboard calculator (rate, team size,
msgs/day), not a claim that every repo saves 30% by deleting lockfiles.

A scripted demo can:

1. Scan this fixture (E2) and show a large `beforeTokens` (~455k).
2. Apply a policy pack that excludes high-risk / oversized paths.
3. Load the scan JSON into the dashboard and set assumptions so the **displayed**
   savings on that scenario is ~30% — honest, editable, not a vendor billing API.

## Layout

```text
fixtures/noisy-app/
├── package.json
├── package-lock.json    # padded lockfile
├── src/                 # small keep-set
├── config/              # fat JSON + XML
└── dist/                # tracked junk (gitignored elsewhere; allowed here)
```
