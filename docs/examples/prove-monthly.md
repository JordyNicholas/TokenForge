# Platform monthly Prove automation (#131)

**Pipelines remember; humans don’t.** Context Guard (VS Code) is real-time Detect.
Monthly FinOps cadence — `usage-sync` plus optional `scan` — belongs to Platform
via GitHub Actions or an equivalent cron. There is no hosted TokenForge SaaS
scheduler and no in-IDE monthly calendar for central Prove.

## Turnkey GitHub Action

Workflow: [`.github/workflows/prove-monthly.yml`](../../.github/workflows/prove-monthly.yml)

| Trigger | Behavior |
| --- | --- |
| `schedule` (`0 6 2 * *` UTC by default) | Cadence is **editable** in the workflow YAML (see below) |
| `workflow_dispatch` | Manual run; inputs override Variables |

**Default policy: artifacts only** — no surprise commits to the default branch.
Download the `tokenforge-prove-YYYY-MM` artifact and load JSON into the Prove
dashboard (or copy into `dashboard/public/` locally for a demo).

### Customize the billing timeframe

Defaults match a settled prior month. Override per run or via Variables:

| `period_mode` | Meaning |
| --- | --- |
| `previous` (**default**) | UTC calendar month `months_ago` months before now (`months_ago=1` → last month) |
| `current` | Current UTC `YYYY-MM` (mid-month flash sync) |
| `explicit` | Require `period` / `TOKENFORGE_USAGE_PERIOD` = `YYYY-MM` |

| Control | Dispatch input | Repository Variable | Default |
| --- | --- | --- | --- |
| Mode | `period_mode` | `TOKENFORGE_PERIOD_MODE` | `previous` |
| Lookback | `months_ago` | `TOKENFORGE_MONTHS_AGO` | `1` |
| Pin month | `period` | `TOKENFORGE_USAGE_PERIOD` | _(empty)_ — non-empty **always wins** |

Examples:

- Last month (default): leave mode/period empty, or `period_mode=previous`, `months_ago=1`
- Two months ago: `period_mode=previous`, `months_ago=2`
- This month: `period_mode=current`
- Fixed window: `period=2026-07` (or set `TOKENFORGE_USAGE_PERIOD`)

### Customize the schedule cadence

GitHub Actions **cannot** load `cron:` from Variables — edit
[`.github/workflows/prove-monthly.yml`](../../.github/workflows/prove-monthly.yml):

```yaml
on:
  schedule:
    - cron: "0 6 2 * *"   # default: 06:00 UTC on the 2nd
    # - cron: "0 6 * * 1" # e.g. weekly Monday
    # - cron: "0 12 5 * *" # e.g. day-5 after invoices post
```

Disable `schedule` and keep only `workflow_dispatch` (or an external cron that
calls `gh workflow run`) if Platform prefers a different clock.

### Smoke test (this repo, no billing secrets)

1. GitHub → **Actions** → **Prove monthly** → **Run workflow**.
2. Leave defaults (`usage_provider=fixture`, `run_scan=true`, `period_mode=previous`).
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
| `TOKENFORGE_PERIOD_MODE` | `previous` \| `current` \| `explicit` |
| `TOKENFORGE_MONTHS_AGO` | `1` (last month), `2`, … |
| `TOKENFORGE_USAGE_PERIOD` | Pin a `YYYY-MM` (overrides mode when set) |
| `TOKENFORGE_USAGE_TEAM` | Optional team scope |
| `TOKENFORGE_RUN_SCAN` | `true` / `false` |
| `TOKENFORGE_SCAN_ROOT` | Path to scan (default `fixtures/noisy-app` in this template) |
| `TOKENFORGE_ARTIFACT_RETENTION_DAYS` | Artifact retention (default `90`) |

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
- Dynamic cron from Variables (GitHub limitation — edit the YAML)

## Generic cron (non-GitHub)

Same CLI flags the Action uses — Platform still owns the clock:

```cron
# Previous month, Copilot — 06:00 on the 2nd (edit schedule + PERIOD to taste)
0 6 2 * * cd /path/to/repo && \
  PERIOD=$(date -u -d "$(date -u +%Y-%m-01) -1 month" +%Y-%m) && \
  npm run tokenforge -- usage-sync . --usage-provider copilot --org YOUR_ORG --period "$PERIOD" \
  >> /var/log/tokenforge-prove.log 2>&1
```

Two months ago: use `-2 month`. Current month: `PERIOD=$(date -u +%Y-%m)`.

Optional scan before sync:

```bash
npm run tokenforge -- scan /path/to/team-repo --provider generic --team payments-platform
```

Do **not** use `npm run tokenforge:usage-sync` / `tokenforge:prove` in automation —
those scripts stage the local dashboard and may open a browser.
