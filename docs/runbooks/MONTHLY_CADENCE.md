# Platform monthly cadence (#131, F24-C)

**Pipelines remember; humans don't.** Context Guard (VS Code) is real-time Detect for
developers. Platform owns the **monthly** FinOps loop: usage sync, scan, drift,
org rollup, Prove report, and dashboard boot — via GitHub Actions or equivalent cron.

There is no hosted TokenForge SaaS scheduler. This runbook is the operator checklist.

Related:

- [`prove-monthly.md`](./prove-monthly.md) — turnkey GitHub Action for `usage-sync`
- [`EM_TEAM_PROVE.md`](./EM_TEAM_PROVE.md) — Friday inbox drop, prove-pack, usage team map
- [`PILOT_RUNBOOK.md`](./PILOT_RUNBOOK.md) — one-team baseline → apply → import bill
- [`STANDARD_PILOT_KIT.md`](./STANDARD_PILOT_KIT.md) — control team + two periods + freeze

## Monthly checklist (Platform)

Run near the start of each billing period (default: **2nd of the month UTC**).

| Step | Command / action | Artifact |
| --- | --- | --- |
| 1. **Usage sync** | `tokenforge usage-sync . --usage-provider <copilot\|cursor\|claude\|fixture> --period YYYY-MM` | `.tokenforge/usage-*.json`, `usage-latest.json` |
| 2. **Scan** | `tokenforge scan <repo-root> --provider <provider> --team <team-id>` | `.tokenforge/scan-report.json` |
| 3. **Drift** | `tokenforge drift <repo-root> --provider <provider>` | Exit 0 = managed section OK; non-zero = drift |
| 4. **Org seed** | `tokenforge org-seed <tree-root>` | Rollup JSON for multi-repo BU dashboard |
| 5. **Prove report** | `tokenforge prove-report <repo-root>` | Markdown with trustLevel + calibration bands |
| 6. **Dashboard boot** | Stage artifacts → `dashboard/public/` or load via SourceBar | `?src=/last-scan.json&afterUsage=…&session=…` |

### Honesty (say this in reviews)

> TokenForge reconciles **estimated** context savings with **imported** vendor usage.
> We do not tap any agent's private pipeline. Invoice delta is **not** 100% causal
> without a control cohort.

## GitHub Actions path

Primary workflow: [`.github/workflows/prove-monthly.yml`](../../.github/workflows/prove-monthly.yml)

See [`prove-monthly.md`](./prove-monthly.md) for period modes, secrets, and smoke test.

**Extend the monthly job** (copy into your org fork — not enabled in root CI by default):

```yaml
- run: npm run tokenforge -- drift ${{ vars.TOKENFORGE_SCAN_ROOT || 'fixtures/noisy-app' }} --provider generic
- run: npm run tokenforge -- org-seed .
- run: npm run tokenforge -- prove-report ${{ vars.TOKENFORGE_SCAN_ROOT || 'fixtures/noisy-app' }}
```

**EM multi-person Prove** (weekly inbox — copy from example, not root CI):

See [`.github/workflows/examples/tokenforge-em-prove.yml`](../../.github/workflows/examples/tokenforge-em-prove.yml) and [`EM_TEAM_PROVE.md`](./EM_TEAM_PROVE.md). Steps: `inbox-validate` (continue-on-error OK), `prove-pack`, drift on a Fix-on fixture repo.

Optional after apply in repos under Fix:

```bash
npm run tokenforge -- promote-shield . --provider cursor --dry-run
npm run tokenforge -- drift . --provider cursor
```

## Generic cron (non-GitHub)

```bash
PERIOD=$(date -u -d "$(date -u +%Y-%m-01) -1 month" +%Y-%m)
cd /path/to/repo && npm ci

npm run tokenforge -- scan /path/to/team-repo --provider generic --team payments-platform
npm run tokenforge -- usage-sync . --usage-provider copilot --org YOUR_ORG --period "$PERIOD"
npm run tokenforge -- drift /path/to/team-repo --provider copilot
npm run tokenforge -- org-seed /path/to/org-tree
npm run tokenforge -- prove-report /path/to/team-repo
```

Do **not** use `npm run tokenforge:prove` in automation — it may open a browser.

## Developer vs Platform

| Role | Surface | Cadence |
| --- | --- | --- |
| Developer | Context Guard extension — Overview daily health strip | Continuous while coding |
| Platform | This runbook + CI | Monthly (or weekly flash sync) |
| FinOps / Director | Prove dashboard + prove-report | Review after usage sync |

## Non-goals

- In-extension monthly calendar feeding a central cloud dashboard
- Auto-committing `.tokenforge/` to `main` without Platform policy
- Claiming 100% invoice causation from Shield alone
