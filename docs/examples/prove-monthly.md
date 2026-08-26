# Platform monthly Prove automation (#131)

**Pipelines remember; humans don’t.** Context Guard (VS Code) is real-time Detect.
Monthly FinOps cadence — `usage-sync` plus optional `scan` — belongs to Platform
via GitHub Actions or an equivalent cron. There is no hosted TokenForge SaaS
scheduler and no in-IDE monthly calendar for central Prove.

## Turnkey GitHub Action

Workflow: [`.github/workflows/prove-monthly.yml`](../../.github/workflows/prove-monthly.yml)

| Trigger | Behavior |
| --- | --- |
| `schedule` (`0 6 2 * *` UTC) | Day-2 monthly run; period defaults to **previous** UTC `YYYY-MM` |
| `workflow_dispatch` | Manual run; inputs override Variables |

**Default policy: artifacts only** — no surprise commits to the default branch.
Download the `tokenforge-prove-YYYY-MM` artifact and load JSON into the Prove
dashboard (or copy into `dashboard/public/` locally for a demo).

### Smoke test (this repo, no billing secrets)

1. GitHub → **Actions** → **Prove monthly** → **Run workflow**.
2. Leave defaults (`usage_provider=fixture`, `run_scan=true`).
3. Confirm the job uploads `.tokenforge/scan-report.json` and `usage-*.json`.

CLI equivalent:

```bash
npm ci
npm run tokenforge -- scan fixtures/noisy-app --provider generic --team platform
mkdir -p .tokenforge && cp fixtures/noisy-app/.tokenforge/scan-report.json .tokenforge/
npm run tokenforge -- usage-sync . \
  --usage-provider fixture \
  --file docs/schemas/examples/usage-metrics.v0.json \
  --period 2026-08
ls .tokenforge/scan-report.json .tokenforge/usage-*.json .tokenforge/usage-latest.json
```

### Live providers (org-approved credentials)

Set **repository Variables** (optional) and **Secrets**:

| Variable | Example |
| --- | --- |
| `TOKENFORGE_USAGE_PROVIDER` | `copilot` \| `cursor` \| `claude` |
| `TOKENFORGE_USAGE_ORG` | GitHub org slug, or Cursor `organizationId` (`org_…`) |
| `TOKENFORGE_USAGE_PERIOD` | Pin a `YYYY-MM` (else previous UTC month) |
| `TOKENFORGE_USAGE_TEAM` | Optional team scope |
| `TOKENFORGE_RUN_SCAN` | `true` / `false` |
| `TOKENFORGE_SCAN_ROOT` | Path to scan (default `fixtures/noisy-app` in this template) |

| Secret | Env consumed by CLI | Provider |
| --- | --- | --- |
| `GITHUB_COPILOT_USAGE_TOKEN` | `GITHUB_COPILOT_USAGE_TOKEN` / `GITHUB_TOKEN` | Copilot (org billing + Copilot metrics PAT) |
| `CURSOR_API_KEY` | `CURSOR_API_KEY` | Cursor Admin API (`usage:*`) |
| `ANTHROPIC_ADMIN_API_KEY` | `ANTHROPIC_ADMIN_API_KEY` | Claude Console Admin key |

Prefer a **dedicated** Copilot usage PAT over the workflow’s default `GITHUB_TOKEN`
(the default token usually cannot read org billing).

`workflow_dispatch` inputs override Variables for one-off runs.

### Non-goals

- In-extension monthly schedule feeding a central cloud dashboard
- Claiming invoice-delta causality without Wave C cohorts
- Auto-committing `.tokenforge/` to `main` (opt-in Platform policy only)

## Generic cron (non-GitHub)

Same CLI flags the Action uses — Platform still owns the clock:

```cron
# Previous month, Copilot — 06:00 on the 2nd
0 6 2 * * cd /path/to/repo && \
  PERIOD=$(date -u -d "$(date -u +%Y-%m-01) -1 day" +%Y-%m) && \
  npm run tokenforge -- usage-sync . --usage-provider copilot --org YOUR_ORG --period "$PERIOD" \
  >> /var/log/tokenforge-prove.log 2>&1
```

Optional scan before sync:

```bash
npm run tokenforge -- scan /path/to/team-repo --provider generic --team payments-platform
```

Do **not** use `npm run tokenforge:usage-sync` / `tokenforge:prove` in automation —
those scripts stage the local dashboard and may open a browser.
