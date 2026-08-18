# End-to-end test — Hybrid scan (Heuristic + Ollama + Dashboard)

Step-by-step runbook for product demos. **~15–20 minutes** including local
Qwen inference time. Assumes TokenForge is cloned and `main` includes the hybrid
scan PR stack (layers → Ollama → dashboard boards).

Related: [`HYBRID_SCAN_DESIGN.md`](./HYBRID_SCAN_DESIGN.md), [`PITCH_FAQ.md`](./PITCH_FAQ.md).

## What you will show

1. **Default scan is heuristic** — fast, offline, no AI.
2. **Optional hybrid scan** — same baseline + local Qwen semantic pass.
3. **Separated JSON layers** — `heuristic`, `llm`, `combined` in one report.
4. **Dashboard three boards** — Combined / Heuristic / LLM views from the same file.

## Prerequisites

| Requirement | Check |
| --- | --- |
| Node.js 20+ | `node -v` |
| Dependencies | `npm install` (repo root) |
| Ollama running | `curl -s http://127.0.0.1:11434/api/tags` |
| Qwen model | `ollama list` shows `qwen2.5-coder:7b` (or adjust `--llm` tag) |
| Git clean fixture | No stale `.tokenforge/` confusing the demo (optional) |

Pull model if needed:

```bash
ollama pull qwen2.5-coder:7b
```

## 1. Baseline — heuristic-only scan

From repo root:

```bash
npm install
npm test
npm run tokenforge -- scan fixtures/noisy-app \
  --repo fixtures/noisy-app \
  --team payments-platform
```

**Expected**

- Table lists lockfiles / oversized paths (`package-lock.json`, etc.).
- Writes `fixtures/noisy-app/.tokenforge/scan-report.json`.
- Exit code `0`, `savedPercent` ~99%+ on the noisy fixture.
- **No** `scan.llm` block (or `scan.mode: heuristic` only).

Inspect JSON:

```bash
cat fixtures/noisy-app/.tokenforge/scan-report.json | jq '{
  mode: .scan.mode,
  layerKeys: (.layers | keys),
  heuristicCount: .layers.heuristic.findings | length,
  llmCount: .layers.llm.findings | length,
  combinedCount: .findings | length
}'
```

**Talking point:** *Detect default is deterministic FinOps — size, path class, inactivity. No model call.*

## 2. Hybrid scan — local Qwen (Ollama)

Scan the **TokenForge repo** so Qwen can judge instruction/docs files (e.g. `AGENTS.md`):

```bash
npm run tokenforge -- scan . \
  --mode hybrid \
  --llm ollama:qwen2.5-coder:7b \
  --repo TokenForge \
  --team local
```

**Expected**

- Runs **2–5+ minutes** on a local 7B (CPU/GPU dependent) — say this upfront.
- Completes with exit `0`.
- Report includes:

```json
"scan": {
  "mode": "hybrid",
  "llm": {
    "backend": "ollama",
    "model": "qwen2.5-coder:7b",
    "candidatesSent": <n>,
    "durationMs": <ms>
  }
}
```

Verify separated layers:

```bash
cat .tokenforge/scan-report.json | jq '{
  scan: .scan,
  heuristic: { n: .layers.heuristic.findings | length, saved: .layers.heuristic.totals.savedTokens },
  llm: { n: .layers.llm.findings | length, saved: .layers.llm.totals.savedTokens },
  combined: { n: .layers.combined.findings | length, saved: .layers.combined.totals.savedTokens }
}'
```

Sample LLM finding (path may vary):

```bash
cat .tokenforge/scan-report.json | jq '.layers.llm.findings[] | { path, reason, confidence, detail }'
```

**Talking points**

- Hybrid is **opt-in** (`--mode hybrid --llm …`).
- Only a **bounded candidate set** goes to the model (not whole lockfiles).
- Top-level `findings` / `totals` = **combined** (Fix adapters unchanged).

**If Ollama is down**

- Command fails with a clear *“Cannot reach Ollama”* / timeout message.
- Fall back to `--mode hybrid` without `--llm` (noop enricher) for orchestration demo only.

## 3. Fix path (optional, 2 min)

Show that **combined** layer drives policy output:

```bash
npm run tokenforge -- apply . --dry-run --provider generic
```

**Expected:** Planned exclusion / instruction files reference combined findings; no LLM SDK in `risk-core`.

## 4. Dashboard — three boards

Start the Prove adapter:

```bash
npm run tokenforge:dashboard
```

Open the URL printed (usually `http://localhost:5173`).

### 4a. Demo seed (offline)

- Default load: `dashboard/public/demo-seed.json`.
- **Combined / Heuristic** boards show BU KPIs.
- **LLM** tab is disabled or empty-state — demo seed has no LLM layer.

### 4b. Load hybrid scan JSON

1. Use **Load JSON** (toolbar) → select `.tokenforge/scan-report.json` from step 2.
2. Sidebar **Scan board** tabs:
   - **Combined** — merged heuristic + LLM totals and offenders.
   - **Heuristic** — lockfiles / oversized only.
   - **LLM** — semantic findings (e.g. redundant instructions) with confidence/detail in team drill-down.
3. Walk **Overview → Heatmap → Offenders** on each board; numbers should differ per layer.
4. **Assumptions** — same calculator; changing knobs does not rewrite scan JSON.

**Talking point:** *Prove is provider-agnostic; boards let managers see rule-based vs semantic waste separately.*

## 5. Honesty checklist (judges / product)

| Claim | Accurate? |
| --- | --- |
| “We always use AI to scan” | **No** — default is heuristic. |
| “Hybrid can run locally” | **Yes** — Ollama + Qwen; data stays on machine. |
| “We intercept the agent pipeline” | **No** — file-based risk + policy recommendations. |
| “~30% savings” | **Scenario** — dashboard assumptions on demo seed, not a SLA. |

FAQ: [`PITCH_FAQ.md`](./PITCH_FAQ.md) · Deck: [`pitch/TokenForge-Pitch.pptx`](./pitch/TokenForge-Pitch.pptx).

## 6. Quick smoke (CI parity, no Ollama)

```bash
npm run tokenforge -- scan fixtures/noisy-app --mode hybrid
npm run typecheck
npm test
```

Hybrid + noop enricher writes `scan.llm.backend: "noop"` and empty `layers.llm.findings`.

## Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| Ollama timeout | Large repo / slow CPU | Scan smaller path (`docs/`) or wait (5 min cap) |
| LLM board empty | Heuristic-only JSON | Re-run step 2 with `--llm ollama:…` |
| LLM tab disabled | No LLM findings in loaded file | Load hybrid report from step 2 |
| Dashboard 404 on `/` | Old bookmark | Use `/board/combined` |

## Issue / PR map (hybrid scan stack)

| Deliverable | Issue | PR branch |
| --- | --- | --- |
| Design + scaffold (merged) | #41 | `TF#41-hybrid-scan` ✓ |
| Separated `layers` in JSON + CLI | #47 (part 1) | `TF#47-scan-layers` |
| Ollama enricher | #44 | `TF#44-ollama-enricher` |
| Dashboard boards + this runbook | #47, #23 | `TF#47-dashboard-boards` |

#42 (candidate + merge) and #43 (enricher port) were delivered in #41; close as done when reviewing.

**Merge order on `main`:** #41 (done) → scan-layers → Ollama → dashboard boards.
