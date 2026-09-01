# Presentation runbook — hybrid-eval-app (Detect → Fix → Prove)

**Status:** Runbook  
**Scope:** Full presenter blueprint — VS Code Context Guard, heuristic CLI, hybrid CLI, dashboard.  
**Audience:** Demo operators.  
**Fixture:** [`fixtures/hybrid-eval-app`](../../fixtures/hybrid-eval-app/)  
**Companion:** [`DEMO_RUNBOOK.md`](./DEMO_RUNBOOK.md) · [`EXTENSION_CONTEXT_GUARD.md`](../adapters/EXTENSION_CONTEXT_GUARD.md) · [`HYBRID_FIX_DESIGN.md`](../design/HYBRID_FIX_DESIGN.md)

---

One fixture, three acts: **extension (live Detect)** → **heuristic scan + apply** → **hybrid scan + apply**, with the dashboard loaded after each CLI pass.

> **Honesty:** Context Guard does **not** intercept any agent pipeline. Heuristic savings on this fixture is **~84%** raw scan delta (`fixtures/expected/hybrid-eval-app-totals.json`). The pitch **~30%** appears only after dashboard **Assumptions → waste applicability (0.3)** — scenario math, not a billing API.

## Quick commands

| Purpose | Command |
| --- | --- |
| **Full guided script** (Acts 1–3) | `npm run tokenforge:presentation-full` |
| Act 2 only (heuristic) | `npm run tokenforge:presentation-heuristic` |
| Act 3 only (hybrid) | `npm run tokenforge:presentation-hybrid` |
| Build extension | `npm run tokenforge:extension` |
| Dashboard dev server | `npm run tokenforge:dashboard` |
| Regen instruction files | `npm run tokenforge:generate-hybrid-eval-instructions` |
| Stage scan report for dashboard | `npm run tokenforge:prove -- stage fixtures/hybrid-eval-app` |
| Reset fixture between rehearsals | `npm run tokenforge:reset-hybrid-eval` |

Env knobs: `TOKENFORGE_PRESENTATION_LLM` (default `cursor-cli:composer-2.5`), `TOKENFORGE_PRESENTATION_NO_OPEN=1`, `TOKENFORGE_PRESENTATION_NO_PROMPT=1`, `TOKENFORGE_DASHBOARD_PORT` (default `5173`).

---

## Pre-flight (once)

```bash
npm install
npm run tokenforge:extension
npm run tokenforge:dashboard    # spare terminal → http://localhost:5173
agent login                   # Act 3 only — Cursor CLI
```

Extension host: open repo root → **F5** (Run Extension) → Extension Development Host.

Optional: **File → Open Folder → `fixtures/hybrid-eval-app`** in the host for cleaner tab paths.

---

## Act 1 — VS Code Context Guard (~2–3 min)

### Tabs to pre-open

Open before going live so high-risk tabs are already flagged:

| Tab | At-risk behaviour |
| --- | --- |
| `fixtures/hybrid-eval-app/package-lock.json` | **Immediate** — lockfile (~44k est. tokens) |
| `fixtures/hybrid-eval-app/test-results/junit.xml` | **Immediate** — test/CI output class |
| `fixtures/hybrid-eval-app/coverage/lcov.info` | Optional — same output-shape class |

Optional narrative tabs (do not Filter — show sprawl / keep-set):

| Tab | Talking point |
| --- | --- |
| `AGENTS.md` | Canonical policy — hybrid apply consolidates here |
| `.github/copilot-instructions.md` | Sprawl + bad “paste lockfile” habit |
| `docs/RULEBOOK.md` | Load-bearing — must **Keep** |
| `openapi.yaml` | Protected contract |

### Live actions

1. **TokenForge** activity bar → **At-risk tabs** + **Risk pulse**
2. Status bar: `TokenForge: … at risk`
3. **Filter** `package-lock.json` → pulse: before → after → saved
4. Optional: **Auto-filter high-risk** toggle
5. **Reveal last-scan.json** — same Token Risk JSON the dashboard can load

**Say:** *Detect is heuristic on open tabs. Filter is your call. We export evidence Prove can load — we do not intercept the agent pipeline.*

Press **Enter** in the guided script when Act 1 is done.

---

## Act 2 — Heuristic scan + apply + dashboard (~4–5 min)

