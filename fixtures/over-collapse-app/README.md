# over-collapse-app

Standing control for the exclusion-glob blast radius (F14, #284/#285/#289).

Every finding here is an oversized binary, and every one of them sits **beside
living source**:

| Path | Why it is here |
| --- | --- |
| `src/hero-illustration.png` | The trap. One oversized binary directly under the source root — `src/**` must never appear in a policy pack because of it. |
| `assets/screenshots/*.png` | Three files in one directory: enough to earn `assets/screenshots/**`. |
| `assets/fonts/Brand-*.ttf` | Only two files, so the directory stays under the collapse floor and both are listed individually. |
| `src/**/*.js`, `docs/GUIDE.md`, `package.json` | Kept content. A glob that matches any of these is a bug. |

What it proves:

- collapse claims the **deepest** cluster (`assets/screenshots/**`), not the
  shallowest heavy directory (`assets/**` or `src/**`)
- a repo-root directory is never globbed on the strength of stray assets
- `collectKeepDirs` marks `src`, `src/checkout`, `src/util`, and `docs` as
  holding kept content, so no glob may widen to them

The generated pack is asserted in `cli/src/commands/apply/apply.over-collapse.test.ts`.
Totals are pinned in `fixtures/expected/over-collapse-app-totals.json`.
