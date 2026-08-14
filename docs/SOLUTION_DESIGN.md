# Solution Design Lite — TokenForge

Locked after concept workshop. Full narrative: [`CONCEPT_BRIEF.md`](./CONCEPT_BRIEF.md).

## Stack (confirmed)

| Piece | Choice |
| --- | --- |
| Dashboard | **React** (Vite) |
| CLI | **TypeScript** |
| Extension | **TypeScript** (VS Code Extension API) |
| Shared helpers | `packages/risk-core` (TypeScript) |
| Package manager | npm workspaces (default) |
| Demo ROI math | Transparent assumptions panel (tokens → $ / AI credits) |

## Product spine

```text
DETECT (extension) → FIX (CLI) → PROVE (dashboard)
```

Shared contract: Token Risk events / scan reports as JSON (see schema below).

## Monorepo layout

```text
TokenForge/
├── docs/
├── packages/risk-core/     # estimateTokens, scoreRisk, types
├── fixtures/noisy-app/     # demo repo with lockfiles / fat configs
├── extension/              # VS Code Context Guard
├── cli/                    # tokenforge init | scan | apply
└── dashboard/              # React ROI UI
```

## JSON contract (v0)

```json
{
  "source": "extension|cli",
  "timestamp": "ISO-8601",
  "repo": "org/name-or-local",
  "team": "payments-platform",
  "findings": [
    {
      "path": "package-lock.json",
      "reason": "inactive_tab|high_risk_filetype|oversized",
      "bytes": 2400000,
      "estTokens": 600000,
      "action": "filtered|excluded|kept"
    }
  ],
  "totals": {
    "beforeTokens": 820000,
    "afterTokens": 210000,
    "savedTokens": 610000
  }
}
```

Hackathon token estimate: `estTokens ≈ ceil(bytes / 4)` unless replaced by a tokenizer later.

## “30%” definition

On the **demo fixture** (not a universal production claim):

\[
\text{savings \%} = (beforeTokens - afterTokens) / beforeTokens
\]

Dashboard converts tokens → $ via editable assumptions (rate, team size, msgs/day).

## Component briefs

### Extension — Context Guard

- Track open editors: path, size, last focus/edit, filetype class
- Rule: inactive ≥15 minutes **or** high-risk class → at-risk
- UX: status bar + side panel (Keep / Filter)
- Export `.tokenforge/last-scan.json` or `~/.tokenforge/events.jsonl`
- Honesty: recommended hygiene / risk scoring — not Copilot pipeline interception

### CLI — `tokenforge`

```bash
tokenforge scan
tokenforge apply [--dry-run]
tokenforge init   # scan + apply + report
```

Writes lean `.github/copilot-instructions.md`, exclusion candidates, and
`.tokenforge/scan-report.json`.

### Dashboard — Tokens Saved (React)

- BU overview, team heatmap, top offenders, assumptions panel
- Load seeded demo data + optional CLI/extension JSON

## Build order

1. Foundation + risk-core + noisy fixture  
2. CLI  
3. Dashboard  
4. Extension  
5. Demo polish / pitch  

## Phase 2 (board: Future)

Chat history compaction, intelligent model routing, live Copilot usage metrics,
org Content Exclusion API apply — do **not** lead the pitch with these.