### Automated

```bash
npm run tokenforge:presentation-heuristic
```

Default fixture: `fixtures/hybrid-eval-app`. Override: `npm run tokenforge:presentation-heuristic -- fixtures/other-app`.

### Manual (step control)

```bash
npm run tokenforge -- scan fixtures/hybrid-eval-app \
  --mode heuristic \
  --team tokenforge-demo \
  --repo hybrid-eval-app

npm run tokenforge -- apply fixtures/hybrid-eval-app \
  --mode heuristic \
  --provider copilot

npm run tokenforge:prove -- stage fixtures/hybrid-eval-app
```

### CLI talking points

- Findings: `package-lock.json`, `test-results/junit.xml` excluded by shape
- Instruction files + `RULEBOOK.md` + `openapi.yaml` stay — no semantic sprawl yet
- Apply merges `<!-- tokenforge:begin/end -->` in `.github/copilot-instructions.md`

### Dashboard URLs

| View | URL |
| --- | --- |
| Overview | `http://localhost:5173/board/combined?src=/last-scan.json` |
| Heuristic board | `http://localhost:5173/board/heuristic?src=/last-scan.json` |
| Findings | `http://localhost:5173/board/combined/findings?src=/last-scan.json` |
| Assumptions | `http://localhost:5173/board/combined/assumptions?src=/last-scan.json` |

### What to show

| Element | Point |
| --- | --- |
| KPI row + savings chart | ~84% repo scan delta (tier 2) |
| Honest savings tiers | Extension hygiene ≠ scan delta ≠ projected $ |
| Board → **Heuristic** | Two actionable findings — no model |
| Instruction stack card | ~5k tokens across four instruction files |
| **Assumptions** | Waste applicability **0.3** → ~26% scenario ($ projection) |
| Team scope | Sidebar → `tokenforge-demo` |

---

## Act 3 — Hybrid scan + apply + dashboard (~6–8 min + LLM)

Requires Cursor CLI logged in (`agent login`).

### Automated

```bash
npm run tokenforge:presentation-hybrid
```

### Manual

```bash
npm run tokenforge -- scan fixtures/hybrid-eval-app \
  --mode hybrid \
  --llm cursor-cli:composer-2.5 \
  --allow-external \
  --team tokenforge-demo \
  --repo hybrid-eval-app

npm run tokenforge -- apply fixtures/hybrid-eval-app \
  --mode hybrid \
  --llm cursor-cli:composer-2.5 \
  --allow-external \
  --provider copilot

npm run tokenforge:prove -- stage fixtures/hybrid-eval-app
```

### CLI talking points

- Same fixture, richer findings: `redundant_instructions`, `semantic_bloat`, …
- `scan.llm.analysisOverview` themes (use `--json` on scan if needed)
- Managed Copilot section: complete bleed-reduction policy within byte budget

### Dashboard URLs

| View | URL |
| --- | --- |
| Overview | `http://localhost:5173/board/combined?src=/last-scan.json` |
| **LLM board** | `http://localhost:5173/board/llm?src=/last-scan.json` |
| LLM findings | `http://localhost:5173/board/llm/findings?src=/last-scan.json` |
| Heatmap | `http://localhost:5173/board/combined/heatmap?src=/last-scan.json` |

### What to show

| Element | Point |
| --- | --- |
| Board toggle Combined → Heuristic → **LLM** | Three lenses on one report |
| Hybrid delta card | What heuristic missed vs LLM added |
| LLM analysis overview | Pass C themes in plain language |
| Findings (LLM) | Instruction-path rows — click for explanation |
| Contrast Act 2 | Heuristic: 2 findings; hybrid: instruction sprawl |
| `.github/copilot-instructions.md` | Show managed section after hybrid apply |

---

## Reset between rehearsals

```bash
npm run tokenforge:reset-hybrid-eval
```

---

## Timing checklist

| Act | Target |
| --- | --- |
| Extension (Filter lockfile) | 2–3 min |
| Heuristic CLI + dashboard | 4–5 min |
| Hybrid CLI + dashboard | 6–8 min |
| **Total** | **~15 min** |

For the legacy ≤5 min noisy-app demo, see [`DEMO_RUNBOOK.md`](./DEMO_RUNBOOK.md).
